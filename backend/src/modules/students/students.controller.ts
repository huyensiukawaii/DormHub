import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StudentsService } from './students.service';
import {
  CreateStudentDto,
  UpdateStudentDto,
  QueryStudentDto,
  ImportStudentDto,
} from './dto';
import * as csv from 'csv-parse/sync';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // ========================================
  // GET ALL STUDENTS (PAGINATED)
  // ========================================
  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Lấy danh sách sinh viên' })
  @ApiResponse({ status: 200, description: 'Danh sách sinh viên' })
  async findAll(@Query() query: QueryStudentDto) {
    return this.studentsService.findAll(query);
  }

  // ========================================
  // EXPORT TO CSV
  // ========================================
  @Get('export')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Xuất danh sách sinh viên ra CSV' })
  @ApiResponse({ status: 200, description: 'File CSV' })
  async export(@Res() res: Response) {
    const csvContent = await this.studentsService.export();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=students_${new Date().toISOString().split('T')[0]}.csv`,
    );
    res.send(csvContent);
  }

  // ========================================
  // GET BY STUDENT CODE (must be before :id to avoid shadowing)
  // ========================================
  @Get('code/:studentCode')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Tìm sinh viên theo MSSV' })
  @ApiResponse({ status: 200, description: 'Thông tin sinh viên' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sinh viên' })
  async findByStudentCode(@Param('studentCode') studentCode: string) {
    return this.studentsService.findByStudentCode(studentCode);
  }

  // ========================================
  // GET ONE STUDENT BY ID
  // ========================================
  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết sinh viên' })
  @ApiResponse({ status: 200, description: 'Thông tin sinh viên' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sinh viên' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findOne(id);
  }

  // ========================================
  // CREATE STUDENT
  // ========================================
  @Post()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Thêm sinh viên mới' })
  @ApiResponse({ status: 201, description: 'Sinh viên đã được tạo' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'MSSV hoặc Email đã tồn tại' })
  async create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  // ========================================
  // IMPORT FROM CSV
  // ========================================
  @Post('import')
  @Roles('ADMIN', 'STAFF')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import danh sách sinh viên từ CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Kết quả import' })
  @ApiResponse({ status: 400, description: 'File không hợp lệ' })
  async import(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file');
    }

    // Check file type - only CSV supported
    const allowedMimeTypes = ['text/csv', 'application/csv', 'text/plain'];

    if (!allowedMimeTypes.includes(file.mimetype) && !file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Chỉ hỗ trợ file CSV');
    }

    try {
      // Parse CSV
      const fileContent = file.buffer.toString('utf-8');
      const records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });

      // Map to ImportStudentDto
      const data: ImportStudentDto[] = records.map((row: any) => ({
        studentCode: row['MSSV'] || row['studentCode'] || row['mssv'] || '',
        fullName: row['Họ tên'] || row['fullName'] || row['ho_ten'] || '',
        email: row['Email'] || row['email'] || '',
        phone: row['SĐT'] || row['phone'] || row['sdt'] || '',
        gender: row['Giới tính'] || row['gender'] || row['gioi_tinh'] || '',
        dateOfBirth: row['Ngày sinh'] || row['dateOfBirth'] || row['ngay_sinh'] || '',
        major: row['Ngành'] || row['major'] || row['nganh'] || '',
        classCode: row['Lớp'] || row['classCode'] || row['lop'] || '',
        admissionYear: row['Năm nhập học'] || row['admissionYear'] || row['nam_nhap_hoc'] || '',
      }));

      return this.studentsService.import(data);
    } catch (error: any) {
      throw new BadRequestException('Lỗi khi đọc file: ' + error.message);
    }
  }

  // ========================================
  // UPDATE STUDENT
  // ========================================
  @Put(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Cập nhật thông tin sinh viên' })
  @ApiResponse({ status: 200, description: 'Sinh viên đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sinh viên' })
  @ApiResponse({ status: 409, description: 'MSSV hoặc Email đã tồn tại' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, dto);
  }

  // ========================================
  // DELETE STUDENT
  // ========================================
  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa sinh viên' })
  @ApiResponse({ status: 200, description: 'Sinh viên đã được xóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sinh viên' })
  @ApiResponse({ status: 400, description: 'Không thể xóa sinh viên đang có hợp đồng' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.remove(id);
  }

}