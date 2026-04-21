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
import { StudentApplicationsService } from './student-application.service';
import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  QueryApplicationDto,
  UpdateStudentProfileDto,
} from './dto';

@ApiTags('Student Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('student')
export class StudentApplicationsController {
  constructor(private readonly service: StudentApplicationsService) {}

  // ========================================
  // STUDENT ROUTES
  // ========================================

  @Get('dashboard')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Lấy dashboard sinh viên' })
  async getDashboard(@Request() req: any) {
    const studentId = req.user.studentId;
    return this.service.getStudentDashboard(studentId);
  }

  @Get('register/period')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Lấy đợt đăng ký đang mở và phòng khả dụng' })
  async getActivePeriod(@Request() req: any) {
    const studentId = req.user.studentId;
    const result = await this.service.getActivePeriod(studentId);
    if (!result) {
      return { message: 'Hiện không có đợt đăng ký nào đang mở', data: null };
    }
    return result;
  }

  @Post('applications')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Nộp đơn đăng ký KTX' })
  @ApiResponse({ status: 201, description: 'Đã nộp đơn thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Đã nộp đơn cho đợt này' })
  async createApplication(@Body() dto: CreateApplicationDto, @Request() req: any) {
    const studentId = req.user.studentId;
    return this.service.create(studentId, dto);
  }

  @Get('applications')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Lấy danh sách đơn đăng ký của tôi' })
  async getMyApplications(@Request() req: any) {
    const studentId = req.user.studentId;
    return this.service.getMyApplications(studentId);
  }

  @Get('applications/:id/detail')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Chi tiết đầy đủ đơn đăng ký' })
  async getApplicationDetail(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOneDetail(id, req.user.studentId);
  }

  @Get('applications/:id')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Xem chi tiết đơn đăng ký' })
  async getApplication(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const studentId = req.user.studentId;
    return this.service.findOne(id, studentId);
  }

  @Delete('applications/:id')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Hủy đơn đăng ký (chỉ đơn đang chờ)' })
  async cancelApplication(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const studentId = req.user.studentId;
    return this.service.cancel(id, studentId);
  }

  @Put('profile')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Cập nhật hồ sơ sinh viên' })
  async updateProfile(@Body() dto: UpdateStudentProfileDto, @Request() req: any) {
    const studentId = req.user.studentId;
    return this.service.updateProfile(studentId, dto);
  }
}

// ========================================
// ADMIN CONTROLLER
// ========================================

@ApiTags('Applications (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications')
export class AdminApplicationsController {
  constructor(private readonly service: StudentApplicationsService) {}

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Lấy danh sách tất cả đơn đăng ký' })
  async findAll(@Query() query: QueryApplicationDto) {
    return this.service.findAll(query);
  }

  @Get(':id/detail')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Chi tiết đầy đủ đơn đăng ký' })
  async findOneDetail(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneDetail(id);
  }

  @Get(':id/available-rooms')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Phòng khả dụng để duyệt đơn' })
  async getAvailableRoomsForApproval(@Param('id', ParseIntPipe) id: number) {
    return this.service.getAvailableRoomsForApproval(id);
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Xem chi tiết đơn đăng ký' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Duyệt/từ chối đơn đăng ký' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật trạng thái' })
  @ApiResponse({ status: 400, description: 'Không thể cập nhật' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApplicationStatusDto,
    @Request() req: any,
  ) {
    return this.service.updateStatus(id, dto, req.user.id);
  }
}