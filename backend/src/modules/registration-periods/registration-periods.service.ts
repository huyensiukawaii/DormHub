import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  CreateRegistrationPeriodDto,
  UpdateRegistrationPeriodDto,
  QueryRegistrationPeriodDto,
  UpdateStatusDto,
  RegistrationPeriodStatus,
  PaginatedRegistrationPeriodResponseDto,
  RegistrationPeriodResponseDto,
  PeriodStatsDto,
} from './dto';

@Injectable()
export class RegistrationPeriodsService {
  constructor(private prisma: PrismaService) {}

  // ========================================
  // FIND ALL (PAGINATED)
  // ========================================
  async findAll(query: QueryRegistrationPeriodDto): Promise<PaginatedRegistrationPeriodResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      academicYear,
      semester,
      status,
      activeOnly,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const now = new Date();

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (academicYear) {
      where.academicYear = academicYear;
    }

    if (semester) {
      where.semester = semester;
    }

    if (status) {
      where.status = status;
    }

    if (activeOnly) {
      where.status = RegistrationPeriodStatus.OPEN;
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    }

    // Build orderBy
    const orderBy: any = {};
    const validSortFields = ['code', 'name', 'startDate', 'endDate', 'createdAt', 'status'];
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    // Query
    const [periods, total] = await Promise.all([
      this.prisma.registrationPeriod.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.registrationPeriod.count({ where }),
    ]);

    // Transform response
    const data = periods.map((period) => this.transformToResponse(period, now));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================================
  // FIND ONE BY ID
  // ========================================
  async findOne(id: number): Promise<RegistrationPeriodResponseDto> {
    const period = await this.prisma.registrationPeriod.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!period) {
      throw new NotFoundException('Không tìm thấy đợt đăng ký');
    }

    return this.transformToResponse(period, new Date());
  }

  // ========================================
  // FIND ACTIVE PERIOD
  // ========================================
  async findActivePeriod(): Promise<RegistrationPeriodResponseDto | null> {
    const now = new Date();

    const period = await this.prisma.registrationPeriod.findFirst({
      where: {
        status: RegistrationPeriodStatus.OPEN,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    if (!period) {
      return null;
    }

    return this.transformToResponse(period, now);
  }

  // ========================================
  // CREATE
  // ========================================
  async create(dto: CreateRegistrationPeriodDto, userId?: number) {
    // Check duplicate code
    const existing = await this.prisma.registrationPeriod.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Mã đợt đăng ký đã tồn tại');
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }

    if (dto.moveInDate && dto.moveOutDate) {
      const moveIn = new Date(dto.moveInDate);
      const moveOut = new Date(dto.moveOutDate);
      if (moveOut <= moveIn) {
        throw new BadRequestException('Ngày trả phòng phải sau ngày nhận phòng');
      }
    }

    // Check overlapping periods with same academic year & semester
    const overlapping = await this.prisma.registrationPeriod.findFirst({
      where: {
        academicYear: dto.academicYear,
        semester: dto.semester,
        status: { notIn: [RegistrationPeriodStatus.CANCELLED, RegistrationPeriodStatus.DRAFT] },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictException(
        `Đã có đợt đăng ký "${overlapping.name}" trong khoảng thời gian này`,
      );
    }

    const period = await this.prisma.registrationPeriod.create({
      data: {
        code: dto.code,
        name: dto.name,
        academicYear: dto.academicYear,
        semester: dto.semester,
        description: dto.description,
        startDate,
        endDate,
        moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : null,
        moveOutDate: dto.moveOutDate ? new Date(dto.moveOutDate) : null,
        maxApplicationsPerStudent: dto.maxApplicationsPerStudent || 1,
        allowRoomPreference: dto.allowRoomPreference || false,
        autoAssignRoom: dto.autoAssignRoom || false,
        targetAdmissionYears: dto.targetAdmissionYears ?? [],
        status: dto.status || RegistrationPeriodStatus.DRAFT,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return this.transformToResponse(period, new Date());
  }

  // ========================================
  // UPDATE
  // ========================================
  async update(id: number, dto: UpdateRegistrationPeriodDto) {
    const period = await this.prisma.registrationPeriod.findUnique({
      where: { id },
    });

    if (!period) {
      throw new NotFoundException('Không tìm thấy đợt đăng ký');
    }

    // Check if can update (not if there are approved applications)
    if (period.approvedCount > 0 && dto.status === RegistrationPeriodStatus.CANCELLED) {
      throw new BadRequestException(
        'Không thể hủy đợt đăng ký đã có đơn được duyệt',
      );
    }

    // Check duplicate code if changing
    if (dto.code && dto.code !== period.code) {
      const existing = await this.prisma.registrationPeriod.findUnique({
        where: { code: dto.code },
      });
      if (existing) {
        throw new ConflictException('Mã đợt đăng ký đã tồn tại');
      }
    }

    // Validate dates if changing
    const startDate = dto.startDate ? new Date(dto.startDate) : period.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : period.endDate;
    const periodAny = period as any;
    const academicYear = dto.academicYear ?? periodAny.academicYear;
    const semester = dto.semester ?? periodAny.semester;
    const newStatus = dto.status ?? period.status;

    if (endDate <= startDate) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }

    // Check overlapping periods (same as create, excluding self)
    if (
      newStatus !== RegistrationPeriodStatus.DRAFT &&
      newStatus !== RegistrationPeriodStatus.CANCELLED
    ) {
      const overlapping = await this.prisma.registrationPeriod.findFirst({
        where: {
          id: { not: id },
          academicYear,
          semester,
          status: { notIn: [RegistrationPeriodStatus.CANCELLED, RegistrationPeriodStatus.DRAFT] as any[] },
          OR: [{ startDate: { lte: endDate }, endDate: { gte: startDate } }],
        } as any,
      });
      if (overlapping) {
        throw new ConflictException(
          `Đã có đợt đăng ký "${overlapping.name}" trong khoảng thời gian này`,
        );
      }
    }

    const updated = await this.prisma.registrationPeriod.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        academicYear: dto.academicYear,
        semester: dto.semester,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        moveInDate: dto.moveInDate !== undefined ? (dto.moveInDate ? new Date(dto.moveInDate) : null) : undefined,
        moveOutDate: dto.moveOutDate !== undefined ? (dto.moveOutDate ? new Date(dto.moveOutDate) : null) : undefined,
        maxApplicationsPerStudent: dto.maxApplicationsPerStudent,
        allowRoomPreference: dto.allowRoomPreference,
        autoAssignRoom: dto.autoAssignRoom,
        targetAdmissionYears: dto.targetAdmissionYears,
        status: dto.status,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return this.transformToResponse(updated, new Date());
  }

  // ========================================
  // UPDATE STATUS
  // ========================================
  async updateStatus(id: number, dto: UpdateStatusDto) {
    const period = await this.prisma.registrationPeriod.findUnique({
      where: { id },
    });

    if (!period) {
      throw new NotFoundException('Không tìm thấy đợt đăng ký');
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['UPCOMING', 'OPEN', 'CANCELLED'],
      UPCOMING: ['OPEN', 'CANCELLED'],
      OPEN: ['CLOSED', 'CANCELLED'],
      CLOSED: [], // Cannot change
      CANCELLED: [], // Cannot change
    };

    if (!validTransitions[period.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái từ ${period.status} sang ${dto.status}`,
      );
    }

    // Check if can cancel
    if (dto.status === RegistrationPeriodStatus.CANCELLED && period.approvedCount > 0) {
      throw new BadRequestException(
        'Không thể hủy đợt đăng ký đã có đơn được duyệt',
      );
    }

    const updated = await this.prisma.registrationPeriod.update({
      where: { id },
      data: { status: dto.status },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return this.transformToResponse(updated, new Date());
  }

  // ========================================
  // DELETE
  // ========================================
  async remove(id: number) {
    const period = await this.prisma.registrationPeriod.findUnique({
      where: { id },
    });

    if (!period) {
      throw new NotFoundException('Không tìm thấy đợt đăng ký');
    }

    // Only allow delete DRAFT or CANCELLED periods with no applications
    if (
      ![RegistrationPeriodStatus.DRAFT, RegistrationPeriodStatus.CANCELLED].includes(
        period.status as RegistrationPeriodStatus,
      )
    ) {
      throw new BadRequestException(
        'Chỉ có thể xóa đợt đăng ký ở trạng thái Nháp hoặc Đã hủy',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const appCount = await tx.registrationApplication.count({
        where: { periodId: id },
      });
      if (appCount > 0) {
        throw new BadRequestException(
          'Không thể xóa đợt đăng ký đã có đơn đăng ký',
        );
      }
      await tx.registrationPeriod.delete({ where: { id } });
    });

    return { message: 'Đã xóa đợt đăng ký thành công' };
  }

  // ========================================
  // GET STATS
  // ========================================
  async getStats(id: number): Promise<PeriodStatsDto> {
    const period = await this.prisma.registrationPeriod.findUnique({
      where: { id },
    });

    if (!period) {
      throw new NotFoundException('Không tìm thấy đợt đăng ký');
    }

    // Get application stats
    const [statusCounts, genderCounts, dailyApps] = await Promise.all([
      // By status
      this.prisma.registrationApplication.groupBy({
        by: ['status'],
        where: { periodId: id },
        _count: true,
      }),
      // By gender
      this.prisma.registrationApplication.findMany({
        where: { periodId: id },
        select: {
          student: {
            select: {
              gender: true,
              studentCode: true,
            },
          },
        },
      }),
      // Daily trend (last 14 days)
      this.prisma.registrationApplication.findMany({
        where: {
          periodId: id,
          createdAt: {
            gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          },
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Process status counts
    const statusMap: Record<string, number> = {};
    statusCounts.forEach((s) => {
      statusMap[s.status] = s._count;
    });

    // Process gender counts
    let maleCount = 0;
    let femaleCount = 0;
    const yearCounts: Record<number, number> = {};

    genderCounts.forEach((app) => {
      if (app.student.gender === 'MALE') maleCount++;
      else femaleCount++;

      // studentCode format: B22DCCN001 → chars 1-2 = "22" = enrollment year suffix
      const codeYearSuffix = parseInt(app.student.studentCode.substring(1, 3));
      const year = !isNaN(codeYearSuffix) ? 2000 + codeYearSuffix : 0;
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    });

    // Process daily applications
    const dailyMap: Record<string, number> = {};
    dailyApps.forEach((d) => {
      const dateStr = d.createdAt.toISOString().split('T')[0];
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + 1;
    });

    const liveTotal = Object.values(statusMap).reduce((sum, n) => sum + n, 0);

    return {
      totalApplications: liveTotal,
      approvedCount: statusMap['APPROVED'] || 0,
      rejectedCount: statusMap['REJECTED'] || 0,
      pendingCount: statusMap['PENDING'] || 0,
      cancelledCount: statusMap['CANCELLED'] || 0,
      maleCount,
      femaleCount,
      applicationsByYear: Object.entries(yearCounts)
        .map(([year, count]) => ({ year: parseInt(year), count }))
        .sort((a, b) => b.year - a.year),
      dailyApplications: Object.entries(dailyMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // ========================================
  // AUTO UPDATE STATUS (CRON)
  // ========================================
  @Cron(CronExpression.EVERY_HOUR)
  async autoUpdateStatuses() {
    const now = new Date();

    // Auto open UPCOMING periods
    await this.prisma.registrationPeriod.updateMany({
      where: {
        status: RegistrationPeriodStatus.UPCOMING,
        startDate: { lte: now },
      },
      data: {
        status: RegistrationPeriodStatus.OPEN,
      },
    });

    // Auto close OPEN periods
    await this.prisma.registrationPeriod.updateMany({
      where: {
        status: RegistrationPeriodStatus.OPEN,
        endDate: { lt: now },
      },
      data: {
        status: RegistrationPeriodStatus.CLOSED,
      },
    });
  }

  // ========================================
  // REFRESH STATS (called after application changes)
  // ========================================
  async refreshStats(periodId: number) {
    const counts = await this.prisma.registrationApplication.groupBy({
      by: ['status'],
      where: { periodId },
      _count: true,
    });

    let total = 0;
    let approved = 0;
    let rejected = 0;
    let pending = 0;

    counts.forEach((c) => {
      total += c._count;
      if (c.status === 'APPROVED') approved = c._count;
      if (c.status === 'REJECTED') rejected = c._count;
      if (c.status === 'PENDING') pending = c._count;
    });

    await this.prisma.registrationPeriod.update({
      where: { id: periodId },
      data: {
        totalApplications: total,
        approvedCount: approved,
        rejectedCount: rejected,
        pendingCount: pending,
      },
    });
  }

  // ========================================
  // HELPER: Transform to response
  // ========================================
  private transformToResponse(period: any, now: Date): RegistrationPeriodResponseDto {
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);

    // Calculate days remaining
    let daysRemaining: number | null = null;
    if (period.status === RegistrationPeriodStatus.OPEN && endDate > now) {
      daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Check if currently active
    const isActive =
      period.status === RegistrationPeriodStatus.OPEN &&
      startDate <= now &&
      endDate >= now;

    return {
      id: period.id,
      code: period.code,
      name: period.name,
      academicYear: period.academicYear,
      semester: period.semester,
      description: period.description,
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
      moveInDate: period.moveInDate?.toISOString(),
      moveOutDate: period.moveOutDate?.toISOString(),
      maxApplicationsPerStudent: period.maxApplicationsPerStudent,
      allowRoomPreference: period.allowRoomPreference,
      autoAssignRoom: period.autoAssignRoom,
      targetAdmissionYears: period.targetAdmissionYears as number[] | undefined,
      status: period.status,
      totalApplications: period.totalApplications,
      approvedCount: period.approvedCount,
      rejectedCount: period.rejectedCount,
      pendingCount: period.pendingCount,
      isActive,
      daysRemaining,
      createdBy: period.createdBy,
      createdAt: period.createdAt,
      updatedAt: period.updatedAt,
    };
  }
}