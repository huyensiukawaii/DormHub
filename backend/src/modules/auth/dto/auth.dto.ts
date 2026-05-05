import { IsEmail, IsString, MinLength, Matches, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, Gender } from '@prisma/client';
import { IsStudentCodeInRange } from '../../../common/validators/student-code.validator';

export class LoginDto {
  @ApiProperty({ example: 'sv20210001@hust.edu.vn' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password!: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'sv20210001@sis.hust.edu.vn' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Matches(/@sis\.hust\.edu\.vn$/, { message: 'Email phải có đuôi @sis.hust.edu.vn' })
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password!: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: '20210001', description: 'Mã số sinh viên (MSSV)' })
  @IsString()
  @Matches(/^\d+$/, { message: 'MSSV chỉ được chứa chữ số' })
  @IsStudentCodeInRange(20200000, 202600000, {
    message: 'MSSV phải nằm trong khoảng 20200000 đến 202600000',
  })
  studentCode!: string;

  @ApiProperty({ example: 'ET-E10', description: 'Mã ngành học' })
  @IsString()
  majorCode!: string;

  @ApiProperty({ example: 'MALE', enum: Gender })
  @IsEnum(Gender, { message: 'Giới tính không hợp lệ' })
  gender!: Gender;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsString()
  phone?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'sv20210001@sis.hust.edu.vn' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token nhận được qua email' })
  @IsString()
  @MinLength(32, { message: 'Token không hợp lệ' })
  token!: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  newPassword!: string;
}

export class AuthResponseDto {
  accessToken!: string;
  user!: {
    id: number;
    email: string;
    fullName: string;
    role: UserRole;
    studentCode: string;
    mustChangePassword: boolean;
    assignedBuildingIds: number[];
  };
}
