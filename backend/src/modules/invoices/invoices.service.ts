import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException, ForbiddenException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  CreateUtilityInvoiceDto, BatchCreateUtilityDto,
  ConfirmPaymentDto, UploadProofDto, QueryInvoiceDto, RejectProofDto,
} from './dto';
import { Contract, InvoiceStatus, Prisma } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  // ========================================
  // INTERNAL: Tạo ROOM_FEE invoice khi tạo Contract
  // Gọi từ ContractsService sau khi tạo Contract thành công
  // ========================================
  async createRoomFeeInvoice(contract: Contract & { room?: { code: string } }) {
    // Tính số tháng
    const start = new Date(contract.startDate);
    const end = new Date(contract.endDate);
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());

    if (months <= 0) throw new BadRequestException('Thời hạn hợp đồng không hợp lệ');

    const roomFee = Math.round(Number(contract.monthlyRent) * months);
    const waterFee = 30_000 * months; // khoán cố định, không tính theo người
    const totalAmount = roomFee + waterFee;

    // billingMonth = ngày bắt đầu HĐ (normalize về ngày 1)
    const billingMonth = new Date(start);
    billingMonth.setDate(1);

    // dueDate = ngày check-in (phải đóng trước khi nhận phòng)
    const dueDate = new Date(start);

    // Dùng contract.code để đảm bảo unique — roomCode+month có thể trùng khi RENEWAL cùng tháng
    const code = `RF-${contract.code}`;

    return this.prisma.invoice.create({
      data: {
        code,
        roomId: contract.roomId,
        contractId: contract.id,
        type: 'ROOM_FEE',
        billingMonth,
        roomFee,
        electricityFee: 0,
        waterFee,
        totalAmount,
        electricityUsage: 0,
        waterUsage: 0,
        occupantsCount: 1,
        dueDate,
        status: 'PAID', // Thu trực tiếp khi nhận phòng
        paidAt: new Date(),
      },
    });
  }

  // ========================================
  // CREATE UTILITY INVOICE — 1 phòng
  // ========================================
  async createUtility(dto: CreateUtilityInvoiceDto, allowedBuildingIds?: number[]) {
    const billingMonth = this.normalizeMonth(dto.billingMonth);

    if (allowedBuildingIds !== undefined) {
      await this.assertBuildingAccess(dto.roomId, allowedBuildingIds);
    }

    // Check duplicate
    const existing = await this.prisma.invoice.findFirst({
      where: { roomId: dto.roomId, billingMonth, type: 'UTILITY' },
    });
    if (existing) throw new ConflictException('Hóa đơn tiện ích tháng này đã tồn tại cho phòng này');

    return this.buildAndCreateUtility(dto.roomId, billingMonth);
  }

  // ========================================
  // BATCH CREATE UTILITY — cả tòa
  // ========================================
  async batchCreateUtility(dto: BatchCreateUtilityDto, allowedBuildingIds?: number[]) {
    const billingMonth = this.normalizeMonth(dto.billingMonth);

    // Scope phòng
    const roomWhere: any = {
      status: 'ACTIVE',
      contracts: { some: { status: 'ACTIVE' } },
    };

    if (dto.buildingId) {
      if (allowedBuildingIds !== undefined && !allowedBuildingIds.includes(dto.buildingId)) {
        throw new ForbiddenException('Bạn không có quyền truy cập tòa này');
      }
      roomWhere.buildingId = dto.buildingId;
    } else if (allowedBuildingIds !== undefined) {
      roomWhere.buildingId = { in: allowedBuildingIds };
    }

    const rooms = await this.prisma.room.findMany({
      where: roomWhere,
      select: { id: true, code: true },
    });

    const results: { roomId: number; roomCode: string; success: boolean; error?: string; invoiceCode?: string }[] = [];

    for (const room of rooms) {
      // Skip phòng đã có hóa đơn tháng này
      const existing = await this.prisma.invoice.findFirst({
        where: { roomId: room.id, billingMonth, type: 'UTILITY' },
      });
      if (existing) {
        results.push({ roomId: room.id, roomCode: room.code, success: false, error: 'Đã có hóa đơn' });
        continue;
      }

      try {
        const invoice = await this.buildAndCreateUtility(room.id, billingMonth);
        results.push({ roomId: room.id, roomCode: room.code, success: true, invoiceCode: invoice.code });
      } catch (err: any) {
        results.push({ roomId: room.id, roomCode: room.code, success: false, error: err.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return {
      message: `Tạo hóa đơn thành công ${successCount}/${rooms.length} phòng`,
      successCount,
      failCount: rooms.length - successCount,
      results,
    };
  }

  // ========================================
  // INTERNAL: Build + tạo UTILITY invoice cho 1 phòng
  // ========================================
  private async buildAndCreateUtility(roomId: number, billingMonth: Date) {
    const room = await this.prisma.room.findUniqueOrThrow({ where: { id: roomId }, select: { code: true } });

    // Lấy chỉ số điện/nước tháng này
    const [elecReading, waterReading] = await Promise.all([
      this.prisma.meterReading.findUnique({
        where: { roomId_meterType_readingMonth: { roomId, meterType: 'ELECTRICITY', readingMonth: billingMonth } },
      }),
      this.prisma.meterReading.findUnique({
        where: { roomId_meterType_readingMonth: { roomId, meterType: 'WATER', readingMonth: billingMonth } },
      }),
    ]);

    if (!elecReading) throw new BadRequestException(`Chưa ghi chỉ số điện tháng này cho phòng ${roomId}`);
    if (!waterReading) throw new BadRequestException(`Chưa ghi chỉ số nước tháng này cho phòng ${roomId}`);

    // Đếm số người đang ở
    const occupantsCount = await this.prisma.contract.count({
      where: { roomId, status: 'ACTIVE' },
    });

    // Tính tiền
    const kWh = Number(elecReading.consumption);
    const m3 = Number(waterReading.consumption);

    const { totalCost: electricityFee } = await this.settings.calculateElectricityCost(kWh);
    const { breakdown } = await this.settings.calculateWaterCost(m3, occupantsCount);
    const utilityWaterFee = breakdown.overQuotaFee;

    const totalAmount = electricityFee + utilityWaterFee;

    // dueDate = ngày 15 tháng sau
    const dueDate = new Date(billingMonth);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(15);

    const code = this.generateCode('INV-UTL', billingMonth, room.code);

    return this.prisma.invoice.create({
      data: {
        code,
        roomId,
        type: 'UTILITY',
        billingMonth,
        roomFee: 0,
        electricityFee,
        waterFee: utilityWaterFee,
        totalAmount,
        electricityUsage: kWh,
        waterUsage: m3,
        occupantsCount,
        dueDate,
        status: 'PENDING',
      },
      include: this.defaultInclude(),
    });
  }

  // ========================================
  // UPLOAD PAYMENT PROOF (Trưởng phòng)
  // ========================================
  async uploadProof(id: number, dto: UploadProofDto, studentId: number) {
    const invoice = await this.findOneOrFail(id);

    if (invoice.type !== 'UTILITY') throw new BadRequestException('Chỉ áp dụng cho hóa đơn tiện ích');
    if (invoice.status !== 'PENDING' && invoice.status !== 'OVERDUE') {
      throw new BadRequestException('Hóa đơn không ở trạng thái có thể nộp minh chứng');
    }

    // Chỉ trưởng phòng mới upload được
    await this.assertRoomLeader(invoice.roomId, studentId);

    return this.prisma.invoice.update({
      where: { id },
      data: { paymentProof: dto.paymentProof, rejectionNote: null, rejectedAt: null },
      include: this.defaultInclude(),
    });
  }

  // ========================================
  // REJECT PROOF (Staff/Admin từ chối minh chứng)
  // ========================================
  async rejectProof(id: number, dto: RejectProofDto, allowedBuildingIds?: number[]) {
    const invoice = await this.findOneOrFail(id);

    if (allowedBuildingIds !== undefined) {
      await this.assertBuildingAccess(invoice.roomId, allowedBuildingIds);
    }
    if (!invoice.paymentProof) {
      throw new BadRequestException('Hóa đơn chưa có minh chứng để từ chối');
    }
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      throw new BadRequestException('Không thể từ chối hóa đơn đã thanh toán hoặc đã hủy');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        paymentProof: null,
        rejectionNote: dto.rejectionNote,
        rejectedAt: new Date(),
      },
      include: this.defaultInclude(),
    });
  }

  // ========================================
  // CONFIRM PAYMENT (Staff/Admin)
  // ========================================
  async confirmPayment(id: number, dto: ConfirmPaymentDto, approvedById: number, allowedBuildingIds?: number[]) {
    const invoice = await this.findOneOrFail(id);

    if (allowedBuildingIds !== undefined) {
      await this.assertBuildingAccess(invoice.roomId, allowedBuildingIds);
    }

    if (!['PENDING', 'OVERDUE'].includes(invoice.status)) {
      throw new BadRequestException('Hóa đơn không ở trạng thái chờ thanh toán');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        approvedById,
        approvedAt: new Date(),
      },
      include: this.defaultInclude(),
    });
  }

  // ========================================
  // CANCEL INVOICE (Admin only)
  // ========================================
  async cancel(id: number) {
    const invoice = await this.findOneOrFail(id);
    if (invoice.status === 'PAID') throw new BadRequestException('Không thể hủy hóa đơn đã thanh toán');

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: this.defaultInclude(),
    });
  }

  // ========================================
  // FIND ALL (Admin/Staff)
  // ========================================
  async findAll(query: QueryInvoiceDto, allowedBuildingIds?: number[]) {
    const { page = 1, limit = 20, roomId, buildingId, studentId, status, type, billingMonth, search, sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (roomId) where.roomId = roomId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (billingMonth) where.billingMonth = this.normalizeMonth(billingMonth);

    if (studentId) {
      const contracts = await this.prisma.contract.findMany({
        where: { studentId },
        select: { id: true, roomId: true },
      });
      const studentRoomIds = [...new Set(contracts.map((c) => c.roomId))];
      const studentContractIds = contracts.map((c) => c.id);
      const studentScope = {
        OR: [
          { roomId: { in: studentRoomIds }, type: 'UTILITY' },
          { contractId: { in: studentContractIds }, type: 'ROOM_FEE' },
        ],
      };
      // Kết hợp AND để search không bị ghi đè
      where.AND = search
        ? [studentScope, { OR: [{ code: { contains: search, mode: 'insensitive' } }, { room: { code: { contains: search, mode: 'insensitive' } } }] }]
        : [studentScope];
      delete where.roomId;
    } else if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { room: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Building scope luôn áp dụng — kể cả khi đã filter theo studentId
    if (allowedBuildingIds !== undefined) {
      const scope = buildingId
        ? allowedBuildingIds.filter((id) => id === Number(buildingId))
        : allowedBuildingIds;
      where.room = { buildingId: { in: scope } };
    } else if (buildingId) {
      where.room = { buildingId };
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where, skip, take: limit,
        orderBy: { billingMonth: sortOrder },
        include: this.defaultInclude(),
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ========================================
  // FIND ONE (với breakdown tiền điện)
  // ========================================
  async findOne(id: number, allowedBuildingIds?: number[]) {
    const invoice = await this.findOneOrFail(id);

    if (allowedBuildingIds !== undefined) {
      await this.assertBuildingAccess(invoice.roomId, allowedBuildingIds);
    }

    // Nếu là UTILITY, trả thêm breakdown tính tiền
    let breakdown: any = null;
    if (invoice.type === 'UTILITY') {
      const [elec, water] = await Promise.all([
        this.settings.calculateElectricityCost(Number(invoice.electricityUsage)),
        this.settings.calculateWaterCost(Number(invoice.waterUsage), invoice.occupantsCount),
      ]);
      breakdown = { electricity: elec, water };
    }

    return { ...invoice, breakdown };
  }

  // ========================================
  // STUDENT: Lấy hóa đơn phòng mình
  // ========================================
  async findForStudent(studentId: number, query: QueryInvoiceDto) {
    const allContracts = await this.prisma.contract.findMany({
      where: { studentId },
      select: { id: true, roomId: true },
    });

    const roomIds = [...new Set(allContracts.map((c) => c.roomId))];
    const contractIds = allContracts.map((c) => c.id);

    const where: any = {
      OR: [
        { roomId: { in: roomIds }, type: 'UTILITY' },
        { contractId: { in: contractIds }, type: 'ROOM_FEE' },
      ],
    };

    if (query.status) where.status = query.status;
    if (query.type) {
      delete where.OR;
      if (query.type === 'UTILITY') where.roomId = { in: roomIds };
      else where.contractId = { in: contractIds };
      where.type = query.type;
    }

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where, skip, take: limit,
        orderBy: { billingMonth: 'desc' },
        include: this.defaultInclude(),
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ========================================
  // CRON: Đánh dấu OVERDUE
  // ========================================
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async markOverdue() {
    const result = await this.prisma.invoice.updateMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: new Date() },
      },
      data: { status: 'OVERDUE' },
    });
    return { marked: result.count };
  }

  // ========================================
  // STATS (Admin/Staff)
  // ========================================
  async getStats(billingMonth: string, allowedBuildingIds?: number[]) {
    const month = this.normalizeMonth(billingMonth);
    const roomScope: any = {};
    if (allowedBuildingIds !== undefined) roomScope.buildingId = { in: allowedBuildingIds };

    const where: any = { billingMonth: month, type: 'UTILITY' };
    if (allowedBuildingIds !== undefined) where.room = roomScope;

    const [pending, paid, overdue, cancelled] = await Promise.all([
      this.prisma.invoice.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.invoice.count({ where: { ...where, status: 'PAID' } }),
      this.prisma.invoice.count({ where: { ...where, status: 'OVERDUE' } }),
      this.prisma.invoice.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);

    const agg = await this.prisma.invoice.aggregate({
      where: { ...where, status: { in: ['PENDING', 'PAID', 'OVERDUE'] } },
      _sum: { totalAmount: true, electricityFee: true, waterFee: true },
    });

    return {
      month: month.toISOString(),
      counts: { pending, paid, overdue, cancelled, total: pending + paid + overdue + cancelled },
      amounts: {
        total: Number(agg._sum.totalAmount || 0),
        electricity: Number(agg._sum.electricityFee || 0),
        water: Number(agg._sum.waterFee || 0),
      },
    };
  }

  // ========================================
  // HELPERS
  // ========================================
  private normalizeMonth(dateStr: string): Date {
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Tháng không hợp lệ');
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1));
  }

  private generateCode(prefix: string, month: Date, roomCode: string): string {
    const y = month.getUTCFullYear();
    const m = String(month.getUTCMonth() + 1).padStart(2, '0');
    return `${prefix}-${y}${m}-${roomCode}`;
  }

  private defaultInclude() {
    return {
      room: {
        include: { building: { select: { id: true, code: true, name: true } } },
      },
      contract: {
        select: { id: true, code: true, studentId: true },
      },
      approvedBy: { select: { id: true, fullName: true } },
    } satisfies Prisma.InvoiceInclude;
  }

  private async findOneOrFail(id: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: this.defaultInclude(),
    });
    if (!invoice) throw new NotFoundException('Không tìm thấy hóa đơn');
    return invoice;
  }

  async findOneStudent(id: number, studentId: number) {
    const invoice = await this.findOneOrFail(id);
    await this.assertStudentBelongsToInvoice(invoice, studentId);

    let breakdown: any = null;
    if (invoice.type === 'UTILITY') {
      const [elec, water] = await Promise.all([
        this.settings.calculateElectricityCost(Number(invoice.electricityUsage)),
        this.settings.calculateWaterCost(Number(invoice.waterUsage), invoice.occupantsCount),
      ]);
      breakdown = { electricity: elec, water };
    }
    return { ...invoice, breakdown };
  }

  private async assertStudentBelongsToInvoice(invoice: any, studentId: number) {
    if (invoice.type === 'ROOM_FEE') {
      // ROOM_FEE: chỉ đúng SV trong contract đó mới xem được
      if (invoice.contract?.studentId !== studentId) {
        throw new ForbiddenException('Bạn không có quyền xem hóa đơn này');
      }
    } else {
      // UTILITY: SV phải có contract ACTIVE (hoặc đã từng ở) trong phòng đó
      const contract = await this.prisma.contract.findFirst({
        where: { roomId: invoice.roomId, studentId },
      });
      if (!contract) throw new ForbiddenException('Bạn không có quyền xem hóa đơn này');
    }
  }

  private async assertRoomLeader(roomId: number, studentId: number) {
    const contract = await this.prisma.contract.findFirst({
      where: { roomId, studentId, status: { in: ['ACTIVE', 'EXPIRED'] }, isRoomLeader: true },
    });
    if (!contract) throw new ForbiddenException('Chỉ trưởng phòng mới thực hiện được thao tác này');
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