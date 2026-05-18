import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export const VALID_EMOJIS = ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'] as const;
export type EmojiType = (typeof VALID_EMOJIS)[number];

export class CreateAnnouncementDto {
  @ApiPropertyOptional({ description: 'null = kênh Toàn KTX; có giá trị = kênh tòa cụ thể' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  buildingId?: number;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ type: [String], description: 'Cloudinary URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class UpdateAnnouncementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class QueryAnnouncementDto {
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
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'null hoặc bỏ qua = Toàn KTX; số nguyên = buildingId' })
  @IsOptional()
  @Transform(({ value }) => (value === 'null' || value === '' ? null : value))
  channel?: string | null;
}

export class ReactAnnouncementDto {
  @ApiProperty({ enum: VALID_EMOJIS })
  @IsIn(VALID_EMOJIS)
  emoji: EmojiType;
}

export class PinAnnouncementDto {
  @ApiProperty()
  @IsBoolean()
  isPinned: boolean;
}
