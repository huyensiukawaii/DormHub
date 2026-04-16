import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsDateString,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// ========================================
// ENUMS
// ========================================

export enum RegistrationPeriodStatus {
  DRAFT = 'DRAFT',
  UPCOMING = 'UPCOMING',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

// ========================================
// CREATE DTO
// ========================================

export class CreateRegistrationPeriodDto {
  @ApiProperty({ example: '2025-2026-HK1' })
  @IsString()
  @MinLength(5)
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Đăng ký KTX HK1 năm học 2025-2026' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '2025-2026' })
  @IsString()
  @MinLength(9)
  @MaxLength(9)
  academicYear: string;

  @ApiProperty({ example: 1, description: 'Học kỳ (1 hoặc 2)' })
  @IsInt()
  @Min(1)
  @Max(2)
  @Type(() => Number)
  semester: number;

  @ApiPropertyOptional({ example: 'Đợt đăng ký dành cho sinh viên năm nhất...' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: '2025-08-01T00:00:00Z', description: 'Ngày bắt đầu đăng ký' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-08-15T23:59:59Z', description: 'Ngày kết thúc đăng ký' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: '2025-09-01', description: 'Ngày nhận phòng' })
  @IsOptional()
  @IsDateString()
  moveInDate?: string;

  @ApiPropertyOptional({ example: '2026-01-15', description: 'Ngày trả phòng' })
  @IsOptional()
  @IsDateString()
  moveOutDate?: string;

  @ApiPropertyOptional({ example: 1, description: 'Số đơn tối đa mỗi SV', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  maxApplicationsPerStudent?: number;

  @ApiPropertyOptional({ example: false, description: 'Cho phép chọn phòng ưu tiên' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  allowRoomPreference?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Tự động xếp phòng' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  autoAssignRoom?: boolean;

  @ApiPropertyOptional({ 
    example: [2024, 2025], 
    description: 'Các khóa được phép đăng ký (năm nhập học). Để trống = tất cả' 
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  targetAdmissionYears?: number[];

  @ApiPropertyOptional({ enum: RegistrationPeriodStatus, default: 'DRAFT' })
  @IsOptional()
  @IsEnum(RegistrationPeriodStatus)
  status?: RegistrationPeriodStatus;
}

// ========================================
// UPDATE DTO
// ========================================

export class UpdateRegistrationPeriodDto extends PartialType(CreateRegistrationPeriodDto) {}

// ========================================
// QUERY DTO
// ========================================

export class QueryRegistrationPeriodDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Tìm theo mã hoặc tên' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2025-2026' })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semester?: number;

  @ApiPropertyOptional({ enum: RegistrationPeriodStatus })
  @IsOptional()
  @IsEnum(RegistrationPeriodStatus)
  status?: RegistrationPeriodStatus;

  @ApiPropertyOptional({ description: 'Chỉ lấy đợt đang mở' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  activeOnly?: boolean;

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
// UPDATE STATUS DTO
// ========================================

export class UpdateStatusDto {
  @ApiProperty({ enum: RegistrationPeriodStatus })
  @IsEnum(RegistrationPeriodStatus)
  status: RegistrationPeriodStatus;
}

// ========================================
// RESPONSE DTOs
// ========================================

export class RegistrationPeriodResponseDto {
  id: number;
  code: string;
  name: string;
  academicYear: string;
  semester: number;
  description?: string;
  startDate: string;
  endDate: string;
  moveInDate?: string;
  moveOutDate?: string;
  maxApplicationsPerStudent: number;
  allowRoomPreference: boolean;
  autoAssignRoom: boolean;
  targetAdmissionYears?: number[];
  status: RegistrationPeriodStatus;
  
  // Stats
  totalApplications: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  
  // Computed
  isActive: boolean;
  daysRemaining: number | null;
  
  createdBy?: {
    id: number;
    fullName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedRegistrationPeriodResponseDto {
  data: RegistrationPeriodResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ========================================
// STATS DTO
// ========================================

export class PeriodStatsDto {
  totalApplications: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  cancelledCount: number;
  
  // By gender
  maleCount: number;
  femaleCount: number;
  
  // By year
  applicationsByYear: {
    year: number;
    count: number;
  }[];
  
  // Daily trend
  dailyApplications: {
    date: string;
    count: number;
  }[];
}