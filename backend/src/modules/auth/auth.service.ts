import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';
import { UserRole } from '@prisma/client';
import type { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailerService: MailerService,
  ) {}

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private getResetTokenTtlMinutes(): number {
    const raw = this.configService.get<string>('RESET_PASSWORD_TTL_MINUTES', '15');
    const ttl = Number(raw);
    return Number.isFinite(ttl) && ttl > 0 ? ttl : 15;
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const normalizedEmail = this.normalizeEmail(dto.email);

    const candidates = await this.prisma.user.findMany({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      include: { student: true },
    });

    // Tách riêng: tài khoản bị khóa vs email không tồn tại
    const activeUser = candidates.find((u) => u.isActive);
    if (!activeUser) {
      if (candidates.length > 0) {
        throw new UnauthorizedException('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
      }
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, activeUser.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const user = activeUser;

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        studentCode: user.student?.studentCode ?? '',
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const normalizedEmail = this.normalizeEmail(dto.email);

    const [existingByEmail, existingByCode] = await Promise.all([
      this.prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      }),
      this.prisma.student.findUnique({
        where: { studentCode: dto.studentCode },
        include: { user: { select: { isActive: true } } },
      }),
    ]);

    if (existingByCode) {
      // Sinh viên đã có trong hệ thống (do admin tạo/import) → hướng dẫn đăng nhập
      throw new ConflictException(
        'Tài khoản của bạn đã được tạo sẵn trong hệ thống. Vui lòng đăng nhập bằng email và mật khẩu mặc định là MSSV của bạn.',
      );
    }
    if (existingByEmail) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Dùng auto-increment cho user.id, KHÔNG đặt id = MSSV để tránh conflict với sequence
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: UserRole.STUDENT,
        student: {
          create: {
            studentCode: dto.studentCode,
            fullName: dto.fullName,
            majorCode: dto.majorCode,
            gender: dto.gender,
          },
        },
      },
      include: { student: true },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        studentCode: dto.studentCode,
        mustChangePassword: false, // tự đăng ký = tự chọn mật khẩu, không cần nhắc
      },
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: {
          include: {
            contracts: {
              where: { status: 'ACTIVE' },
              include: { room: { include: { building: true } } },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const activeContract = user.student?.contracts?.[0] ?? null;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      student: user.student,
      currentRoom: activeContract
        ? {
            id: activeContract.room.id,
            code: activeContract.room.code,
            buildingName: activeContract.room.building.name,
          }
        : null,
    };
  }

  async logout(user: User) {
    this.logger.log(`LOGOUT userId=${user.id} email=${user.email}`);
    return { message: 'Đã ghi nhận logout' };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = this.normalizeEmail(email);

    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    // Tránh user-enumeration: luôn trả về OK.
    if (!user) {
      return {
        message:
          'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
      };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const ttlMinutes = this.getResetTokenTtlMinutes();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;

    try {
      await this.mailerService.sendPasswordResetEmail(user.email, resetUrl, rawToken);
    } catch (err: any) {
      this.logger.error(`Gửi mail reset thất bại email=${user.email}`, err?.stack ?? err);
      // Vẫn trả OK để không lộ trạng thái.
    }

    return {
      message:
        'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const rawToken = token.trim();
    if (!rawToken) {
      throw new BadRequestException('Token không hợp lệ');
    }

    const tokenHash = this.hashToken(rawToken);

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, mustChangePassword: false },
      }),
      this.prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Đặt lại mật khẩu thành công' };
  }
}
