import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ChatMessageDto } from './chat.dto';

const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `Bạn là trợ lý ảo của hệ thống quản lý ký túc xá DormHub.
Nhiệm vụ: hỗ trợ sinh viên tra cứu thông tin cá nhân trong hệ thống.
Quy tắc:
- Luôn trả lời bằng tiếng Việt, ngắn gọn và thân thiện.
- Khi sinh viên hỏi về dữ liệu cụ thể (hoá đơn, hợp đồng, ticket...), hãy gọi tool để lấy thông tin thật, không được tự bịa.
- Nếu không có dữ liệu liên quan, hãy nói rõ là không tìm thấy.
- Chỉ trả lời các vấn đề liên quan đến ký túc xá.`;

const TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_my_contracts',
      description: 'Lấy thông tin hợp đồng ký túc xá của sinh viên (phòng, ngày bắt đầu, ngày kết thúc, trạng thái)',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_invoices',
      description: 'Lấy danh sách hoá đơn gần đây của sinh viên (tiền phòng, điện nước, trạng thái thanh toán)',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['PENDING', 'PAID', 'OVERDUE'],
            description: 'Lọc theo trạng thái hoá đơn. Bỏ trống để lấy tất cả.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_tickets',
      description: 'Lấy danh sách yêu cầu sửa chữa/bảo trì của sinh viên',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['NEW', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'],
            description: 'Lọc theo trạng thái yêu cầu sửa chữa.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_active_registration_period',
      description: 'Lấy thông tin đợt đăng ký ký túc xá đang mở',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_applications',
      description: 'Lấy danh sách đơn đăng ký phòng của sinh viên và trạng thái xét duyệt',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

@Injectable()
export class ChatService {
  private groq: Groq;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.groq = new Groq({ apiKey: this.config.get('GROQ_API_KEY')! });
  }

  async chat(messages: ChatMessageDto[], studentId: number): Promise<string> {
    // Cap 20 tin nhắn gần nhất để tránh context overflow
    const recent = messages.slice(-20);

    const history: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...recent.map((m) => ({
        role: m.role === 'model' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      })),
    ];

    let response = await this.groq.chat.completions.create({
      model: MODEL,
      messages: history,
      tools: TOOLS,
      tool_choice: 'auto',
    });

    // Tool use loop
    while (response.choices[0].finish_reason === 'tool_calls') {
      const assistantMsg = response.choices[0].message;
      history.push(assistantMsg);

      const toolResults = await Promise.all(
        (assistantMsg.tool_calls ?? []).map(async (call) => {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* dùng {} */ }
          const result = await this.executeTool(call.function.name, args, studentId);
          return {
            role: 'tool' as const,
            tool_call_id: call.id,
            content: JSON.stringify(result),
          };
        }),
      );

      history.push(...toolResults);

      response = await this.groq.chat.completions.create({
        model: MODEL,
        messages: history,
        tools: TOOLS,
        tool_choice: 'auto',
      });
    }

    return response.choices[0].message.content ?? 'Xin lỗi, tôi không thể trả lời lúc này.';
  }

  private async executeTool(name: string, args: Record<string, unknown>, studentId: number) {
    switch (name) {
      case 'get_my_contracts':
        return this.getMyContracts(studentId);
      case 'get_my_invoices':
        return this.getMyInvoices(studentId, args.status as string | undefined);
      case 'get_my_tickets':
        return this.getMyTickets(studentId, args.status as string | undefined);
      case 'get_active_registration_period':
        return this.getActiveRegistrationPeriod();
      case 'get_my_applications':
        return this.getMyApplications(studentId);
      default:
        return { error: 'Tool không tồn tại' };
    }
  }

  private async getMyContracts(studentId: number) {
    const contracts = await this.prisma.contract.findMany({
      where: { studentId },
      include: {
        room: {
          select: {
            code: true,
            roomType: true,
            floor: true,
            building: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    if (!contracts.length) return { message: 'Sinh viên chưa có hợp đồng nào' };

    return contracts.map((c) => ({
      id: c.id,
      phong: `${c.room.building.name} - ${c.room.code}`,
      loaiPhong: c.room.roomType,
      tang: c.room.floor,
      ngayBatDau: c.startDate,
      ngayKetThuc: c.endDate,
      tienThueHangThang: c.monthlyRent,
      trangThai: c.status,
    }));
  }

  private async getMyInvoices(studentId: number, status?: string) {
    const validStatus = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];
    const safeStatus = status && validStatus.includes(status) ? status : undefined;
    const allContracts = await this.prisma.contract.findMany({
      where: { studentId },
      select: { id: true, roomId: true },
    });

    if (!allContracts.length) return { message: 'Không có hợp đồng nên không có hoá đơn' };

    const roomIds = [...new Set(allContracts.map((c) => c.roomId))];
    const contractIds = allContracts.map((c) => c.id);

    const where: any = {
      OR: [
        { roomId: { in: roomIds }, type: 'UTILITY' },
        { contractId: { in: contractIds }, type: 'ROOM_FEE' },
      ],
    };
    if (safeStatus) where.status = safeStatus;

    const invoices = await this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (!invoices.length) return { message: 'Không tìm thấy hoá đơn' };

    return invoices.map((inv) => ({
      id: inv.id,
      ma: inv.code,
      loai: inv.type,
      tongTien: inv.totalAmount,
      trangThai: inv.status,
      hanThanhToan: inv.dueDate,
      thang: inv.billingMonth,
    }));
  }

  private async getMyTickets(studentId: number, status?: string) {
    const validStatus = ['NEW', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];
    const safeStatus = status && validStatus.includes(status) ? status : undefined;
    const where: any = { reportedById: studentId };
    if (safeStatus) where.status = safeStatus;

    const tickets = await this.prisma.maintenanceTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (!tickets.length) return { message: 'Không có yêu cầu sửa chữa nào' };

    return tickets.map((t) => ({
      id: t.id,
      tieuDe: t.title,
      danhMuc: t.category,
      trangThai: t.status,
      ngayTao: t.createdAt,
    }));
  }

  private async getActiveRegistrationPeriod() {
    const period = await this.prisma.registrationPeriod.findFirst({
      where: { status: 'OPEN' },
      select: {
        name: true,
        startDate: true,
        endDate: true,
        status: true,
        _count: { select: { applications: true } },
      },
    });

    if (!period) return { message: 'Hiện tại không có đợt đăng ký nào đang mở' };
    return period;
  }

  private async getMyApplications(studentId: number) {
    const applications = await this.prisma.registrationApplication.findMany({
      where: { studentId },
      include: {
        period: { select: { name: true } },
        approvedRoom: { select: { code: true, building: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (!applications.length) return { message: 'Sinh viên chưa có đơn đăng ký nào' };

    return applications.map((a) => ({
      id: a.id,
      dotDangKy: a.period.name,
      phongDuocPhan: a.approvedRoom ? `${a.approvedRoom.building.name} - ${a.approvedRoom.code}` : null,
      trangThai: a.status,
      loai: a.type,
      ngayNop: a.createdAt,
    }));
  }
}
