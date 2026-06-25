import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import { UpsertSettingDto, BulkUpsertSettingsDto } from './dto';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Lấy tất cả settings (grouped by tab)' })
  async findAll() {
    return this.service.getGrouped();
  }

  @Get('all')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Lấy tất cả settings (flat)' })
  async findAllFlat() {
    return this.service.findAll();
  }

  @Get('key/:key')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Lấy setting theo key' })
  async findByKey(@Param('key') key: string) {
    return this.service.findByKey(key);
  }

  @Get('prefix/:prefix')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Lấy settings theo prefix (electricity_, water_, priority_)' })
  async findByPrefix(@Param('prefix') prefix: string) {
    return this.service.findByPrefix(prefix);
  }

  @Put()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cập nhật 1 setting (chỉ Admin)' })
  async upsert(@Body() dto: UpsertSettingDto, @Request() req: any) {
    return this.service.upsert(dto, req.user.id);
  }

  @Put('bulk')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cập nhật nhiều settings cùng lúc (chỉ Admin)' })
  async bulkUpsert(@Body() dto: BulkUpsertSettingsDto, @Request() req: any) {
    return this.service.bulkUpsert(dto.settings, req.user.id);
  }

  @Post('seed')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Seed default settings (chạy 1 lần)' })
  async seed() {
    await this.service.seedDefaults();
    return { message: 'Đã seed settings mặc định' };
  }

  @Get('priority-weights')
  @Roles('ADMIN', 'STAFF', 'STUDENT')
  @ApiOperation({ summary: 'Lấy trọng số điểm ưu tiên (tất cả role)' })
  async getPriorityWeights() {
    return this.service.getPriorityWeights();
  }

  @Get('calculate/electricity')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Tính tiền điện mẫu (preview)' })
  async calcElectricity(@Query('kwh') kwh: string) {
    return this.service.calculateElectricityCost(parseFloat(kwh) || 0);
  }

  @Get('calculate/water')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Tính tiền nước mẫu (preview)' })
  async calcWater(
    @Query('m3') m3: string,
    @Query('occupants') occupants: string,
  ) {
    return this.service.calculateWaterCost(
      parseFloat(m3) || 0,
      parseInt(occupants) || 1,
    );
  }
}