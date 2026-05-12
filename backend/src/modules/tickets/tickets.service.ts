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
import { NotificationsService } from '../notifications/notifications.service';

const MAX_OPEN_TICKETS = 3;

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ========================================
  // STUDENT: Tạo ticket
  // ========================================
  async create(dto: CreateTicketDto, studentId: number) {
    const contract = await this.prisma.contract.findFirst({
      where: { studentId, status: 'ACTIVE' },
      select: { roomId: true },
    });
    if (!contract) throw new BadRequestException('Bạn chưa có hợp đồng đang hoạt động');

    const openCount = await this.prisma.maintenanceTicket.count({
      where: { reportedById: studentId, status: { in: ['NEW', 'IN_PROGRESS'] } },
    });
    if (openCount >= MAX_OPEN_TICKETS) {
      throw new BadRequestException(`Bạn đang có ${openCount} sự cố chưa xử lý. Tối đa ${MAX_OPEN_TICKETS} yêu cầu cùng lúc`);
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId }, select: { fullName: true },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.maintenanceTicket.create({
        data: {
          code: `PENDING-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          roomId: contract.roomId,
          reportedById: studentId,
          category: dto.category,
          title: dto.title,
          description: dto.description,
          images: dto.images ?? [],
          status: 'NEW',
        },
      });
      const year = ticket.createdAt.getFullYear();
      const code = `TK-${year}-${String(ticket.id).padStart(4, '0')}`;
      const updated = await tx.maintenanceTicket.update({
        where: { id: ticket.id },
        data: { code },
        include: this.defaultInclude(),
      });
      await tx.ticketLog.create({
        data: { ticketId: ticket.id, action: 'CREATED', to: 'NEW', actorName: student?.fullName ?? 'Sinh viên' },
      });
      return updated;
    });

    this.notifyAdminsNewTicket(created.id, contract.roomId, student?.fullName ?? 'Sinh viên', created.title).catch(() => {});
    return created;
  }

  // ========================================
  // STUDENT: Hủy ticket (chỉ khi status = NEW)
  // ========================================
  async cancel(id: number, studentId: number) {
    const ticket = await this.findOneOrFail(id);

    if (ticket.reportedById !== studentId) {
      throw new ForbiddenException('Bạn không có quyền hủy ticket này');
    }
    if (ticket.status !== 'NEW') {
      throw new BadRequestException('Chỉ có thể hủy yêu cầu khi trạng thái còn Mới');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId }, select: { fullName: true },
    });

    const [updated] = await this.prisma.$transaction([
      this.prisma.maintenanceTicket.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: this.defaultInclude(),
      }),
      this.prisma.ticketLog.create({
        data: { ticketId: id, action: 'CANCELLED', from: 'NEW', to: 'CANCELLED', actorName: student?.fullName ?? 'Sinh viên' },
      }),
    ]);
    return updated;
  }

  // ========================================
  // STAFF/ADMIN: Cập nhật ticket
  // ========================================
  async update(id: number, dto: UpdateTicketDto, handledById: number, allowedBuildingIds?: number[]) {
    const ticket = await this.findOneOrFail(id);

    if (allowedBuildingIds !== undefined) {
      await this.assertBuildingAccess(ticket.roomId, allowedBuildingIds);
    }
    if (ticket.status === 'COMPLETED' || ticket.status === 'REJECTED' || ticket.status === 'CANCELLED') {
      throw new BadRequestException('Không thể cập nhật ticket đã kết thúc');
    }

    const user = await this.prisma.user.findUnique({ where: { id: handledById }, select: { fullName: true } });
    const actorName = user?.fullName ?? 'Ban quản lý';

    const data: any = {};
    const logs: Prisma.TicketLogCreateManyInput[] = [];

    if (dto.priority !== undefined && dto.priority !== ticket.priority) {
      data.priority = dto.priority ?? null;
      logs.push({ ticketId: id, action: 'PRIORITY_SET', from: ticket.priority ?? undefined, to: dto.priority ?? undefined, actorName });
    }
    if (dto.resolutionNote !== undefined && dto.resolutionNote !== ticket.resolutionNote) {
      data.resolutionNote = dto.resolutionNote;
      logs.push({ ticketId: id, action: 'NOTE_UPDATED', actorName });
    }
    if (dto.status && dto.status !== ticket.status) {
      data.status = dto.status;
      logs.push({ ticketId: id, action: 'STATUS_CHANGED', from: ticket.status, to: dto.status, actorName });

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

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.maintenanceTicket.update({
        where: { id }, data, include: this.defaultInclude(),
      });
      if (logs.length > 0) await tx.ticketLog.createMany({ data: logs });
      return result;
    });

    if (dto.status && dto.status !== ticket.status) {
      this.notifyStudentStatusChanged(ticket.reportedById, id, dto.status).catch(() => {});
    }
    return updated;
  }

  // ========================================
  // STAFF/ADMIN: Reject ticket
  // ========================================
  async reject(id: number, dto: RejectTicketDto, handledById: number, allowedBuildingIds?: number[]) {
    const ticket = await this.findOneOrFail(id);

    if (allowedBuildingIds !== undefined) {
      await this.assertBuildingAccess(ticket.roomId, allowedBuildingIds);
    }
    if (ticket.status === 'COMPLETED' || ticket.status === 'REJECTED' || ticket.status === 'CANCELLED') {
      throw new BadRequestException('Không thể từ chối ticket đã kết thúc');
    }

    const user = await this.prisma.user.findUnique({ where: { id: handledById }, select: { fullName: true } });

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.maintenanceTicket.update({
        where: { id },
        data: { status: 'REJECTED', rejectionReason: dto.rejectionReason, handledById, handledAt: new Date() },
        include: this.defaultInclude(),
      });
      await tx.ticketLog.create({
        data: { ticketId: id, action: 'STATUS_CHANGED', from: ticket.status, to: 'REJECTED', actorName: user?.fullName ?? 'Ban quản lý' },
      });
      return result;
    });

    this.notifyStudentStatusChanged(ticket.reportedById, id, 'REJECTED').catch(() => {});
    return updated;
  }

  // ========================================
  // STUDENT: Đánh giá sau hoàn thành (7 ngày)
  // ========================================
  async rate(id: number, dto: RateTicketDto, studentId: number) {
    const ticket = await this.findOneOrFail(id);

    if (ticket.reportedById !== studentId) throw new ForbiddenException('Chỉ người tạo ticket mới đánh giá được');
    if (ticket.status !== 'COMPLETED') throw new BadRequestException('Chỉ đánh giá được ticket đã hoàn thành');
    if (ticket.rating !== null) throw new BadRequestException('Bạn đã đánh giá ticket này rồi');

    if (ticket.completedAt) {
      const daysSince = (Date.now() - new Date(ticket.completedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 7) throw new BadRequestException('Đã quá 7 ngày kể từ khi hoàn thành, không thể đánh giá');
    }

    return this.prisma.maintenanceTicket.update({
      where: { id },
      data: { rating: dto.rating, ratingComment: dto.ratingComment, ratedAt: new Date() },
      include: this.defaultInclude(),
    });
  }

  // ========================================
  // FIND ALL (Admin/Staff)
  // ========================================
  async findAll(query: QueryTicketDto, allowedBuildingIds?: number[]) {
    const { page = 1, limit = 20, roomId, buildingId, status, category, priority, search, sortOrder = 'desc', activeOnly } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (roomId) where.roomId = roomId;
    if (activeOnly) where.status = { in: ['NEW', 'IN_PROGRESS'] };
    else if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { room: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }

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
  // FIND ONE (Admin/Staff)
  // ========================================
  async findOne(id: number, allowedBuildingIds?: number[]) {
    const ticket = await this.findOneOrFail(id, true);
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
    const ticket = await this.findOneOrFail(id, true);
    if (ticket.reportedById !== studentId) throw new ForbiddenException('Bạn không có quyền xem ticket này');
    return ticket;
  }

  // ========================================
  // STUDENT: Stats + open slots
  // ========================================
  async getStudentStats(studentId: number) {
    const counts = await this.prisma.maintenanceTicket.groupBy({
      by: ['status'],
      where: { reportedById: studentId },
      _count: true,
    });

    const map = Object.fromEntries(counts.map((c) => [c.status, c._count]));
    const openCount = (map['NEW'] ?? 0) + (map['IN_PROGRESS'] ?? 0);

    return {
      counts: {
        new: map['NEW'] ?? 0,
        inProgress: map['IN_PROGRESS'] ?? 0,
        completed: map['COMPLETED'] ?? 0,
        rejected: map['REJECTED'] ?? 0,
        cancelled: map['CANCELLED'] ?? 0,
      },
      openCount,
      openSlots: Math.max(0, MAX_OPEN_TICKETS - openCount),
    };
  }

  // ========================================
  // STATS (Admin/Staff)
  // ========================================
  async getStats(allowedBuildingIds?: number[]) {
    const roomScope: any = {};
    if (allowedBuildingIds !== undefined) {
      roomScope.room = { buildingId: { in: allowedBuildingIds } };
    }

    const [newCount, inProgress, completed, rejected, cancelled, newUnhandled] = await Promise.all([
      this.prisma.maintenanceTicket.count({ where: { ...roomScope, status: 'NEW' } }),
      this.prisma.maintenanceTicket.count({ where: { ...roomScope, status: 'IN_PROGRESS' } }),
      this.prisma.maintenanceTicket.count({ where: { ...roomScope, status: 'COMPLETED' } }),
      this.prisma.maintenanceTicket.count({ where: { ...roomScope, status: 'REJECTED' } }),
      this.prisma.maintenanceTicket.count({ where: { ...roomScope, status: 'CANCELLED' } }),
      this.prisma.maintenanceTicket.count({ where: { ...roomScope, status: 'NEW', handledById: null } }),
    ]);

    const ratingAgg = await this.prisma.maintenanceTicket.aggregate({
      where: { ...roomScope, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const urgentPending = await this.prisma.maintenanceTicket.count({
      where: { ...roomScope, priority: 'URGENT', status: { in: ['NEW', 'IN_PROGRESS'] } },
    });

    return {
      counts: { new: newCount, inProgress, completed, rejected, cancelled, total: newCount + inProgress + completed + rejected + cancelled },
      newUnhandled,
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
  private defaultInclude() {
    return {
      room: { include: { building: { select: { id: true, code: true, name: true } } } },
      reportedBy: { select: { id: true, fullName: true, studentCode: true } },
      handledBy: { select: { id: true, fullName: true } },
    } satisfies Prisma.MaintenanceTicketInclude;
  }

  private detailInclude() {
    return {
      room: { include: { building: { select: { id: true, code: true, name: true } } } },
      reportedBy: { select: { id: true, fullName: true, studentCode: true } },
      handledBy: { select: { id: true, fullName: true } },
      logs: { orderBy: { createdAt: 'asc' as const } },
    } satisfies Prisma.MaintenanceTicketInclude;
  }

  private async findOneOrFail(id: number, withLogs = false) {
    const ticket = await this.prisma.maintenanceTicket.findUnique({
      where: { id },
      include: withLogs ? this.detailInclude() : this.defaultInclude(),
    });
    if (!ticket) throw new NotFoundException('Không tìm thấy ticket');
    return ticket;
  }

  private async assertBuildingAccess(roomId: number, allowedBuildingIds: number[]) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, select: { buildingId: true } });
    if (!room || !allowedBuildingIds.includes(room.buildingId)) {
      throw new ForbiddenException('Bạn không có quyền truy cập dữ liệu tòa này');
    }
  }

  // ========================================
  // NOTIFICATION HELPERS (fire-and-forget)
  // ========================================

  private async notifyAdminsNewTicket(ticketId: number, roomId: number, studentName: string, ticketTitle: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, select: { buildingId: true, code: true } });
    if (!room) return;
    const userIds = await this.notifications.getAdminAndBuildingStaffIds(room.buildingId);
    await this.notifications.createMany(userIds, {
      title: 'Yêu cầu sửa chữa mới',
      content: `${studentName} - Phòng ${room.code}: ${ticketTitle}`,
      type: 'TICKET',
      referenceType: 'Ticket',
      referenceId: ticketId,
    });
  }

  private async notifyStudentStatusChanged(studentId: number, ticketId: number, newStatus: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, select: { userId: true } });
    if (!student) return;

    const statusMessages: Record<string, { title: string; content?: string }> = {
      IN_PROGRESS: { title: 'Yêu cầu sửa chữa đang được xử lý' },
      COMPLETED:   { title: 'Sự cố đã được xử lý xong — hãy đánh giá!', content: 'Bạn có 7 ngày để đánh giá chất lượng xử lý. Phản hồi giúp chúng tôi cải thiện dịch vụ.' },
      REJECTED:    { title: 'Yêu cầu sửa chữa bị từ chối' },
    };
    const msg = statusMessages[newStatus];
    if (!msg) return;
    const { title, content } = msg;

    await this.notifications.create({
      userId: student.userId,
      title,
      content,
      type: 'TICKET',
      referenceType: 'Ticket',
      referenceId: ticketId,
    });
  }
}
