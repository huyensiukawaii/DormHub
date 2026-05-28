import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';

const formatDate = (d: Date) =>
  d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatMoney = (amount: any) =>
  Number(amount).toLocaleString('vi-VN') + '₫';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    private mailer: MailerService,
    private config: ConfigService,
  ) {}

  // Chạy 8:00 AM mỗi ngày
  @Cron('0 8 * * *')
  async sendOverdueInvoiceReminders() {
    this.logger.log('Bắt đầu gửi nhắc nhở hoá đơn quá hạn...');
    const loginUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000') + '/student/invoices';

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: { status: 'OVERDUE' },
      include: {
        contract: {
          include: { student: { include: { user: true } } },
        },
        room: {
          include: {
            contracts: {
              where: { status: 'ACTIVE', isRoomLeader: true },
              include: { student: { include: { user: true } } },
              take: 1,
            },
          },
        },
      },
    });

    // Gom nhóm hoá đơn theo sinh viên
    const studentMap = new Map<number, {
      email: string;
      name: string;
      invoices: typeof overdueInvoices;
    }>();

    for (const inv of overdueInvoices) {
      let student: any = null;
      if (inv.type === 'ROOM_FEE' && inv.contract?.student) {
        student = inv.contract.student;
      } else if (inv.type === 'UTILITY' && inv.room?.contracts[0]?.student) {
        student = inv.room.contracts[0].student;
      }

      if (!student) continue;

      const email = student.email || student.user?.email;
      if (!email) continue;

      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, { email, name: student.fullName, invoices: [] });
      }
      studentMap.get(student.id)!.invoices.push(inv);
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
            dueDate: inv.dueDate ? formatDate(inv.dueDate) : 'N/A',
          })),
          loginUrl,
        });
        sent++;
      } catch (err: any) {
        this.logger.error(`Lỗi gửi mail nhắc hoá đơn cho ${email}: ${err?.message}`);
      }
    }

    this.logger.log(`Gửi nhắc nhở hoá đơn quá hạn: ${sent}/${studentMap.size} email thành công`);
  }

  // Chạy 8:30 AM mỗi ngày
  @Cron('30 8 * * *')
  async sendContractExpiryReminders() {
    this.logger.log('Bắt đầu gửi nhắc nhở hợp đồng sắp hết hạn...');
    const loginUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000') + '/student/contracts';

    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);
    const in29Days = new Date(today);
    in29Days.setDate(today.getDate() + 29);

    const contracts = await this.prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: in29Days, lte: in30Days },
      },
      include: {
        student: { include: { user: true } },
        room: { include: { building: { select: { name: true } } } },
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

    this.logger.log(`Gửi nhắc nhở hợp đồng sắp hết hạn: ${sent}/${contracts.length} email thành công`);
  }
}
