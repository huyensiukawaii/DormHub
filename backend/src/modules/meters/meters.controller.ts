import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MetersService } from './meters.service';
import {
  CreateMeterReadingDto,
  BatchCreateMeterReadingDto,
  UpdateMeterReadingDto,
  QueryMeterReadingDto,
  QueryRoomsForReadingDto,
  MeterType,
} from './dto';
import { getAllowedBuildingIds, assertAllowed } from '@/common/utils/building-access';

@ApiTags('Meters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('meters')
export class MetersController {
  constructor(private readonly service: MetersService) {}

  @Get('stats')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Thống kê ghi chỉ số theo tháng' })
  async getStats(
    @Query('readingMonth') readingMonth: string,
    @Query('buildingId') buildingId: string,
    @Request() req: any,
  ) {
    const allowed = getAllowedBuildingIds(req.user);
    // Resolve effective buildingId: respect STAFF scope
    let effectiveBuildingId: number | undefined;
    if (buildingId) {
      effectiveBuildingId = Number(buildingId);
      if (allowed !== undefined) assertAllowed(allowed, effectiveBuildingId);
    } else if (allowed !== undefined && allowed.length === 1) {
      effectiveBuildingId = allowed[0];
    }
    return this.service.getMonthlyStats(readingMonth, effectiveBuildingId);
  }

  @Get('rooms')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'DS phòng để ghi chỉ số (kèm chỉ số trước, đã ghi chưa)' })
  async getRoomsForReading(@Query() query: QueryRoomsForReadingDto, @Request() req: any) {
    const allowed = getAllowedBuildingIds(req.user);
    if (allowed !== undefined) {
      // Validate the requested buildingId is in STAFF's scope (or force it if missing)
      if (query.buildingId) {
        assertAllowed(allowed, Number(query.buildingId));
      } else if (allowed.length > 0) {
        // Default to first assigned building when none specified
        query = { ...query, buildingId: allowed[0] as any };
      } else {
        return []; // STAFF with no assigned buildings sees nothing
      }
    }
    return this.service.getRoomsForReading(query);
  }

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Danh sách chỉ số đã ghi (paginated)' })
  async findAll(@Query() query: QueryMeterReadingDto, @Request() req: any) {
    return this.service.findAll(query, getAllowedBuildingIds(req.user));
  }

  @Get('room/:roomId/history')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Lịch sử chỉ số của 1 phòng' })
  async getRoomHistory(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Query('meterType') meterType: MeterType,
    @Query('months') months: string,
    @Request() req: any,
  ) {
    const result = await this.service.getRoomHistory(roomId, meterType, months ? parseInt(months) : 12);
    assertAllowed(getAllowedBuildingIds(req.user), result.room.buildingId);
    return result;
  }

  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Ghi chỉ số 1 phòng' })
  async create(@Body() dto: CreateMeterReadingDto, @Request() req: any) {
    const allowed = getAllowedBuildingIds(req.user);
    if (allowed !== undefined) {
      await this.service.assertRoomBuildingAccess(dto.roomId, allowed);
    }
    return this.service.create(dto, req.user.id);
  }

  @Post('batch')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Ghi chỉ số hàng loạt (nhiều phòng)' })
  async batchCreate(@Body() dto: BatchCreateMeterReadingDto, @Request() req: any) {
    const allowed = getAllowedBuildingIds(req.user);
    if (allowed !== undefined && dto.readings.length > 0) {
      const uniqueRoomIds = [...new Set(dto.readings.map((r) => r.roomId))];
      await Promise.all(uniqueRoomIds.map((roomId) => this.service.assertRoomBuildingAccess(roomId, allowed)));
    }
    return this.service.batchCreate(dto, req.user.id);
  }

  @Put(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Sửa chỉ số đã ghi' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMeterReadingDto,
    @Request() req: any,
  ) {
    const allowed = getAllowedBuildingIds(req.user);
    if (allowed !== undefined) {
      await this.service.assertReadingBuildingAccess(id, allowed);
    }
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa bản ghi chỉ số' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
