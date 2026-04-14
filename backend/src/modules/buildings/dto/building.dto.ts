import { IsString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BuildingStatus } from '@prisma/client';

export class CreateBuildingDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Tòa A' })
  @IsString()
  name: string;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalFloors: number;

  @ApiPropertyOptional({ example: 'Tòa nhà dành cho sinh viên quốc tế' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateBuildingDto extends PartialType(CreateBuildingDto) {
  @ApiPropertyOptional({ enum: BuildingStatus })
  @IsOptional()
  @IsEnum(BuildingStatus)
  status?: BuildingStatus;
}

export class BuildingQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: BuildingStatus })
  @IsOptional()
  @IsEnum(BuildingStatus)
  status?: BuildingStatus;
}