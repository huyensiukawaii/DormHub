import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateMeterReadingDto,
  BatchCreateMeterReadingDto,
  UpdateMeterReadingDto,
  QueryMeterReadingDto,
  QueryRoomsForReadingDto,
  MeterType,
} from './dto';

@Injectable()
export class MetersService {
  constructor(private prisma: PrismaService) {}

  // ========================================
  // GET ROOMS FOR READING (Admin chọn tháng + loại → DS phòng)
  // ========================================
  async getRoomsForReading(query: QueryRoomsForReadingDto) {
    const { meterType, readingMonth, buildingId } = query;
    const monthDate = new Date(readingMonth);
    // Chuẩn hóa về ngày 1
    monthDate.setDate(1);

    // Lấy phòng ACTIVE có người ở
    const roomWhere: any = { status: 'ACTIVE' };
    if (buildingId) roomWhere.buildingId = buildingId;

    const rooms = await this.prisma.room.findMany({
      where: roomWhere,
      include: {
        building: { select: { id: true, code: true, name: true } },
        contracts: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
      },
      orderBy: [{ buildingId: 'asc' }, { code: 'asc' }],
    });

    // Chỉ lấy phòng có người ở
    const occupiedRooms = rooms.filter((r) => r.contracts.length > 0);

    // Lấy readings đã ghi cho tháng này
    const existingReadings = await this.prisma.meterReading.findMany({
      where: {
        meterType,
        readingMonth: monthDate,
        roomId: { in: occupiedRooms.map((r) => r.id) },
      },
    });

    const readingMap = new Map(existingReadings.map((r) => [r.roomId, r]));

    // Lấy reading tháng trước để hiển thị chỉ số trước
    const prevMonth = new Date(monthDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);

    const prevReadings = await this.prisma.meterReading.findMany({
      where: {
        meterType,
        readingMonth: prevMonth,
        roomId: { in: occupiedRooms.map((r) => r.id) },
      },
    });

    const prevMap = new Map(prevReadings.map((r) => [r.roomId, r]));

    return occupiedRooms.map((room) => {
      const existing = readingMap.get(room.id);
      const prev = prevMap.get(room.id);

      return {
        roomId: room.id,
        roomCode: room.code,
        buildingCode: room.building.code,
        buildingName: room.building.name,
        floor: room.floor,
        occupants: room.contracts.length,
        // Chỉ số trước (từ tháng trước hoặc từ reading đã ghi)
        previousReading: existing
          ? Number(existing.previousReading)
          : prev
          ? Number(prev.currentReading)
          : 0,
        // Đã ghi chưa?
        hasReading: !!existing,
        currentReading: existing ? Number(existing.currentReading) : null,
        consumption: existing ? Number(existing.consumption) : null,
        readingId: existing?.id || null,
      };
    });
  }

  // ========================================
  // CREATE SINGLE READING
  // ========================================
  async create(dto: CreateMeterReadingDto, recordedById: number) {
    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException('Không tìm thấy phòng');

    const monthDate = new Date(dto.readingMonth);
    monthDate.setDate(1);

    // Check duplicate
    const existing = await this.prisma.meterReading.findUnique({
      where: {
        roomId_meterType_readingMonth: {
          roomId: dto.roomId,
          meterType: dto.meterType,
          readingMonth: monthDate,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Đã ghi chỉ số ${dto.meterType === 'ELECTRICITY' ? 'điện' : 'nước'} cho phòng này tháng này rồi`,
      );
    }

    // Lấy chỉ số trước
    let previousReading = dto.previousReading;
    if (previousReading === undefined || previousReading === null) {
      const prevMonth = new Date(monthDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);

      const prev = await this.prisma.meterReading.findUnique({
        where: {
          roomId_meterType_readingMonth: {
            roomId: dto.roomId,
            meterType: dto.meterType,
            readingMonth: prevMonth,
          },
        },
      });
      previousReading = prev ? Number(prev.currentReading) : 0;
    }

    // Validate
    if (dto.currentReading < previousReading) {
      throw new BadRequestException(
        `Chỉ số hiện tại (${dto.currentReading}) không thể nhỏ hơn chỉ số trước (${previousReading})`,
      );
    }

    const consumption = dto.currentReading - previousReading;

    return this.prisma.meterReading.create({
      data: {
        roomId: dto.roomId,
        meterType: dto.meterType,
        readingMonth: monthDate,
        previousReading,
        currentReading: dto.currentReading,
        consumption,
        recordedById,
      },
      include: {
        room: {
          include: { building: { select: { code: true, name: true } } },
        },
        recordedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  // ========================================
  // BATCH CREATE
  // ========================================
  async batchCreate(dto: BatchCreateMeterReadingDto, recordedById: number) {
    const monthDate = new Date(dto.readingMonth);
    monthDate.setDate(1);

    const results: { roomId: number; success: boolean; error?: string }[] = [];

    for (const item of dto.readings) {
      try {
        await this.create(
          {
            roomId: item.roomId,
            meterType: dto.meterType,
            readingMonth: dto.readingMonth,
            currentReading: item.currentReading,
          },
          recordedById,
        );
        results.push({ roomId: item.roomId, success: true });
      } catch (err: any) {
        results.push({
          roomId: item.roomId,
          success: false,
          error: err.message || 'Lỗi không xác định',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      message: `Đã ghi ${successCount}/${dto.readings.length} phòng thành công`,
      successCount,
      failCount,
      results,
    };
  }

  // ========================================
  // UPDATE READING
  // ========================================
  async update(id: number, dto: UpdateMeterReadingDto) {
    const reading = await this.prisma.meterReading.findUnique({ where: { id } });
    if (!reading) throw new NotFoundException('Không tìm thấy bản ghi');

    const previousReading = Number(reading.previousReading);
    if (dto.currentReading < previousReading) {
      throw new BadRequestException(
        `Chỉ số hiện tại (${dto.currentReading}) không thể nhỏ hơn chỉ số trước (${previousReading})`,
      );
    }

    const consumption = dto.currentReading - previousReading;

    return this.prisma.meterReading.update({
      where: { id },
      data: {
        currentReading: dto.currentReading,
        consumption,
      },
      include: {
        room: {
          include: { building: { select: { code: true, name: true } } },
        },
      },
    });
  }

  // ========================================
  // DELETE READING
  // ========================================
  async remove(id: number) {
    const reading = await this.prisma.meterReading.findUnique({ where: { id } });
    if (!reading) throw new NotFoundException('Không tìm thấy bản ghi');

    await this.prisma.meterReading.delete({ where: { id } });
    return { message: 'Đã xóa bản ghi chỉ số' };
  }

  // ========================================
  // FIND ALL (Paginated)
  // ========================================
  async findAll(query: QueryMeterReadingDto) {
    const {
      page = 1, limit = 20, roomId, buildingId, meterType,
      readingMonth, search, sortBy = 'readingMonth', sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (roomId) where.roomId = roomId;
    if (buildingId) where.room = { buildingId };
    if (meterType) where.meterType = meterType;
    if (readingMonth) {
      const d = new Date(readingMonth);
      d.setDate(1);
      where.readingMonth = d;
    }
    if (search) {
      where.room = {
        ...where.room,
        code: { contains: search, mode: 'insensitive' },
      };
    }

    const orderBy: any = {};
    if (['readingMonth', 'consumption', 'currentReading', 'recordedAt'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.readingMonth = 'desc';
    }

    const [readings, total] = await Promise.all([
      this.prisma.meterReading.findMany({
        where, skip, take: limit, orderBy,
        include: {
          room: {
            include: { building: { select: { id: true, code: true, name: true } } },
          },
          recordedBy: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.meterReading.count({ where }),
    ]);

    return {
      data: readings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================================
  // GET ROOM HISTORY (Lịch sử chỉ số 1 phòng)
  // ========================================
  async getRoomHistory(roomId: number, meterType?: MeterType, months: number = 12) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { building: { select: { code: true, name: true } } },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng');

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    const where: any = {
      roomId,
      readingMonth: { gte: cutoff },
    };
    if (meterType) where.meterType = meterType;

    const readings = await this.prisma.meterReading.findMany({
      where,
      orderBy: [{ readingMonth: 'desc' }, { meterType: 'asc' }],
      include: {
        recordedBy: { select: { id: true, fullName: true } },
      },
    });

    return {
      room: {
        id: room.id,
        code: room.code,
        buildingName: room.building.name,
      },
      readings,
    };
  }

  // ========================================
  // STATS (Thống kê tháng)
  // ========================================
  async getMonthlyStats(readingMonth: string) {
    const monthDate = new Date(readingMonth);
    monthDate.setDate(1);

    // Tổng phòng đang hoạt động có người
    const totalOccupiedRooms = await this.prisma.room.count({
      where: {
        status: 'ACTIVE',
        contracts: { some: { status: 'ACTIVE' } },
      },
    });

    // Đã ghi điện
    const elecRecorded = await this.prisma.meterReading.count({
      where: { meterType: 'ELECTRICITY', readingMonth: monthDate },
    });

    // Đã ghi nước
    const waterRecorded = await this.prisma.meterReading.count({
      where: { meterType: 'WATER', readingMonth: monthDate },
    });

    // Tổng tiêu thụ
    const elecAgg = await this.prisma.meterReading.aggregate({
      where: { meterType: 'ELECTRICITY', readingMonth: monthDate },
      _sum: { consumption: true },
      _avg: { consumption: true },
      _max: { consumption: true },
    });

    const waterAgg = await this.prisma.meterReading.aggregate({
      where: { meterType: 'WATER', readingMonth: monthDate },
      _sum: { consumption: true },
      _avg: { consumption: true },
      _max: { consumption: true },
    });

    return {
      month: monthDate.toISOString(),
      totalOccupiedRooms,
      electricity: {
        recorded: elecRecorded,
        remaining: totalOccupiedRooms - elecRecorded,
        totalConsumption: Number(elecAgg._sum.consumption || 0),
        avgConsumption: Number(elecAgg._avg.consumption || 0),
        maxConsumption: Number(elecAgg._max.consumption || 0),
        unit: 'kWh',
      },
      water: {
        recorded: waterRecorded,
        remaining: totalOccupiedRooms - waterRecorded,
        totalConsumption: Number(waterAgg._sum.consumption || 0),
        avgConsumption: Number(waterAgg._avg.consumption || 0),
        maxConsumption: Number(waterAgg._max.consumption || 0),
        unit: 'm³',
      },
    };
  }
}