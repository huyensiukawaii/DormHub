import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RegistrationPeriodsService } from './registration-periods.service';
import {
  CreateRegistrationPeriodDto,
  UpdateRegistrationPeriodDto,
  QueryRegistrationPeriodDto,
  UpdateStatusDto,
} from './dto';

@ApiTags('Registration Periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('registration-periods')
export class RegistrationPeriodsController {
  constructor(private readonly service: RegistrationPeriodsService) {}

  // ========================================
  // GET ALL (PAGINATED)
  // ========================================
  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Lấy danh sách đợt đăng ký' })
  @ApiResponse({ status: 200, description: 'Danh sách đợt đăng ký' })
  async findAll(@Query() query: QueryRegistrationPeriodDto) {
    return this.service.findAll(query);
  }

  // ========================================
  // GET ACTIVE PERIOD (Public for students)
  // ========================================
  @Get('active')
  @Roles('ADMIN', 'STAFF', 'STUDENT')
  @ApiOperation({ summary: 'Lấy đợt đăng ký đang mở' })
  @ApiResponse({ status: 200, description: 'Đợt đăng ký đang mở' })
  async findActive() {
    const period = await this.service.findActivePeriod();
    return { data: period };
  }

  // ========================================
  // GET ONE BY ID
  // ========================================
  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Lấy chi tiết đợt đăng ký' })
  @ApiResponse({ status: 200, description: 'Chi tiết đợt đăng ký' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // ========================================
  // GET STATS
  // ========================================
  @Get(':id/stats')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Lấy thống kê đợt đăng ký' })
  @ApiResponse({ status: 200, description: 'Thống kê' })
  async getStats(@Param('id', ParseIntPipe) id: number) {
    return this.service.getStats(id);
  }

  // ========================================
  // CREATE
  // ========================================
  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tạo đợt đăng ký mới' })
  @ApiResponse({ status: 201, description: 'Đợt đăng ký đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Mã đã tồn tại hoặc trùng thời gian' })
  async create(@Body() dto: CreateRegistrationPeriodDto, @Request() req: any) {
    return this.service.create(dto, req.user?.id);
  }

  // ========================================
  // UPDATE
  // ========================================
  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cập nhật đợt đăng ký' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRegistrationPeriodDto,
  ) {
    return this.service.update(id, dto);
  }

  // ========================================
  // UPDATE STATUS
  // ========================================
  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cập nhật trạng thái đợt đăng ký' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật trạng thái' })
  @ApiResponse({ status: 400, description: 'Không thể chuyển trạng thái' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.service.updateStatus(id, dto);
  }

  // ========================================
  // DELETE
  // ========================================
  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa đợt đăng ký' })
  @ApiResponse({ status: 200, description: 'Đã xóa' })
  @ApiResponse({ status: 400, description: 'Không thể xóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}