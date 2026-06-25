import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegistrationPeriodsService } from '../registration-periods/registration-periods.service';
import { ContractsService } from '../contracts/contracts.service';
import { MailerService } from '../mailer/mailer.service';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { getAllowedBuildingIds } from '../../common/utils/building-access';
import { SettingsService } from '../settings/settings.service';
import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  QueryApplicationDto,
  ApplicationType,
  ApplicationStatus,
  PaginatedApplicationResponseDto,
  ApplicationResponseDto,
  StudentDashboardDto,
  UpdateStudentProfileDto,
} from './dto';

// Reusable include for full application data
const APPLICATION_INCLUDE = {
  student: {
    select: {
      id: true,
      studentCode: true,
      fullName: true,
      gender: true,
      className: true,
      faculty: true,
    },
  },
  period: {
    select: {
      id: true,
      code: true,
      name: true,
      academicYear: true,
      semester: true,
      moveInDate: true,
      moveOutDate: true,
    },
  },
  roomChoices: {
    include: {
      room: {
        include: { building: true },
      },
    },
    orderBy: { priority: 'asc' as const },
  },
  approvedRoom: {
    include: { building: true },
  },
  reviewedBy: {
    select: {
      id: true,
      fullName: true,
    },
  },
};

@Injectable()
export class StudentApplicationsService {
  constructor(
    private prisma: PrismaService,
    private periodsService: RegistrationPeriodsService,
    private contractsService: ContractsService,
    private mailerService: MailerService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    private settingsService: SettingsService,
  ) {}

  // ========================================
  // GET ACTIVE PERIOD FOR STUDENT
  // ========================================
  async getActivePeriod(studentId: number) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        gender: true,
        contracts: { where: { status: 'ACTIVE' }, take: 1, select: { id: true, roomId: true } },
      },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy sinh viên');
    }

    const currentRoomId: number | null = student.contracts[0]?.roomId ?? null;

    const now = new Date();

    // Get all currently open periods (there may be multiple non-building-conflicting ones)
    const openPeriods = await this.prisma.registrationPeriod.findMany({
      where: {
        status: 'OPEN' as any,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: 'desc' },
    });

    if (!openPeriods.length) return null;

    // If the student already has an active app in one of these periods, prefer that period.
    // This handles the case where multiple periods are open but the student already registered.
    const existingAppInAnyPeriod = await this.prisma.registrationApplication.findFirst({
      where: {
        studentId,
        periodId: { in: openPeriods.map((p) => p.id) },
        status: { notIn: ['CANCELLED'] as any[] },
      },
      include: { approvedRoom: { select: { id: true, code: true, buildingId: true } } },
      orderBy: { createdAt: 'desc' },
    });

    let period: (typeof openPeriods)[0] | null = null;
    if (existingAppInAnyPeriod) {
      period = openPeriods.find((p) => p.id === existingAppInAnyPeriod.periodId) ?? null;
    }
    if (!period) {
      // Pick the first open period that has rooms matching this student's gender
      for (const p of openPeriods) {
        const pBuildings = (p as any).allowedBuildingIds as number[];
        const roomCheck = await this.prisma.room.findFirst({
          where: {
            gender: student.gender,
            status: 'ACTIVE',
            ...(pBuildings?.length > 0 ? { buildingId: { in: pBuildings } } : {}),
          },
          select: { id: true },
        });
        if (roomCheck) { period = p; break; }
      }
    }
    if (!period) return null;

    const autoAssignRoom = (period as any).autoAssignRoom as boolean;

    // Get available rooms for this student's gender, filtered by allowed buildings
    const allowedBuildingIds = (period as any).allowedBuildingIds as number[];
    const roomWhere: any = { gender: student.gender, status: 'ACTIVE' };
    if (allowedBuildingIds?.length > 0) {
      roomWhere.buildingId = { in: allowedBuildingIds };
    }

    const availableRooms = await this.prisma.room.findMany({
      where: roomWhere,
      include: {
        building: true,
        _count: {
          select: { contracts: { where: { status: 'ACTIVE' } } },
        },
      },
      orderBy: [{ building: { code: 'asc' } }, { code: 'asc' }],
    });

    // For auto-assign periods: subtract approved reservations (no contract yet) from availability
    let reservationsByRoom = new Map<number, number>();
    if (autoAssignRoom) {
      const reservations = await this.prisma.registrationApplication.groupBy({
        by: ['approvedRoomId'] as any[],
        where: {
          periodId: period.id,
          status: 'APPROVED' as any,
          approvedRoomId: { not: null },
          contract: { is: null },
        } as any,
        _count: { approvedRoomId: true } as any,
      });
      reservationsByRoom = new Map(
        reservations.map((r: any) => [r.approvedRoomId as number, r._count.approvedRoomId as number]),
      );
    }

    // Use existing app only if it belongs to the selected period
    const existingApplication = existingAppInAnyPeriod?.periodId === period.id
      ? existingAppInAnyPeriod
      : null;

    return {
      period: {
        id: period.id,
        code: (period as any).code,
        name: period.name,
        academicYear: (period as any).academicYear,
        semester: (period as any).semester,
        endDate: period.endDate,
        allowRoomPreference: (period as any).allowRoomPreference,
        autoAssignRoom,
        moveInDate: (period as any).moveInDate,
        moveOutDate: (period as any).moveOutDate,
        allowedBuildingIds: (period as any).allowedBuildingIds ?? [],
        allowedTypes: (period as any).allowedTypes ?? 'ALL',
      },
      availableRooms: availableRooms.map((room) => {
        const reserved = reservationsByRoom.get(room.id) ?? 0;
        const rawOccupants = room._count.contracts + reserved;
        // For the student's current room, their own contract slot will be freed on renewal,
        // so we show one extra available slot so they can select it.
        const isCurrentRoom = room.id === currentRoomId;
        const occupants = isCurrentRoom ? Math.max(0, rawOccupants - 1) : rawOccupants;
        return {
          id: room.id,
          code: room.code,
          buildingName: room.building.name,
          floor: room.floor,
          roomType: room.roomType,
          capacity: room.capacity,
          currentOccupants: occupants,
          availableSlots: room.capacity - occupants,
          pricePerMonth: room.pricePerMonth,
          gender: room.gender,
          isCurrentRoom,
        };
      }),
      hasExistingApplication: !!existingApplication,
      existingApplicationId: existingApplication?.id,
      existingApplicationStatus: existingApplication?.status ?? null,
      existingApprovedRoomId: (existingApplication as any)?.approvedRoomId ?? null,
      hasActiveContract: student.contracts.length > 0,
      currentRoomId,
    };
  }

  // ========================================
  // CREATE APPLICATION (Student)
  // ========================================
  async create(studentId: number, dto: CreateApplicationDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy sinh viên');
    }

    // Validate application type vs current status
    const hasActiveContract = student.contracts.length > 0;
    if (dto.applicationType === ApplicationType.RENEWAL && !hasActiveContract) {
      throw new BadRequestException('Chỉ sinh viên đang ở KTX mới được gia hạn');
    }
    if (dto.applicationType === ApplicationType.NEW && hasActiveContract) {
      throw new BadRequestException('Sinh viên đang ở KTX chỉ được đăng ký gia hạn');
    }

    // Get active period
    const periodData = await this.getActivePeriod(studentId);
    if (!periodData?.period) {
      throw new BadRequestException('Hiện không có đợt đăng ký nào đang mở');
    }

    const isAutoAssign = (periodData.period as any).autoAssignRoom as boolean;

    // Run all validations BEFORE cancelling existing application to avoid data corruption
    const allowedTypes = (periodData.period as any).allowedTypes ?? 'ALL';
    if (allowedTypes === 'NEW_ONLY' && dto.applicationType === ApplicationType.RENEWAL) {
      throw new BadRequestException('Đợt đăng ký này chỉ dành cho đăng ký mới, không nhận đơn gia hạn');
    }
    if (allowedTypes === 'RENEWAL_ONLY' && dto.applicationType === ApplicationType.NEW) {
      throw new BadRequestException('Đợt đăng ký này chỉ dành cho gia hạn, không nhận đơn đăng ký mới');
    }
    if (isAutoAssign && dto.roomPreferences && dto.roomPreferences.length > 1) {
      throw new BadRequestException('Đợt tự động chỉ cho phép chọn 1 phòng');
    }

    // Reject duplicate submissions for manual-review periods
    if (periodData.hasExistingApplication && !isAutoAssign) {
      throw new ConflictException('Bạn đã nộp đơn đăng ký cho đợt này rồi');
    }

    // Calculate priority score from approved priority documents
    const approvedDocs = await this.prisma.priorityDocument.findMany({
      where: { studentId, status: 'APPROVED' as any },
      select: { type: true },
    });

    const weights = await this.settingsService.getPriorityWeights();
    const DOC_POINTS: Record<string, number> = {
      POOR_HOUSEHOLD: weights.poorHousehold,
      NEAR_POOR: weights.nearPoor,
      ORPHAN: weights.orphan,
      DISABLED: weights.disabled,
      POLICY_FAMILY: weights.policyFamily,
      GPA_TRANSCRIPT: weights.gpa3_6,
    };

    const approvedTypes = new Set(approvedDocs.map((d) => d.type as string));
    const priorityScore = Array.from(approvedTypes).reduce(
      (sum, type) => sum + (DOC_POINTS[type] ?? 0),
      0,
    );

    const priorityInfo = {
      isPoorHousehold: approvedTypes.has('POOR_HOUSEHOLD'),
      isNearPoor: approvedTypes.has('NEAR_POOR'),
      isOrphan: approvedTypes.has('ORPHAN'),
      isDisabled: approvedTypes.has('DISABLED'),
      isPolicyFamily: approvedTypes.has('POLICY_FAMILY'),
    };

    // Validate room preferences against current availability
    if (dto.roomPreferences && dto.roomPreferences.length > 0) {
      const availableRoomIds = periodData.availableRooms
        .filter((r) => r.availableSlots > 0)
        .map((r) => r.id);
      for (const pref of dto.roomPreferences) {
        if (!availableRoomIds.includes(pref.roomId)) {
          throw new BadRequestException(`Phòng ID ${pref.roomId} không khả dụng hoặc đã hết chỗ`);
        }
      }
    }

    // Atomically cancel the old app (auto-assign re-registration) and create the new one.
    // Keeping both in a single transaction prevents a state where the old app is cancelled
    // but the new one was never created (e.g. due to a subsequent DB error).
    const application = await this.prisma.$transaction(async (tx) => {
      if (periodData.hasExistingApplication && isAutoAssign) {
        await tx.registrationApplication.update({
          where: { id: periodData.existingApplicationId },
          data: { status: 'CANCELLED' as any },
        });
      }

      const app = await tx.registrationApplication.create({
        data: {
          studentId,
          periodId: periodData.period.id,
          type: dto.applicationType as any,
          isFirstYear: false,
          isPoorHousehold: priorityInfo.isPoorHousehold,
          isNearPoor: priorityInfo.isNearPoor,
          isOrphan: priorityInfo.isOrphan,
          isDisabled: priorityInfo.isDisabled,
          isPolicyFamily: priorityInfo.isPolicyFamily,
          wasResident: false,
          priorityScore,
          status: 'PENDING' as any,
        },
      });

      if (dto.roomPreferences && dto.roomPreferences.length > 0) {
        await tx.roomChoice.createMany({
          data: dto.roomPreferences.map((pref) => ({
            applicationId: app.id,
            roomId: pref.roomId,
            priority: pref.priority,
          })),
        });
      }

      return app;
    });

    // Auto-approve if the period is configured for it.
    // For auto-assign periods, contracts are NOT created immediately — they are batch-created
    // by the CRON job when the period closes, so the approved room is only a reservation.
    if (isAutoAssign) {
      const allowedBuildingIds = (periodData.period as any).allowedBuildingIds ?? [];
      await this.autoApproveApplication(application.id, studentId, student.gender, allowedBuildingIds, periodData.period.id);
    }

    // Update period stats
    await this.periodsService.refreshStats(periodData.period.id);

    // Fetch full application with all relations
    const full = await this.prisma.registrationApplication.findUnique({
      where: { id: application.id },
      include: APPLICATION_INCLUDE as any,
    });

    return this.transformToResponse(full);
  }

  // ========================================
  // AUTO-APPROVE APPLICATION
  // ========================================
  private async autoApproveApplication(applicationId: number, studentId: number, gender: string, allowedBuildingIds: number[] = [], periodId?: number) {
    // Gather student's room preferences (already created)
    const choices = await this.prisma.roomChoice.findMany({
      where: { applicationId },
      orderBy: { priority: 'asc' },
    });

    // Build reservation map: rooms already reserved by other APPROVED apps in this period
    // (these don't have contracts yet but occupy slots). Exclude self to handle re-registration.
    const reservationsByRoom = new Map<number, number>();
    if (periodId) {
      const reservations = await this.prisma.registrationApplication.groupBy({
        by: ['approvedRoomId'] as any[],
        where: {
          periodId,
          status: 'APPROVED' as any,
          approvedRoomId: { not: null },
          id: { not: applicationId },
          contract: { is: null },
        } as any,
        _count: { approvedRoomId: true } as any,
      });
      reservations.forEach((r: any) => reservationsByRoom.set(r.approvedRoomId as number, r._count.approvedRoomId as number));
    }

    const hasCapacity = (room: { id: number; capacity: number; _count: { contracts: number } }) => {
      const reserved = reservationsByRoom.get(room.id) ?? 0;
      return room._count.contracts + reserved < room.capacity;
    };

    let selectedRoomId: number | null = null;

    // Batch-fetch all preferred rooms to avoid N+1
    const preferredRoomIds = choices.map((c) => c.roomId);
    if (preferredRoomIds.length > 0) {
      const preferredRooms = await this.prisma.room.findMany({
        where: { id: { in: preferredRoomIds } },
        include: { _count: { select: { contracts: { where: { status: 'ACTIVE' } } } } },
      });
      const roomById = new Map(preferredRooms.map((r) => [r.id, r]));

      // Try preferred rooms in priority order — must be ACTIVE and have capacity (including reservations)
      for (const choice of choices) {
        const room = roomById.get(choice.roomId);
        if (room && room.status === 'ACTIVE' && hasCapacity(room)) {
          selectedRoomId = room.id;
          break;
        }
      }
    }

    // If preferred room unavailable (or no preference): fall back to first available room
    // matching gender (respecting allowed buildings). Use findMany + find to avoid missing
    // available rooms when the first result by sort is already full.
    if (!selectedRoomId) {
      const fallbackWhere: any = { gender: gender as any, status: 'ACTIVE' };
      if (allowedBuildingIds.length > 0) fallbackWhere.buildingId = { in: allowedBuildingIds };
      const fallbackRooms = await this.prisma.room.findMany({
        where: fallbackWhere,
        include: { _count: { select: { contracts: { where: { status: 'ACTIVE' } } } } },
        orderBy: [{ buildingId: 'asc' }, { code: 'asc' }],
      });
      const availableRoom = fallbackRooms.find((r) => hasCapacity(r));
      if (availableRoom) selectedRoomId = availableRoom.id;
    }

    // No room available → leave as PENDING for admin to handle
    if (!selectedRoomId) return;

    // Approve the application with the reserved room.
    // Contract is NOT created here — it will be batch-created when the period closes.
    await this.prisma.registrationApplication.update({
      where: { id: applicationId },
      data: {
        status: 'APPROVED' as any,
        approvedRoomId: selectedRoomId,
        reviewedAt: new Date(),
      },
    });

    // Send approval email (fire-and-forget)
    const full = await this.prisma.registrationApplication.findUnique({
      where: { id: applicationId },
      include: APPLICATION_INCLUDE as any,
    });
    if (full) this.sendResultEmail(full, 'APPROVED').catch(() => {});
  }

  // ========================================
  // GET MY APPLICATIONS (Student)
  // ========================================
  async getMyApplications(studentId: number): Promise<ApplicationResponseDto[]> {
    const applications = await this.prisma.registrationApplication.findMany({
      where: { studentId },
      include: APPLICATION_INCLUDE as any,
      orderBy: { createdAt: 'desc' },
    });

    return applications.map((app) => this.transformToResponse(app));
  }

  // ========================================
  // GET ONE APPLICATION
  // ========================================
  async findOne(id: number, studentId?: number): Promise<ApplicationResponseDto> {
    const application = await this.prisma.registrationApplication.findUnique({
      where: { id },
      include: APPLICATION_INCLUDE as any,
    });

    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn đăng ký');
    }

    if (studentId && application.studentId !== studentId) {
      throw new ForbiddenException('Bạn không có quyền xem đơn này');
    }

    return this.transformToResponse(application);
  }

  // ========================================
  // GET ALL APPLICATIONS (Admin)
  // ========================================
  async findAll(query: QueryApplicationDto, allowedBuildingIds?: number[]): Promise<PaginatedApplicationResponseDto> {
    const {
      page = 1,
      limit = 10,
      periodId,
      status,
      applicationType,
      studentId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (periodId) where.periodId = periodId;
    if (status) where.status = status;
    if (applicationType) where.type = applicationType;
    if (studentId) where.studentId = studentId;
    if (search) {
      where.student = {
        OR: [
          { studentCode: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }
    if (allowedBuildingIds !== undefined) {
      // Match applications whose approved room OR any room choice belongs to an assigned building
      where.OR = [
        { approvedRoom: { buildingId: { in: allowedBuildingIds } } },
        { roomChoices: { some: { room: { buildingId: { in: allowedBuildingIds } } } } },
      ];
    }

    let orderBy: any = {};
    if (sortBy === 'priorityScore') {
      orderBy = { priorityScore: sortOrder };
    } else if (sortBy === 'studentCode') {
      orderBy = { student: { studentCode: sortOrder } };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    const [applications, total] = await Promise.all([
      this.prisma.registrationApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: APPLICATION_INCLUDE as any,
      }),
      this.prisma.registrationApplication.count({ where }),
    ]);

    return {
      data: applications.map((app) => this.transformToResponse(app)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================================
  // UPDATE STATUS (Admin)
  // ========================================
  async updateStatus(id: number, dto: UpdateApplicationStatusDto, reviewerId: number, allowedBuildingIds?: number[]) {
    const application = await this.prisma.registrationApplication.findUnique({
      where: { id },
      include: { period: true, student: { select: { gender: true } } },
    });

    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn đăng ký');
    }

    if (application.status !== 'PENDING') {
      throw new BadRequestException('Chỉ có thể duyệt đơn đang ở trạng thái chờ duyệt');
    }

    const updateData: any = {
      status: dto.status,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    };

    if (dto.status === 'REJECTED') {
      updateData.rejectionReason = dto.rejectionReason || 'Không đạt tiêu chí xét duyệt';
    }

    if (dto.status === 'APPROVED') {
      if (!dto.assignedRoomId) {
        throw new BadRequestException('Cần chọn phòng khi duyệt đơn');
      }

      // Verify room exists, gender matches, and has capacity
      const room = await this.prisma.room.findUnique({
        where: { id: dto.assignedRoomId },
        include: {
          _count: { select: { contracts: { where: { status: 'ACTIVE' } } } },
        },
      });

      if (!room) {
        throw new NotFoundException('Phòng không tồn tại');
      }
      if (allowedBuildingIds !== undefined && !allowedBuildingIds.includes(room.buildingId)) {
        throw new ForbiddenException('Phòng không thuộc tòa nhà bạn được phân quyền');
      }
      if (room.gender !== (application as any).student.gender) {
        throw new BadRequestException('Phòng không phù hợp giới tính sinh viên');
      }

      // For RENEWAL in the same room the student already occupies, skip capacity check —
      // ContractsService.createFromApplication() will expire the old contract atomically,
      // so the slot count stays consistent.
      const studentActiveContract = await this.prisma.contract.findFirst({
        where: { studentId: application.studentId, status: 'ACTIVE' as any } as any,
        select: { roomId: true },
      });
      const isRenewalSameRoom =
        (application as any).type === 'RENEWAL' &&
        studentActiveContract?.roomId === dto.assignedRoomId;

      if (!isRenewalSameRoom && room._count.contracts >= room.capacity) {
        throw new BadRequestException('Phòng đã đầy');
      }

      updateData.approvedRoomId = dto.assignedRoomId;
    }

    const updated = await this.prisma.registrationApplication.update({
      where: { id },
      data: updateData,
      include: APPLICATION_INCLUDE as any,
    });

    if (dto.status === 'APPROVED') {
      try {
        await this.contractsService.createFromApplication(
          { applicationId: id, roomId: dto.assignedRoomId! },
          reviewerId,
        );
      } catch (err) {
        // Revert application to PENDING so admin can retry
        await this.prisma.registrationApplication.update({
          where: { id },
          data: { status: 'PENDING' as any, approvedRoomId: null, reviewedById: null, reviewedAt: null },
        });
        throw err;
      }
    }

    // Update period stats
    await this.periodsService.refreshStats(application.periodId);

    // Gửi email thông báo kết quả (fire-and-forget, không block response)
    this.sendResultEmail(updated, dto.status).catch(() => {});

    if (dto.status === 'APPROVED') {
      this.notificationsService.notifyStudent(application.studentId, {
        title: 'Đơn đăng ký KTX đã được duyệt ✓',
        content: 'Chúc mừng! Đơn đăng ký của bạn đã được chấp thuận. Hợp đồng đã được tạo.',
        type: 'REGISTRATION',
        referenceType: 'Application',
        referenceId: id,
      }).catch(() => {});
    } else if (dto.status === 'REJECTED') {
      this.notificationsService.notifyStudent(application.studentId, {
        title: 'Đơn đăng ký KTX không được chấp thuận',
        content: updateData.rejectionReason ?? 'Đơn của bạn không đạt tiêu chí xét duyệt',
        type: 'REGISTRATION',
        referenceType: 'Application',
        referenceId: id,
      }).catch(() => {});
    }

    return this.transformToResponse(updated);
  }

  // ========================================
  // CANCEL APPLICATION (Student)
  // ========================================
  async cancel(id: number, studentId: number) {
    const application = await this.prisma.registrationApplication.findUnique({
      where: { id },
      include: { period: { select: { endDate: true, autoAssignRoom: true } } },
    });

    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn đăng ký');
    }

    if (application.studentId !== studentId) {
      throw new ForbiddenException('Bạn không có quyền hủy đơn này');
    }

    // For auto-assign periods: also allow canceling APPROVED reservations while period is open
    const period = (application as any).period;
    const isAutoAssign = period?.autoAssignRoom as boolean;
    const periodStillOpen = period?.endDate && new Date(period.endDate) > new Date();

    if (application.status === 'APPROVED' && isAutoAssign && periodStillOpen) {
      // Allowed: release the reservation
    } else if (application.status !== 'PENDING') {
      throw new BadRequestException('Chỉ có thể hủy đơn đang chờ duyệt');
    }

    await this.prisma.registrationApplication.update({
      where: { id },
      data: { status: 'CANCELLED' as any },
    });

    await this.periodsService.refreshStats(application.periodId);

    return { message: 'Đã hủy đơn đăng ký thành công' };
  }

  // ========================================
  // GET STUDENT DASHBOARD
  // ========================================
  async getStudentDashboard(studentId: number): Promise<StudentDashboardDto> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          include: {
            room: { include: { building: true } },
          },
          take: 1,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy sinh viên');
    }

    const activeContract = student.contracts[0];

    const [
      unpaidInvoice,
      unpaidInvoicesCount,
      pendingTicketsCount,
      recentInvoices,
      recentTickets,
      pendingTransfer,
    ] = await Promise.all([
      activeContract
        ? this.prisma.invoice.findFirst({
            where: { roomId: activeContract.roomId, status: { in: ['PENDING', 'OVERDUE'] as any } },
            orderBy: { dueDate: 'asc' },
          })
        : Promise.resolve(null),
      activeContract
        ? this.prisma.invoice.count({
            where: { roomId: activeContract.roomId, status: { in: ['PENDING', 'OVERDUE'] as any } },
          })
        : Promise.resolve(0),
      this.prisma.maintenanceTicket.count({
        where: { reportedById: studentId, status: { in: ['NEW', 'IN_PROGRESS'] as any[] } },
      }),
      activeContract
        ? this.prisma.invoice.findMany({
            where: { roomId: activeContract.roomId },
            orderBy: { createdAt: 'desc' },
            take: 3,
          })
        : Promise.resolve([]),
      this.prisma.maintenanceTicket.findMany({
        where: { reportedById: studentId },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      this.prisma.roomTransferRequest.findFirst({
        where: { studentId, status: 'PENDING' },
        select: { id: true, code: true, toRoom: { select: { code: true } } },
      }),
    ]);

    const now = new Date();

    return {
      student: {
        id: student.id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        className: student.className ?? '',
      },
      currentRoom: activeContract
        ? {
            id: activeContract.room.id,
            code: activeContract.room.code,
            buildingName: activeContract.room.building.name,
          }
        : null,
      currentContract: activeContract
        ? {
            id: activeContract.id,
            endDate: activeContract.endDate,
            daysRemaining: Math.ceil(
              (activeContract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            ),
          }
        : null,
      unpaidInvoice: unpaidInvoice
        ? {
            id: unpaidInvoice.id,
            amount: (unpaidInvoice as any).totalAmount,
            dueDate: unpaidInvoice.dueDate,
            status: unpaidInvoice.status,
            daysUntilDue: Math.ceil(
              (unpaidInvoice.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            ),
          }
        : null,
      unpaidInvoicesCount,
      pendingTicketsCount,
      pendingTransfer: pendingTransfer
        ? { id: pendingTransfer.id, code: pendingTransfer.code, toRoomCode: (pendingTransfer as any).toRoom.code }
        : null,
      recentInvoices: recentInvoices.map((inv: any) => ({
        id: inv.id,
        month: `Tháng ${inv.billingMonth}/${inv.billingYear}`,
        amount: inv.totalAmount,
        dueDate: inv.dueDate,
        status: inv.status,
      })),
      recentTickets: recentTickets.map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        category: ticket.category,
        status: ticket.status,
        createdAt: ticket.createdAt,
      })),
    };
  }

  // ========================================
  // GET ONE APPLICATION - FULL DETAIL
  // ========================================
  async findOneDetail(id: number, studentId?: number) {
    const application = await this.prisma.registrationApplication.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: { id: true, email: true, phone: true, avatarUrl: true },
            },
          },
        },
        period: true,
        currentRoom: {
          include: { building: true },
        },
        approvedRoom: {
          include: { building: true },
        },
        reviewedBy: {
          select: { id: true, fullName: true, email: true },
        },
        roomChoices: {
          include: {
            room: {
              include: { building: true },
            },
          },
          orderBy: { priority: 'asc' as const },
        },
        contract: {
          select: { id: true, code: true, status: true, startDate: true, endDate: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn đăng ký');
    }

    if (studentId !== undefined && application.studentId !== studentId) {
      throw new ForbiddenException('Bạn không có quyền xem đơn này');
    }

    const [approvedDocs, pendingDocs] = await Promise.all([
      this.prisma.priorityDocument.findMany({
        where: {
          studentId: application.studentId,
          status: 'APPROVED' as any,
          createdAt: { lte: application.createdAt },
        },
        select: { type: true, fileName: true, fileUrl: true },
      }),
      this.prisma.priorityDocument.findMany({
        where: { studentId: application.studentId, status: 'PENDING' as any },
        select: { id: true, type: true, fileName: true },
      }),
    ]);

    const weights = await this.settingsService.getPriorityWeights();
    return {
      ...application,
      priorityBreakdown: this.buildPriorityBreakdown(application, approvedDocs, weights),
      approvedDocuments: approvedDocs,
      pendingDocuments: pendingDocs,
    };
  }

  private buildPriorityBreakdown(
    app: any,
    approvedDocs: any[] = [],
    weights: Awaited<ReturnType<SettingsService['getPriorityWeights']>>,
  ) {
    // Dùng approved docs làm source of truth (tránh boolean flags trong DB bị sai)
    const docTypes = new Set(approvedDocs.map((d) => d.type as string));

    const items: { label: string; points: number; active: boolean }[] = [
      { label: 'Sinh viên năm nhất', points: weights.firstYear, active: app.isFirstYear },
      { label: 'Hộ nghèo', points: weights.poorHousehold, active: app.isPoorHousehold || docTypes.has('POOR_HOUSEHOLD') },
      { label: 'Hộ cận nghèo', points: weights.nearPoor, active: app.isNearPoor || docTypes.has('NEAR_POOR') },
      { label: 'Mồ côi', points: weights.orphan, active: app.isOrphan || docTypes.has('ORPHAN') },
      { label: 'Khuyết tật', points: weights.disabled, active: app.isDisabled || docTypes.has('DISABLED') },
      { label: 'Gia đình chính sách', points: weights.policyFamily, active: app.isPolicyFamily || docTypes.has('POLICY_FAMILY') },
      { label: 'Đã từng ở KTX', points: weights.wasResident, active: app.wasResident },
    ];

    if (docTypes.has('GPA_TRANSCRIPT')) {
      const gpa = app.gpaLastSemester ? parseFloat(app.gpaLastSemester.toString()) : 0;
      if (gpa >= 3.6) items.push({ label: `GPA ${gpa.toFixed(2)} (≥ 3.6)`, points: weights.gpa3_6, active: true });
      else if (gpa >= 3.2) items.push({ label: `GPA ${gpa.toFixed(2)} (≥ 3.2)`, points: weights.gpa3_2, active: true });
      else if (gpa >= 2.5) items.push({ label: `GPA ${gpa.toFixed(2)} (≥ 2.5)`, points: weights.gpa2_5, active: true });
      else items.push({ label: 'Bảng điểm GPA', points: weights.gpa3_6, active: true });
    } else {
      const gpa = app.gpaLastSemester ? parseFloat(app.gpaLastSemester.toString()) : 0;
      if (gpa >= 3.6) items.push({ label: `GPA ${gpa.toFixed(2)} (≥ 3.6)`, points: weights.gpa3_6, active: true });
      else if (gpa >= 3.2) items.push({ label: `GPA ${gpa.toFixed(2)} (≥ 3.2)`, points: weights.gpa3_2, active: true });
      else if (gpa >= 2.5) items.push({ label: `GPA ${gpa.toFixed(2)} (≥ 2.5)`, points: weights.gpa2_5, active: true });
    }

    return {
      items,
      totalPoints: items.filter((i) => i.active).reduce((s, i) => s + i.points, 0),
    };
  }

  // ========================================
  // GET AVAILABLE ROOMS FOR APPROVAL (Admin)
  // ========================================
  async getAvailableRoomsForApproval(applicationId: number, allowedBuildingIds?: number[]) {
    const app = await this.prisma.registrationApplication.findUnique({
      where: { id: applicationId },
      include: {
        student: { select: { gender: true } },
        roomChoices: { include: { room: true }, orderBy: { priority: 'asc' as const } },
      },
    });

    if (!app) throw new NotFoundException('Không tìm thấy đơn đăng ký');

    const roomWhere: any = { gender: app.student.gender, status: 'ACTIVE' };
    if (allowedBuildingIds !== undefined) {
      roomWhere.buildingId = { in: allowedBuildingIds };
    }

    const rooms = await this.prisma.room.findMany({
      where: roomWhere,
      include: {
        building: true,
        contracts: {
          where: { status: 'ACTIVE' as any },
          select: { id: true },
        },
      },
      orderBy: [{ buildingId: 'asc' }, { code: 'asc' }],
    });

    // Với đơn gia hạn muốn ở lại, phòng hiện tại cũng được coi là nguyện vọng
    const renewalCurrentRoomId =
      app.type === 'RENEWAL' && (app as any).wantSameRoom ? (app as any).currentRoomId : null;

    const roomsWithAvailability = rooms.map((room) => {
      const currentOccupants = room.contracts.length;
      const availableSlots = room.capacity - currentOccupants;
      const choiceMatch = app.roomChoices.find((c) => c.roomId === room.id);
      const isCurrentRoom = renewalCurrentRoomId === room.id;

      return {
        id: room.id,
        code: room.code,
        buildingName: room.building.name,
        buildingCode: room.building.code,
        floor: room.floor,
        roomType: room.roomType,
        gender: room.gender,
        capacity: room.capacity,
        currentOccupants,
        availableSlots,
        pricePerMonth: room.pricePerMonth,
        isUserPreference: !!choiceMatch || isCurrentRoom,
        preferencePriority: choiceMatch?.priority ?? (isCurrentRoom ? 0 : null),
        isCurrentRoom,
      };
    });

    roomsWithAvailability.sort((a, b) => {
      if (a.isUserPreference && !b.isUserPreference) return -1;
      if (!a.isUserPreference && b.isUserPreference) return 1;
      if (a.isUserPreference && b.isUserPreference) {
        return (a.preferencePriority || 0) - (b.preferencePriority || 0);
      }
      if (a.availableSlots > 0 && b.availableSlots === 0) return -1;
      if (a.availableSlots === 0 && b.availableSlots > 0) return 1;
      return 0;
    });

    return {
      application: { id: app.id, studentGender: app.student.gender },
      rooms: roomsWithAvailability,
      totalAvailable: roomsWithAvailability.filter((r) => r.availableSlots > 0).length,
    };
  }

  // ========================================
  // UPDATE STUDENT PROFILE
  // ========================================
  async updateProfile(studentId: number, dto: UpdateStudentProfileDto) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Không tìm thấy sinh viên');

    const updated = await this.prisma.student.update({
      where: { id: studentId },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        idCardNumber: dto.idCardNumber,
        hometownProvince: dto.hometownProvince,
        hometownDistance: dto.hometownDistance,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        emergencyContactRelation: dto.emergencyContactRelation,
      },
    });

    return updated;
  }

  // ========================================
  // GET ADMIN DASHBOARD
  // ========================================
  async getAdminDashboard(user: any) {
    const allowedBuildingIds = getAllowedBuildingIds(user);
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Filter helpers — empty object ({}) means no restriction (ADMIN path)
    const buildingIdFilter = allowedBuildingIds !== undefined ? { in: allowedBuildingIds } : undefined;
    const viaRoom = buildingIdFilter ? { room: { buildingId: buildingIdFilter } } : {};
    const viaFromRoom = buildingIdFilter ? { fromRoom: { buildingId: buildingIdFilter } } : {};
    // Applications: PENDING may not have approvedRoom yet — filter via roomChoices too
    const viaApp = buildingIdFilter
      ? {
          OR: [
            { approvedRoom: { buildingId: buildingIdFilter } },
            { roomChoices: { some: { room: { buildingId: buildingIdFilter } } } },
          ],
        }
      : {};

    const [
      totalRooms,
      activeContractsCount,
      pendingApplications,
      contractsNotCheckedIn,
      openTickets,
      pendingRoomTransfers,
      overdueInvoices,
      buildings,
      recentApps,
      recentTickets,
      paidInvoices,
      ticketCategoryGroups,
      invoiceStatusGroups,
    ] = await Promise.all([
      this.prisma.room.count({
        where: { status: 'ACTIVE' as any, ...(buildingIdFilter ? { buildingId: buildingIdFilter } : {}) },
      }),
      this.prisma.contract
        .findMany({
          where: { status: 'ACTIVE' as any, ...viaRoom },
          distinct: ['studentId'],
          select: { studentId: true },
        })
        .then((rows) => rows.length),
      this.prisma.registrationApplication.count({ where: { status: 'PENDING', ...viaApp } }),
      this.prisma.contract.count({ where: { status: 'ACTIVE' as any, checkedInAt: null, ...viaRoom } }),
      this.prisma.maintenanceTicket.count({ where: { status: { in: ['NEW', 'IN_PROGRESS'] as any }, ...viaRoom } }),
      this.prisma.roomTransferRequest.count({ where: { status: 'PENDING', ...viaFromRoom } }),
      this.prisma.invoice.count({ where: { status: 'OVERDUE' as any, ...viaRoom } }),
      this.prisma.building.findMany({
        where: { status: 'ACTIVE' as any, ...(buildingIdFilter ? { id: buildingIdFilter } : {}) },
        include: {
          rooms: {
            where: { status: 'ACTIVE' as any },
            include: {
              _count: { select: { contracts: { where: { status: 'ACTIVE' as any } } } },
            },
          },
        },
        orderBy: { code: 'asc' },
      }),
      this.prisma.registrationApplication.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: viaApp,
        include: {
          student: { select: { fullName: true, studentCode: true } },
          approvedRoom: { select: { code: true } },
        },
      }),
      this.prisma.maintenanceTicket.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: viaRoom,
        include: { room: { select: { code: true } } },
      }),
      this.prisma.invoice.findMany({
        where: { status: 'PAID' as any, paidAt: { gte: sixMonthsAgo }, ...viaRoom },
        select: { paidAt: true, totalAmount: true },
      }),
      this.prisma.maintenanceTicket.groupBy({
        by: ['category'],
        where: viaRoom,
        _count: { id: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: viaRoom,
        _count: { id: true },
      }),
    ]);

    // Building occupancy
    let availableRooms = 0;
    const buildingOccupancy = buildings.map((b) => {
      let totalCapacity = 0;
      let occupied = 0;
      b.rooms.forEach((r) => {
        totalCapacity += r.capacity;
        const roomOccupied = (r as any)._count.contracts;
        occupied += roomOccupied;
        if (roomOccupied < r.capacity) availableRooms++;
      });
      const percentage =
        totalCapacity > 0 ? Math.round((occupied / totalCapacity) * 1000) / 10 : 0;
      return { id: b.id, code: b.code, name: b.name, totalCapacity, occupied, percentage };
    });

    // Revenue by month (last 6 months)
    const revenueMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      revenueMap.set(key, 0);
    }
    paidInvoices.forEach((inv) => {
      if (!inv.paidAt) return;
      const key = `${inv.paidAt.getFullYear()}-${String(inv.paidAt.getMonth() + 1).padStart(2, '0')}`;
      if (revenueMap.has(key)) {
        revenueMap.set(key, (revenueMap.get(key) ?? 0) + Number(inv.totalAmount));
      }
    });
    const revenueByMonth = Array.from(revenueMap.entries()).map(([month, amount]) => ({
      month,
      amount,
    }));

    return {
      stats: {
        totalRooms,
        availableRooms,
        studentsWithActiveContracts: activeContractsCount,
        pendingApplications,
        contractsNotCheckedIn,
        openTickets,
        pendingRoomTransfers,
        overdueInvoices,
      },
      buildingOccupancy,
      recentApplications: recentApps.map((app) => ({
        id: app.id,
        studentName: (app as any).student.fullName,
        studentCode: (app as any).student.studentCode,
        roomCode: (app as any).approvedRoom?.code ?? null,
        status: app.status,
        createdAt: app.createdAt,
      })),
      recentTickets: recentTickets.map((t) => ({
        id: t.id,
        title: t.title,
        roomCode: (t as any).room.code,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt,
      })),
      revenueByMonth,
      ticketsByCategory: ticketCategoryGroups.map((g) => ({
        category: g.category,
        count: g._count.id,
      })),
      invoiceStats: invoiceStatusGroups.map((g) => ({
        status: g.status,
        count: g._count.id,
      })),
    };
  }

  // ========================================
  // HELPER: Send result email
  // ========================================
  private async sendResultEmail(app: any, status: string) {
    const studentWithEmail = await this.prisma.student.findUnique({
      where: { id: app.studentId },
      include: { user: { select: { email: true } } },
    });
    const email = (studentWithEmail as any)?.user?.email;
    if (!email) return;

    const loginUrl =
      this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000') + '/student/contracts';

    if (status === 'APPROVED') {
      await this.mailerService.sendApplicationApprovedEmail({
        to: email,
        studentName: app.student?.fullName ?? '',
        periodName: app.period?.name ?? '',
        roomCode: app.approvedRoom?.code ?? '',
        buildingName: app.approvedRoom?.building?.name ?? '',
        moveInDate: app.period?.moveInDate ?? null,
        moveOutDate: app.period?.moveOutDate ?? null,
        loginUrl,
      });
    } else if (status === 'REJECTED') {
      await this.mailerService.sendApplicationRejectedEmail({
        to: email,
        studentName: app.student?.fullName ?? '',
        periodName: app.period?.name ?? '',
        rejectionReason: app.rejectionReason ?? 'Không đạt tiêu chí xét duyệt',
      });
    }
  }

  // ========================================
  // HELPER: Transform to response
  // ========================================
  private transformToResponse(app: any): ApplicationResponseDto {
    // Reconstruct priorityInfo from individual columns
    const priorityInfo = {
      isFirstYear: app.isFirstYear,
      isPoorHousehold: app.isPoorHousehold,
      isNearPoor: app.isNearPoor,
      isOrphan: app.isOrphan,
      isDisabled: app.isDisabled,
      isPolicyFamily: app.isPolicyFamily,
      wasResident: app.wasResident,
      gpaLastSemester: app.gpaLastSemester ? Number(app.gpaLastSemester) : undefined,
    };

    // roomChoices → roomPreferences
    const roomPreferences = (app.roomChoices ?? []).map((rc: any) => ({
      priority: rc.priority,
      room: {
        id: rc.room.id,
        code: rc.room.code,
        buildingName: rc.room.building.name,
      },
    }));

    return {
      id: app.id,
      studentId: app.studentId,
      student: app.student,
      periodId: app.periodId,
      period: app.period,
      applicationType: app.type as ApplicationType, // schema field is "type"
      priorityInfo,
      priorityScore: app.priorityScore,
      roomPreferences,
      status: app.status as ApplicationStatus,
      assignedRoom: app.approvedRoom
        ? {
            id: app.approvedRoom.id,
            code: app.approvedRoom.code,
            buildingName: app.approvedRoom.building.name,
          }
        : undefined,
      rejectionReason: app.rejectionReason,
      reviewedById: app.reviewedById,
      reviewedBy: app.reviewedBy,
      reviewedAt: app.reviewedAt,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  }
}
