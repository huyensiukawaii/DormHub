import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateRoomTransferDto,
  QueryRoomTransferDto,
  ReviewRoomTransferDto,
} from './dto/room-transfer.dto';

@Injectable()
export class RoomTransfersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // =============================================
  // STUDENT: Tạo yêu cầu chuyển phòng
  // =============================================
  async create(dto: CreateRoomTransferDto, studentId: number) {
    // 1. Kiểm tra hợp đồng đang hoạt động
    const contract = await this.prisma.contract.findFirst({
      where: { studentId, status: 'ACTIVE' },
      include: { room: true, student: true },
    });
    if (!contract) {
      throw new BadRequestException('Bạn không có hợp đồng đang hoạt động');
    }

    // 2. Không được trùng phòng hiện tại
    if (dto.toRoomId === contract.roomId) {
      throw new BadRequestException('Phòng đích trùng với phòng hiện tại của bạn');
    }

    // 3. Không được có yêu cầu PENDING khác
    const existing = await this.prisma.roomTransferRequest.findFirst({
      where: { studentId, status: 'PENDING' },
    });
    if (existing) {
      throw new BadRequestException('Bạn đang có yêu cầu chuyển phòng chờ duyệt (mã: ' + existing.code + ')');
    }

    // 4. Kiểm tra phòng đích
    const toRoom = await this.prisma.room.findUnique({
      where: { id: dto.toRoomId },
      include: {
        building: true,
        contracts: { where: { status: 'ACTIVE' } },
      },
    });
    if (!toRoom) throw new NotFoundException('Phòng không tồn tại');
    if (toRoom.status !== 'ACTIVE') {
      throw new BadRequestException('Phòng đích không trong trạng thái hoạt động');
    }
    if (toRoom.gender !== contract.student.gender) {
      throw new BadRequestException('Phòng đích không phù hợp với giới tính của bạn');
    }
    if (toRoom.contracts.length >= toRoom.capacity) {
      throw new BadRequestException('Phòng đích đã đầy, không còn chỗ trống');
    }

    // 5. Tạo yêu cầu với code tạm, sau đó cập nhật dựa trên ID để tránh race condition
    const tempCode = `CHPG-TEMP-${Date.now()}`;
    const created = await this.prisma.roomTransferRequest.create({
      data: {
        code: tempCode,
        studentId,
        fromRoomId: contract.roomId,
        toRoomId: dto.toRoomId,
        reason: dto.reason,
      },
    });

    // 6. Cập nhật code chính thức dựa trên ID (unique, không phụ thuộc count)
    const pad = String(created.id).padStart(4, '0');
    const today = new Date();
    const dateStr =
      String(today.getFullYear()) +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');
    const code = `CHPG-${dateStr}-${pad}`;
    const request = await this.prisma.roomTransferRequest.update({
      where: { id: created.id },
      data: { code },
    });

    // 7. Thông báo xác nhận cho chính SV, kèm so sánh giá
    const oldRent = Number(contract.monthlyRent);
    const newRent = Number(toRoom.pricePerMonth);
    const diffPerMonth = newRent - oldRent;

    let priceNote: string;
    if (diffPerMonth === 0) {
      priceNote = `Phòng ${toRoom.code} có giá tương đương phòng hiện tại (${oldRent.toLocaleString('vi-VN')}đ/tháng).`;
    } else {
      const endDate = new Date(contract.endDate);
      const now = new Date();
      const remainingMonths = Math.max(
        0,
        (endDate.getFullYear() - now.getFullYear()) * 12 +
          (endDate.getMonth() - now.getMonth()),
      );
      const totalDiff = Math.abs(diffPerMonth) * remainingMonths;
      if (diffPerMonth > 0) {
        priceNote = `Phòng ${toRoom.code} có giá ${newRent.toLocaleString('vi-VN')}đ/tháng, cao hơn ${diffPerMonth.toLocaleString('vi-VN')}đ/tháng so với phòng hiện tại. Nếu được duyệt, bạn sẽ cần nộp thêm ${totalDiff.toLocaleString('vi-VN')}đ cho ${remainingMonths} tháng còn lại của hợp đồng.`;
      } else {
        priceNote = `Phòng ${toRoom.code} có giá ${newRent.toLocaleString('vi-VN')}đ/tháng, thấp hơn ${Math.abs(diffPerMonth).toLocaleString('vi-VN')}đ/tháng so với phòng hiện tại. Chênh lệch sẽ không được hoàn lại.`;
      }
    }

    await this.notifications.notifyStudent(studentId, {
      title: 'Yêu cầu chuyển phòng đã được ghi nhận',
      content: `Yêu cầu ${request.code} đang chờ ban quản lý xét duyệt. ${priceNote}`,
      type: 'SYSTEM',
      referenceType: 'RoomTransfer',
      referenceId: request.id,
    });

    // 8. Thông báo cho admin/staff quản lý tòa của phòng đích
    const staffIds = await this.notifications.getAdminAndBuildingStaffIds(toRoom.buildingId);
    if (staffIds.length > 0) {
      await this.notifications.createMany(staffIds, {
        title: 'Yêu cầu chuyển phòng mới',
        content: `SV ${contract.student.fullName} yêu cầu chuyển sang phòng ${toRoom.code} (${toRoom.building.name})`,
        type: 'SYSTEM',
        referenceType: 'RoomTransfer',
        referenceId: request.id,
      });
    }

    return request;
  }

  // =============================================
  // STUDENT: Hủy yêu cầu đang chờ
  // =============================================
  async cancel(id: number, studentId: number) {
    const request = await this.prisma.roomTransferRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu');
    if (request.studentId !== studentId) throw new ForbiddenException();
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Chỉ có thể hủy yêu cầu đang chờ duyệt');
    }
    return this.prisma.roomTransferRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // =============================================
  // STUDENT: Xem lịch sử yêu cầu của bản thân
  // =============================================
  async findByStudent(studentId: number, query: QueryRoomTransferDto) {
    const { page = 1, limit = 20, status } = query;
    const where: any = { studentId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.roomTransferRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          fromRoom: { include: { building: true } },
          toRoom: { include: { building: true } },
          reviewedBy: { select: { fullName: true } },
        },
      }),
      this.prisma.roomTransferRequest.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // =============================================
  // ADMIN/STAFF: Danh sách tất cả yêu cầu
  // =============================================
  async findAll(query: QueryRoomTransferDto, allowedBuildingIds?: number[]) {
    const { page = 1, limit = 20, status, search, buildingId } = query;

    const where: any = {};
    if (status) where.status = status;
    if (allowedBuildingIds) {
      where.toRoom = { buildingId: { in: allowedBuildingIds } };
    }
    if (buildingId) {
      if (allowedBuildingIds && !allowedBuildingIds.includes(buildingId)) {
        throw new ForbiddenException('Không có quyền lọc theo tòa này');
      }
      where.toRoom = { ...(where.toRoom ?? {}), buildingId };
    }
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { student: { fullName: { contains: search, mode: 'insensitive' } } },
        { student: { studentCode: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.roomTransferRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { fullName: true, studentCode: true, gender: true } },
          fromRoom: { include: { building: { select: { id: true, code: true, name: true } } } },
          toRoom: { include: { building: { select: { id: true, code: true, name: true } } } },
          reviewedBy: { select: { fullName: true } },
        },
      }),
      this.prisma.roomTransferRequest.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // =============================================
  // ADMIN/STAFF: Chi tiết một yêu cầu
  // =============================================
  async findOne(id: number, allowedBuildingIds?: number[]) {
    const request = await this.prisma.roomTransferRequest.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            fullName: true,
            studentCode: true,
            gender: true,
            phone: true,
            faculty: true,
            className: true,
          },
        },
        fromRoom: {
          include: {
            building: true,
            contracts: { where: { status: 'ACTIVE' }, select: { id: true } },
          },
        },
        toRoom: {
          include: {
            building: true,
            contracts: { where: { status: 'ACTIVE' }, select: { id: true } },
          },
        },
        reviewedBy: { select: { fullName: true } },
      },
    });
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu');
    if (
      allowedBuildingIds &&
      !allowedBuildingIds.includes(request.toRoom.buildingId)
    ) {
      throw new ForbiddenException('Không có quyền xem yêu cầu này');
    }
    return request;
  }

  // =============================================
  // ADMIN/STAFF: Duyệt hoặc từ chối
  // =============================================
  async review(id: number, dto: ReviewRoomTransferDto, reviewerId: number, allowedBuildingIds?: number[]) {
    const request = await this.prisma.roomTransferRequest.findUnique({
      where: { id },
      include: {
        toRoom: {
          select: {
            code: true,
            buildingId: true,
            capacity: true,
            pricePerMonth: true,
            contracts: { where: { status: 'ACTIVE' }, select: { id: true } },
          },
        },
        fromRoom: { select: { buildingId: true } },
        student: { select: { fullName: true } },
      },
    });
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu');
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Yêu cầu không ở trạng thái chờ duyệt');
    }
    if (
      allowedBuildingIds &&
      !allowedBuildingIds.includes(request.toRoom.buildingId)
    ) {
      throw new ForbiddenException('Không có quyền xử lý yêu cầu này');
    }

    if (dto.action === 'APPROVED') {
      // Kiểm tra lại sức chứa tại thời điểm duyệt
      if (request.toRoom.contracts.length >= request.toRoom.capacity) {
        throw new BadRequestException('Phòng đích đã đầy, không thể duyệt yêu cầu này');
      }

      // Lấy hợp đồng hiện tại để biết isRoomLeader + tính chênh lệch tiền
      const activeContract = await this.prisma.contract.findFirst({
        where: { studentId: request.studentId, status: 'ACTIVE' },
        select: { id: true, isRoomLeader: true, monthlyRent: true, endDate: true },
      });

      if (!activeContract) {
        throw new BadRequestException('Sinh viên không còn hợp đồng ACTIVE để thực hiện chuyển phòng');
      }

      await this.prisma.$transaction([
        // Cập nhật trạng thái yêu cầu
        this.prisma.roomTransferRequest.update({
          where: { id },
          data: { status: 'APPROVED', reviewedById: reviewerId, reviewedAt: new Date() },
        }),
        // Cập nhật hợp đồng: phòng mới + bỏ trưởng phòng
        // monthlyRent giữ nguyên theo giá lúc ký (invoice ROOM_FEE đã PAID theo giá đó)
        this.prisma.contract.updateMany({
          where: { studentId: request.studentId, status: 'ACTIVE' },
          data: { roomId: request.toRoomId, isRoomLeader: false },
        }),
      ]);

      // Nếu SV vừa chuyển là trưởng phòng cũ → tự động bầu trưởng mới cho phòng cũ
      if (activeContract.isRoomLeader) {
        const candidate = await this.prisma.contract.findFirst({
          where: {
            roomId: request.fromRoomId,
            status: 'ACTIVE',
            id: { not: activeContract.id },
          },
          orderBy: { startDate: 'asc' },
        });
        if (candidate) {
          await this.prisma.contract.update({
            where: { id: candidate.id },
            data: { isRoomLeader: true },
          });
        }
      }

      // Tính chênh lệch tiền phòng cho phần còn lại của hợp đồng
      let paymentNote = '';
      if (activeContract.monthlyRent && activeContract.endDate) {
        const now = new Date();
        const endDate = new Date(activeContract.endDate);
        const remainingMonths = Math.max(
          0,
          (endDate.getFullYear() - now.getFullYear()) * 12 +
            (endDate.getMonth() - now.getMonth()),
        );
        const oldRent = Number(activeContract.monthlyRent);
        const newRent = Number(request.toRoom.pricePerMonth);
        const diffPerMonth = newRent - oldRent;

        if (remainingMonths > 0 && diffPerMonth !== 0) {
          const totalDiff = Math.abs(diffPerMonth) * remainingMonths;
          const formatted = totalDiff.toLocaleString('vi-VN') + 'đ';
          if (diffPerMonth > 0) {
            paymentNote = ` Phòng mới có giá cao hơn ${Math.abs(diffPerMonth).toLocaleString('vi-VN')}đ/tháng, bạn cần nộp thêm ${formatted} cho ${remainingMonths} tháng còn lại. Vui lòng đến phòng quản lý ký túc xá để thanh toán.`;
          }
        }
      }

      await this.notifications.notifyStudent(request.studentId, {
        title: 'Yêu cầu chuyển phòng được chấp thuận',
        content: `Yêu cầu chuyển sang phòng ${request.toRoom.code} đã được duyệt.${paymentNote} Mang theo thẻ sinh viên khi đến làm thủ tục nhận phòng mới.`,
        type: 'SYSTEM',
        referenceType: 'RoomTransfer',
        referenceId: id,
      });
    } else {
      if (!dto.rejectionReason?.trim()) {
        throw new BadRequestException('Vui lòng cung cấp lý do từ chối');
      }
      await this.prisma.roomTransferRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: dto.rejectionReason,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });

      await this.notifications.notifyStudent(request.studentId, {
        title: 'Yêu cầu chuyển phòng bị từ chối',
        content: `Yêu cầu chuyển sang phòng ${request.toRoom.code} bị từ chối: ${dto.rejectionReason}`,
        type: 'SYSTEM',
        referenceType: 'RoomTransfer',
        referenceId: id,
      });
    }

    return { success: true };
  }

  // =============================================
  // ADMIN/STAFF: Thống kê nhanh
  // =============================================
  async getStats(allowedBuildingIds?: number[]) {
    const buildingFilter = allowedBuildingIds
      ? { toRoom: { buildingId: { in: allowedBuildingIds } } }
      : {};

    const [pending, approved, rejected, cancelled] = await Promise.all([
      this.prisma.roomTransferRequest.count({ where: { status: 'PENDING', ...buildingFilter } }),
      this.prisma.roomTransferRequest.count({ where: { status: 'APPROVED', ...buildingFilter } }),
      this.prisma.roomTransferRequest.count({ where: { status: 'REJECTED', ...buildingFilter } }),
      this.prisma.roomTransferRequest.count({ where: { status: 'CANCELLED', ...buildingFilter } }),
    ]);

    return { pending, approved, rejected, cancelled, total: pending + approved + rejected + cancelled };
  }
}
