import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertSettingDto {
  @ApiProperty({ example: 'electricity_tier_1_price' })
  @IsString()
  @MaxLength(100)
  key: string;

  @ApiProperty({ example: '1728' })
  @IsString()
  @MaxLength(5000)
  value: string;

  @ApiPropertyOptional({ example: 'Giá điện bậc 1 (đ/kWh)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class BulkUpsertSettingsDto {
  @ApiProperty({ type: [UpsertSettingDto] })
  settings: UpsertSettingDto[];
}