/**
 * seed-demo.ts — Data bổ sung cho demo giáo viên
 * Chạy SAU seed.ts:
 *   npx ts-node -r tsconfig-paths/register prisma/seed-demo.ts
 *
 * Idempotent: dùng upsert / findFirst → safe khi chạy nhiều lần.
 */

import 'dotenv/config';
import {
  PrismaClient,
  UserRole,
  Gender,
  RoomType,
  RoomStatus,
  BuildingStatus,
  PeriodStatus,
  ApplicationType,
  ApplicationStatus,
  ContractStatus,
  RoomTransferStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set.');
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ── helpers ──────────────────────────────────────────────────────────────────

const pw = bcrypt.hashSync('123456', 10);

async function upsertUser(email: string, data: { fullName: string; role: UserRole; phone?: string }) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash: pw, isActive: true, ...data },
  });
}

async function upsertStudent(studentCode: string, data: object) {
  return (
    (await prisma.student.findUnique({ where: { studentCode } })) ??
    (await prisma.student.create({ data: { studentCode, ...data } as any }))
  );
}

async function upsertRoom(code: string, data: object) {
  return prisma.room.upsert({
    where: { code },
    update: {},
    create: { code, ...data } as any,
  });
}

async function upsertPeriod(code: string, data: object) {
  return prisma.registrationPeriod.upsert({
    where: { code },
    update: {},
    create: { code, ...data } as any,
  });
}

async function findOrCreateApp(where: { studentId: number; periodId: number }, data: object) {
  return (
    (await prisma.registrationApplication.findFirst({ where })) ??
    (await prisma.registrationApplication.create({ data: { ...where, ...data } as any }))
  );
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 seed-demo.ts — bắt đầu...\n');

  const admin = await prisma.user.findFirstOrThrow({ where: { role: UserRole.ADMIN } });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. STAFF MỚI — Tòa B + Tòa C
  // ═══════════════════════════════════════════════════════════════════════════

  const staff2 = await upsertUser('staff2@dormhub.com', {
    fullName: 'Trần Thị Bảo',
    role: UserRole.STAFF,
    phone: '0912345678',
  });
  const staff3 = await upsertUser('staff3@dormhub.com', {
    fullName: 'Lê Quốc Cường',
    role: UserRole.STAFF,
    phone: '0923456789',
  });
  console.log(`✅ Staff: staff2 (Tòa B), staff3 (Tòa C)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. TOÀ C — Nam, mới xây (để show multi-building)
  // ═══════════════════════════════════════════════════════════════════════════

  const bldA = await prisma.building.findUniqueOrThrow({ where: { code: 'A' } });
  const bldB = await prisma.building.findUniqueOrThrow({ where: { code: 'B' } });

  const bldC = await prisma.building.upsert({
    where: { code: 'C' },
    update: {},
    create: {
      code: 'C',
      name: 'Tòa C (Nam – Mới)',
      totalFloors: 6,
      description: 'Tòa KTX nam mới đưa vào sử dụng từ năm học 2025-2026, đầy đủ điều hòa và wifi.',
      status: BuildingStatus.ACTIVE,
    },
  });

  // Phòng Tòa C — mix standard và AC, có 1 phòng bảo trì để show trạng thái
  const [rC101, rC102, rC103, rC201, rC202, rC203, rC301] = await Promise.all([
    upsertRoom('C101', { buildingId: bldC.id, floor: 1, gender: Gender.MALE, roomType: RoomType.STANDARD,      capacity: 6, pricePerMonth: 380000 }),
    upsertRoom('C102', { buildingId: bldC.id, floor: 1, gender: Gender.MALE, roomType: RoomType.AIR_CONDITIONED, capacity: 4, pricePerMonth: 580000 }),
    upsertRoom('C103', { buildingId: bldC.id, floor: 1, gender: Gender.MALE, roomType: RoomType.AIR_CONDITIONED, capacity: 4, pricePerMonth: 580000, status: RoomStatus.MAINTENANCE, description: 'Đang sơn lại tường, dự kiến hoàn thành 01/06/2026' }),
    upsertRoom('C201', { buildingId: bldC.id, floor: 2, gender: Gender.MALE, roomType: RoomType.STANDARD,      capacity: 6, pricePerMonth: 380000 }),
    upsertRoom('C202', { buildingId: bldC.id, floor: 2, gender: Gender.MALE, roomType: RoomType.AIR_CONDITIONED, capacity: 4, pricePerMonth: 580000 }),
    upsertRoom('C203', { buildingId: bldC.id, floor: 2, gender: Gender.MALE, roomType: RoomType.AIR_CONDITIONED, capacity: 4, pricePerMonth: 580000 }),
    upsertRoom('C301', { buildingId: bldC.id, floor: 3, gender: Gender.MALE, roomType: RoomType.STANDARD,      capacity: 6, pricePerMonth: 380000 }),
  ]);

  console.log(`✅ Tòa C: 7 phòng (C101–C301, 1 bảo trì)`);

  // Gán staff
  const assignStaff = async (userId: number, buildingId: number) => {
    await prisma.userBuilding.upsert({
      where: { userId_buildingId: { userId, buildingId } },
      update: {},
      create: { userId, buildingId, assignedById: admin.id },
    });
  };
  await assignStaff(staff2.id, bldB.id);
  await assignStaff(staff3.id, bldC.id);
  console.log(`✅ Staff2 → Tòa B, Staff3 → Tòa C`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SINH VIÊN DEMO — K68 (2023), chưa có phòng, để demo live registration
  // ═══════════════════════════════════════════════════════════════════════════

  const uDemo1 = await upsertUser('sv_demo@dormhub.com', {
    fullName: 'Phan Văn Khải',
    role: UserRole.STUDENT,
    phone: '0934111222',
  });
  const uDemo2 = await upsertUser('sv_demo_nu@dormhub.com', {
    fullName: 'Nguyễn Thị Ngọc',
    role: UserRole.STUDENT,
    phone: '0934333444',
  });

  const svDemo1 = await upsertStudent('B23DCCN099', {
    userId: uDemo1.id,
    fullName: 'Phan Văn Khải',
    gender: Gender.MALE,
    dateOfBirth: new Date('2005-03-10'),
    idCardNumber: '049305001234',
    faculty: 'Công nghệ thông tin',
    className: 'D23CQCN03-N',
    majorCode: 'CNTT',
    hometownProvince: 'Quảng Nam',
    hometownDistance: 850,
    phone: '0934111222',
    email: 'sv_demo@dormhub.com',
    emergencyContactName: 'Phan Văn Minh',
    emergencyContactPhone: '0905123456',
    emergencyContactRelation: 'Cha',
  });

  const svDemo2 = await upsertStudent('B23DCVT098', {
    userId: uDemo2.id,
    fullName: 'Nguyễn Thị Ngọc',
    gender: Gender.FEMALE,
    dateOfBirth: new Date('2005-07-22'),
    idCardNumber: '052305005678',
    faculty: 'Điện tử Viễn thông',
    className: 'D23CQVT02-N',
    majorCode: 'VT',
    hometownProvince: 'Bình Định',
    hometownDistance: 1000,
    phone: '0934333444',
    email: 'sv_demo_nu@dormhub.com',
    emergencyContactName: 'Nguyễn Văn Hùng',
    emergencyContactPhone: '0905654321',
    emergencyContactRelation: 'Cha',
  });

  console.log(`✅ Demo students: sv_demo@dormhub.com (K68/Nam/Quảng Nam) — sv_demo_nu@dormhub.com (K68/Nữ/Bình Định)`);
  console.log(`   → Cả 2 chưa có phòng, dùng để demo live đăng ký`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. K68 STUDENTS bổ sung — có PENDING apps trong đợt OPEN (cho đông)
  // ═══════════════════════════════════════════════════════════════════════════

  const k68Defs = [
    { email: 'sv17@dormhub.com', name: 'Đỗ Minh Quân',      code: 'B23DCCN011', gender: Gender.MALE,   faculty: 'CNTT',            cls: 'D23CQCN01-N', province: 'Nghệ An',    dist: 300, isPoor: false, gpa: null  },
    { email: 'sv18@dormhub.com', name: 'Cao Thế Phong',      code: 'B23DCCN012', gender: Gender.MALE,   faculty: 'Điện tử',         cls: 'D23CQDT02-N', province: 'Hà Tĩnh',   dist: 340, isPoor: true,  gpa: null  },
    { email: 'sv19@dormhub.com', name: 'Lương Văn Tài',      code: 'B23DCDT013', gender: Gender.MALE,   faculty: 'Điện tử',         cls: 'D23CQDT01-N', province: 'Quảng Bình',dist: 500, isPoor: false, gpa: 3.6  },
    { email: 'sv20@dormhub.com', name: 'Trịnh Thị Thu',      code: 'B23DCVT014', gender: Gender.FEMALE, faculty: 'Viễn thông',      cls: 'D23CQVT01-N', province: 'Thanh Hóa', dist: 150, isPoor: false, gpa: null  },
    { email: 'sv21@dormhub.com', name: 'Mai Thị Hạnh',       code: 'B23DCCN015', gender: Gender.FEMALE, faculty: 'CNTT',            cls: 'D23CQCN02-N', province: 'Nam Định',   dist: 90,  isPoor: true,  gpa: null  },
    { email: 'sv22@dormhub.com', name: 'Lê Thị Bích Thảo',   code: 'B23DCDT016', gender: Gender.FEMALE, faculty: 'Điện tử',         cls: 'D23CQDT02-N', province: 'Ninh Bình',  dist: 120, isPoor: false, gpa: 3.8  },
    { email: 'sv23@dormhub.com', name: 'Phạm Hữu Đạt',       code: 'B23DCCN017', gender: Gender.MALE,   faculty: 'CNTT',            cls: 'D23CQCN03-N', province: 'Hải Phòng',  dist: 100, isPoor: false, gpa: null  },
    { email: 'sv24@dormhub.com', name: 'Ngô Xuân Bình',      code: 'B23DCDT018', gender: Gender.MALE,   faculty: 'Điện tử',         cls: 'D23CQDT01-N', province: 'Thái Bình',  dist: 110, isPoor: false, gpa: null  },
  ];

  const k68Students: any[] = [];
  for (const def of k68Defs) {
    const u = await upsertUser(def.email, { fullName: def.name, role: UserRole.STUDENT });
    const s = await upsertStudent(def.code, {
      userId: u.id, fullName: def.name,
      gender: def.gender, faculty: def.faculty, className: def.cls,
      hometownProvince: def.province, hometownDistance: def.dist,
    });
    k68Students.push({ ...s, isPoor: def.isPoor, gpa: def.gpa });
  }
  console.log(`✅ K68 students: sv17-sv24`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. ĐỢT ĐĂNG KÝ — Đủ 5 trạng thái cho dashboard phong phú
  // ═══════════════════════════════════════════════════════════════════════════

  const now = new Date();

  // Lịch sử xa: HK2 2023-2024 — CLOSED, có số liệu
  const periodOld = await upsertPeriod('2023-2024-HK2', {
    name: 'Đăng ký KTX HK2 năm học 2023-2024',
    academicYear: '2023-2024',
    semester: 2,
    startDate: new Date('2024-01-02'),
    endDate: new Date('2024-01-20'),
    moveInDate: new Date('2024-02-15'),
    moveOutDate: new Date('2024-07-31'),
    allowRoomPreference: true,
    targetAdmissionYears: [2021, 2022, 2023],
    allowedTypes: 'ALL',
    status: PeriodStatus.CLOSED,
    totalApplications: 48,
    approvedCount: 35,
    rejectedCount: 8,
    pendingCount: 0,
    createdById: admin.id,
  });

  // Đợt bị hủy: Học kỳ hè 2024 (không đủ chỉ tiêu)
  const periodCancelled = await upsertPeriod('2024-HK-HE', {
    name: 'Đăng ký KTX Học kỳ Hè 2024',
    academicYear: '2023-2024',
    semester: 3,
    startDate: new Date('2024-05-01'),
    endDate: new Date('2024-05-15'),
    moveInDate: new Date('2024-06-01'),
    moveOutDate: new Date('2024-08-31'),
    allowRoomPreference: false,
    targetAdmissionYears: [2021, 2022],
    allowedTypes: 'RENEWAL_ONLY',
    description: 'Đợt đăng ký học kỳ hè. Đã hủy do số lượng sinh viên đăng ký không đủ tối thiểu.',
    status: PeriodStatus.CANCELLED,
    totalApplications: 3,
    approvedCount: 0,
    rejectedCount: 0,
    pendingCount: 0,
    createdById: admin.id,
  });

  // Đợt đang OPEN (update period HK2 2024-2025 để include K68)
  const periodOpen = await prisma.registrationPeriod.upsert({
    where: { code: '2024-2025-HK2' },
    update: {
      targetAdmissionYears: [2023, 2022, 2021],
      allowedTypes: 'ALL',
    },
    create: {
      code: '2024-2025-HK2',
      name: 'Đăng ký KTX HK2 năm học 2024-2025',
      academicYear: '2024-2025',
      semester: 2,
      startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      moveInDate: new Date('2025-02-10'),
      moveOutDate: new Date('2025-06-30'),
      allowRoomPreference: true,
      targetAdmissionYears: [2023, 2022, 2021],
      allowedTypes: 'ALL',
      status: PeriodStatus.OPEN,
      createdById: admin.id,
    },
  });

  // Đợt UPCOMING: HK1 2025-2026 (nâng từ DRAFT lên UPCOMING)
  const periodUpcoming = await prisma.registrationPeriod.upsert({
    where: { code: '2025-2026-HK1' },
    update: {
      status: PeriodStatus.UPCOMING,
      startDate: new Date('2025-07-01'),
      endDate: new Date('2025-08-15'),
      moveInDate: new Date('2025-09-01'),
      moveOutDate: new Date('2026-01-31'),
      targetAdmissionYears: [2023, 2022, 2021, 2020],
      allowedTypes: 'ALL',
    },
    create: {
      code: '2025-2026-HK1',
      name: 'Đăng ký KTX HK1 năm học 2025-2026',
      academicYear: '2025-2026',
      semester: 1,
      startDate: new Date('2025-07-01'),
      endDate: new Date('2025-08-15'),
      moveInDate: new Date('2025-09-01'),
      moveOutDate: new Date('2026-01-31'),
      allowRoomPreference: true,
      targetAdmissionYears: [2023, 2022, 2021, 2020],
      allowedTypes: 'ALL',
      status: PeriodStatus.UPCOMING,
      createdById: admin.id,
    },
  });

  // Đợt DRAFT: HK1 2026-2027 — mới tạo nháp
  const periodDraft = await upsertPeriod('2026-2027-HK1', {
    name: 'Đăng ký KTX HK1 năm học 2026-2027',
    academicYear: '2026-2027',
    semester: 1,
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-08-15'),
    moveInDate: new Date('2026-09-01'),
    moveOutDate: new Date('2027-01-31'),
    allowRoomPreference: true,
    targetAdmissionYears: [2024, 2023, 2022, 2021],
    allowedTypes: 'ALL',
    status: PeriodStatus.DRAFT,
    createdById: admin.id,
  });

  console.log(`✅ Registration periods:`);
  console.log(`   CLOSED:    2023-2024-HK2 (lịch sử, 48 đơn)`);
  console.log(`   CANCELLED: 2024-HK-HE (hủy do thiếu SV)`);
  console.log(`   OPEN:      2024-2025-HK2 (đang mở, đã update targetYears += K68)`);
  console.log(`   UPCOMING:  2025-2026-HK1 (sắp mở 01/07/2025)`);
  console.log(`   DRAFT:     2026-2027-HK1 (nháp)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. ĐƠN ĐĂNG KÝ K68 trong đợt OPEN — tạo đủ trạng thái đa dạng
  // ═══════════════════════════════════════════════════════════════════════════

  // sv17 (Đỗ Minh Quân, Nam) — PENDING, chọn C101 > A101
  const appK68_1 = await findOrCreateApp({ studentId: k68Students[0].id, periodId: periodOpen.id }, {
    type: ApplicationType.NEW, isFirstYear: true,
    priorityScore: 5, status: ApplicationStatus.PENDING,
  });
  await prisma.roomChoice.upsert({ where: { applicationId_priority: { applicationId: appK68_1.id, priority: 1 } }, update: {}, create: { applicationId: appK68_1.id, roomId: rC101.id, priority: 1 } });
  await prisma.roomChoice.upsert({ where: { applicationId_priority: { applicationId: appK68_1.id, priority: 2 } }, update: {}, create: { applicationId: appK68_1.id, roomId: (await prisma.room.findUnique({ where: { code: 'A101' } }))!.id, priority: 2 } });

  // sv18 (Cao Thế Phong, Nam, hộ nghèo) — PENDING, 15đ
  const appK68_2 = await findOrCreateApp({ studentId: k68Students[1].id, periodId: periodOpen.id }, {
    type: ApplicationType.NEW, isFirstYear: true, isPoorHousehold: true,
    priorityScore: 20, status: ApplicationStatus.PENDING,
  });
  await prisma.roomChoice.upsert({ where: { applicationId_priority: { applicationId: appK68_2.id, priority: 1 } }, update: {}, create: { applicationId: appK68_2.id, roomId: rC102.id, priority: 1 } });

  // sv19 (Lương Văn Tài, Nam, GPA 3.6) — APPROVED vào C201
  const appK68_3 = await findOrCreateApp({ studentId: k68Students[2].id, periodId: periodOpen.id }, {
    type: ApplicationType.NEW, isFirstYear: true, gpaLastSemester: 3.6,
    priorityScore: 15, status: ApplicationStatus.APPROVED,
    approvedRoomId: rC201.id, approvedPriority: 1,
    reviewedById: admin.id, reviewedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
  });
  await prisma.roomChoice.upsert({ where: { applicationId_priority: { applicationId: appK68_3.id, priority: 1 } }, update: {}, create: { applicationId: appK68_3.id, roomId: rC201.id, priority: 1 } });

  // Tạo hợp đồng cho sv19 (đã được duyệt)
  await prisma.contract.upsert({
    where: { code: 'HD-2026-020' },
    update: {},
    create: {
      code: 'HD-2026-020',
      studentId: k68Students[2].id,
      roomId: rC201.id,
      applicationId: appK68_3.id,
      startDate: new Date('2025-02-10'),
      endDate: new Date('2025-06-30'),
      monthlyRent: 380000,
      status: ContractStatus.ACTIVE,
      checkedInAt: new Date('2025-02-10'),
      createdById: admin.id,
    },
  });

  // sv20 (Trịnh Thị Thu, Nữ) — PENDING
  const appK68_4 = await findOrCreateApp({ studentId: k68Students[3].id, periodId: periodOpen.id }, {
    type: ApplicationType.NEW, isFirstYear: true,
    priorityScore: 5, status: ApplicationStatus.PENDING,
  });
  await prisma.roomChoice.upsert({ where: { applicationId_priority: { applicationId: appK68_4.id, priority: 1 } }, update: {}, create: { applicationId: appK68_4.id, roomId: (await prisma.room.findUnique({ where: { code: 'B103' } }))!.id, priority: 1 } });

  // sv21 (Mai Thị Hạnh, Nữ, hộ nghèo) — PENDING, 20đ
  const appK68_5 = await findOrCreateApp({ studentId: k68Students[4].id, periodId: periodOpen.id }, {
    type: ApplicationType.NEW, isFirstYear: true, isPoorHousehold: true,
    priorityScore: 20, status: ApplicationStatus.PENDING,
  });
  await prisma.roomChoice.upsert({ where: { applicationId_priority: { applicationId: appK68_5.id, priority: 1 } }, update: {}, create: { applicationId: appK68_5.id, roomId: (await prisma.room.findUnique({ where: { code: 'B201' } }))!.id, priority: 1 } });

  // sv22 (Lê Thị Bích Thảo, Nữ, GPA 3.8) — REJECTED (phòng đã đầy)
  const appK68_6 = await findOrCreateApp({ studentId: k68Students[5].id, periodId: periodOpen.id }, {
    type: ApplicationType.NEW, isFirstYear: true, gpaLastSemester: 3.8,
    priorityScore: 15, status: ApplicationStatus.REJECTED,
    rejectionReason: 'Tất cả phòng trong nguyện vọng đã đủ sinh viên. Đề nghị bạn đăng ký lại đợt tiếp theo hoặc chọn nguyện vọng khác.',
    reviewedById: admin.id, reviewedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
  });
  await prisma.roomChoice.upsert({ where: { applicationId_priority: { applicationId: appK68_6.id, priority: 1 } }, update: {}, create: { applicationId: appK68_6.id, roomId: (await prisma.room.findUnique({ where: { code: 'B102' } }))!.id, priority: 1 } });

  // sv23 (Phạm Hữu Đạt, Nam) — CANCELLED (tự hủy)
  await findOrCreateApp({ studentId: k68Students[6].id, periodId: periodOpen.id }, {
    type: ApplicationType.NEW, isFirstYear: true,
    priorityScore: 5, status: ApplicationStatus.CANCELLED,
  });

  // sv24 (Ngô Xuân Bình, Nam) — PENDING
  const appK68_8 = await findOrCreateApp({ studentId: k68Students[7].id, periodId: periodOpen.id }, {
    type: ApplicationType.NEW, isFirstYear: true,
    priorityScore: 5, status: ApplicationStatus.PENDING,
  });
  await prisma.roomChoice.upsert({ where: { applicationId_priority: { applicationId: appK68_8.id, priority: 1 } }, update: {}, create: { applicationId: appK68_8.id, roomId: rC201.id, priority: 1 } });

  console.log(`✅ K68 applications: 4 PENDING, 1 APPROVED (+ HD), 1 REJECTED, 1 CANCELLED`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. CHUYỂN PHÒNG — Stable codes, đủ 4 trạng thái
  // ═══════════════════════════════════════════════════════════════════════════

  // Tìm hợp đồng active của sv1 (A102) và sv3 (B102)
  const ctSv1 = await prisma.contract.findFirst({
    where: { student: { studentCode: 'B22DCCN001' }, status: ContractStatus.ACTIVE },
    include: { room: true },
  });
  const ctSv3 = await prisma.contract.findFirst({
    where: { student: { studentCode: 'B22DCCN003' }, status: ContractStatus.ACTIVE },
    include: { room: true },
  });
  const ctSv4 = await prisma.contract.findFirst({
    where: { student: { studentCode: 'B22DCVT004' }, status: ContractStatus.ACTIVE },
    include: { room: true },
  });
  const ctSv7 = await prisma.contract.findFirst({
    where: { student: { studentCode: 'B22DCCN007' }, status: ContractStatus.ACTIVE },
    include: { room: true },
  });

  const roomA103 = await prisma.room.findUnique({ where: { code: 'A103' } });
  const roomA201 = await prisma.room.findUnique({ where: { code: 'A201' } });
  const roomB201 = await prisma.room.findUnique({ where: { code: 'B201' } });
  const roomB203 = await prisma.room.findUnique({ where: { code: 'B203' } });

  type RTWhere = { code: string };

  const upsertTransfer = async (code: string, data: object) => {
    const ex = await prisma.roomTransferRequest.findFirst({ where: { code } });
    if (!ex) await prisma.roomTransferRequest.create({ data: { code, ...data } as any });
  };

  // PENDING — sv1 muốn chuyển từ A102 → A103 (có điều hòa)
  if (ctSv1 && roomA103) {
    await upsertTransfer('CHPG-2026-001', {
      studentId: ctSv1.studentId,
      fromRoomId: ctSv1.roomId,
      toRoomId: roomA103.id,
      reason: 'Phòng A102 không có điều hòa, thời tiết hè nóng bức ảnh hưởng đến sức khỏe và việc học. Tôi muốn chuyển sang A103 có điều hòa.',
      status: RoomTransferStatus.PENDING,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    });
  }

  // PENDING — sv3 muốn chuyển từ B102 → B201 (muốn ở tầng cao hơn)
  if (ctSv3 && roomB201) {
    await upsertTransfer('CHPG-2026-002', {
      studentId: ctSv3.studentId,
      fromRoomId: ctSv3.roomId,
      toRoomId: roomB201.id,
      reason: 'Phòng B102 tầng 1 bị ẩm thấp vào mùa mưa, tường thường xuyên có nấm mốc ảnh hưởng đến sức khỏe. Đề nghị được chuyển lên tầng 2.',
      status: RoomTransferStatus.PENDING,
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    });
  }

  // APPROVED — sv7 đã được duyệt chuyển phòng (lịch sử 10 ngày trước)
  if (ctSv7 && roomA201) {
    await upsertTransfer('CHPG-2026-003', {
      studentId: ctSv7.studentId,
      fromRoomId: roomA201.id,
      toRoomId: ctSv7.roomId,
      reason: 'Chuyển về phòng gần thang máy hơn để tiện di chuyển vì đang chấn thương chân.',
      status: RoomTransferStatus.APPROVED,
      reviewedById: admin.id,
      reviewedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    });
  }

  // REJECTED — sv4 bị từ chối (phòng B203 đã đủ người)
  if (ctSv4 && roomB203) {
    await upsertTransfer('CHPG-2026-004', {
      studentId: ctSv4.studentId,
      fromRoomId: ctSv4.roomId,
      toRoomId: roomB203.id,
      reason: 'Muốn chuyển sang phòng có điều hòa để có điều kiện học tập tốt hơn.',
      status: RoomTransferStatus.REJECTED,
      rejectionReason: 'Phòng B203 hiện đang đủ 4/4 sinh viên, không còn chỗ trống. Vui lòng theo dõi và đăng ký lại khi có chỗ.',
      reviewedById: admin.id,
      reviewedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    });
  }

  console.log(`✅ Room transfers: CHPG-2026-001 (PENDING), 002 (PENDING), 003 (APPROVED), 004 (REJECTED)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. CẬP NHẬT PERIOD STATS cho đợt OPEN
  // ═══════════════════════════════════════════════════════════════════════════

  const statusCounts = await prisma.registrationApplication.groupBy({
    by: ['status'],
    where: { periodId: periodOpen.id },
    _count: { id: true },
  });
  const map: Record<string, number> = {};
  statusCounts.forEach((r) => { map[r.status] = r._count.id; });
  const total = Object.values(map).reduce((s, v) => s + v, 0);

  await prisma.registrationPeriod.update({
    where: { id: periodOpen.id },
    data: {
      totalApplications: total,
      approvedCount: map['APPROVED'] || 0,
      rejectedCount: map['REJECTED'] || 0,
      pendingCount: map['PENDING'] || 0,
    },
  });

  console.log(`✅ Period stats updated: ${total} tổng đơn, ${map['PENDING'] || 0} chờ duyệt`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. SV_TENANT — demo luồng nạp minh chứng thanh toán
  //    Phòng A203 (Điều hòa, 550k/tháng, tầng 2 Tòa A)
  //    Lịch sử: Nov25–Mar26 PAID
  //    Apr26: PENDING + CÓ paymentProof → admin duyệt live
  //    May26: PENDING + CHƯA có proof → sv upload live
  // ═══════════════════════════════════════════════════════════════════════════

  const PROOF_URL = 'https://res.cloudinary.com/dfouucs9m/image/upload/v1778422885/9216b6a3-dce5-473e-893b-9a5bb85fbbdd_ojwfr4.jpg';

  const uTenant = await upsertUser('sv_tenant@dormhub.com', {
    fullName: 'Trần Anh Tuấn',
    role: UserRole.STUDENT,
    phone: '0941000888',
  });

  const svTenant = await upsertStudent('B22DCCN099', {
    userId: uTenant.id,
    fullName: 'Trần Anh Tuấn',
    gender: Gender.MALE,
    dateOfBirth: new Date('2004-05-15'),
    idCardNumber: '001204012345',
    faculty: 'Công nghệ thông tin',
    className: 'D22CQCN03-N',
    majorCode: 'CNTT',
    hometownProvince: 'Hà Tĩnh',
    hometownDistance: 340,
    phone: '0941000888',
    email: 'sv_tenant@dormhub.com',
    emergencyContactName: 'Trần Văn Dũng',
    emergencyContactPhone: '0912888999',
    emergencyContactRelation: 'Cha',
  });

  const roomA203 = await prisma.room.findUniqueOrThrow({ where: { code: 'A203' } });

  // Hợp đồng ACTIVE HK2 2025-2026
  const ctTenant = await prisma.contract.upsert({
    where: { code: 'HD-2026-TENANT' },
    update: {},
    create: {
      code: 'HD-2026-TENANT',
      studentId: svTenant.id,
      roomId: roomA203.id,
      startDate: new Date('2026-02-10'),
      endDate: new Date('2026-06-30'),
      monthlyRent: 550000,
      status: ContractStatus.ACTIVE,
      checkedInAt: new Date('2026-02-10'),
      isRoomLeader: true,
      createdById: admin.id,
    },
  });

  // ── Room fee invoice (PAID) ──────────────────────────────────────────────
  const existRF = await prisma.invoice.findFirst({ where: { contractId: ctTenant.id } });
  if (!existRF) {
    await prisma.invoice.create({
      data: {
        code: 'RF-2026-TENANT',
        roomId: roomA203.id,
        contractId: ctTenant.id,
        type: 'ROOM_FEE' as any,
        billingMonth: new Date('2026-02-01'),
        roomFee: 550000 * 5,        // 5 tháng HK2
        electricityFee: 0,
        waterFee: 30000 * 5,        // phí nước khoán 5 tháng
        totalAmount: 550000 * 5 + 30000 * 5,
        electricityUsage: 0,
        waterUsage: 0,
        occupantsCount: 1,
        dueDate: new Date('2026-02-10'),
        status: 'PAID' as any,
        paidAt: new Date('2026-02-10'),
        approvedById: admin.id,
        approvedAt: new Date('2026-02-10'),
      },
    });
  }

  // ── Utility invoices (helper) ────────────────────────────────────────────
  type InvDef = {
    code: string; month: Date; kWh: number; m3: number;
    status: 'PAID' | 'PENDING';
    paidAt?: Date; approvedById?: number;
    paymentProof?: string;
  };

  const utilityDefs: InvDef[] = [
    { code: 'INV-UTL-2025-11-A203-TN', month: new Date('2025-11-01'), kWh: 88,  m3: 5, status: 'PAID', paidAt: new Date('2025-11-14'), approvedById: admin.id },
    { code: 'INV-UTL-2025-12-A203-TN', month: new Date('2025-12-01'), kWh: 95,  m3: 6, status: 'PAID', paidAt: new Date('2025-12-12'), approvedById: admin.id },
    { code: 'INV-UTL-2026-01-A203-TN', month: new Date('2026-01-01'), kWh: 82,  m3: 5, status: 'PAID', paidAt: new Date('2026-01-13'), approvedById: admin.id },
    { code: 'INV-UTL-2026-02-A203-TN', month: new Date('2026-02-01'), kWh: 90,  m3: 5, status: 'PAID', paidAt: new Date('2026-02-14'), approvedById: admin.id },
    { code: 'INV-UTL-2026-03-A203-TN', month: new Date('2026-03-01'), kWh: 78,  m3: 4, status: 'PAID', paidAt: new Date('2026-03-11'), approvedById: admin.id },
    // Apr: PENDING, đã có minh chứng → admin duyệt live
    { code: 'INV-UTL-2026-04-A203-TN', month: new Date('2026-04-01'), kWh: 93,  m3: 5, status: 'PENDING', paymentProof: PROOF_URL },
    // May: PENDING, chưa có minh chứng → sv upload live
    { code: 'INV-UTL-2026-05-A203-TN', month: new Date('2026-05-01'), kWh: 86,  m3: 5, status: 'PENDING' },
  ];

  for (const d of utilityDefs) {
    const exists = await prisma.invoice.findFirst({ where: { code: d.code } });
    if (exists) continue;

    const electricityFee = Math.round(d.kWh * 1786);
    const waterFee       = d.m3 > 4 ? (d.m3 - 4) * 7000 : 0; // occupants=1, quota=4m3
    const dueDate        = new Date(d.month);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(15);

    await prisma.invoice.create({
      data: {
        code: d.code,
        roomId: roomA203.id,
        type: 'UTILITY' as any,
        billingMonth: d.month,
        roomFee: 0,
        electricityFee,
        waterFee,
        totalAmount: electricityFee + waterFee,
        electricityUsage: d.kWh,
        waterUsage: d.m3,
        occupantsCount: 1,
        dueDate,
        status: d.status as any,
        paymentProof: d.paymentProof ?? null,
        paidAt: d.paidAt ?? null,
        approvedById: d.approvedById ?? null,
        approvedAt: d.approvedById ? d.paidAt! : null,
      },
    });
  }

  console.log(`✅ sv_tenant@dormhub.com (Trần Anh Tuấn) — Phòng A203:`);
  console.log(`   Hợp đồng HD-2026-TENANT (ACTIVE, 10/02–30/06/2026)`);
  console.log(`   Nov25–Mar26: 5 hóa đơn PAID`);
  console.log(`   Apr26: PENDING + CÓ minh chứng → admin duyệt live`);
  console.log(`   May26: PENDING + CHƯA có minh chứng → sv upload live`);

  // ═══════════════════════════════════════════════════════════════════════════
  // XONG
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n✨ seed-demo.ts hoàn tất!\n');
  console.log('📋 TÀI KHOẢN DEMO:');
  console.log('┌─────────────────────────────────┬──────────────┬───────────────────────────────────────┐');
  console.log('│ Email                           │ Mật khẩu    │ Ghi chú                               │');
  console.log('├─────────────────────────────────┼──────────────┼───────────────────────────────────────┤');
  console.log('│ admin@dormhub.com               │ 123456       │ Quản trị viên — toàn quyền            │');
  console.log('│ staff@dormhub.com               │ 123456       │ Nhân viên BQL — Tòa A                 │');
  console.log('│ staff2@dormhub.com              │ 123456       │ Nhân viên BQL — Tòa B (MỚI)           │');
  console.log('│ staff3@dormhub.com              │ 123456       │ Nhân viên BQL — Tòa C (MỚI)           │');
  console.log('│ sv1@dormhub.com                 │ 123456       │ Nguyễn Văn An — có hợp đồng A102      │');
  console.log('│ sv3@dormhub.com                 │ 123456       │ Lê Thị Cẩm — có hợp đồng B102         │');
  console.log('│ sv4@dormhub.com                 │ 123456       │ Phạm Thị Dung — có HĐ, đang gia hạn   │');
  console.log('│ sv_demo@dormhub.com             │ 123456       │ ★ DEMO Nam — K68, CHƯA CÓ PHÒNG      │');
  console.log('│ sv_demo_nu@dormhub.com          │ 123456       │ ★ DEMO Nữ — K68, CHƯA CÓ PHÒNG      │');
  console.log('│ sv_tenant@dormhub.com           │ 123456       │ ★ Trần Anh Tuấn — A203, demo hóa đơn │');
  console.log('└─────────────────────────────────┴──────────────┴───────────────────────────────────────┘');
  console.log('');
  console.log('📅 ĐỢT ĐĂNG KÝ:');
  console.log('   DRAFT     → 2026-2027-HK1 (nháp, chưa công bố)');
  console.log('   UPCOMING  → 2025-2026-HK1 (sắp mở, bắt đầu 01/07/2025)');
  console.log('   OPEN      → 2024-2025-HK2 (đang mở, K68+K67+K66 đăng ký được)');
  console.log('   CANCELLED → 2024-HK-HE    (đã hủy — hè 2024)');
  console.log('   CLOSED    → 2023-2024-HK2 (đã đóng — lịch sử)');
  console.log('');
  console.log('🏢 TOÀ NHÀ: A (Nam), B (Nữ), C (Nam – Mới, 7 phòng)');
  console.log('🔄 CHUYỂN PHÒNG: CHPG-2026-001/002 (PENDING), 003 (APPROVED), 004 (REJECTED)');
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
