import {
  Controller,
  Get,
  Post,
  Patch,
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
import { ContractsService } from './contracts.service';
import { getAllowedBuildingIds, assertAllowed } from '@/common/utils/building-access';
import {
  CreateContractDto,
  CreateContractFromApplicationDto,
  CheckInDto,
  CheckOutDto,
  TerminateContractDto,
  SetRoomLeaderDto,
  QueryContractDto,
} from './dto';

// ========================================
// ADMIN CONTROLLER
// ========================================
@ApiTags('Contracts (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contracts')
export class AdminContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get('stats')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Thống kê hợp đồng' })
  async getStats() {
    return this.service.getStats();
  }

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Danh sách hợp đồng' })
  async findAll(@Query() query: QueryContractDto, @Request() req: any) {
    return this.service.findAll(query, getAllowedBuildingIds(req.user));
  }

  @Get('room/:roomId')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Xem ai ở trong phòng' })
  async getRoomContracts(@Param('roomId', ParseIntPipe) roomId: number, @Request() req: any) {
    return this.service.getRoomContracts(roomId, getAllowedBuildingIds(req.user));
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Chi tiết hợp đồng' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const contract = await this.service.findOne(id);
    assertAllowed(getAllowedBuildingIds(req.user), contract.room.buildingId);
    return contract;
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tạo hợp đồng thủ công' })
  async create(@Body() dto: CreateContractDto, @Request() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Post('from-application')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Tạo hợp đồng từ đơn đăng ký đã duyệt' })
  async createFromApplication(
    @Body() dto: CreateContractFromApplicationDto,
    @Request() req: any,
  ) {
    return this.service.createFromApplication(dto, req.user.id, getAllowedBuildingIds(req.user));
  }

  @Patch(':id/check-in')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Check-in sinh viên' })
  async checkIn(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CheckInDto,
    @Request() req: any,
  ) {
    return this.service.checkIn(id, dto, getAllowedBuildingIds(req.user));
  }

  @Patch(':id/check-out')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Check-out sinh viên' })
  async checkOut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CheckOutDto,
    @Request() req: any,
  ) {
    return this.service.checkOut(id, dto, getAllowedBuildingIds(req.user));
  }

  @Patch(':id/terminate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Chấm dứt hợp đồng sớm' })
  async terminate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TerminateContractDto,
  ) {
    return this.service.terminate(id, dto);
  }

  @Patch(':id/room-leader')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Đặt/bỏ trưởng phòng' })
  async setRoomLeader(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetRoomLeaderDto,
    @Request() req: any,
  ) {
    return this.service.setRoomLeader(id, dto, getAllowedBuildingIds(req.user));
  }
}

// ========================================
// STUDENT CONTROLLER
// ========================================
@ApiTags('Student Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('student/contracts')
export class StudentContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Danh sách hợp đồng của tôi' })
  async getMyContracts(@Request() req: any) {
    return this.service.getMyContracts(req.user.studentId);
  }

  @Get(':id')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Chi tiết hợp đồng của tôi' })
  async getMyContractDetail(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.service.getMyContractDetail(id, req.user.studentId);
  }
}