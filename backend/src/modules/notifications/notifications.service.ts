import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueryNotificationDto } from './dto/notification.dto';

export interface CreateNotificationData {
  userId: number;
  title: string;
  content?: string;
  type?: string;
  referenceType?: string;
  referenceId?: number;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateNotificationData) {
    return this.prisma.notification.create({ data });
  }

  async createMany(userIds: number[], data: Omit<CreateNotificationData, 'userId'>) {
    if (userIds.length === 0) return;
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ ...data, userId })),
    });
  }

  // Tìm tất cả userId cần thông báo cho một tòa (admin + staff phụ trách tòa)
  async getAdminAndBuildingStaffIds(buildingId: number): Promise<number[]> {
    const [admins, buildingStaff] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      }),
      this.prisma.userBuilding.findMany({
        where: { buildingId },
        select: { userId: true },
      }),
    ]);
    const ids = new Set<number>([
      ...admins.map((u) => u.id),
      ...buildingStaff.map((ub) => ub.userId),
    ]);
    return Array.from(ids);
  }

  // Gửi notification đến sinh viên (lookup userId từ studentId)
  async notifyStudent(studentId: number, data: Omit<CreateNotificationData, 'userId'>) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true },
    });
    if (!student) return;
    await this.create({ ...data, userId: student.userId });
  }

  // Gửi notification đến trưởng phòng hiện tại của một phòng
  async notifyRoomLeader(roomId: number, data: Omit<CreateNotificationData, 'userId'>) {
    const leaderContract = await this.prisma.contract.findFirst({
      where: { roomId, status: 'ACTIVE', isRoomLeader: true },
      select: { studentId: true },
    });
    if (!leaderContract) return;
    await this.notifyStudent(leaderContract.studentId, data);
  }

  async findAll(userId: number, query: QueryNotificationDto) {
    const { page = 1, limit = 20, unreadOnly } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit), unreadCount };
  }

  async getUnreadCount(userId: number) {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }

  async markRead(id: number, userId: number) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Không tìm thấy thông báo');
    if (notif.userId !== userId) throw new ForbiddenException();

    if (notif.isRead) return notif;
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  async deleteOne(id: number, userId: number) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Không tìm thấy thông báo');
    if (notif.userId !== userId) throw new ForbiddenException();
    await this.prisma.notification.delete({ where: { id } });
    return { success: true };
  }
}
