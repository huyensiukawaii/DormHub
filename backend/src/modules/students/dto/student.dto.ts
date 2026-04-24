import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsInt,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

// ========================================
// ENUMS
// ========================================

export enum StudentStatus {
  ACTIVE = 'ACTIVE',
  GRADUATED = 'GRADUATED',
  SUSPENDED = 'SUSPENDED',
  DROPPED_OUT = 'DROPPED_OUT',
}

// ========================================
// CREATE STUDENT DTO
// ========================================

export class CreateStudentDto {
  @ApiProperty({ example: '20210001' })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  studentCode: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'student@sis.hust.edu.vn' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '0912345678' })
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  phone: string;

  @ApiProperty({ enum: Gender, example: 'MALE' })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: '2003-01-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ example: 'IT-E6', description: 'Mã ngành học' })
  @IsString()
  @MaxLength(50)
  major: string;

  @ApiProperty({ example: 'Việt-Nhật 01 K66' })
  @IsString()
  @MaxLength(50)
  classCode: string;

  @ApiProperty({ example: 2021, description: 'Năm nhập học' })
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  admissionYear: number;

  @ApiPropertyOptional({ example: '001203012345' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  idCardNumber?: string;

  @ApiPropertyOptional({ example: 'Hà Nội' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  hometown?: string;

  @ApiPropertyOptional({ example: 50, description: 'Khoảng cách từ quê (km)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  hometownDistance?: number;

  @ApiPropertyOptional({ example: 'Nguyễn Văn B' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactName?: string;

  @ApiPropertyOptional({ example: '0987654321' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ example: 'Bố' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  emergencyContactRelation?: string;
}

// ========================================
// UPDATE STUDENT DTO
// ========================================

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;
}

// ========================================
// QUERY STUDENT DTO
// ========================================

export class QueryStudentDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Tìm theo MSSV, tên, email, SĐT' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo mã ngành' })
  @IsOptional()
  @IsString()
  major?: string;

  @ApiPropertyOptional({ description: 'Lọc theo năm nhập học' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  admissionYear?: number;

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({ description: 'Lọc theo có đang ở KTX không' })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : value === 'true',
  )
  @IsBoolean()
  hasRoom?: boolean;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// ========================================
// IMPORT STUDENT DTO
// ========================================

export class ImportStudentDto {
  @ApiProperty({ example: '20210001' })
  @IsString()
  studentCode: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'student@sis.hust.edu.vn' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '0912345678' })
  @IsString()
  phone: string;

  @ApiProperty({ enum: ['MALE', 'FEMALE', 'Nam', 'Nữ', 'M', 'F'] })
  @IsString()
  gender: string;

  @ApiProperty({ example: '2003-01-15' })
  @IsString()
  dateOfBirth: string;

  @ApiProperty({ example: 'IT-E6' })
  @IsString()
  major: string;

  @ApiProperty({ example: 'Việt-Nhật 01 K66' })
  @IsString()
  classCode: string;

  @ApiProperty({ example: 2021 })
  admissionYear: number | string;
}

// ========================================
// RESPONSE DTOs
// ========================================

export class StudentResponseDto {
  id: number;
  studentCode: string;
  fullName: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  major: string;
  classCode: string;
  admissionYear: number;
  status: StudentStatus;
  idCardNumber?: string;
  hometown?: string;
  currentRoom?: {
    id: number;
    code: string;
    buildingName: string;
  } | null;
  hasActiveContract: boolean;
  createdAt: Date;
}

export class StudentDetailResponseDto extends StudentResponseDto {
  hometownDistance?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  user?: {
    id: number;
    email: string;
  } | null;
  currentContract?: {
    id: number;
    contractNumber: string;
    isRoomLeader: boolean;
    room: {
      id: number;
      code: string;
      buildingName: string;
    };
    startDate: string;
    endDate: string;
    status: string;
    monthlyRent: number;
    checkInDate?: string;
    checkOutDate?: string;
  } | null;
  contractHistory: Array<{
    id: number;
    contractNumber: string;
    isRoomLeader: boolean;
    room: {
      id: number;
      code: string;
      buildingName: string;
    };
    startDate: string;
    endDate: string;
    status: string;
    monthlyRent: number;
    checkInDate?: string;
    checkOutDate?: string;
  }>;
  stats: {
    totalContracts: number;
    totalInvoices: number;
    unpaidInvoices: number;
    totalTickets: number;
  };
}

export class PaginatedStudentResponseDto {
  data: StudentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ImportResultDto {
  success: number;
  failed: number;
  errors: string[];
}