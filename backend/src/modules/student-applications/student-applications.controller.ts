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
  ForbiddenException,
} from '@nestjs/common';
import { getAllowedBuildingIds } from '@/common/utils/building-access';
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

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminDashboardController {
  constructor(private readonly service: StudentApplicationsService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Tổng quan hệ thống cho admin' })
  async getDashboard(@Request() req: any) {
    return this.service.getAdminDashboard(req.user);
  }
}

// An application belongs to STAFF's scope if any of its room choices or approved room
// is in one of the STAFF's assigned buildings.
function assertAppBuildingAccess(allowed: number[] | undefined, app: any): void {
  if (allowed === undefined) return;
  const buildingIds: number[] = [
    ...(app.roomChoices ?? []).map((c: any) => c.room?.buildingId).filter(Boolean),
    app.approvedRoom?.buildingId,
  ].filter((id): id is number => typeof id === 'number');

  if (buildingIds.length === 0 || !buildingIds.some((id) => allowed.includes(id))) {
    throw new ForbiddenException('Bạn không có quyền truy cập đơn đăng ký này');
  }
}

@ApiTags('Applications (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('applications')
export class AdminApplicationsController {
  constructor(private readonly service: StudentApplicationsService) {}

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Lấy danh sách tất cả đơn đăng ký' })
  async findAll(@Query() query: QueryApplicationDto, @Request() req: any) {
    return this.service.findAll(query, getAllowedBuildingIds(req.user));
  }

  @Get(':id/detail')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Chi tiết đầy đủ đơn đăng ký' })
  async findOneDetail(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const app = await this.service.findOneDetail(id);
    assertAppBuildingAccess(getAllowedBuildingIds(req.user), app);
    return app;
  }

  @Get(':id/available-rooms')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Phòng khả dụng để duyệt đơn' })
  async getAvailableRoomsForApproval(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const allowed = getAllowedBuildingIds(req.user);
    const app = await this.service.findOne(id);
    assertAppBuildingAccess(allowed, app);
    return this.service.getAvailableRoomsForApproval(id, allowed);
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Xem chi tiết đơn đăng ký' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const app = await this.service.findOne(id);
    assertAppBuildingAccess(getAllowedBuildingIds(req.user), app);
    return app;
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
    const allowed = getAllowedBuildingIds(req.user);
    const app = await this.service.findOne(id);
    assertAppBuildingAccess(allowed, app);
    return this.service.updateStatus(id, dto, req.user.id, allowed);
  }
}