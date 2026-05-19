import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { getAllowedBuildingIds } from '../../common/utils/building-access';
import { AnnouncementsService } from './announcements.service';
import { CloudinaryService } from '@/common/cloudinary/cloudinary.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  QueryAnnouncementDto,
  ReactAnnouncementDto,
  PinAnnouncementDto,
} from './dto';

// ─── Admin / Staff routes ────────────────────────────────────────────────────
@ApiTags('Announcements (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(
    private readonly service: AnnouncementsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Post('upload-image')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Upload ảnh bài đăng lên Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh');
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('Chỉ hỗ trợ JPG, PNG, WEBP');
    const { url } = await this.cloudinary.uploadBuffer(file.buffer, file.originalname, 'dormhub/announcements');
    return { url };
  }

  @Get('channels')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Danh sách kênh (theo quyền)' })
  async getChannels(@Request() req: any) {
    return this.service.getChannels(getAllowedBuildingIds(req.user));
  }

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Danh sách bài đăng theo kênh' })
  async findAll(@Query() query: QueryAnnouncementDto, @Request() req: any) {
    return this.service.findAll(query, req.user.id, getAllowedBuildingIds(req.user));
  }

  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Tạo bài đăng mới' })
  async create(@Body() dto: CreateAnnouncementDto, @Request() req: any) {
    return this.service.create(dto, req.user);
  }

  @Put(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Sửa bài đăng' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnnouncementDto,
    @Request() req: any,
  ) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Xóa bài đăng' })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, req.user);
  }

  @Patch(':id/pin')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Ghim / bỏ ghim bài đăng' })
  async setPin(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PinAnnouncementDto,
    @Request() req: any,
  ) {
    return this.service.setPin(id, dto.isPinned, req.user);
  }

  @Post(':id/react')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'React bài đăng (admin/staff)' })
  async react(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReactAnnouncementDto,
    @Request() req: any,
  ) {
    return this.service.react(id, dto, req.user.id, getAllowedBuildingIds(req.user));
  }
}

// ─── Student routes ───────────────────────────────────────────────────────────
@ApiTags('Announcements (Student)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('student/announcements')
export class StudentAnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Get('channels')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Danh sách kênh sinh viên có thể xem' })
  async getChannels(@Request() req: any) {
    return this.service.getStudentChannels(req.user.studentId);
  }

  @Get()
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Danh sách bài đăng (sinh viên)' })
  async findAll(@Query() query: QueryAnnouncementDto, @Request() req: any) {
    // Lấy buildingId tòa đang ở để validate quyền xem
    const channels = await this.service.getStudentChannels(req.user.studentId);
    const allowedIds = channels.filter((c) => c.id !== null).map((c) => c.id as number);
    return this.service.findAll(query, req.user.id, allowedIds.length ? allowedIds : undefined);
  }

  @Post(':id/react')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'React bài đăng' })
  async react(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReactAnnouncementDto,
    @Request() req: any,
  ) {
    const channels = await this.service.getStudentChannels(req.user.studentId);
    const allowedIds = channels.filter((c) => c.id !== null).map((c) => c.id as number);
    return this.service.react(id, dto, req.user.id, allowedIds);
  }
}
