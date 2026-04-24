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
  ) {}

  // ========================================
  // GET ACTIVE PERIOD FOR STUDENT
  // ========================================
  async getActivePeriod(studentId: number) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { gender: true },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy sinh viên');
    }

    const now = new Date();
    const period = await this.prisma.registrationPeriod.findFirst({
      where: {
        status: 'OPEN' as any,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: 'desc' },
    });

    if (!period) {
      return null;
    }

    // Get available rooms for this student's gender
    const availableRooms = await this.prisma.room.findMany({
      where: {
        gender: student.gender,
        status: 'ACTIVE',
      },
      include: {
        building: true,
        _count: {
          select: { contracts: { where: { status: 'ACTIVE' } } },
        },
      },
      orderBy: [{ building: { code: 'asc' } }, { code: 'asc' }],
    });

    // Check if student already applied for this period
    const existingApplication = await this.prisma.registrationApplication.findFirst({
      where: {
        studentId,
        periodId: period.id,
        status: { notIn: ['CANCELLED'] as any[] },
      },
    });

    return {
      period: {
        id: period.id,
        code: (period as any).code,
        name: period.name,
        academicYear: (period as any).academicYear,
        semester: (period as any).semester,
        endDate: period.endDate,
        allowRoomPreference: (period as any).allowRoomPreference,
        autoAssignRoom: (period as any).autoAssignRoom,
        moveInDate: (period as any).moveInDate,
        moveOutDate: (period as any).moveOutDate,
      },
      availableRooms: availableRooms.map((room) => ({
        id: room.id,
        code: room.code,
        buildingName: room.building.name,
        floor: room.floor,
        roomType: room.roomType,
        capacity: room.capacity,
        currentOccupants: room._count.contracts,
        availableSlots: room.capacity - room._count.contracts,
        pricePerMonth: room.pricePerMonth,
        gender: room.gender,
      })),
      hasExistingApplication: !!existingApplication,
      existingApplicationId: existingApplication?.id,
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

    if (periodData.hasExistingApplication) {
      throw new ConflictException('Bạn đã nộp đơn đăng ký cho đợt này rồi');
    }

    // Calculate priority score from approved priority documents
    const approvedDocs = await this.prisma.priorityDocument.findMany({
      where: { studentId, status: 'APPROVED' as any },
      select: { type: true },
    });

    const DOC_POINTS: Record<string, number> = {
      POOR_HOUSEHOLD: 15,
      NEAR_POOR: 10,
      ORPHAN: 15,
      DISABLED: 15,
      POLICY_FAMILY: 10,
      GPA_TRANSCRIPT: 10, // +10 khi có bảng điểm GPA được duyệt
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

    // Validate room preferences
    if (dto.roomPreferences && dto.roomPreferences.length > 0) {
      if (!periodData.period.allowRoomPreference) {
        throw new BadRequestException('Đợt đăng ký này không cho phép chọn phòng ưu tiên');
      }
      const availableRoomIds = periodData.availableRooms.map((r) => r.id);
      for (const pref of dto.roomPreferences) {
        if (!availableRoomIds.includes(pref.roomId)) {
          throw new BadRequestException(`Phòng ID ${pref.roomId} không khả dụng`);
        }
      }
    }

    // Create application with individual priority fields
    const application = await this.prisma.registrationApplication.create({
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

    // Create room choices separately
    if (dto.roomPreferences && dto.roomPreferences.length > 0) {
      await this.prisma.roomChoice.createMany({
        data: dto.roomPreferences.map((pref) => ({
          applicationId: application.id,
          roomId: pref.roomId,
          priority: pref.priority,
        })),
      });
    }

    // Auto-approve if the period is configured for it
    if ((periodData.period as any).autoAssignRoom) {
      await this.autoApproveApplication(application.id, studentId, student.gender);
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
  private async autoApproveApplication(applicationId: number, studentId: number, gender: string) {
    // Gather student's room preferences (already created)
    const choices = await this.prisma.roomChoice.findMany({
      where: { applicationId },
      orderBy: { priority: 'asc' },
    });

    let selectedRoomId: number | null = null;

    // Try preferred rooms first (in preference order) — must be ACTIVE and have capacity
    for (const choice of choices) {
      const room = await this.prisma.room.findUnique({
        where: { id: choice.roomId },
        include: { _count: { select: { contracts: { where: { status: 'ACTIVE' } } } } },
      });
      if (room && room.status === 'ACTIVE' && room._count.contracts < room.capacity) {
        selectedRoomId = room.id;
        break;
      }
    }

    // Fall back to first available room matching gender
    if (!selectedRoomId) {
      const anyRoom = await this.prisma.room.findFirst({
        where: { gender: gender as any, status: 'ACTIVE' },
        include: { _count: { select: { contracts: { where: { status: 'ACTIVE' } } } } },
        orderBy: [{ buildingId: 'asc' }, { code: 'asc' }],
      });
      if (anyRoom && anyRoom._count.contracts < anyRoom.capacity) {
        selectedRoomId = anyRoom.id;
      }
    }

    // No room available → leave as PENDING for admin to handle
    if (!selectedRoomId) return;

    // Approve the application — if contract creation fails, revert to PENDING
    await this.prisma.registrationApplication.update({
      where: { id: applicationId },
      data: {
        status: 'APPROVED' as any,
        approvedRoomId: selectedRoomId,
        reviewedAt: new Date(),
      },
    });

    try {
      await this.contractsService.createFromApplication(
        { applicationId, roomId: selectedRoomId },
        null,
      );
    } catch {
      // Revert application to PENDING so admin can handle it
      await this.prisma.registrationApplication.update({
        where: { id: applicationId },
        data: { status: 'PENDING' as any, approvedRoomId: null, reviewedAt: null },
      });
      return;
    }

    // Send approval email (fire-and-forget) — fetch full data needed by sendResultEmail
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
  async findAll(query: QueryApplicationDto): Promise<PaginatedApplicationResponseDto> {
    const {
      page = 1,
      limit = 10,
      periodId,
      status,
      applicationType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (periodId) where.periodId = periodId;
    if (status) where.status = status;
    if (applicationType) where.type = applicationType; // schema field is "type"
    if (search) {
      where.student = {
        OR: [
          { studentCode: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
        ],
      };
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
  async updateStatus(id: number, dto: UpdateApplicationStatusDto, reviewerId: number) {
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

      // Verify room exists and has available capacity
      const room = await this.prisma.room.findUnique({
        where: { id: dto.assignedRoomId },
        include: {
          _count: { select: { contracts: { where: { status: 'ACTIVE' } } } },
        },
      });

      if (!room) {
        throw new NotFoundException('Phòng không tồn tại');
      }
      if (room._count.contracts >= room.capacity) {
        throw new BadRequestException('Phòng đã đầy');
      }
      if (room.gender !== (application as any).student.gender) {
        throw new BadRequestException('Phòng không phù hợp giới tính sinh viên');
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

    return this.transformToResponse(updated);
  }

  // ========================================
  // CANCEL APPLICATION (Student)
  // ========================================
  async cancel(id: number, studentId: number) {
    const application = await this.prisma.registrationApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn đăng ký');
    }

    if (application.studentId !== studentId) {
      throw new ForbiddenException('Bạn không có quyền hủy đơn này');
    }

    if (application.status !== 'PENDING') {
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

    const unpaidInvoice = activeContract
      ? await this.prisma.invoice.findFirst({
          where: { roomId: activeContract.roomId, status: 'PENDING' },
          orderBy: { dueDate: 'asc' },
        })
      : null;

    const pendingTicketsCount = await this.prisma.maintenanceTicket.count({
      where: {
        reportedById: studentId,
        status: { in: ['NEW', 'IN_PROGRESS'] as any[] },
      },
    });

    const recentInvoices = activeContract
      ? await this.prisma.invoice.findMany({
          where: { roomId: activeContract.roomId },
          orderBy: { createdAt: 'desc' },
          take: 3,
        })
      : [];

    const recentTickets = await this.prisma.maintenanceTicket.findMany({
      where: { reportedById: studentId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

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
            daysUntilDue: Math.ceil(
              (unpaidInvoice.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            ),
          }
        : null,
      pendingTicketsCount,
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

    return {
      ...application,
      priorityBreakdown: this.buildPriorityBreakdown(application, approvedDocs),
      approvedDocuments: approvedDocs,
      pendingDocuments: pendingDocs,
    };
  }

  private buildPriorityBreakdown(app: any, approvedDocs: any[] = []) {
    // Dùng approved docs làm source of truth (tránh boolean flags trong DB bị sai)
    const docTypes = new Set(approvedDocs.map((d) => d.type as string));

    const items: { label: string; points: number; active: boolean }[] = [
      { label: 'Sinh viên năm nhất', points: 20, active: app.isFirstYear },
      { label: 'Hộ nghèo', points: 15, active: app.isPoorHousehold || docTypes.has('POOR_HOUSEHOLD') },
      { label: 'Hộ cận nghèo', points: 10, active: app.isNearPoor || docTypes.has('NEAR_POOR') },
      { label: 'Mồ côi', points: 15, active: app.isOrphan || docTypes.has('ORPHAN') },
      { label: 'Khuyết tật', points: 15, active: app.isDisabled || docTypes.has('DISABLED') },
      { label: 'Gia đình chính sách', points: 10, active: app.isPolicyFamily || docTypes.has('POLICY_FAMILY') },
      { label: 'Đã từng ở KTX', points: 5, active: app.wasResident },
    ];

    if (docTypes.has('GPA_TRANSCRIPT')) {
      const gpa = app.gpaLastSemester ? parseFloat(app.gpaLastSemester.toString()) : 0;
      if (gpa >= 3.6) items.push({ label: `GPA ${gpa.toFixed(2)} (≥ 3.6)`, points: 10, active: true });
      else if (gpa >= 3.2) items.push({ label: `GPA ${gpa.toFixed(2)} (≥ 3.2)`, points: 7, active: true });
      else if (gpa >= 2.5) items.push({ label: `GPA ${gpa.toFixed(2)} (≥ 2.5)`, points: 5, active: true });
      else items.push({ label: 'Bảng điểm GPA', points: 10, active: true });
    } else {
      const gpa = app.gpaLastSemester ? parseFloat(app.gpaLastSemester.toString()) : 0;
      if (gpa >= 3.6) items.push({ label: `GPA ${gpa.toFixed(2)} (≥ 3.6)`, points: 10, active: true });
      else if (gpa >= 3.2) items.push({ label: `GPA ${gpa.toFixed(2)} (≥ 3.2)`, points: 7, active: true });
      else if (gpa >= 2.5) items.push({ label: `GPA ${gpa.toFixed(2)} (≥ 2.5)`, points: 5, active: true });
    }

    return {
      items,
      totalPoints: items.filter((i) => i.active).reduce((s, i) => s + i.points, 0),
    };
  }

  // ========================================
  // GET AVAILABLE ROOMS FOR APPROVAL (Admin)
  // ========================================
  async getAvailableRoomsForApproval(applicationId: number) {
    const app = await this.prisma.registrationApplication.findUnique({
      where: { id: applicationId },
      include: {
        student: { select: { gender: true } },
        roomChoices: { include: { room: true }, orderBy: { priority: 'asc' as const } },
      },
    });

    if (!app) throw new NotFoundException('Không tìm thấy đơn đăng ký');

    const rooms = await this.prisma.room.findMany({
      where: {
        gender: app.student.gender,
        status: 'ACTIVE',
      },
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
  async getAdminDashboard() {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalRooms,
      activeContractsCount,
      pendingApplications,
      contractsNotCheckedIn,
      openTickets,
      buildings,
      recentApps,
      recentTickets,
      paidInvoices,
    ] = await Promise.all([
      this.prisma.room.count({ where: { status: 'ACTIVE' as any } }),
      this.prisma.contract.count({ where: { status: 'ACTIVE' as any } }),
      this.prisma.registrationApplication.count({ where: { status: 'PENDING' } }),
      this.prisma.contract.count({ where: { status: 'ACTIVE' as any, checkedInAt: null } }),
      this.prisma.maintenanceTicket.count({ where: { status: { in: ['NEW', 'IN_PROGRESS'] as any } } }),
      this.prisma.building.findMany({
        where: { status: 'ACTIVE' as any },
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
        include: {
          student: { select: { fullName: true, studentCode: true } },
          approvedRoom: { select: { code: true } },
        },
      }),
      this.prisma.maintenanceTicket.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { room: { select: { code: true } } },
      }),
      this.prisma.invoice.findMany({
        where: { status: 'PAID' as any, paidAt: { gte: sixMonthsAgo } },
        select: { paidAt: true, totalAmount: true },
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
