import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateTicketDto, UpdateTicketDto, RejectTicketDto,
  RateTicketDto, QueryTicketDto,
} from './dto';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  // ========================================
  // STUDENT: Tạo ticket
  // ========================================
  async create(dto: CreateTicketDto, studentId: number) {
    // Lấy contract ACTIVE → xác định phòng
    const contract = await this.prisma.contract.findFirst({
      where: { studentId, status: 'ACTIVE' },
      select: { roomId: true },
    });
    if (!contract) throw new BadRequestException('Bạn chưa có hợp đồng đang hoạt động');

    const code = await this.generateCode();

    return this.prisma.maintenanceTicket.create({
      data: {
        code,
        roomId: contract.roomId,
        reportedById: studentId,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        images: dto.images ?? [],
        status: 'NEW',
      },
      include: this.defaultInclude(),
    });
  }

  // ========================================
  // STAFF/ADMIN: Cập nhật ticket (status, priority, note)
  // ========================================
  async update(id: number, dto: UpdateTicketDto, handledById: number, allowedBuildingIds?: number[]) {
    const ticket = await this.findOneOrFail(id);

    if (allowedBuildingIds !== undefined) {
      await this.assertBuildingAccess(ticket.roomId, allowedBuildingIds);
    }

    if (ticket.status === 'COMPLETED' || ticket.status === 'REJECTED') {
      throw new BadRequestException('Không thể cập nhật ticket đã hoàn thành hoặc bị từ chối');
    }

    const data: any = {};

    if (dto.priority) data.priority = dto.priority;
    if (dto.resolutionNote !== undefined) data.resolutionNote = dto.resolutionNote;

    if (dto.status) {
      data.status = dto.status;

      if (dto.status === 'IN_PROGRESS' && ticket.status === 'NEW') {
        data.handledById = handledById;
        data.handledAt = new Date();
      }

      if (dto.status === 'COMPLETED') {
        data.completedAt = new Date();
        if (!ticket.handledById) {
          data.handledById = handledById;
          data.handledAt = new Date();
        }
      }
    }

    return this.prisma.maintenanceTicket.update({
      where: { id },
      data,
      include: this.defaultInclude(),
    });
  }

  // ========================================
  // STAFF/ADMIN: Reject ticket
  // ========================================
  async reject(id: number, dto: RejectTicketDto, handledById: number, allowedBuildingIds?: number[]) {
    const ticket = await this.findOneOrFail(id);

    if (allowedBuildingIds !== undefined) {
      await this.assertBuildingAccess(ticket.roomId, allowedBuildingIds);
    }

    if (ticket.status === 'COMPLETED' || ticket.status === 'REJECTED') {
      throw new BadRequestException('Không thể từ chối ticket đã hoàn thành hoặc đã từ chối');
    }

    return this.prisma.maintenanceTicket.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.rejectionReason,
        handledById,
        handledAt: new Date(),
      },
      include: this.defaultInclude(),
    });
  }

  // ========================================
  // STUDENT: Đánh giá sau hoàn thành (7 ngày)
  // ========================================
  async rate(id: number, dto: RateTicketDto, studentId: number) {
    const ticket = await this.findOneOrFail(id);

    if (ticket.reportedById !== studentId) {
      throw new ForbiddenException('Chỉ người tạo ticket mới đánh giá được');
    }

    if (ticket.status !== 'COMPLETED') {
      throw new BadRequestException('Chỉ đánh giá được ticket đã hoàn thành');
    }

    if (ticket.rating !== null) {
      throw new BadRequestException('Bạn đã đánh giá ticket này rồi');
    }

    // Check 7 ngày
    if (ticket.completedAt) {
      const daysSince = (Date.now() - new Date(ticket.completedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 7) {
        throw new BadRequestException('Đã quá 7 ngày kể từ khi hoàn thành, không thể đánh giá');
      }
    }

    return this.prisma.maintenanceTicket.update({
      where: { id },
      data: {
        rating: dto.rating,
        ratingComment: dto.ratingComment,
        ratedAt: new Date(),
      },
      include: this.defaultInclude(),
    });
  }

  // ========================================
  // FIND ALL (Admin/Staff)
  // ========================================
  async findAll(query: QueryTicketDto, allowedBuildingIds?: number[]) {
    const { page = 1, limit = 20, roomId, buildingId, status, category, priority, search, sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (roomId) where.roomId = roomId;
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { room: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Building scope
    if (allowedBuildingIds !== undefined) {
      const scope = buildingId
        ? allowedBuildingIds.filter((id) => id === Number(buildingId))
        : allowedBuildingIds;
      where.room = { ...where.room, buildingId: { in: scope } };
    } else if (buildingId) {
      where.room = { ...where.room, buildingId };
    }

    const [data, total] = await Promise.all([
      this.prisma.maintenanceTicket.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: sortOrder },
        include: this.defaultInclude(),
      }),
      this.prisma.maintenanceTicket.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ========================================
  // FIND ONE
  // ========================================
  async findOne(id: number, allowedBuildingIds?: number[]) {
    const ticket = await this.findOneOrFail(id);

    if (allowedBuildingIds !== undefined) {
      await this.assertBuildingAccess(ticket.roomId, allowedBuildingIds);
    }

    return ticket;
  }

  // ========================================
  // STUDENT: Lấy ticket của mình
  // ========================================
  async findForStudent(studentId: number, query: QueryTicketDto) {
    const { page = 1, limit = 20, status, category, sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = { reportedById: studentId };
    if (status) where.status = status;
    if (category) where.category = category;

    const [data, total] = await Promise.all([
      this.prisma.maintenanceTicket.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: sortOrder },
        include: this.defaultInclude(),
      }),
      this.prisma.maintenanceTicket.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ========================================
  // STUDENT: Xem chi tiết ticket của mình
  // ========================================
  async findOneStudent(id: number, studentId: number) {
    const ticket = await this.findOneOrFail(id);
    if (ticket.reportedById !== studentId) {
      throw new ForbiddenException('Bạn không có quyền xem ticket này');
    }
    return ticket;
  }

  // ========================================
  // STATS (Admin/Staff)
  // ========================================
  async getStats(allowedBuildingIds?: number[]) {
    const roomScope: any = {};
    if (allowedBuildingIds !== undefined) {
      roomScope.room = { buildingId: { in: allowedBuildingIds } };
    }

    const [newCount, inProgress, completed, rejected] = await Promise.all([
      this.prisma.maintenanceTicket.count({ where: { ...roomScope, status: 'NEW' } }),
      this.prisma.maintenanceTicket.count({ where: { ...roomScope, status: 'IN_PROGRESS' } }),
      this.prisma.maintenanceTicket.count({ where: { ...roomScope, status: 'COMPLETED' } }),
      this.prisma.maintenanceTicket.count({ where: { ...roomScope, status: 'REJECTED' } }),
    ]);

    // Trung bình đánh giá
    const ratingAgg = await this.prisma.maintenanceTicket.aggregate({
      where: { ...roomScope, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // Ticket URGENT chưa xử lý
    const urgentPending = await this.prisma.maintenanceTicket.count({
      where: { ...roomScope, priority: 'URGENT', status: { in: ['NEW', 'IN_PROGRESS'] } },
    });

    return {
      counts: {
        new: newCount,
        inProgress,
        completed,
        rejected,
        total: newCount + inProgress + completed + rejected,
      },
      urgentPending,
      rating: {
        average: ratingAgg._avg.rating ? Number(ratingAgg._avg.rating.toFixed(1)) : null,
        count: ratingAgg._count.rating,
      },
    };
  }

  // ========================================
  // HELPERS
  // ========================================
  private async generateCode(): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const count = await this.prisma.maintenanceTicket.count({
      where: {
        createdAt: {
          gte: new Date(y, 0, 1),
          lt: new Date(y + 1, 0, 1),
        },
      },
    });
    return `TK-${y}-${String(count + 1).padStart(4, '0')}`;
  }

  private defaultInclude() {
    return {
      room: {
        include: { building: { select: { id: true, code: true, name: true } } },
      },
      reportedBy: {
        select: { id: true, fullName: true, studentCode: true },
      },
      handledBy: {
        select: { id: true, fullName: true },
      },
    } satisfies Prisma.MaintenanceTicketInclude;
  }

  private async findOneOrFail(id: number) {
    const ticket = await this.prisma.maintenanceTicket.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });
    if (!ticket) throw new NotFoundException('Không tìm thấy ticket');
    return ticket;
  }

  private async assertBuildingAccess(roomId: number, allowedBuildingIds: number[]) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { buildingId: true },
    });
    if (!room || !allowedBuildingIds.includes(room.buildingId)) {
      throw new ForbiddenException('Bạn không có quyền truy cập dữ liệu tòa này');
    }
  }
}