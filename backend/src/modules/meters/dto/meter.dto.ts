import {
  IsInt,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeterType } from '@prisma/client';

export { MeterType };

// ========================================
// CREATE SINGLE READING
// ========================================

export class CreateMeterReadingDto {
  @ApiProperty({ description: 'Room ID' })
  @IsInt()
  @Type(() => Number)
  roomId: number;

  @ApiProperty({ enum: MeterType })
  @IsEnum(MeterType)
  meterType: MeterType;

  @ApiProperty({ example: '2026-04-01', description: 'Tháng ghi (ngày 1 của tháng)' })
  @IsDateString()
  readingMonth: string;

  @ApiProperty({ example: 1250.5, description: 'Chỉ số hiện tại' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  currentReading: number;

  @ApiPropertyOptional({ description: 'Chỉ số trước (tự lấy nếu bỏ trống)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  previousReading?: number;
}

// ========================================
// BATCH CREATE (Ghi nhiều phòng cùng lúc)
// ========================================

export class BatchReadingItemDto {
  @ApiProperty({ description: 'Room ID' })
  @IsInt()
  @Type(() => Number)
  roomId: number;

  @ApiProperty({ example: 1250.5 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  currentReading: number;
}

export class BatchCreateMeterReadingDto {
  @ApiProperty({ enum: MeterType })
  @IsEnum(MeterType)
  meterType: MeterType;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  readingMonth: string;

  @ApiProperty({ type: [BatchReadingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchReadingItemDto)
  readings: BatchReadingItemDto[];
}

// ========================================
// UPDATE READING
// ========================================

export class UpdateMeterReadingDto {
  @ApiProperty({ example: 1260 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  currentReading: number;
}

// ========================================
// QUERY DTO
// ========================================

export class QueryMeterReadingDto {
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

  @ApiPropertyOptional({ enum: MeterType })
  @IsOptional()
  @IsEnum(MeterType)
  meterType?: MeterType;

  @ApiPropertyOptional({ example: '2026-04-01', description: 'Filter theo tháng' })
  @IsOptional()
  @IsDateString()
  readingMonth?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã phòng' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 'readingMonth' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'readingMonth';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// ========================================
// ROOMS FOR READING (lấy DS phòng để ghi chỉ số)
// ========================================

export class QueryRoomsForReadingDto {
  @ApiProperty({ enum: MeterType })
  @IsEnum(MeterType)
  meterType: MeterType;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  readingMonth: string;

  @ApiPropertyOptional({ description: 'Filter theo tòa nhà ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  buildingId?: number;
}