import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Gender, ContractStatus, InvoiceStatus } from '@prisma/client';
import {
  CreateStudentDto,
  UpdateStudentDto,
  QueryStudentDto,
  ImportStudentDto,
  StudentStatus,
  PaginatedStudentResponseDto,
  StudentDetailResponseDto,
  ImportResultDto,
} from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  // ========================================
  // FIND ALL (PAGINATED)
  // ========================================
  async findAll(query: QueryStudentDto): Promise<PaginatedStudentResponseDto> {
    const {
      page = 1,
      limit = 20,
      search,
      major,
      admissionYear,
      status,
      hasRoom,
      gender,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      user: { isActive: true }, // Exclude soft-deleted students
    };

    if (search) {
      where.OR = [
        { studentCode: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (major) {
      where.faculty = major;
    }

    if (admissionYear) {
      // Tính từ studentCode (VD: 20210001 -> 2021)
      where.studentCode = {
        startsWith: admissionYear.toString(),
      };
    }

    if (status) {
      where.status = status;
    }

    if (gender) {
      where.gender = gender;
    }

    // Filter hasRoom - có hợp đồng active không
    if (hasRoom !== undefined) {
      if (hasRoom) {
        where.contracts = {
          some: {
            status: ContractStatus.ACTIVE,
          },
        };
      } else {
        where.contracts = {
          none: {
            status: ContractStatus.ACTIVE,
          },
        };
      }
    }

    // Build orderBy
    const orderBy: any = {};
    const validSortFields = ['studentCode', 'fullName', 'createdAt', 'updatedAt'];
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    // Query
    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
            },
          },
          contracts: {
            where: {
              status: ContractStatus.ACTIVE,
            },
            include: {
              room: {
                include: {
                  building: true,
                },
              },
            },
            take: 1,
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    // Transform response
    const data = students.map((student) => {
      const activeContract = student.contracts[0];
      const admYear = parseInt(student.studentCode.substring(0, 4)) || new Date().getFullYear();

      return {
        id: student.id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        email: student.email || student.user?.email || '',
        phone: student.phone || '',
        gender: student.gender,
        dateOfBirth: student.dateOfBirth?.toISOString().split('T')[0] || '',
        major: student.faculty || '',
        classCode: student.className || '',
        admissionYear: admYear,
        status: student.status as unknown as StudentStatus,
        idCardNumber: student.idCardNumber ?? undefined,
        hometown: student.hometownProvince ?? undefined,
        currentRoom: activeContract
          ? {
              id: activeContract.room.id,
              code: activeContract.room.code,
              buildingName: activeContract.room.building.name,
            }
          : null,
        hasActiveContract: !!activeContract,
        createdAt: student.createdAt,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================================
  // FIND ONE BY ID
  // ========================================
  async findOne(id: number): Promise<StudentDetailResponseDto> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
        contracts: {
          include: {
            room: {
              include: {
                building: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        tickets: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy sinh viên');
    }

    // Find active contract
    const activeContract = student.contracts.find(
      (c) => c.status === ContractStatus.ACTIVE,
    );

    // Calculate invoice stats via rooms from contracts
    const roomIds = student.contracts.map((c) => c.roomId);
    const [totalInvoices, unpaidInvoices] = roomIds.length > 0
      ? await Promise.all([
          this.prisma.invoice.count({ where: { roomId: { in: roomIds } } }),
          this.prisma.invoice.count({
            where: {
              roomId: { in: roomIds },
              status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
            },
          }),
        ])
      : [0, 0];

    // Calculate stats
    const stats = {
      totalContracts: student.contracts.length,
      totalInvoices,
      unpaidInvoices,
      totalTickets: student.tickets.length,
    };

    // Transform contracts for history
    const contractHistory = student.contracts.map((contract) => ({
      id: contract.id,
      contractNumber: contract.code,
      isRoomLeader: contract.isRoomLeader,
      room: {
        id: contract.room.id,
        code: contract.room.code,
        buildingName: contract.room.building.name,
      },
      startDate: contract.startDate.toISOString().split('T')[0],
      endDate: contract.endDate.toISOString().split('T')[0],
      status: contract.status,
      monthlyRent: Number(contract.monthlyRent),
      checkInDate: contract.checkedInAt?.toISOString().split('T')[0],
      checkOutDate: contract.checkedOutAt?.toISOString().split('T')[0],
    }));

    const admYear = parseInt(student.studentCode.substring(0, 4)) || new Date().getFullYear();

    return {
      id: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      email: student.email || student.user?.email || '',
      phone: student.phone || '',
      gender: student.gender,
      dateOfBirth: student.dateOfBirth?.toISOString().split('T')[0] || '',
      major: student.faculty || '',
      classCode: student.className || '',
      admissionYear: admYear,
      status: (student as any).status as StudentStatus,
      idCardNumber: student.idCardNumber ?? undefined,
      hometown: student.hometownProvince ?? undefined,
      hometownDistance: student.hometownDistance ?? undefined,
      emergencyContactName: student.emergencyContactName ?? undefined,
      emergencyContactPhone: student.emergencyContactPhone ?? undefined,
      emergencyContactRelation: student.emergencyContactRelation ?? undefined,
      user: student.user
        ? {
            id: student.user.id,
            email: student.user.email,
          }
        : null,
      currentRoom: activeContract
        ? {
            id: activeContract.room.id,
            code: activeContract.room.code,
            buildingName: activeContract.room.building.name,
          }
        : null,
      hasActiveContract: !!activeContract,
      currentContract: activeContract
        ? {
            id: activeContract.id,
            contractNumber: activeContract.code,
            isRoomLeader: activeContract.isRoomLeader,
            room: {
              id: activeContract.room.id,
              code: activeContract.room.code,
              buildingName: activeContract.room.building.name,
            },
            startDate: activeContract.startDate.toISOString().split('T')[0],
            endDate: activeContract.endDate.toISOString().split('T')[0],
            status: activeContract.status,
            monthlyRent: Number(activeContract.monthlyRent),
            checkInDate: activeContract.checkedInAt?.toISOString().split('T')[0],
            checkOutDate: activeContract.checkedOutAt?.toISOString().split('T')[0],
          }
        : null,
      contractHistory,
      stats,
      createdAt: student.createdAt,
    };
  }

  // ========================================
  // CREATE
  // ========================================
  async create(dto: CreateStudentDto) {
    // Check duplicate studentCode
    const existingStudent = await this.prisma.student.findUnique({
      where: { studentCode: dto.studentCode },
    });

    if (existingStudent) {
      throw new ConflictException('Mã sinh viên đã tồn tại');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();

    // Check duplicate email in User
    const existingUser = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Validate admissionYear matches studentCode prefix
    const codeYear = parseInt(dto.studentCode.substring(0, 4));
    if (codeYear && dto.admissionYear && codeYear !== dto.admissionYear) {
      throw new BadRequestException(
        `Năm nhập học (${dto.admissionYear}) không khớp với MSSV (${dto.studentCode})`,
      );
    }

    // Create user and student in transaction
    // Default password = MSSV; student should change on first login
    const result = await this.prisma.$transaction(async (tx) => {
      const passwordHash = await bcrypt.hash(dto.studentCode, 10);

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: 'STUDENT',
          fullName: dto.fullName,
          phone: dto.phone,
          isActive: true,
          mustChangePassword: true,
        },
      });

      // Create student
      const student = await tx.student.create({
        data: {
          userId: user.id,
          studentCode: dto.studentCode,
          fullName: dto.fullName,
          gender: dto.gender,
          dateOfBirth: new Date(dto.dateOfBirth),
          idCardNumber: dto.idCardNumber,
          phone: dto.phone,
          email: normalizedEmail,
          faculty: dto.major,
          className: dto.classCode,
          hometownProvince: dto.hometown,
          hometownDistance: dto.hometownDistance,
          emergencyContactName: dto.emergencyContactName,
          emergencyContactPhone: dto.emergencyContactPhone,
          emergencyContactRelation: dto.emergencyContactRelation,
        },
      });

      return student;
    });

    return this.findOne(result.id);
  }

  // ========================================
  // UPDATE
  // ========================================
  async update(id: number, dto: UpdateStudentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy sinh viên');
    }

    // Check duplicate studentCode if changing
    if (dto.studentCode && dto.studentCode !== student.studentCode) {
      const existingStudent = await this.prisma.student.findUnique({
        where: { studentCode: dto.studentCode },
      });
      if (existingStudent) {
        throw new ConflictException('Mã sinh viên đã tồn tại');
      }
    }

    // Check duplicate email if changing
    const normalizedEmail = dto.email ? dto.email.trim().toLowerCase() : undefined;
    if (normalizedEmail && normalizedEmail !== student.email?.toLowerCase()) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: { equals: normalizedEmail, mode: 'insensitive' },
          id: { not: student.userId },
        },
      });
      if (existingUser) {
        throw new ConflictException('Email đã được sử dụng');
      }
    }

    // Update in transaction
    await this.prisma.$transaction(async (tx) => {
      // Sync email/phone/name changes to User
      const userData: any = {};
      if (dto.fullName) userData.fullName = dto.fullName;
      if (normalizedEmail) userData.email = normalizedEmail;
      if (dto.phone) userData.phone = dto.phone;

      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: student.userId },
          data: userData,
        });
      }

      // Update student
      await tx.student.update({
        where: { id },
        data: {
          studentCode: dto.studentCode,
          fullName: dto.fullName,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          idCardNumber: dto.idCardNumber,
          phone: dto.phone,
          email: normalizedEmail,
          faculty: dto.major,
          className: dto.classCode,
          hometownProvince: dto.hometown,
          hometownDistance: dto.hometownDistance,
          emergencyContactName: dto.emergencyContactName,
          emergencyContactPhone: dto.emergencyContactPhone,
          emergencyContactRelation: dto.emergencyContactRelation,
          status: dto.status as unknown as any,
        },
      });
    });

    return this.findOne(id);
  }

  // ========================================
  // DELETE
  // ========================================
  async remove(id: number) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        contracts: {
          where: { status: ContractStatus.ACTIVE },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy sinh viên');
    }

    if (student.contracts.length > 0) {
      throw new BadRequestException(
        'Không thể xóa sinh viên đang có hợp đồng. Vui lòng kết thúc hợp đồng trước.',
      );
    }

    // Soft delete: deactivate user
    await this.prisma.user.update({
      where: { id: student.userId },
      data: { isActive: false },
    });

    return { message: 'Đã xóa sinh viên thành công' };
  }

  // ========================================
  // IMPORT FROM CSV
  // ========================================
  async import(data: ImportStudentDto[]): Promise<ImportResultDto> {
    const result: ImportResultDto = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +2 because of header row and 0-index

      try {
        // Validate required fields
        if (!row.studentCode || !row.fullName || !row.email) {
          result.errors.push(`Dòng ${rowNum}: Thiếu thông tin bắt buộc`);
          result.failed++;
          continue;
        }

        // Parse gender
        let gender: Gender;
        const genderInput = row.gender?.toString().toUpperCase();
        if (['MALE', 'NAM', 'M'].includes(genderInput)) {
          gender = Gender.MALE;
        } else if (['FEMALE', 'NỮ', 'NU', 'F'].includes(genderInput)) {
          gender = Gender.FEMALE;
        } else {
          result.errors.push(`Dòng ${rowNum}: Giới tính không hợp lệ`);
          result.failed++;
          continue;
        }

        // Parse admission year — fallback to prefix of studentCode to avoid validate error
        const studentCode = row.studentCode.toString().trim();
        const codeYearPrefix = parseInt(studentCode.substring(0, 4));
        const parsedYear = typeof row.admissionYear === 'string'
          ? parseInt(row.admissionYear)
          : row.admissionYear;
        const admissionYear = parsedYear || codeYearPrefix || new Date().getFullYear();

        // Create student
        await this.create({
          studentCode,
          fullName: row.fullName.trim(),
          email: row.email.trim(),
          phone: row.phone?.toString().trim() || '',
          gender,
          dateOfBirth: row.dateOfBirth,
          major: row.major?.trim() || '',
          classCode: row.classCode?.trim() || '',
          admissionYear,
        });

        result.success++;
      } catch (error: any) {
        if (error instanceof ConflictException) {
          result.errors.push(`Dòng ${rowNum}: ${error.message}`);
        } else {
          result.errors.push(`Dòng ${rowNum}: Lỗi không xác định - ${error.message}`);
        }
        result.failed++;
      }
    }

    return result;
  }

  // ========================================
  // EXPORT TO CSV
  // ========================================
  async export(): Promise<string> {
    const students = await this.prisma.student.findMany({
      where: { user: { isActive: true } },
      include: {
        user: {
          select: {
            isActive: true,
          },
        },
        contracts: {
          where: { status: ContractStatus.ACTIVE },
          include: {
            room: {
              include: {
                building: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { studentCode: 'asc' },
    });

    // CSV header — dùng 'Năm nhập học' (số năm 4 chữ số) để có thể import lại được
    const headers = [
      'MSSV',
      'Họ tên',
      'Email',
      'SĐT',
      'Giới tính',
      'Ngày sinh',
      'Ngành',
      'Lớp',
      'Năm nhập học',
      'Trạng thái',
      'Phòng KTX',
      'Tòa',
    ];

    const rows = students.map((student) => {
      const activeContract = student.contracts[0];
      const admYear = parseInt(student.studentCode.substring(0, 4)) || '';

      return [
        student.studentCode,
        student.fullName,
        student.email || '',
        student.phone || '',
        student.gender === Gender.MALE ? 'Nam' : 'Nữ',
        student.dateOfBirth?.toISOString().split('T')[0] || '',
        student.faculty || '',
        student.className || '',
        admYear || '',
        (() => {
          switch (student.status) {
            case 'ACTIVE': return 'Đang học';
            case 'GRADUATED': return 'Đã tốt nghiệp';
            case 'SUSPENDED': return 'Tạm nghỉ';
            case 'DROPPED_OUT': return 'Thôi học';
            default: return '';
          }
        })(),
        activeContract?.room.code || '',
        activeContract?.room.building.name || '',
      ];
    });

    // Build CSV string (sanitize cells to prevent formula injection)
    const sanitize = (value: string | number) => {
      const str = value?.toString() || '';
      // Prefix với tab nếu cell bắt đầu bằng ký tự dễ bị Excel hiểu là formula
      const safe = /^[=+\-@|]/.test(str) ? `\t${str}` : str;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map(sanitize).join(',')),
    ].join('\n');

    // Add BOM for UTF-8
    return '\uFEFF' + csvContent;
  }

  // ========================================
  // FIND BY STUDENT CODE
  // ========================================
  async findByStudentCode(studentCode: string) {
    const student = await this.prisma.student.findUnique({
      where: { studentCode },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy sinh viên');
    }

    return student;
  }
}