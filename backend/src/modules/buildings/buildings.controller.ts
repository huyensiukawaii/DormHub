import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto, UpdateBuildingDto, BuildingQueryDto } from './dto/building.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { getAllowedBuildingIds, assertBuildingAccess } from '@/common/utils/building-access';

@ApiTags('Buildings')
@Controller('buildings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BuildingsController {
  constructor(private buildingsService: BuildingsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tòa nhà' })
  async findAll(@Query() query: BuildingQueryDto, @Request() req: any) {
    return this.buildingsService.findAll(query, getAllowedBuildingIds(req.user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết tòa nhà' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    assertBuildingAccess(req.user, id);
    return this.buildingsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Tạo tòa nhà mới' })
  async create(@Body() dto: CreateBuildingDto) {
    return this.buildingsService.create(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cập nhật tòa nhà' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBuildingDto,
  ) {
    return this.buildingsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xóa tòa nhà' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.buildingsService.remove(id);
  }
}