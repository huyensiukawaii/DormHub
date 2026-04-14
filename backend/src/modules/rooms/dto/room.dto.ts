import { IsString, IsEnum, IsInt, IsOptional, Min, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { RoomType, RoomStatus, Gender } from '@prisma/client';

export class CreateRoomDto {
  @ApiProperty({ example: 'A101' })
  @IsString()
  code: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  buildingId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  floor: number;

  @ApiProperty({ enum: Gender, example: 'MALE' })
  @IsEnum(Gender)
  gender: Gender;
  
  @ApiProperty({ enum: RoomType, example: 'STANDARD' })
  @IsEnum(RoomType)
  roomType: RoomType;

  @ApiProperty({ example: 8 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({ example: 350000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerMonth: number;

  @ApiPropertyOptional({ example: 'Phòng 8 người, có ban công' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRoomDto extends PartialType(CreateRoomDto) {
  @ApiPropertyOptional({ enum: RoomStatus })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}

export class RoomQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  buildingId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floor?: number;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ enum: RoomType })
  @IsOptional()
  @IsEnum(RoomType)
  roomType?: RoomType;

  @ApiPropertyOptional({ enum: RoomStatus })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @ApiPropertyOptional({ description: 'Chỉ lấy phòng còn chỗ trống' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasAvailable?: boolean;
}