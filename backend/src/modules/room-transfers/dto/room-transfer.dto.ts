import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomTransferDto {
  @ApiProperty({ description: 'ID phòng muốn chuyển đến' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  toRoomId: number;

  @ApiProperty({ description: 'Lý do chuyển phòng', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class ReviewRoomTransferDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Lý do từ chối (bắt buộc khi từ chối)', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}

export class QueryRoomTransferDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái: PENDING | APPROVED | REJECTED | CANCELLED' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Tìm theo tên SV, MSSV hoặc mã yêu cầu' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo tòa (của phòng đích)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  buildingId?: number;
}
