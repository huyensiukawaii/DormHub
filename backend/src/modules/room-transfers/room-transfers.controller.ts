import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { getAllowedBuildingIds } from '@/common/utils/building-access';
import { RoomTransfersService } from './room-transfers.service';
import {
  CreateRoomTransferDto,
  QueryRoomTransferDto,
  ReviewRoomTransferDto,
} from './dto/room-transfer.dto';

@ApiTags('Room Transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('room-transfers')
export class RoomTransfersController {
  constructor(private readonly service: RoomTransfersService) {}

  // =============================================
  // STUDENT endpoints
  // =============================================

  @Post('student')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Sinh viên tạo yêu cầu chuyển phòng' })
  async create(@Body() dto: CreateRoomTransferDto, @Request() req: any) {
    return this.service.create(dto, req.user.studentId);
  }

  @Get('student/my')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Sinh viên xem lịch sử yêu cầu của mình' })
  async myRequests(@Query() query: QueryRoomTransferDto, @Request() req: any) {
    return this.service.findByStudent(req.user.studentId, query);
  }

  @Patch('student/:id/cancel')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Sinh viên hủy yêu cầu đang chờ' })
  async cancel(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.cancel(id, req.user.studentId);
  }

  // =============================================
  // ADMIN / STAFF endpoints
  // =============================================

  @Get('stats')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Thống kê yêu cầu chuyển phòng' })
  async getStats(@Request() req: any) {
    return this.service.getStats(getAllowedBuildingIds(req.user));
  }

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Danh sách yêu cầu chuyển phòng' })
  async findAll(@Query() query: QueryRoomTransferDto, @Request() req: any) {
    return this.service.findAll(query, getAllowedBuildingIds(req.user));
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Chi tiết yêu cầu chuyển phòng' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, getAllowedBuildingIds(req.user));
  }

  @Patch(':id/review')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Duyệt hoặc từ chối yêu cầu' })
  async review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewRoomTransferDto,
    @Request() req: any,
  ) {
    return this.service.review(id, dto, req.user.id, getAllowedBuildingIds(req.user));
  }
}
