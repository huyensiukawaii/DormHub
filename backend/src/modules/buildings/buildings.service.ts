import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateBuildingDto, UpdateBuildingDto, BuildingQueryDto } from './dto/building.dto';

@Injectable()
export class BuildingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: BuildingQueryDto, allowedBuildingIds?: number[]) {
    const { search, status } = query;

    const where: any = {};

    if (allowedBuildingIds) {
      where.id = { in: allowedBuildingIds };
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;

    const buildings = await this.prisma.building.findMany({
      where,
      include: {
        _count: {
          select: { rooms: true },
        },
        rooms: {
          include: {
            _count: {
              select: { contracts: { where: { status: 'ACTIVE' } } },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    // Tính thống kê cho mỗi tòa
    return buildings.map((building) => {
      const totalCapacity = building.rooms.reduce(
        (sum, room) => sum + room.capacity,
        0,
      );
      const occupiedSlots = building.rooms.reduce(
        (sum, room) => sum + room._count.contracts,
        0,
      );

      return {
        id: building.id,
        code: building.code,
        name: building.name,
        totalFloors: building.totalFloors,
        description: building.description,
        status: building.status,
        createdAt: building.createdAt,
        updatedAt: building.updatedAt,
        stats: {
          totalRooms: building._count.rooms,
          totalCapacity,
          occupiedCount: occupiedSlots,
          availableCount: totalCapacity - occupiedSlots,
          occupancyRate: totalCapacity > 0 ? Math.round((occupiedSlots / totalCapacity) * 100) : 0,
        },
      };
    });
  }

  async findOne(id: number) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        rooms: {
          include: {
            _count: {
              select: { contracts: { where: { status: 'ACTIVE' } } },
            },
          },
          orderBy: { code: 'asc' },
        },
      },
    });

    if (!building) {
      throw new NotFoundException(`Không tìm thấy tòa nhà với ID ${id}`);
    }

    // Tính thống kê
    const totalCapacity = building.rooms.reduce(
      (sum, room) => sum + room.capacity,
      0,
    );
    const occupiedSlots = building.rooms.reduce(
      (sum, room) => sum + room._count.contracts,
      0,
    );

    const rooms = building.rooms.map((room) => ({
      id: room.id,
      code: room.code,
      buildingId: room.buildingId,
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

    return {
      id: building.id,
      code: building.code,
      name: building.name,
      totalFloors: building.totalFloors,
      description: building.description,
      status: building.status,
      createdAt: building.createdAt,
      updatedAt: building.updatedAt,
      rooms,
      stats: {
        totalRooms: rooms.length,
        totalCapacity,
        occupiedCount: occupiedSlots,
        availableCount: totalCapacity - occupiedSlots,
        occupancyRate: totalCapacity > 0 ? Math.round((occupiedSlots / totalCapacity) * 100) : 0,
      },
    };
  }

  async create(dto: CreateBuildingDto) {
    // Check mã tòa nhà đã tồn tại
    const existing = await this.prisma.building.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Mã tòa nhà "${dto.code}" đã tồn tại`);
    }

    return this.prisma.building.create({
      data: dto,
    });
  }

  async update(id: number, dto: UpdateBuildingDto) {
    await this.findOne(id);

    // Check mã tòa nhà nếu đổi
    if (dto.code) {
      const existing = await this.prisma.building.findFirst({
        where: {
          code: dto.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(`Mã tòa nhà "${dto.code}" đã tồn tại`);
      }
    }

    return this.prisma.building.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    const building = await this.findOne(id);

    // Check có phòng không
    const roomCount = await this.prisma.room.count({
      where: { buildingId: id },
    });

    if (roomCount > 0) {
      throw new ConflictException(
        `Không thể xóa tòa nhà đang có ${roomCount} phòng. Vui lòng xóa các phòng trước.`,
      );
    }

    return this.prisma.building.delete({
      where: { id },
    });
  }
}