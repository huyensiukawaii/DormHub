import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { assertAllowed } from '@/common/utils/building-access';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CreateContractDto,
  CreateContractFromApplicationDto,
  CheckInDto,
  CheckOutDto,
  TerminateContractDto,
  SetRoomLeaderDto,
  QueryContractDto,
} from './dto';

@Injectable()
export class ContractsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Retry once with a short delay — Neon pooler may close the connection at cold start
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.autoExpireContracts();
        return;
      } catch (err: any) {
        if (attempt === 3 || err?.code !== 'P1017') {
          console.error('[onModuleInit] autoExpireContracts failed:', err?.message ?? err);
          return;
        }
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
  }

  // ========================================
  // GENERATE CONTRACT CODE
  // ========================================
  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `HD-${year}-`;

    const lastContract = await this.prisma.contract.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: 'desc' },
    });

    let nextNumber = 1;
    if (lastContract) {
      const lastNum = parseInt(lastContract.code.replace(prefix, ''), 10);
      if (!isNaN(lastNum)) nextNumber = lastNum + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  }

  // ========================================
  // CREATE CONTRACT (Thủ công - Admin)
  // ========================================
  async create(dto: CreateContractDto, createdById: number) {
    // Validate student
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Không tìm thấy sinh viên');

    // Validate room
    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
      include: { building: true },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng');
    if (room.status !== 'ACTIVE') {
      throw new BadRequestException('Phòng không khả dụng');
    }

    // Check gender match
    if (room.gender !== student.gender) {
      throw new BadRequestException(
        `Phòng ${room.code} dành cho ${room.gender === 'MALE' ? 'nam' : 'nữ'}, không phù hợp với sinh viên`,
      );
    }

    // Check dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }

    // Status tự động: nếu endDate đã qua thì là record lịch sử (EXPIRED), không cần check conflict
    const initialStatus = endDate < new Date() ? 'EXPIRED' : 'ACTIVE';

    if (initialStatus === 'ACTIVE') {
      // Check student doesn't have active contract
      const existingActive = await this.prisma.contract.findFirst({
        where: { studentId: dto.studentId, status: 'ACTIVE' },
      });
      if (existingActive) {
        throw new ConflictException(
          `Sinh viên đang có hợp đồng ACTIVE: ${existingActive.code}`,
        );
      }

      // Check room capacity
      const currentOccupants = await this.prisma.contract.count({
        where: { roomId: dto.roomId, status: 'ACTIVE' },
      });
      if (currentOccupants >= room.capacity) {
        throw new BadRequestException(`Phòng ${room.code} đã đầy (${currentOccupants}/${room.capacity})`);
      }
    }

    const code = await this.generateCode();
    const monthlyRent = dto.monthlyRent ?? Number(room.pricePerMonth);

    const contract = await this.prisma.contract.create({
      data: {
        code,
        studentId: dto.studentId,
        roomId: dto.roomId,
        startDate,
        endDate,
        monthlyRent,
        isRoomLeader: dto.isRoomLeader || false,
        status: initialStatus,
        createdById,
      },
      include: {
        student: { select: { id: true, studentCode: true, fullName: true, gender: true } },
        room: { include: { building: { select: { id: true, code: true, name: true } } } },
      },
    });

    return contract;
  }

  // ========================================
  // CREATE FROM APPLICATION (Khi duyệt đơn)
  // ========================================
  async createFromApplication(dto: CreateContractFromApplicationDto, createdById: number | null) {
    const application = await this.prisma.registrationApplication.findUnique({
      where: { id: dto.applicationId },
      include: {
        student: true,
        period: true,
        contract: true,
      },
    });

    if (!application) throw new NotFoundException('Không tìm thấy đơn đăng ký');
    if (application.status !== 'APPROVED') {
      throw new BadRequestException('Chỉ tạo hợp đồng từ đơn đã được duyệt');
    }
    if (application.contract) {
      throw new ConflictException(`Đơn này đã có hợp đồng: ${application.contract.code}`);
    }

    // Validate room
    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
      include: { _count: { select: { contracts: { where: { status: 'ACTIVE' } } } } },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng');
    if (room.status !== 'ACTIVE') throw new BadRequestException('Phòng không khả dụng');
    if (room.gender !== application.student.gender) {
      throw new BadRequestException(
        `Phòng ${room.code} dành cho ${room.gender === 'MALE' ? 'nam' : 'nữ'}, không phù hợp với sinh viên`,
      );
    }

    // Check student doesn't have active contract
    const existingActive = await this.prisma.contract.findFirst({
      where: { studentId: application.studentId, status: 'ACTIVE' },
    });
    if (existingActive && application.type !== 'RENEWAL') {
      throw new ConflictException(
        `Sinh viên đang có hợp đồng ACTIVE: ${existingActive.code}`,
      );
    }

    // Check room capacity
    // For RENEWAL staying in the same room, skip the check: the old contract will be expired
    // in the same transaction, so one slot frees up. For all other cases enforce capacity.
    const isRenewalSameRoom = application.type === 'RENEWAL' && existingActive?.roomId === dto.roomId;
    if (!isRenewalSameRoom && room._count.contracts >= room.capacity) {
      throw new BadRequestException(`Phòng ${room.code} đã đầy (${room._count.contracts}/${room.capacity})`);
    }

    // Lấy thời gian từ đợt đăng ký
    const startDate = application.period.moveInDate || application.period.startDate;
    const endDate = application.period.moveOutDate || application.period.endDate;

    const code = await this.generateCode();
    const monthlyRent = dto.monthlyRent ?? Number(room.pricePerMonth);

    // Nếu đợt đã qua hạn (ví dụ admin duyệt trễ), tạo contract với status EXPIRED luôn
    const initialStatus = new Date(endDate) < new Date() ? 'EXPIRED' : 'ACTIVE';

    // Wrap RENEWAL expiry + new contract creation in a transaction for atomicity
    const contract = await this.prisma.$transaction(async (tx) => {
      if (existingActive && application.type === 'RENEWAL') {
        await tx.contract.update({
          where: { id: existingActive.id },
          data: { status: 'EXPIRED', checkedOutAt: new Date() },
        });
      }

      return tx.contract.create({
        data: {
          code,
          studentId: application.studentId,
          roomId: dto.roomId,
          applicationId: dto.applicationId,
          startDate,
          endDate,
          monthlyRent,
          isRoomLeader: dto.isRoomLeader || false,
          status: initialStatus,
          createdById,
        },
        include: {
          student: { select: { id: true, studentCode: true, fullName: true, gender: true } },
          room: { include: { building: { select: { id: true, code: true, name: true } } } },
        },
      });
    });

    return contract;
  }

  // ========================================
  // FIND ALL (ADMIN - Paginated)
  // ========================================
  async findAll(query: QueryContractDto, allowedBuildingIds?: number[]) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      roomId,
      buildingId,
      studentId,
      notCheckedIn,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { student: { studentCode: { contains: search, mode: 'insensitive' } } },
        { student: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) where.status = status;
    if (studentId) where.studentId = studentId;
    if (roomId) where.roomId = roomId;

    if (allowedBuildingIds !== undefined) {
      const scope = buildingId
        ? allowedBuildingIds.filter((id) => id === Number(buildingId))
        : allowedBuildingIds;
      where.room = { buildingId: { in: scope } };
    } else if (buildingId) {
      where.room = { buildingId };
    }

    if (notCheckedIn) where.checkedInAt = null;

    const orderBy: any = {};
    const validSortFields = ['code', 'startDate', 'endDate', 'createdAt', 'status'];
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [contracts, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          student: {
            select: {
              id: true,
              studentCode: true,
              fullName: true,
              gender: true,
              faculty: true,
              className: true,
            },
          },
          room: {
            include: {
              building: { select: { id: true, code: true, name: true } },
            },
          },
          application: {
            select: { id: true, type: true },
          },
          createdBy: {
            select: { id: true, fullName: true },
          },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    // Enrich: tính ngày còn lại
    const now = new Date();
    const data = contracts.map((c) => {
      const endDate = new Date(c.endDate);
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { ...c, daysRemaining };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================================
  // FIND ONE
  // ========================================
  async findOne(id: number) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { email: true, phone: true } },
          },
        },
        room: {
          include: {
            building: true,
            contracts: {
              where: { status: 'ACTIVE' },
              include: {
                student: {
                  select: { id: true, studentCode: true, fullName: true, gender: true },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        application: {
          select: {
            id: true,
            type: true,
            priorityScore: true,
            createdAt: true,
            period: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');

    const now = new Date();
    const endDate = new Date(contract.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Danh sách bạn cùng phòng
    const roommates = contract.room.contracts
      .filter((c) => c.studentId !== contract.studentId)
      .map((c) => c.student);

    return {
      ...contract,
      daysRemaining,
      roommates,
      currentOccupants: contract.room.contracts.length,
    };
  }

  // ========================================
  // GET MY CONTRACTS (Student)
  // ========================================
  async getMyContracts(studentId: number) {
    const contracts = await this.prisma.contract.findMany({
      where: { studentId },
      include: {
        room: {
          include: {
            building: { select: { id: true, code: true, name: true } },
          },
        },
        application: {
          select: { id: true, type: true, period: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    return contracts.map((c) => {
      const endDate = new Date(c.endDate);
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { ...c, daysRemaining };
    });
  }

  // ========================================
  // GET MY CONTRACT DETAIL (Student)
  // ========================================
  async getMyContractDetail(contractId: number, studentId: number) {
    const contract = await this.findOne(contractId);

    if (contract.studentId !== studentId) {
      throw new ForbiddenException('Bạn không có quyền xem hợp đồng này');
    }

    return contract;
  }

  // ========================================
  // CHECK-IN
  // ========================================
  async checkIn(id: number, dto: CheckInDto, allowedBuildingIds?: number[]) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { room: { select: { buildingId: true } } },
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    assertAllowed(allowedBuildingIds, contract.room.buildingId);
    if (contract.status !== 'ACTIVE') {
      throw new BadRequestException('Chỉ có thể check-in hợp đồng đang ACTIVE');
    }
    if (contract.checkedInAt) {
      throw new BadRequestException('Sinh viên đã check-in rồi');
    }

    return this.prisma.contract.update({
      where: { id },
      data: { checkedInAt: dto.checkedInAt ? new Date(dto.checkedInAt) : new Date() },
      include: {
        student: { select: { id: true, studentCode: true, fullName: true } },
        room: { include: { building: { select: { name: true } } } },
      },
    });
  }

  // ========================================
  // CHECK-OUT
  // ========================================
  async checkOut(id: number, dto: CheckOutDto, allowedBuildingIds?: number[]) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { room: { select: { buildingId: true } } },
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    assertAllowed(allowedBuildingIds, contract.room.buildingId);
    if (contract.status !== 'ACTIVE') {
      throw new BadRequestException('Chỉ có thể check-out hợp đồng đang ACTIVE');
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        checkedOutAt: dto.checkedOutAt ? new Date(dto.checkedOutAt) : new Date(),
        status: 'EXPIRED',
      },
      include: {
        student: { select: { id: true, studentCode: true, fullName: true } },
        room: { include: { building: { select: { name: true } } } },
      },
    });
  }

  // ========================================
  // TERMINATE (Chấm dứt sớm)
  // ========================================
  async terminate(id: number, dto: TerminateContractDto) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    if (contract.status !== 'ACTIVE') {
      throw new BadRequestException('Chỉ có thể chấm dứt hợp đồng đang ACTIVE');
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        status: 'TERMINATED',
        terminationReason: dto.terminationReason,
        checkedOutAt: dto.checkedOutAt ? new Date(dto.checkedOutAt) : new Date(),
      },
      include: {
        student: { select: { id: true, studentCode: true, fullName: true } },
        room: { include: { building: { select: { name: true } } } },
      },
    });
  }

  // ========================================
  // SET ROOM LEADER
  // ========================================
  async setRoomLeader(id: number, dto: SetRoomLeaderDto, allowedBuildingIds?: number[]) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: { room: { select: { buildingId: true } } },
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    assertAllowed(allowedBuildingIds, contract.room.buildingId);
    if (contract.status !== 'ACTIVE') {
      throw new BadRequestException('Chỉ đặt trưởng phòng cho hợp đồng ACTIVE');
    }

    // Nếu set true, bỏ trưởng phòng cũ trong phòng đó
    if (dto.isRoomLeader) {
      await this.prisma.contract.updateMany({
        where: {
          roomId: contract.roomId,
          status: 'ACTIVE',
          isRoomLeader: true,
          id: { not: id },
        },
        data: { isRoomLeader: false },
      });
    }

    return this.prisma.contract.update({
      where: { id },
      data: { isRoomLeader: dto.isRoomLeader },
      include: {
        student: { select: { id: true, studentCode: true, fullName: true } },
      },
    });
  }

  // ========================================
  // GET ROOM CONTRACTS (Xem ai ở trong phòng)
  // ========================================
  async getRoomContracts(roomId: number, allowedBuildingIds?: number[]) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { building: true },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng');
    assertAllowed(allowedBuildingIds, room.buildingId);

    const contracts = await this.prisma.contract.findMany({
      where: { roomId, status: 'ACTIVE' },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            gender: true,
            faculty: true,
            className: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      room: {
        id: room.id,
        code: room.code,
        buildingName: room.building.name,
        capacity: room.capacity,
        currentOccupants: contracts.length,
        availableSlots: room.capacity - contracts.length,
      },
      contracts,
    };
  }

  // ========================================
  // STATS
  // ========================================
  async getStats() {
    const [total, active, expired, terminated, notCheckedIn] = await Promise.all([
      this.prisma.contract.count(),
      this.prisma.contract.count({ where: { status: 'ACTIVE' } }),
      this.prisma.contract.count({ where: { status: 'EXPIRED' } }),
      this.prisma.contract.count({ where: { status: 'TERMINATED' } }),
      this.prisma.contract.count({
        where: { status: 'ACTIVE', checkedInAt: null },
      }),
    ]);

    // Sắp hết hạn (trong 30 ngày)
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const expiringCount = await this.prisma.contract.count({
      where: {
        status: 'ACTIVE',
        endDate: { lte: thirtyDaysLater },
      },
    });

    return { total, active, expired, terminated, notCheckedIn, expiringCount };
  }

  // ========================================
  // AUTO EXPIRE CONTRACTS (CRON)
  // ========================================
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async autoExpireContracts() {
    try {
      const now = new Date();
      const result = await this.prisma.contract.updateMany({
        where: { status: 'ACTIVE', endDate: { lt: now } },
        data: { status: 'EXPIRED' },
      });
      if (result.count > 0) {
        console.log(`[CRON] Auto-expired ${result.count} contracts`);
      }
    } catch (err: any) {
      console.error('[CRON] autoExpireContracts error:', err?.message ?? err);
    }
  }
}