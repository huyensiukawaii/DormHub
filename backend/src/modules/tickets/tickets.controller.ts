import {
  Controller, Get, Post, Patch, Param, Query, Body,
  ParseIntPipe, UseGuards, Request, UseInterceptors,
  UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TicketsService } from './tickets.service';
import {
  CreateTicketDto, UpdateTicketDto, RejectTicketDto,
  RateTicketDto, QueryTicketDto,
} from './dto';
import { getAllowedBuildingIds } from '@/common/utils/building-access';
import { CloudinaryService } from '@/common/cloudinary/cloudinary.service';

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly service: TicketsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ----------------------------------------
  // ADMIN / STAFF
  // ----------------------------------------

  @Get('stats')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Thống kê ticket' })
  async getStats(@Request() req: any) {
    return this.service.getStats(getAllowedBuildingIds(req.user));
  }

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Danh sách ticket (paginated)' })
  async findAll(@Query() query: QueryTicketDto, @Request() req: any) {
    return this.service.findAll(query, getAllowedBuildingIds(req.user));
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Chi tiết ticket' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, getAllowedBuildingIds(req.user));
  }

  @Patch(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Cập nhật ticket (status, priority, note)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
    @Request() req: any,
  ) {
    return this.service.update(id, dto, req.user.id, getAllowedBuildingIds(req.user));
  }

  @Patch(':id/reject')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Từ chối ticket' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectTicketDto,
    @Request() req: any,
  ) {
    return this.service.reject(id, dto, req.user.id, getAllowedBuildingIds(req.user));
  }

  // ----------------------------------------
  // STUDENT
  // ----------------------------------------

  @Post('student/upload-image')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Upload ảnh đính kèm ticket lên Cloudinary, trả về URL' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh');
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('Chỉ hỗ trợ JPG, PNG, WEBP');
    const { url } = await this.cloudinary.uploadBuffer(
      file.buffer, file.originalname, `dormhub/tickets/${req.user.studentId}`,
    );
    return { url };
  }

  @Post('student')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Tạo ticket báo sự cố' })
  async create(@Body() dto: CreateTicketDto, @Request() req: any) {
    return this.service.create(dto, req.user.studentId);
  }

  @Get('student/my')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Danh sách ticket của tôi' })
  async findForStudent(@Query() query: QueryTicketDto, @Request() req: any) {
    return this.service.findForStudent(req.user.studentId, query);
  }

  @Get('student/my/:id')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Chi tiết ticket của tôi' })
  async findOneStudent(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOneStudent(id, req.user.studentId);
  }

  @Patch('student/my/:id/rate')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Đánh giá ticket sau hoàn thành' })
  async rate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RateTicketDto,
    @Request() req: any,
  ) {
    return this.service.rate(id, dto, req.user.studentId);
  }
}