import { IsArray, IsInt, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';

export class AssignBuildingsDto {
  @ApiProperty({ type: [Number], description: 'Danh sách ID tòa nhà' })
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  buildingIds: number[];
}

export class QueryUsersDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  search?: string;
}
