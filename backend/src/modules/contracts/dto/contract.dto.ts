import {
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ========================================
// ENUMS
// ========================================

export enum ContractStatus {
  ACTIVE = 'ACTIVE',
  TERMINATED = 'TERMINATED',
  EXPIRED = 'EXPIRED',
}

// ========================================
// CREATE DTO (Tạo thủ công - không qua đơn đăng ký)
// ========================================

export class CreateContractDto {
  @ApiProperty({ description: 'ID sinh viên' })
  @IsInt()
  @Type(() => Number)
  studentId: number;

  @ApiProperty({ description: 'ID phòng' })
  @IsInt()
  @Type(() => Number)
  roomId: number;

  @ApiProperty({ example: '2025-09-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-01-30' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Tiền phòng/tháng (mặc định lấy từ phòng)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyRent?: number;

  @ApiPropertyOptional({ description: 'Là trưởng phòng?', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isRoomLeader?: boolean;
}

// ========================================
// CREATE FROM APPLICATION DTO (Tạo tự động khi duyệt đơn)
// ========================================

export class CreateContractFromApplicationDto {
  @ApiProperty({ description: 'ID đơn đăng ký' })
  @IsInt()
  @Type(() => Number)
  applicationId: number;

  @ApiProperty({ description: 'ID phòng được duyệt' })
  @IsInt()
  @Type(() => Number)
  roomId: number;

  @ApiPropertyOptional({ description: 'Tiền phòng/tháng (mặc định lấy từ phòng)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyRent?: number;

  @ApiPropertyOptional({ description: 'Là trưởng phòng?' })
  @IsOptional()
  @IsBoolean()
  isRoomLeader?: boolean;
}

// ========================================
// CHECK-IN / CHECK-OUT DTO
// ========================================

export class CheckInDto {
  @ApiPropertyOptional({ description: 'Ngày check-in (mặc định = hôm nay)' })
  @IsOptional()
  @IsDateString()
  checkedInAt?: string;
}

export class CheckOutDto {
  @ApiPropertyOptional({ description: 'Ngày check-out (mặc định = hôm nay)' })
  @IsOptional()
  @IsDateString()
  checkedOutAt?: string;
}

// ========================================
// TERMINATE DTO
// ========================================

export class TerminateContractDto {
  @ApiProperty({ description: 'Lý do chấm dứt' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  terminationReason: string;

  @ApiPropertyOptional({ description: 'Ngày check-out' })
  @IsOptional()
  @IsDateString()
  checkedOutAt?: string;
}

// ========================================
// SET ROOM LEADER DTO
// ========================================

export class SetRoomLeaderDto {
  @ApiProperty({ description: 'Có phải trưởng phòng?' })
  @IsBoolean()
  isRoomLeader: boolean;
}

// ========================================
// QUERY DTO
// ========================================

export class QueryContractDto {
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

  @ApiPropertyOptional({ description: 'Tìm theo MSSV hoặc tên SV' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional({ description: 'Filter theo phòng ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roomId?: number;

  @ApiPropertyOptional({ description: 'Filter theo tòa nhà ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  buildingId?: number;

  @ApiPropertyOptional({ description: 'Filter theo sinh viên ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  studentId?: number;

  @ApiPropertyOptional({ description: 'Chỉ hợp đồng chưa check-in' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  notCheckedIn?: boolean;

  @ApiPropertyOptional({ description: 'Chỉ hợp đồng ACTIVE sắp hết hạn trong 30 ngày hoặc đã quá hạn' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  expiringSoon?: boolean;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}