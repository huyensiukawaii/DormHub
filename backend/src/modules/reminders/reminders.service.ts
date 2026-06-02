import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { Prisma } from '@prisma/client';
type Decimal = Prisma.Decimal;

const formatDate = (d: Date) =>
  d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatMoney = (amount: Decimal | number | string) =>
  Number(amount).toLocaleString('vi-VN') + '₫';

// Trả về Date tại 00:00:00.000 (local) + N ngày
const startOfDayPlusDays = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
};

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    private mailer: MailerService,
    private config: ConfigService,
  ) {}

  // Chạy 8:00 AM thứ Hai hàng tuần — tránh spam email mỗi ngày cho cùng hoá đơn
  @Cron('0 8 * * 1')
  async sendOverdueInvoiceReminders() {
    this.logger.log('Bắt đầu gửi nhắc nhở hoá đơn quá hạn...');
    const loginUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000') + '/student/invoices';

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: { status: 'OVERDUE' },
      select: {
        id: true,
        code: true,
        type: true,
        totalAmount: true,
        dueDate: true,
        contract: {
          select: {
            student: {
              select: { id: true, fullName: true, email: true, user: { select: { email: true } } },
            },
          },
        },
        room: {
          select: {
            contracts: {
              where: { status: 'ACTIVE', isRoomLeader: true },
              orderBy: { id: 'desc' },
              take: 1,
              select: {
                student: {
                  select: { id: true, fullName: true, email: true, user: { select: { email: true } } },
                },
              },
            },
          },
        },
      },
    });

    // Gom nhóm theo sinh viên
    const studentMap = new Map<number, {
      email: string;
      name: string;
      invoices: { code: string; type: string; totalAmount: Decimal | number; dueDate: Date | null }[];
    }>();

    for (const inv of overdueInvoices) {
      const student =
        inv.type === 'ROOM_FEE'
          ? inv.contract?.student
          : inv.room?.contracts[0]?.student;

      if (!student) continue;

      const email = student.email || student.user?.email;
      if (!email) continue;

      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, { email, name: student.fullName, invoices: [] });
      }
      studentMap.get(student.id)!.invoices.push({
        code: inv.code,
        type: inv.type,
        totalAmount: inv.totalAmount,
        dueDate: inv.dueDate,
      });
    }

    let sent = 0;
    for (const { email, name, invoices } of studentMap.values()) {
      const total = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
      try {
        await this.mailer.sendOverdueInvoiceReminderEmail({
          to: email,
          studentName: name,
          invoiceCount: invoices.length,
          totalAmount: formatMoney(total),
          invoices: invoices.map((inv) => ({
            code: inv.code,
            type: inv.type === 'ROOM_FEE' ? 'Tiền phòng' : 'Điện nước',
            amount: formatMoney(inv.totalAmount),
          })),
          loginUrl,
        });
        sent++;
      } catch (err: any) {
        this.logger.error(`Lỗi gửi mail nhắc hoá đơn cho ${email}: ${err?.message}`);
      }
    }

    this.logger.log(`Nhắc hoá đơn quá hạn: ${sent}/${studentMap.size} email thành công`);
  }

  // Chạy 8:30 AM mỗi ngày — normalize về 00:00 để tránh lệch giờ với @db.Date
  @Cron('30 8 * * *')
  async sendContractExpiryReminders() {
    this.logger.log('Bắt đầu gửi nhắc nhở hợp đồng sắp hết hạn...');
    const loginUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000') + '/student/contracts';

    // target = đúng 30 ngày kể từ 00:00 hôm nay
    const today = new Date();
    const targetDay = startOfDayPlusDays(today, 30);
    const nextDay = startOfDayPlusDays(today, 31);

    const contracts = await this.prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: targetDay, lt: nextDay },
      },
      select: {
        endDate: true,
        student: {
          select: { fullName: true, email: true, user: { select: { email: true } } },
        },
        room: {
          select: { code: true, building: { select: { name: true } } },
        },
      },
    });

    let sent = 0;
    for (const contract of contracts) {
      const email = contract.student.email || contract.student.user?.email;
      if (!email) continue;

      const daysLeft = Math.ceil(
        (contract.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      try {
        await this.mailer.sendContractExpiryReminderEmail({
          to: email,
          studentName: contract.student.fullName,
          roomCode: contract.room.code,
          buildingName: contract.room.building.name,
          expiryDate: formatDate(contract.endDate),
          daysLeft,
          loginUrl,
        });
        sent++;
      } catch (err: any) {
        this.logger.error(`Lỗi gửi mail nhắc hợp đồng cho ${email}: ${err?.message}`);
      }
    }

    this.logger.log(`Nhắc hợp đồng sắp hết hạn: ${sent}/${contracts.length} email thành công`);
  }
}
