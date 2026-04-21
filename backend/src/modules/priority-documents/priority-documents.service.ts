import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { PriorityDocumentType, DocumentStatus } from '@prisma/client';

// Points map for approved document types
const PRIORITY_POINTS: Record<PriorityDocumentType, number> = {
  POOR_HOUSEHOLD: 15,
  NEAR_POOR: 10,
  ORPHAN: 15,
  DISABLED: 15,
  POLICY_FAMILY: 10,
  GPA_TRANSCRIPT: 10,
};

export const DOCUMENT_TYPE_LABELS: Record<PriorityDocumentType, string> = {
  POOR_HOUSEHOLD: 'Hộ nghèo',
  NEAR_POOR: 'Hộ cận nghèo',
  ORPHAN: 'Mồ côi',
  DISABLED: 'Khuyết tật',
  POLICY_FAMILY: 'Gia đình chính sách',
  GPA_TRANSCRIPT: 'Bảng điểm GPA',
};

@Injectable()
export class PriorityDocumentsService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  // ========================================
  // UPLOAD DOCUMENT (Student)
  // ========================================
  async upload(
    studentId: number,
    type: PriorityDocumentType,
    file: Express.Multer.File,
  ) {
    // Only one document per type per student (non-rejected)
    const existing = await this.prisma.priorityDocument.findFirst({
      where: { studentId, type, status: { not: 'REJECTED' } },
    });
    if (existing) {
      throw new BadRequestException(
        `Bạn đã nộp minh chứng cho tiêu chí này (trạng thái: ${existing.status}). Hãy xóa minh chứng cũ trước khi nộp lại.`,
      );
    }

    const folder = `dormhub/priority/${studentId}`;
    const { url, publicId } = await this.cloudinary.uploadBuffer(
      file.buffer,
      file.originalname,
      folder,
    );

    return this.prisma.priorityDocument.create({
      data: {
        studentId,
        type,
        fileUrl: url,
        fileName: file.originalname,
        publicId,
        status: 'PENDING',
      },
    });
  }

  // ========================================
  // GET MY DOCUMENTS (Student)
  // ========================================
  async getMyDocuments(studentId: number) {
    const docs = await this.prisma.priorityDocument.findMany({
      where: { studentId },
      include: {
        reviewedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return docs;
  }

  // ========================================
  // DELETE MY DOCUMENT (Student — only PENDING or REJECTED)
  // ========================================
  async delete(studentId: number, docId: number) {
    const doc = await this.prisma.priorityDocument.findFirst({
      where: { id: docId, studentId },
    });
    if (!doc) throw new NotFoundException('Không tìm thấy minh chứng');
    if (doc.status === 'APPROVED') {
      throw new ForbiddenException('Không thể xóa minh chứng đã được duyệt');
    }

    await this.cloudinary.deleteFile(doc.publicId);
    await this.prisma.priorityDocument.delete({ where: { id: docId } });
    return { message: 'Đã xóa minh chứng' };
  }

  // ========================================
  // LIST ALL DOCUMENTS (Admin/Staff)
  // ========================================
  async findAll(status?: DocumentStatus, type?: PriorityDocumentType) {
    return this.prisma.priorityDocument.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
      },
      include: {
        student: {
          select: { id: true, studentCode: true, fullName: true, faculty: true, className: true },
        },
        reviewedBy: { select: { id: true, fullName: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // ========================================
  // REVIEW DOCUMENT (Admin/Staff)
  // ========================================
  async review(
    docId: number,
    reviewerId: number,
    action: 'APPROVED' | 'REJECTED',
    reviewNote?: string,
  ) {
    const doc = await this.prisma.priorityDocument.findUnique({ where: { id: docId } });
    if (!doc) throw new NotFoundException('Không tìm thấy minh chứng');
    if (doc.status !== 'PENDING') {
      throw new BadRequestException('Minh chứng này đã được xử lý rồi');
    }

    const updated = await this.prisma.priorityDocument.update({
      where: { id: docId },
      data: {
        status: action,
        reviewNote: reviewNote ?? null,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
      include: {
        student: { select: { id: true, studentCode: true, fullName: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });

    // Recalculate and update priorityScore for all PENDING applications of this student
    const approvedDocs = await this.prisma.priorityDocument.findMany({
      where: { studentId: doc.studentId, status: 'APPROVED' },
      select: { type: true },
    });
    const newScore = approvedDocs.reduce(
      (sum, d) => sum + (PRIORITY_POINTS[d.type] ?? 0),
      0,
    );
    await this.prisma.registrationApplication.updateMany({
      where: { studentId: doc.studentId, status: 'PENDING' },
      data: { priorityScore: newScore },
    });

    return updated;
  }

  // ========================================
  // GET DOCUMENT FILE URL (for proxy)
  // ========================================
  async getDocumentFileUrl(
    docId: number,
    studentId?: number,
  ): Promise<{ fileUrl: string; fileName: string }> {
    const doc = await this.prisma.priorityDocument.findFirst({
      where: { id: docId, ...(studentId !== undefined ? { studentId } : {}) },
    });
    if (!doc) throw new NotFoundException('Không tìm thấy minh chứng');
    return { fileUrl: doc.fileUrl, fileName: doc.fileName };
  }

  // ========================================
  // GET STUDENT PRIORITY SCORE (from approved docs)
  // ========================================
  async getStudentPriorityScore(studentId: number): Promise<{
    score: number;
    approvedTypes: PriorityDocumentType[];
    breakdown: { type: PriorityDocumentType; label: string; points: number }[];
  }> {
    const approved = await this.prisma.priorityDocument.findMany({
      where: { studentId, status: 'APPROVED' },
    });

    let score = 0;
    const breakdown: { type: PriorityDocumentType; label: string; points: number }[] = [];

    for (const doc of approved) {
      const pts = PRIORITY_POINTS[doc.type];
      score += pts;
      breakdown.push({ type: doc.type, label: DOCUMENT_TYPE_LABELS[doc.type], points: pts });
    }

    return {
      score,
      approvedTypes: approved.map((d) => d.type),
      breakdown,
    };
  }
}
