import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  Request,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Response } from 'express';
import * as https from 'https';
import * as http from 'http';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PriorityDocumentsService } from './priority-documents.service';
import { PriorityDocumentType, DocumentStatus } from '@prisma/client';

async function proxyFile(fileUrl: string, fileName: string, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = fileUrl.startsWith('https') ? https : http;
    client.get(fileUrl, (upstream) => {
      if (!upstream.statusCode || upstream.statusCode >= 400) {
        reject(new InternalServerErrorException('Không thể tải file'));
        return;
      }
      const contentType = upstream.headers['content-type'] || 'application/octet-stream';
      const safeName = encodeURIComponent(fileName);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${safeName}`);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      upstream.pipe(res);
      upstream.on('end', resolve);
      upstream.on('error', reject);
    }).on('error', reject);
  });
}

@ApiTags('Priority Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('student/priority-documents')
export class StudentPriorityDocsController {
  constructor(private readonly service: PriorityDocumentsService) {}

  @Get()
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Lấy danh sách minh chứng của tôi' })
  async getMyDocuments(@Request() req: any) {
    return this.service.getMyDocuments(req.user.studentId);
  }

  @Get('score')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Lấy điểm ưu tiên từ minh chứng đã duyệt' })
  async getMyScore(@Request() req: any) {
    return this.service.getStudentPriorityScore(req.user.studentId);
  }

  @Post('upload')
  @Roles('STUDENT')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Tải lên minh chứng ưu tiên' })
  async upload(
    @Request() req: any,
    @Query('type') type: PriorityDocumentType,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file');
    if (!type || !Object.values(PriorityDocumentType).includes(type)) {
      throw new BadRequestException('Loại minh chứng không hợp lệ');
    }
    return this.service.upload(req.user.studentId, type, file);
  }

  @Get(':id/file')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Xem file minh chứng (proxy qua backend)' })
  async streamFileStudent(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const { fileUrl, fileName } = await this.service.getDocumentFileUrl(id, req.user.studentId);
    await proxyFile(fileUrl, fileName, res);
  }

  @Delete(':id')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Xóa minh chứng (chỉ PENDING hoặc REJECTED)' })
  async delete(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.delete(req.user.studentId, id);
  }
}

@ApiTags('Priority Documents (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/priority-documents')
export class AdminPriorityDocsController {
  constructor(private readonly service: PriorityDocumentsService) {}

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Lấy danh sách tất cả minh chứng' })
  async findAll(
    @Query('status') status?: DocumentStatus,
    @Query('type') type?: PriorityDocumentType,
  ) {
    return this.service.findAll(status, type);
  }

  @Get('student/:studentId/score')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Lấy điểm ưu tiên của sinh viên' })
  async getStudentScore(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.service.getStudentPriorityScore(studentId);
  }

  @Get(':id/file')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Xem file minh chứng (proxy qua backend)' })
  async streamFileAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { fileUrl, fileName } = await this.service.getDocumentFileUrl(id);
    await proxyFile(fileUrl, fileName, res);
  }

  @Patch(':id/review')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Duyệt hoặc từ chối minh chứng' })
  async review(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { action: 'APPROVED' | 'REJECTED'; reviewNote?: string },
    @Request() req: any,
  ) {
    return this.service.review(id, req.user.id, body.action, body.reviewNote);
  }
}
