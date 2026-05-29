import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AssignBuildingsDto, QueryUsersDto, CreateStaffDto, UpdateStaffDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryUsersDto) {
    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        assignedBuildings: {
          select: {
            building: { select: { id: true, code: true, name: true } },
            assignedAt: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        assignedBuildings: {
          select: {
            building: { select: { id: true, code: true, name: true } },
            assignedAt: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  async setBuildings(userId: number, dto: AssignBuildingsDto, adminId: number) {
    await this.findOne(userId);

    if (dto.buildingIds.length > 0) {
      const validBuildings = await this.prisma.building.findMany({
        where: { id: { in: dto.buildingIds } },
        select: { id: true },
      });
      if (validBuildings.length !== dto.buildingIds.length) {
        const validIds = new Set(validBuildings.map((b) => b.id));
        const invalid = dto.buildingIds.filter((id) => !validIds.has(id));
        throw new BadRequestException(`Tòa nhà không tồn tại: ${invalid.join(', ')}`);
      }
    }

    // Replace all assignments atomically
    await this.prisma.$transaction([
      this.prisma.userBuilding.deleteMany({ where: { userId } }),
      ...dto.buildingIds.map((buildingId) =>
        this.prisma.userBuilding.create({
          data: { userId, buildingId, assignedById: adminId },
        }),
      ),
    ]);

    return this.findOne(userId);
  }

  async addBuilding(userId: number, buildingId: number, adminId: number) {
    await this.findOne(userId);
    await this.prisma.building.findUniqueOrThrow({ where: { id: buildingId } });

    await this.prisma.userBuilding.upsert({
      where: { userId_buildingId: { userId, buildingId } },
      create: { userId, buildingId, assignedById: adminId },
      update: { assignedById: adminId },
    });

    return this.findOne(userId);
  }

  async removeBuilding(userId: number, buildingId: number) {
    await this.prisma.userBuilding.deleteMany({ where: { userId, buildingId } });
    return this.findOne(userId);
  }

  async getAssignedBuildingIds(userId: number): Promise<number[]> {
    const rows = await this.prisma.userBuilding.findMany({
      where: { userId },
      select: { buildingId: true },
    });
    return rows.map((r) => r.buildingId);
  }

  async createStaff(dto: CreateStaffDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email đã tồn tại');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: 'STAFF',
      },
    });

    return this.findOne(user.id);
  }

  async updateStaff(id: number, dto: UpdateStaffDto) {
    await this.findOne(id);

    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email.toLowerCase(), NOT: { id } },
      });
      if (existing) throw new ConflictException('Email đã tồn tại');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.email && { email: dto.email.toLowerCase() }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return this.findOne(id);
  }

  async removeStaff(id: number) {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Đã vô hiệu hóa tài khoản nhân viên' };
  }
}
