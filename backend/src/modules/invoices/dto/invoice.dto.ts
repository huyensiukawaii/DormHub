import {
  IsInt, IsOptional, IsString, IsEnum, IsDateString, IsIn, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { InvoiceStatus, InvoiceType } from '@prisma/client';

export { InvoiceStatus, InvoiceType };

// ========================================
// CREATE UTILITY INVOICE (Staff/Admin)
// ========================================
export class CreateUtilityInvoiceDto {
  @ApiProperty({ description: 'Room ID' })
  @IsInt()
  @Type(() => Number)
  roomId: number;

  @ApiProperty({ example: '2026-04-01', description: 'Tháng hóa đơn (ngày 1 của tháng)' })
  @IsDateString()
  billingMonth: string;
}

// ========================================
// BATCH CREATE UTILITY (nhiều phòng)
// ========================================
export class BatchCreateUtilityDto {
  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  billingMonth: string;

  @ApiPropertyOptional({ description: 'Lọc theo tòa nhà' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  buildingId?: number;
}

// ========================================
// CONFIRM PAYMENT (Staff/Admin xác nhận)
// ========================================
export class ConfirmPaymentDto {
  @ApiPropertyOptional({ description: 'Ghi chú xác nhận' })
  @IsOptional()
  @IsString()
  note?: string;
}

// ========================================
// UPLOAD PAYMENT PROOF (Trưởng phòng)
// ========================================
export class UploadProofDto {
  @ApiProperty({ description: 'URL ảnh minh chứng chuyển khoản' })
  @IsString()
  paymentProof: string;
}

// ========================================
// REJECT PAYMENT PROOF (Staff/Admin)
// ========================================
export class RejectProofDto {
  @ApiProperty({ description: 'Lý do từ chối minh chứng thanh toán' })
  @IsString()
  rejectionNote: string;
}

// ========================================
// QUERY INVOICES
// ========================================
export class QueryInvoiceDto {
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
  studentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  buildingId?: number;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ enum: InvoiceType })
  @IsOptional()
  @IsEnum(InvoiceType)
  type?: InvoiceType;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsDateString()
  billingMonth?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã phòng hoặc mã HĐ' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}