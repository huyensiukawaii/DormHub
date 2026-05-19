import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getAllowedBuildingIds } from '../../common/utils/building-access';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  QueryAnnouncementDto,
  ReactAnnouncementDto,
} from './dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ========================================
  // HELPERS
  // ========================================
  private reactionSummary(reactions: { emoji: string; userId: number }[], viewerId?: number) {
    const counts: Record<string, number> = {};
    let myReaction: string | null = null;
    for (const r of reactions) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
      if (viewerId && r.userId === viewerId) myReaction = r.emoji;
    }
    return { counts, myReaction, total: reactions.length };
  }

  private mapPost(post: any, viewerId?: number) {
    const { reactions, author, building, ...rest } = post;
    return {
      ...rest,
      images: (rest.images as string[] | null) ?? [],
      channelLabel: building ? building.name : 'Toàn KTX',
      author: { id: author.id, fullName: author.fullName, role: author.role },
      reactions: this.reactionSummary(reactions ?? [], viewerId),
    };
  }

  private mapPostBatch(
    post: any,
    countsMap: Record<number, Record<string, number>>,
    totalMap: Record<number, number>,
    viewerMap: Record<number, string>,
  ) {
    const { author, building, ...rest } = post;
    return {
      ...rest,
      images: (rest.images as string[] | null) ?? [],
      channelLabel: building ? building.name : 'Toàn KTX',
      author: { id: author.id, fullName: author.fullName, role: author.role },
      reactions: {
        counts: countsMap[post.id] ?? {},
        myReaction: viewerMap[post.id] ?? null,
        total: totalMap[post.id] ?? 0,
      },
    };
  }

  // ========================================
  // FIND (dùng cho cả admin và student)
  // ========================================
  async findAll(query: QueryAnnouncementDto, viewerId?: number, allowedBuildingIds?: number[]) {
    const { page = 1, limit = 20, channel } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (channel === null || channel === undefined || channel === '') {
      // Kênh "Toàn KTX"
      where.buildingId = null;
    } else {
      const bid = parseInt(channel as string, 10);
      if (isNaN(bid)) throw new BadRequestException('channel không hợp lệ');
      // Kiểm tra quyền xem kênh tòa
      if (allowedBuildingIds !== undefined && !allowedBuildingIds.includes(bid)) {
        throw new ForbiddenException('Bạn không có quyền xem kênh này');
      }
      where.buildingId = bid;
    }

    const include = {
      author: { select: { id: true, fullName: true, role: true } },
      building: { select: { id: true, name: true, code: true } },
    };

    const [pinnedPosts, normalPosts, total] = await Promise.all([
      this.prisma.announcementPost.findMany({
        where: { ...where, isPinned: true },
        include,
        orderBy: { pinnedAt: 'desc' },
        take: 3,
      }),
      this.prisma.announcementPost.findMany({
        where: { ...where, isPinned: false },
        include,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.announcementPost.count({ where: { ...where, isPinned: false } }),
    ]);

    const allPostIds = [...pinnedPosts.map((p) => p.id), ...normalPosts.map((p) => p.id)];

    const [reactionGroups, viewerReactions] = await Promise.all([
      allPostIds.length
        ? this.prisma.announcementReaction.groupBy({
            by: ['postId', 'emoji'],
            where: { postId: { in: allPostIds } },
            _count: { emoji: true },
          })
        : Promise.resolve([]),
      viewerId && allPostIds.length
        ? this.prisma.announcementReaction.findMany({
            where: { postId: { in: allPostIds }, userId: viewerId },
            select: { postId: true, emoji: true },
          })
        : Promise.resolve([]),
    ]);

    const countsMap: Record<number, Record<string, number>> = {};
    const totalMap: Record<number, number> = {};
    for (const r of reactionGroups) {
      if (!countsMap[r.postId]) { countsMap[r.postId] = {}; totalMap[r.postId] = 0; }
      countsMap[r.postId][r.emoji] = r._count.emoji;
      totalMap[r.postId] += r._count.emoji;
    }
    const viewerMap: Record<number, string> = {};
    for (const r of viewerReactions) {
      viewerMap[r.postId] = r.emoji;
    }

    return {
      pinned: pinnedPosts.map((p) => this.mapPostBatch(p, countsMap, totalMap, viewerMap)),
      data: normalPosts.map((p) => this.mapPostBatch(p, countsMap, totalMap, viewerMap)),
      total,
      totalPages: Math.ceil(total / limit),
      page,
    };
  }

  // ========================================
  // GET CHANNELS (danh sách kênh có thể xem)
  // ========================================
  async getChannels(allowedBuildingIds?: number[]) {
    const where = allowedBuildingIds !== undefined
      ? { id: { in: allowedBuildingIds }, status: 'ACTIVE' as any }
      : { status: 'ACTIVE' as any };

    const buildings = await this.prisma.building.findMany({
      where,
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });

    return [
      { id: null, code: 'GLOBAL', name: 'Toàn KTX' },
      ...buildings.map((b) => ({ id: b.id, code: b.code, name: b.name })),
    ];
  }

  // ========================================
  // HELPERS — notification
  // ========================================
  private async getStudentUserIdsByBuilding(buildingId: number | null): Promise<number[]> {
    const contracts = await this.prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        ...(buildingId !== null && { room: { buildingId } }),
      },
      select: { student: { select: { userId: true } } },
    });
    return contracts.map((c) => c.student.userId);
  }

  // ========================================
  // CREATE
  // ========================================
  async create(dto: CreateAnnouncementDto, user: any) {
    const allowedBuildingIds = getAllowedBuildingIds(user);

    if (dto.buildingId == null) {
      // Kênh Toàn KTX — chỉ ADMIN
      if (user.role !== 'ADMIN') {
        throw new ForbiddenException('Chỉ Admin mới được đăng lên kênh Toàn KTX');
      }
    } else {
      // Kênh tòa — kiểm tra quyền
      if (allowedBuildingIds !== undefined && !allowedBuildingIds.includes(dto.buildingId)) {
        throw new ForbiddenException('Bạn không có quyền đăng lên kênh tòa này');
      }
      // Kiểm tra tòa tồn tại
      const building = await this.prisma.building.findUnique({ where: { id: dto.buildingId } });
      if (!building) throw new NotFoundException('Không tìm thấy tòa nhà');
    }

    const post = await this.prisma.announcementPost.create({
      data: {
        buildingId: dto.buildingId ?? null,
        title: dto.title,
        content: dto.content,
        images: dto.images ?? [],
        authorId: user.id,
      },
      include: {
        author: { select: { id: true, fullName: true, role: true } },
        building: { select: { id: true, name: true, code: true } },
        reactions: { select: { userId: true, emoji: true } },
      },
    });

    // Gửi noti bất đồng bộ — không block response
    const channelLabel = post.building ? (post.building as any).name : 'Toàn KTX';
    this.getStudentUserIdsByBuilding(dto.buildingId ?? null).then((userIds) => {
      if (userIds.length === 0) return;
      return this.notifications.createMany(userIds, {
        title: `📢 Thông báo mới — ${channelLabel}`,
        content: post.title,
        type: 'ANNOUNCEMENT',
        referenceType: 'ANNOUNCEMENT_POST',
        referenceId: post.id,
      });
    }).catch(() => {/* không crash nếu noti lỗi */});

    return this.mapPost(post, user.id);
  }

  // ========================================
  // UPDATE
  // ========================================
  async update(id: number, dto: UpdateAnnouncementDto, user: any) {
    const post = await this.prisma.announcementPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Không tìm thấy bài đăng');

    if (user.role !== 'ADMIN' && post.authorId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể sửa bài của mình');
    }

    const updated = await this.prisma.announcementPost.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.images !== undefined && { images: dto.images }),
      },
      include: {
        author: { select: { id: true, fullName: true, role: true } },
        building: { select: { id: true, name: true, code: true } },
        reactions: { select: { userId: true, emoji: true } },
      },
    });

    return this.mapPost(updated, user.id);
  }

  // ========================================
  // DELETE
  // ========================================
  async remove(id: number, user: any) {
    const post = await this.prisma.announcementPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Không tìm thấy bài đăng');

    if (user.role !== 'ADMIN' && post.authorId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể xóa bài của mình');
    }

    await this.prisma.announcementPost.delete({ where: { id } });
    return { success: true };
  }

  // ========================================
  // PIN / UNPIN
  // ========================================
  async setPin(id: number, isPinned: boolean, user: any) {
    const post = await this.prisma.announcementPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Không tìm thấy bài đăng');

    const allowedBuildingIds = getAllowedBuildingIds(user);
    if (allowedBuildingIds !== undefined && post.buildingId !== null) {
      if (!allowedBuildingIds.includes(post.buildingId)) {
        throw new ForbiddenException('Bạn không có quyền ghim bài trong kênh này');
      }
    }

    await this.prisma.announcementPost.update({
      where: { id },
      data: { isPinned, pinnedAt: isPinned ? new Date() : null },
    });

    return { success: true, isPinned };
  }

  // ========================================
  // REACT (upsert — đổi emoji hoặc bỏ react)
  // ========================================
  async react(postId: number, dto: ReactAnnouncementDto, userId: number, allowedBuildingIds?: number[]) {
    const post = await this.prisma.announcementPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Không tìm thấy bài đăng');

    if (allowedBuildingIds !== undefined && post.buildingId !== null) {
      if (!allowedBuildingIds.includes(post.buildingId)) {
        throw new ForbiddenException('Bạn không có quyền react bài đăng này');
      }
    }

    const existing = await this.prisma.announcementReaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      if (existing.emoji === dto.emoji) {
        // Cùng emoji → bỏ react (toggle off)
        await this.prisma.announcementReaction.delete({
          where: { postId_userId: { postId, userId } },
        });
        return { action: 'removed', emoji: null };
      }
      // Đổi emoji
      await this.prisma.announcementReaction.update({
        where: { postId_userId: { postId, userId } },
        data: { emoji: dto.emoji },
      });
      return { action: 'updated', emoji: dto.emoji };
    }

    await this.prisma.announcementReaction.create({
      data: { postId, userId, emoji: dto.emoji },
    });
    return { action: 'added', emoji: dto.emoji };
  }

  // ========================================
  // GET STUDENT CHANNELS (kênh Toàn KTX + tòa đang ở)
  // ========================================
  async getStudentChannels(studentId: number) {
    const activeContract = await this.prisma.contract.findFirst({
      where: { studentId, status: 'ACTIVE' as any },
      include: { room: { include: { building: { select: { id: true, code: true, name: true } } } } },
    });

    const channels: { id: number | null; code: string; name: string }[] = [
      { id: null, code: 'GLOBAL', name: 'Toàn KTX' },
    ];

    if (activeContract) {
      const b = (activeContract.room as any).building;
      channels.push({ id: b.id, code: b.code, name: b.name });
    }

    return channels;
  }
}
