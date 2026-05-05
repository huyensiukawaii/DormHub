import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto, RoomQueryDto } from './dto/room.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: RoomQueryDto, allowedBuildingIds?: number[]) {
    const { search, buildingId, floor, roomType, gender, status, hasAvailable } = query;

    const where: any = {};

    if (search) {
      where.code = { contains: search, mode: 'insensitive' };
    }
    if (allowedBuildingIds !== undefined) {
      // STAFF scope: intersect with client-supplied filter if any
      const scope = buildingId
        ? allowedBuildingIds.filter((id) => id === Number(buildingId))
        : allowedBuildingIds;
      where.buildingId = { in: scope };
    } else if (buildingId) {
      where.buildingId = buildingId;
    }
    if (floor) where.floor = floor;
    if (roomType) where.roomType = roomType;
    if (gender) where.gender = gender;
    if (status) where.status = status;

    const rooms = await this.prisma.room.findMany({
      where,
      include: {
        building: {
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: {
            contracts: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
      orderBy: [{ buildingId: 'asc' }, { floor: 'asc' }, { code: 'asc' }],
    });

    const result = rooms.map((room) => ({
      id: room.id,
      code: room.code,
      buildingId: room.buildingId,
      building: room.building,
      floor: room.floor,
      roomType: room.roomType,
      gender: room.gender,
      capacity: room.capacity,
      pricePerMonth: room.pricePerMonth,
      description: room.description,
      status: room.status,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      occupiedCount: room._count.contracts,
      availableCount: room.capacity - room._count.contracts,
    }));

    // Filter phòng còn chỗ
    if (hasAvailable) {
      return result.filter((r) => r.availableCount > 0);
    }

    return result;
  }

  async findOne(id: number) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        building: {
          select: { id: true, code: true, name: true },
        },
        contracts: {
          where: { status: 'ACTIVE' },
          include: {
            student: {
              select: {
                id: true,
                studentCode: true,
                fullName: true,
                email: true,
                phone: true,
                majorCode: true,
                className: true,
                user: {
                  select: { avatarUrl: true },
                },
              },
            },
          },
          orderBy: { startDate: 'asc' },
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng với ID ${id}`);
    }

    return {
      id: room.id,
      code: room.code,
      floor: room.floor,
      roomType: room.roomType,
      gender: room.gender,
      capacity: room.capacity,
      pricePerMonth: room.pricePerMonth,
      status: room.status,
      description: room.description,
      buildingId: room.buildingId,
      building: room.building,
      occupiedCount: room.contracts.length,
      availableCount: room.capacity - room.contracts.length,
      residents: room.contracts.map((c) => ({
        id: c.id,
        contractId: c.id,
        isRoomLeader: c.isRoomLeader,
        checkInDate: c.startDate,
        checkOutDate: c.endDate,
        contractStatus: c.status,
        student: {
          id: c.student.id,
          studentCode: c.student.studentCode,
          fullName: c.student.fullName,
          email: c.student.email,
          phone: c.student.phone,
          major: c.student.majorCode,
          classCode: c.student.className,
          avatar: c.student.user?.avatarUrl ?? null,
        },
      })),
      recentTickets: room.tickets,
    };
  }

  async create(dto: CreateRoomDto) {
    const building = await this.prisma.building.findUnique({
      where: { id: dto.buildingId },
    });

    if (!building) {
      throw new NotFoundException(`Không tìm thấy tòa nhà với ID ${dto.buildingId}`);
    }

    const existing = await this.prisma.room.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Mã phòng "${dto.code}" đã tồn tại`);
    }

    if (dto.floor > building.totalFloors) {
      throw new ConflictException(
        `Tầng ${dto.floor} vượt quá số tầng của tòa nhà (${building.totalFloors} tầng)`,
      );
    }

    return this.prisma.room.create({
      data: dto,
      include: { building: true },
    });
  }

  async update(id: number, dto: UpdateRoomDto) {
    const room = await this.findOne(id);

    if (dto.capacity !== undefined && dto.capacity < room.occupiedCount) {
      throw new ConflictException(
        `Sức chứa mới (${dto.capacity}) không thể nhỏ hơn số người đang ở (${room.occupiedCount})`,
      );
    }

    if (dto.buildingId !== undefined) {
      const building = await this.prisma.building.findUnique({
        where: { id: dto.buildingId },
      });
      if (!building) {
        throw new NotFoundException(`Không tìm thấy tòa nhà với ID ${dto.buildingId}`);
      }
    }

    if (dto.code) {
      const existing = await this.prisma.room.findFirst({
        where: {
          code: dto.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(`Mã phòng "${dto.code}" đã tồn tại`);
      }
    }

    return this.prisma.room.update({
      where: { id },
      data: dto,
      include: { building: true },
    });
  }

  async remove(id: number) {
    const room = await this.findOne(id);

    if (room.occupiedCount > 0) {
      throw new ConflictException(
        `Không thể xóa phòng đang có ${room.occupiedCount} người ở`,
      );
    }

    return this.prisma.room.delete({
      where: { id },
    });
  }
}