import {
  IsEnum,
  IsOptional,
  IsInt,
  IsBoolean,
  IsNumber,
  IsArray,
  IsString,
  Min,
  Max,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ========================================
// ENUMS
// ========================================

export enum ApplicationType {
  NEW = 'NEW',
  RENEWAL = 'RENEWAL',
}

export enum ApplicationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

// ========================================
// ROOM PREFERENCE DTO
// ========================================

export class RoomPreferenceDto {
  @ApiProperty({ example: 1, description: 'Thứ tự ưu tiên (1, 2, 3)' })
  @IsInt()
  @Min(1)
  @Max(3)
  priority: number;

  @ApiProperty({ example: 5, description: 'Room ID' })
  @IsInt()
  roomId: number;
}

// ========================================
// PRIORITY INFO DTO
// ========================================

export class PriorityInfoDto {
  @ApiPropertyOptional({ description: 'Sinh viên năm nhất' })
  @IsOptional()
  @IsBoolean()
  isFirstYear?: boolean;

  @ApiPropertyOptional({ description: 'Hộ nghèo' })
  @IsOptional()
  @IsBoolean()
  isPoorHousehold?: boolean;

  @ApiPropertyOptional({ description: 'Hộ cận nghèo' })
  @IsOptional()
  @IsBoolean()
  isNearPoor?: boolean;

  @ApiPropertyOptional({ description: 'Mồ côi' })
  @IsOptional()
  @IsBoolean()
  isOrphan?: boolean;

  @ApiPropertyOptional({ description: 'Khuyết tật' })
  @IsOptional()
  @IsBoolean()
  isDisabled?: boolean;

  @ApiPropertyOptional({ description: 'Gia đình chính sách' })
  @IsOptional()
  @IsBoolean()
  isPolicyFamily?: boolean;

  @ApiPropertyOptional({ description: 'Đã từng ở KTX' })
  @IsOptional()
  @IsBoolean()
  wasResident?: boolean;

  @ApiPropertyOptional({ description: 'GPA kỳ trước', example: 3.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  gpaLastSemester?: number;
}

// ========================================
// CREATE APPLICATION DTO
// ========================================

export class CreateApplicationDto {
  @ApiProperty({ enum: ApplicationType })
  @IsEnum(ApplicationType)
  applicationType: ApplicationType;

  @ApiProperty({ type: PriorityInfoDto })
  @ValidateNested()
  @Type(() => PriorityInfoDto)
  priorityInfo: PriorityInfoDto;

  @ApiPropertyOptional({ type: [RoomPreferenceDto], description: 'Danh sách phòng ưu tiên (tối đa 3)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => RoomPreferenceDto)
  roomPreferences?: RoomPreferenceDto[];
}

// ========================================
// UPDATE APPLICATION STATUS DTO (Admin)
// ========================================

export class UpdateApplicationStatusDto {
  @ApiProperty({ enum: ApplicationStatus })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @ApiPropertyOptional({ description: 'Room ID nếu APPROVED' })
  @IsOptional()
  @IsInt()
  assignedRoomId?: number;

  @ApiPropertyOptional({ description: 'Lý do từ chối nếu REJECTED' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

// ========================================
// QUERY DTO
// ========================================

export class QueryApplicationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by period ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodId?: number;

  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ enum: ApplicationType })
  @IsOptional()
  @IsEnum(ApplicationType)
  applicationType?: ApplicationType;

  @ApiPropertyOptional({ description: 'Filter by student ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  studentId?: number;

  @ApiPropertyOptional({ description: 'Search by student code or name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// ========================================
// RESPONSE DTOs
// ========================================

export class ApplicationResponseDto {
  id: number;
  studentId: number;
  student: {
    id: number;
    studentCode: string;
    fullName: string;
    gender: string;
    className: string;
    faculty: string;
  };
  periodId: number;
  period: {
    id: number;
    code: string;
    name: string;
    academicYear: string;
    semester: number;
  };
  applicationType: ApplicationType;
  priorityInfo: PriorityInfoDto;
  priorityScore: number;
  roomPreferences: {
    priority: number;
    room: {
      id: number;
      code: string;
      buildingName: string;
    };
  }[];
  status: ApplicationStatus;
  assignedRoom?: {
    id: number;
    code: string;
    buildingName: string;
  };
  rejectionReason?: string;
  reviewedById?: number;
  reviewedBy?: {
    id: number;
    fullName: string;
  };
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedApplicationResponseDto {
  data: ApplicationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ========================================
// STUDENT DASHBOARD DTO
// ========================================

export class StudentDashboardDto {
  student: {
    id: number;
    studentCode: string;
    fullName: string;
    className: string;
  };
  currentRoom: {
    id: number;
    code: string;
    buildingName: string;
  } | null;
  currentContract: {
    id: number;
    endDate: Date;
    daysRemaining: number;
  } | null;
  unpaidInvoice: {
    id: number;
    amount: number;
    dueDate: Date;
    status: string;
    daysUntilDue: number;
  } | null;
  unpaidInvoicesCount: number;
  pendingTransfer: { id: number; code: string; toRoomCode: string } | null;
  pendingTicketsCount: number;
  recentInvoices: {
    id: number;
    month: string;
    amount: number;
    dueDate: Date;
    status: string;
  }[];
  recentTickets: {
    id: number;
    title: string;
    category: string;
    status: string;
    createdAt: Date;
  }[];
}

// ========================================
// UPDATE STUDENT PROFILE DTO
// ========================================

export class UpdateStudentProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idCardNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hometownProvince?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  hometownDistance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactRelation?: string;
}