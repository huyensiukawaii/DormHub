import {
  IsInt, IsOptional, IsString, IsEnum, IsArray,
  Min, Max, MaxLength, ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory, TicketStatus, TicketPriority } from '@prisma/client';

export { TicketCategory, TicketStatus, TicketPriority };

// ========================================
// STUDENT: Tạo ticket
// ========================================
export class CreateTicketDto {
  @ApiProperty({ enum: TicketCategory })
  @IsEnum(TicketCategory)
  category: TicketCategory;

  @ApiProperty({ example: 'Bóng đèn phòng tắm hỏng' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Bóng đèn nhà tắm không sáng từ tối qua' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'URLs ảnh đính kèm (tối đa 3)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(3)
  images?: string[];
}

// ========================================
// STAFF/ADMIN: Cập nhật trạng thái + ghi chú
// ========================================
export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ example: 'Đã liên hệ thợ điện, hẹn 14h chiều nay' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNote?: string;
}

// ========================================
// STAFF/ADMIN: Reject ticket
// ========================================
export class RejectTicketDto {
  @ApiProperty({ example: 'Không thuộc phạm vi bảo trì KTX' })
  @IsString()
  @MaxLength(1000)
  rejectionReason: string;
}

// ========================================
// STUDENT: Đánh giá sau hoàn thành
// ========================================
export class RateTicketDto {
  @ApiProperty({ example: 4, description: '1-5 sao' })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @ApiPropertyOptional({ example: 'Xử lý nhanh, cảm ơn!' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ratingComment?: string;
}

// ========================================
// QUERY
// ========================================
export class QueryTicketDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roomId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  buildingId?: number;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketCategory })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Tìm theo mã ticket, tiêu đề, mã phòng' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}