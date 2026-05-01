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

@ApiTags('Meters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('meters')
export class MetersController {
  constructor(private readonly service: MetersService) {}

  @Get('stats')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Thống kê ghi chỉ số theo tháng' })
  async getStats(@Query('readingMonth') readingMonth: string) {
    return this.service.getMonthlyStats(readingMonth);
  }

  @Get('rooms')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'DS phòng để ghi chỉ số (kèm chỉ số trước, đã ghi chưa)' })
  async getRoomsForReading(@Query() query: QueryRoomsForReadingDto) {
    return this.service.getRoomsForReading(query);
  }

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Danh sách chỉ số đã ghi (paginated)' })
  async findAll(@Query() query: QueryMeterReadingDto) {
    return this.service.findAll(query);
  }

  @Get('room/:roomId/history')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Lịch sử chỉ số của 1 phòng' })
  async getRoomHistory(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Query('meterType') meterType?: MeterType,
    @Query('months') months?: string,
  ) {
    return this.service.getRoomHistory(
      roomId,
      meterType,
      months ? parseInt(months) : 12,
    );
  }

  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Ghi chỉ số 1 phòng' })
  async create(@Body() dto: CreateMeterReadingDto, @Request() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Post('batch')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Ghi chỉ số hàng loạt (nhiều phòng)' })
  async batchCreate(@Body() dto: BatchCreateMeterReadingDto, @Request() req: any) {
    return this.service.batchCreate(dto, req.user.id);
  }

  @Put(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Sửa chỉ số đã ghi' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMeterReadingDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa bản ghi chỉ số' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}