import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { LoginDto, RegisterDto, ChangePasswordDto, AuthResponseDto } from './dto/auth.dto';
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

  private getResetTokenTtlMinutes(): number {
    const raw = this.configService.get<string>('RESET_PASSWORD_TTL_MINUTES', '15');
    const ttl = Number(raw);
    return Number.isFinite(ttl) && ttl > 0 ? ttl : 15;
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { student: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        studentCode: user.student?.studentCode ?? '',
      },
    };
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const userId = parseInt(dto.studentCode, 10);
    if (isNaN(userId)) {
      throw new BadRequestException('MSSV không hợp lệ');
    }

    const [existingById, existingByEmail, existingByCode] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.user.findUnique({ where: { email: dto.email } }),
      this.prisma.student.findUnique({ where: { studentCode: dto.studentCode } }),
    ]);

    if (existingById || existingByCode) {
      throw new ConflictException('MSSV đã được sử dụng');
    }
    if (existingByEmail) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        id: userId,
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: UserRole.STUDENT,
        student: {
          create: {
            studentCode: dto.studentCode,
            fullName: dto.fullName,
            majorCode: dto.majorCode,
            gender: 'MALE',
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
      },
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const isPasswordValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu cũ không đúng');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { student: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      student: user.student,
    };
  }

  async logout(user: User) {
    this.logger.log(`LOGOUT userId=${user.id} email=${user.email}`);
    return { message: 'Đã ghi nhận logout' };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
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
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Đặt lại mật khẩu thành công' };
  }
}
