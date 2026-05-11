import {
  Controller, Get, Post, Patch, Param, Query, Body,
  ParseIntPipe, UseGuards, Request, UploadedFile, UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InvoicesService } from './invoices.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import {
  CreateUtilityInvoiceDto, BatchCreateUtilityDto,
  ConfirmPaymentDto, UploadProofDto, QueryInvoiceDto, RejectProofDto,
} from './dto';
import { getAllowedBuildingIds } from '@/common/utils/building-access';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly service: InvoicesService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ----------------------------------------
  // ADMIN / STAFF
  // ----------------------------------------

  @Get('stats')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Thống kê hóa đơn theo tháng' })
  async getStats(@Query('billingMonth') billingMonth: string, @Request() req: any) {
    if (!billingMonth?.trim()) throw new BadRequestException('billingMonth là bắt buộc');
    if (!/^\d{4}-\d{2}/.test(billingMonth)) throw new BadRequestException('billingMonth phải bắt đầu bằng YYYY-MM');
    return this.service.getStats(billingMonth, getAllowedBuildingIds(req.user));
  }

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Danh sách hóa đơn (paginated)' })
  async findAll(@Query() query: QueryInvoiceDto, @Request() req: any) {
    return this.service.findAll(query, getAllowedBuildingIds(req.user));
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Chi tiết hóa đơn (kèm breakdown)' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, getAllowedBuildingIds(req.user));
  }

  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Tạo hóa đơn tiện ích cho 1 phòng' })
  async createUtility(@Body() dto: CreateUtilityInvoiceDto, @Request() req: any) {
    return this.service.createUtility(dto, getAllowedBuildingIds(req.user));
  }

  @Post('batch')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Tạo hóa đơn tiện ích hàng loạt theo tòa' })
  async batchCreate(@Body() dto: BatchCreateUtilityDto, @Request() req: any) {
    return this.service.batchCreateUtility(dto, getAllowedBuildingIds(req.user));
  }

  @Patch(':id/confirm-payment')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Xác nhận thanh toán' })
  async confirmPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmPaymentDto,
    @Request() req: any,
  ) {
    return this.service.confirmPayment(id, dto, req.user.id, getAllowedBuildingIds(req.user));
  }

  @Patch(':id/reject-proof')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Từ chối minh chứng, yêu cầu SV nộp lại' })
  async rejectProof(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectProofDto,
    @Request() req: any,
  ) {
    return this.service.rejectProof(id, dto, getAllowedBuildingIds(req.user));
  }

  @Patch(':id/cancel')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Hủy hóa đơn (Admin only)' })
  async cancel(@Param('id', ParseIntPipe) id: number) {
    return this.service.cancel(id);
  }

  // ----------------------------------------
  // STUDENT
  // ----------------------------------------

  @Post('student/upload-proof-image')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Upload ảnh minh chứng lên Cloudinary, trả về URL' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadProofImage(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh');
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('Chỉ hỗ trợ ảnh JPG, PNG, WEBP');
    const folder = `dormhub/proofs/${req.user.studentId}`;
    const { url } = await this.cloudinary.uploadBuffer(file.buffer, file.originalname, folder);
    return { url };
  }

  @Get('student/my')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Hóa đơn của tôi (SV xem)' })
  async findForStudent(@Query() query: QueryInvoiceDto, @Request() req: any) {
    return this.service.findForStudent(req.user.studentId, query);
  }

  @Get('student/my/:id')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Chi tiết hóa đơn của tôi' })
  async findOneForStudent(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOneStudent(id, req.user.studentId);
  }

  @Patch('student/my/:id/upload-proof')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Trưởng phòng upload minh chứng thanh toán' })
  async uploadProof(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UploadProofDto,
    @Request() req: any,
  ) {
    return this.service.uploadProof(id, dto, req.user.studentId);
  }
}