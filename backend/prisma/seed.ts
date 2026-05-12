import 'dotenv/config';
import {
  PrismaClient,
  UserRole,
  Gender,
  RoomType,
  PriorityDocumentType,
  DocumentStatus,
  ApplicationStatus,
  ApplicationType,
  ContractStatus,
  PeriodStatus,
  InvoiceStatus,
  InvoiceType,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set.');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Bắt đầu seed data...\n');

  const pw = await bcrypt.hash('123456', 10);

  // ─── 1. Users ──────────────────────────────────────────────────────────────

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dormhub.com' },
    update: {},
    create: { email: 'admin@dormhub.com', passwordHash: pw, role: UserRole.ADMIN, fullName: 'Quản trị viên KTX', phone: '0123456789', isActive: true },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@dormhub.com' },
    update: {},
    create: { email: 'staff@dormhub.com', passwordHash: pw, role: UserRole.STAFF, fullName: 'Nhân viên BQL', phone: '0987654321', isActive: true },
  });

  // Sinh viên K67 (nhập học 2022) - nam
  const uSv1 = await prisma.user.upsert({
    where: { email: 'sv1@dormhub.com' },
    update: {},
    create: { email: 'sv1@dormhub.com', passwordHash: pw, role: UserRole.STUDENT, fullName: 'Nguyễn Văn An', phone: '0901000001', isActive: true },
  });
  // Sinh viên K67 - nam, điểm ưu tiên cao
  const uSv2 = await prisma.user.upsert({
    where: { email: 'sv2@dormhub.com' },
    update: {},
    create: { email: 'sv2@dormhub.com', passwordHash: pw, role: UserRole.STUDENT, fullName: 'Trần Minh Bảo', phone: '0901000002', isActive: true },
  });
  // Sinh viên K67 - nữ
  const uSv3 = await prisma.user.upsert({
    where: { email: 'sv3@dormhub.com' },
    update: {},
    create: { email: 'sv3@dormhub.com', passwordHash: pw, role: UserRole.STUDENT, fullName: 'Lê Thị Cẩm', phone: '0901000003', isActive: true },
  });
  // Sinh viên K67 - nữ, đang có hợp đồng (test gia hạn)
  const uSv4 = await prisma.user.upsert({
    where: { email: 'sv4@dormhub.com' },
    update: {},
    create: { email: 'sv4@dormhub.com', passwordHash: pw, role: UserRole.STUDENT, fullName: 'Phạm Thị Dung', phone: '0901000004', isActive: true },
  });
  // Sinh viên K66 (nhập học 2021) - nam, không có tài liệu ưu tiên
  const uSv5 = await prisma.user.upsert({
    where: { email: 'sv5@dormhub.com' },
    update: {},
    create: { email: 'sv5@dormhub.com', passwordHash: pw, role: UserRole.STUDENT, fullName: 'Hoàng Văn Em', phone: '0901000005', isActive: true },
  });
  // Sinh viên K67 - nam, bị từ chối
  const uSv6 = await prisma.user.upsert({
    where: { email: 'sv6@dormhub.com' },
    update: {},
    create: { email: 'sv6@dormhub.com', passwordHash: pw, role: UserRole.STUDENT, fullName: 'Vũ Quang Phúc', phone: '0901000006', isActive: true },
  });

  console.log('✅ Users:', [admin, staff, uSv1, uSv2, uSv3, uSv4, uSv5, uSv6].map(u => u.email).join(', '));

  // ─── 2. Buildings ──────────────────────────────────────────────────────────

  const bldA = await prisma.building.upsert({
    where: { code: 'A' },
    update: {},
    create: { code: 'A', name: 'Tòa A (Nam)', totalFloors: 5, description: 'Khu KTX nam sinh' },
  });
  const bldB = await prisma.building.upsert({
    where: { code: 'B' },
    update: {},
    create: { code: 'B', name: 'Tòa B (Nữ)', totalFloors: 5, description: 'Khu KTX nữ sinh' },
  });

  console.log(`✅ Buildings: ${bldA.name}, ${bldB.name}`);

  // Gán staff quản lý tòa A (không phải toàn bộ — staff chỉ thấy hóa đơn tòa mình quản)
  await prisma.userBuilding.upsert({
    where: { userId_buildingId: { userId: staff.id, buildingId: bldA.id } },
    update: {},
    create: { userId: staff.id, buildingId: bldA.id, assignedById: admin.id },
  });

  // ─── 3. Rooms ──────────────────────────────────────────────────────────────

  // Nam – nhiều trạng thái chỗ trống khác nhau
  const rA101 = await prisma.room.upsert({ where: { code: 'A101' }, update: {}, create: { code: 'A101', buildingId: bldA.id, floor: 1, gender: Gender.MALE, roomType: RoomType.STANDARD, capacity: 6, pricePerMonth: 350000 } });
  const rA102 = await prisma.room.upsert({ where: { code: 'A102' }, update: {}, create: { code: 'A102', buildingId: bldA.id, floor: 1, gender: Gender.MALE, roomType: RoomType.STANDARD, capacity: 4, pricePerMonth: 350000 } });
  const rA103 = await prisma.room.upsert({ where: { code: 'A103' }, update: {}, create: { code: 'A103', buildingId: bldA.id, floor: 1, gender: Gender.MALE, roomType: RoomType.AIR_CONDITIONED, capacity: 4, pricePerMonth: 550000 } });
  const rA201 = await prisma.room.upsert({ where: { code: 'A201' }, update: {}, create: { code: 'A201', buildingId: bldA.id, floor: 2, gender: Gender.MALE, roomType: RoomType.STANDARD, capacity: 6, pricePerMonth: 350000 } });
  // Nữ
  const rB101 = await prisma.room.upsert({ where: { code: 'B101' }, update: {}, create: { code: 'B101', buildingId: bldB.id, floor: 1, gender: Gender.FEMALE, roomType: RoomType.STANDARD, capacity: 6, pricePerMonth: 350000 } });
  const rB102 = await prisma.room.upsert({ where: { code: 'B102' }, update: {}, create: { code: 'B102', buildingId: bldB.id, floor: 1, gender: Gender.FEMALE, roomType: RoomType.AIR_CONDITIONED, capacity: 4, pricePerMonth: 550000 } });
  const rB201 = await prisma.room.upsert({ where: { code: 'B201' }, update: {}, create: { code: 'B201', buildingId: bldB.id, floor: 2, gender: Gender.FEMALE, roomType: RoomType.STANDARD, capacity: 6, pricePerMonth: 350000 } });

  console.log(`✅ Rooms: ${[rA101, rA102, rA103, rA201, rB101, rB102, rB201].map(r => r.code).join(', ')}`);

  // ─── 4. Students ───────────────────────────────────────────────────────────
  // K67 = nhập học 2022 (1955 + 67 = 2022)
  // K66 = nhập học 2021

  const sv1 = await prisma.student.upsert({
    where: { studentCode: 'B22DCCN001' },
    update: {},
    create: {
      userId: uSv1.id, studentCode: 'B22DCCN001', fullName: 'Nguyễn Văn An',
      gender: Gender.MALE, dateOfBirth: new Date('2004-03-15'),
      faculty: 'Công nghệ thông tin', className: 'D22CQCN01-N',
      majorCode: 'CNTT', hometownProvince: 'Hà Nội', hometownDistance: 0,
    },
  });
  const sv2 = await prisma.student.upsert({
    where: { studentCode: 'B22DCCN002' },
    update: {},
    create: {
      userId: uSv2.id, studentCode: 'B22DCCN002', fullName: 'Trần Minh Bảo',
      gender: Gender.MALE, dateOfBirth: new Date('2004-07-22'),
      faculty: 'Điện tử Viễn thông', className: 'D22CQVT01-N',
      majorCode: 'VTTB', hometownProvince: 'Nghệ An', hometownDistance: 300,
    },
  });
  const sv3 = await prisma.student.upsert({
    where: { studentCode: 'B22DCCN003' },
    update: {},
    create: {
      userId: uSv3.id, studentCode: 'B22DCCN003', fullName: 'Lê Thị Cẩm',
      gender: Gender.FEMALE, dateOfBirth: new Date('2004-01-10'),
      faculty: 'Công nghệ thông tin', className: 'D22CQCN02-N',
      majorCode: 'CNTT', hometownProvince: 'Thanh Hóa', hometownDistance: 150,
    },
  });
  const sv4 = await prisma.student.upsert({
    where: { studentCode: 'B22DCVT004' },
    update: {},
    create: {
      userId: uSv4.id, studentCode: 'B22DCVT004', fullName: 'Phạm Thị Dung',
      gender: Gender.FEMALE, dateOfBirth: new Date('2004-09-05'),
      faculty: 'Viễn thông', className: 'D22CQVT02-N',
      majorCode: 'VT', hometownProvince: 'Nam Định', hometownDistance: 90,
    },
  });
  const sv5 = await prisma.student.upsert({
    where: { studentCode: 'B21DCCN005' },
    update: {},
    create: {
      userId: uSv5.id, studentCode: 'B21DCCN005', fullName: 'Hoàng Văn Em',
      gender: Gender.MALE, dateOfBirth: new Date('2003-05-20'),
      faculty: 'Công nghệ thông tin', className: 'D21CQCN01-N',
      majorCode: 'CNTT', hometownProvince: 'Hà Nội', hometownDistance: 0,
    },
  });
  const sv6 = await prisma.student.upsert({
    where: { studentCode: 'B22DCCN006' },
    update: {},
    create: {
      userId: uSv6.id, studentCode: 'B22DCCN006', fullName: 'Vũ Quang Phúc',
      gender: Gender.MALE, dateOfBirth: new Date('2004-11-30'),
      faculty: 'Điện tử Viễn thông', className: 'D22CQVT02-N',
      majorCode: 'VTTB', hometownProvince: 'Hải Phòng', hometownDistance: 100,
    },
  });

  console.log(`✅ Students: sv1(K67/Nam), sv2(K67/Nam), sv3(K67/Nữ), sv4(K67/Nữ-HĐ), sv5(K66/Nam), sv6(K67/Nam)`);

  // ─── 5. Priority Documents ─────────────────────────────────────────────────

  async function findOrCreateDoc(data: {
    studentId: number; type: PriorityDocumentType; fileUrl: string;
    fileName: string; publicId: string; status: DocumentStatus;
    reviewedById?: number; reviewedAt?: Date;
  }) {
    return (
      await prisma.priorityDocument.findFirst({ where: { studentId: data.studentId, type: data.type } }) ??
      await prisma.priorityDocument.create({ data })
    );
  }

  // sv1: hộ nghèo → +15đ
  await findOrCreateDoc({ studentId: sv1.id, type: PriorityDocumentType.POOR_HOUSEHOLD, fileUrl: 'https://example.com/docs/sv1-ho-ngheo.pdf', fileName: 'ho-ngheo.pdf', publicId: 'dormhub/sv1-ho-ngheo', status: DocumentStatus.APPROVED, reviewedById: admin.id, reviewedAt: new Date('2024-08-01') });
  // sv2: mồ côi (+15đ) + bảng điểm GPA 3.8 (+10đ) → 25đ
  await findOrCreateDoc({ studentId: sv2.id, type: PriorityDocumentType.ORPHAN, fileUrl: 'https://example.com/docs/sv2-mo-coi.pdf', fileName: 'mo-coi.pdf', publicId: 'dormhub/sv2-mo-coi', status: DocumentStatus.APPROVED, reviewedById: admin.id, reviewedAt: new Date('2024-08-01') });
  await findOrCreateDoc({ studentId: sv2.id, type: PriorityDocumentType.GPA_TRANSCRIPT, fileUrl: 'https://example.com/docs/sv2-bang-diem.pdf', fileName: 'bang-diem.pdf', publicId: 'dormhub/sv2-gpa', status: DocumentStatus.APPROVED, reviewedById: admin.id, reviewedAt: new Date('2024-08-01') });
  // sv3: gia đình chính sách → +10đ
  await findOrCreateDoc({ studentId: sv3.id, type: PriorityDocumentType.POLICY_FAMILY, fileUrl: 'https://example.com/docs/sv3-chinh-sach.pdf', fileName: 'chinh-sach.pdf', publicId: 'dormhub/sv3-policy', status: DocumentStatus.APPROVED, reviewedById: admin.id, reviewedAt: new Date('2024-08-01') });
  // sv6: doc nộp nhưng chưa duyệt (PENDING)
  await findOrCreateDoc({ studentId: sv6.id, type: PriorityDocumentType.NEAR_POOR, fileUrl: 'https://example.com/docs/sv6-can-ngheo.pdf', fileName: 'can-ngheo.pdf', publicId: 'dormhub/sv6-near-poor', status: DocumentStatus.PENDING });

  console.log(`✅ PriorityDocuments: doc1(sv1/POOR), doc2(sv2/ORPHAN), doc3(sv2/GPA), doc4(sv3/POLICY), doc5(sv6/NEAR_POOR-pending)`);

  // ─── 6. Contract sv4 (đang ở KTX – để test gia hạn & dashboard) ────────────

  const contract4 = await prisma.contract.upsert({
    where: { code: 'HD-2024-004' },
    update: { status: ContractStatus.EXPIRED },
    create: {
      code: 'HD-2024-004',
      studentId: sv4.id,
      roomId: rB101.id,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-01-31'),
      monthlyRent: 350000,
      status: ContractStatus.ACTIVE,
      checkedInAt: new Date('2024-09-01'),
      createdById: admin.id,
    },
  });
  console.log(`✅ Contract: ${contract4.code} (sv4 đang ở B101)`);

  // ─── 7. Registration Periods ───────────────────────────────────────────────

  const now = new Date();

  // Đợt cũ đã đóng (HK1 2024-2025) – có đơn đã xử lý
  const period1 = await prisma.registrationPeriod.upsert({
    where: { code: '2024-2025-HK1' },
    update: {},
    create: {
      code: '2024-2025-HK1',
      name: 'Đăng ký KTX HK1 năm học 2024-2025',
      academicYear: '2024-2025',
      semester: 1,
      startDate: new Date('2024-07-01'),
      endDate: new Date('2024-08-15'),
      moveInDate: new Date('2024-09-01'),
      moveOutDate: new Date('2025-01-31'),
      allowRoomPreference: true,
      targetAdmissionYears: [2022, 2021, 2020],
      status: PeriodStatus.CLOSED,
      createdById: admin.id,
    },
  });

  // Đợt hiện tại đang mở (HK2 2024-2025) – có đơn đang chờ duyệt
  const period2 = await prisma.registrationPeriod.upsert({
    where: { code: '2024-2025-HK2' },
    update: {},
    create: {
      code: '2024-2025-HK2',
      name: 'Đăng ký KTX HK2 năm học 2024-2025',
      academicYear: '2024-2025',
      semester: 2,
      startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 ngày trước
      endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),  // 14 ngày sau
      moveInDate: new Date('2025-02-10'),
      moveOutDate: new Date('2025-06-30'),
      allowRoomPreference: true,
      targetAdmissionYears: [2022, 2021],
      status: PeriodStatus.OPEN,
      createdById: admin.id,
    },
  });

  // Đợt nháp (chưa mở)
  const period3 = await prisma.registrationPeriod.upsert({
    where: { code: '2025-2026-HK1' },
    update: {},
    create: {
      code: '2025-2026-HK1',
      name: 'Đăng ký KTX HK1 năm học 2025-2026',
      academicYear: '2025-2026',
      semester: 1,
      startDate: new Date('2025-07-01'),
      endDate: new Date('2025-08-15'),
      allowRoomPreference: true,
      targetAdmissionYears: [2022, 2021, 2020],
      status: PeriodStatus.DRAFT,
      createdById: admin.id,
    },
  });

  console.log(`✅ Periods: ${period1.code}(CLOSED), ${period2.code}(OPEN), ${period3.code}(DRAFT)`);

  // ─── 8. Applications – Đợt 1 (CLOSED) ────────────────────────────────────

  async function findOrCreateApp(where: { studentId: number; periodId: number }, data: object) {
    return await prisma.registrationApplication.findFirst({ where }) ?? await prisma.registrationApplication.create({ data: { ...where, ...data } as any });
  }

  // sv1: APPROVED, được duyệt vào A101 (15đ từ hộ nghèo)
  const app1 = await findOrCreateApp({ studentId: sv1.id, periodId: period1.id }, {
    type: ApplicationType.NEW, isPoorHousehold: true, priorityScore: 15,
    status: ApplicationStatus.APPROVED, approvedRoomId: rA101.id,
    reviewedById: admin.id, reviewedAt: new Date('2024-08-20'),
  });
  await prisma.roomChoice.upsert({
    where: { applicationId_priority: { applicationId: app1.id, priority: 1 } },
    update: {},
    create: { applicationId: app1.id, roomId: rA101.id, priority: 1 },
  });
  await prisma.roomChoice.upsert({
    where: { applicationId_priority: { applicationId: app1.id, priority: 2 } },
    update: {},
    create: { applicationId: app1.id, roomId: rA102.id, priority: 2 },
  });

  // Contract từ đơn được duyệt HK1 (đã hết hạn)
  await prisma.contract.upsert({
    where: { code: 'HD-2024-001' },
    update: {},
    create: {
      code: 'HD-2024-001',
      studentId: sv1.id,
      roomId: rA101.id,
      applicationId: app1.id,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-01-31'),
      monthlyRent: 350000,
      status: ContractStatus.EXPIRED,
      createdById: admin.id,
    },
  });

  // sv5 (K66): REJECTED
  await findOrCreateApp({ studentId: sv5.id, periodId: period1.id }, {
    type: ApplicationType.NEW, priorityScore: 0, status: ApplicationStatus.REJECTED,
    rejectionReason: 'Không đủ điểm ưu tiên tối thiểu. Vui lòng thử lại đợt sau.',
    reviewedById: staff.id, reviewedAt: new Date('2024-08-20'),
  });

  // sv6: CANCELLED (tự hủy)
  await findOrCreateApp({ studentId: sv6.id, periodId: period1.id }, {
    type: ApplicationType.NEW, priorityScore: 0, status: ApplicationStatus.CANCELLED,
  });

  console.log(`✅ Apps HK1: app1(sv1/APPROVED/A101), app2(sv5/REJECTED), app3(sv6/CANCELLED)`);

  // ─── 9. Applications – Đợt 2 (OPEN, đang chờ duyệt) ─────────────────────

  // sv2: PENDING, 25đ (mồ côi+GPA), nguyện vọng A102 > A101
  const app4 = await findOrCreateApp({ studentId: sv2.id, periodId: period2.id }, {
    type: ApplicationType.NEW, isOrphan: true, gpaLastSemester: 3.8, priorityScore: 25, status: ApplicationStatus.PENDING,
  });
  await prisma.roomChoice.upsert({ where: { applicationId_priority: { applicationId: app4.id, priority: 1 } }, update: {}, create: { applicationId: app4.id, roomId: rA102.id, priority: 1 } });
  await prisma.roomChoice.upsert({ where: { applicationId_priority: { applicationId: app4.id, priority: 2 } }, update: {}, create: { applicationId: app4.id, roomId: rA101.id, priority: 2 } });

  // sv3: PENDING, 10đ (gia đình chính sách), nguyện vọng B102 > B101
  const app5 = await findOrCreateApp({ studentId: sv3.id, periodId: period2.id }, {
    type: ApplicationType.NEW, isPolicyFamily: true, priorityScore: 10, status: ApplicationStatus.PENDING,
  });
  await prisma.roomChoice.upsert({ where: { applicationId_priority: { applicationId: app5.id, priority: 1 } }, update: {}, create: { applicationId: app5.id, roomId: rB102.id, priority: 1 } });
  await prisma.roomChoice.upsert({ where: { applicationId_priority: { applicationId: app5.id, priority: 2 } }, update: {}, create: { applicationId: app5.id, roomId: rB101.id, priority: 2 } });

  // sv4: PENDING gia hạn (đang ở B101), 0đ
  await findOrCreateApp({ studentId: sv4.id, periodId: period2.id }, {
    type: ApplicationType.RENEWAL, currentRoomId: rB101.id, wantSameRoom: true, priorityScore: 0, status: ApplicationStatus.PENDING,
  });

  // sv5 (K66): PENDING, 0đ – không có tài liệu ưu tiên
  const app7 = await findOrCreateApp({ studentId: sv5.id, periodId: period2.id }, {
    type: ApplicationType.NEW, priorityScore: 0, status: ApplicationStatus.PENDING,
  });
  await prisma.roomChoice.upsert({ where: { applicationId_priority: { applicationId: app7.id, priority: 1 } }, update: {}, create: { applicationId: app7.id, roomId: rA201.id, priority: 1 } });

  // sv6: PENDING, 0đ (doc chưa duyệt nên không được tính)
  await findOrCreateApp({ studentId: sv6.id, periodId: period2.id }, {
    type: ApplicationType.NEW, priorityScore: 0, status: ApplicationStatus.PENDING,
  });

  // sv1: PENDING đợt 2, 15đ
  const app9 = await findOrCreateApp({ studentId: sv1.id, periodId: period2.id }, {
    type: ApplicationType.NEW, isPoorHousehold: true, priorityScore: 15, status: ApplicationStatus.PENDING,
  });
  await prisma.roomChoice.upsert({ where: { applicationId_priority: { applicationId: app9.id, priority: 1 } }, update: {}, create: { applicationId: app9.id, roomId: rA101.id, priority: 1 } });

  console.log(`✅ Apps HK2: app4(sv2/25đ), app5(sv3/10đ), app6(sv4/gia-hạn), app7(sv5/0đ), app8(sv6/0đ), app9(sv1/15đ)`);

  // ─── 10. Extra data for realistic dashboard ────────────────────────────────

  // Thêm phòng cho tòa A và B
  const extraRooms = await Promise.all([
    prisma.room.upsert({ where: { code: 'A104' }, update: {}, create: { code: 'A104', buildingId: bldA.id, floor: 1, gender: Gender.MALE, roomType: RoomType.STANDARD, capacity: 6, pricePerMonth: 350000 } }),
    prisma.room.upsert({ where: { code: 'A105' }, update: {}, create: { code: 'A105', buildingId: bldA.id, floor: 1, gender: Gender.MALE, roomType: RoomType.AIR_CONDITIONED, capacity: 4, pricePerMonth: 550000 } }),
    prisma.room.upsert({ where: { code: 'A202' }, update: {}, create: { code: 'A202', buildingId: bldA.id, floor: 2, gender: Gender.MALE, roomType: RoomType.STANDARD, capacity: 6, pricePerMonth: 350000 } }),
    prisma.room.upsert({ where: { code: 'A203' }, update: {}, create: { code: 'A203', buildingId: bldA.id, floor: 2, gender: Gender.MALE, roomType: RoomType.AIR_CONDITIONED, capacity: 4, pricePerMonth: 550000 } }),
    prisma.room.upsert({ where: { code: 'A301' }, update: {}, create: { code: 'A301', buildingId: bldA.id, floor: 3, gender: Gender.MALE, roomType: RoomType.STANDARD, capacity: 6, pricePerMonth: 350000 } }),
    prisma.room.upsert({ where: { code: 'B103' }, update: {}, create: { code: 'B103', buildingId: bldB.id, floor: 1, gender: Gender.FEMALE, roomType: RoomType.AIR_CONDITIONED, capacity: 4, pricePerMonth: 550000 } }),
    prisma.room.upsert({ where: { code: 'B202' }, update: {}, create: { code: 'B202', buildingId: bldB.id, floor: 2, gender: Gender.FEMALE, roomType: RoomType.STANDARD, capacity: 6, pricePerMonth: 350000 } }),
    prisma.room.upsert({ where: { code: 'B203' }, update: {}, create: { code: 'B203', buildingId: bldB.id, floor: 2, gender: Gender.FEMALE, roomType: RoomType.AIR_CONDITIONED, capacity: 4, pricePerMonth: 550000 } }),
    prisma.room.upsert({ where: { code: 'B301' }, update: {}, create: { code: 'B301', buildingId: bldB.id, floor: 3, gender: Gender.FEMALE, roomType: RoomType.STANDARD, capacity: 6, pricePerMonth: 350000 } }),
  ]);
  console.log(`✅ Extra rooms added: ${extraRooms.map(r => r.code).join(', ')}`);

  // Thêm sinh viên sv7-sv16
  const extraStudentDefs = [
    { email: 'sv7@dormhub.com',  name: 'Đinh Văn Giang',    gender: Gender.MALE,   code: 'B22DCCN007', faculty: 'Công nghệ thông tin', cls: 'D22CQCN01-N', province: 'Hà Tĩnh',   dist: 350 },
    { email: 'sv8@dormhub.com',  name: 'Bùi Quang Hải',     gender: Gender.MALE,   code: 'B22DCDT008', faculty: 'Điện tử',            cls: 'D22CQDT01-N', province: 'Quảng Bình', dist: 500 },
    { email: 'sv9@dormhub.com',  name: 'Ngô Thành Long',     gender: Gender.MALE,   code: 'B23DCCN001', faculty: 'Công nghệ thông tin', cls: 'D23CQCN01-N', province: 'Nghệ An',    dist: 300 },
    { email: 'sv10@dormhub.com', name: 'Lý Minh Tuấn',      gender: Gender.MALE,   code: 'B23DCCN002', faculty: 'Điện tử Viễn thông', cls: 'D23CQVT01-N', province: 'Thanh Hóa',  dist: 150 },
    { email: 'sv11@dormhub.com', name: 'Trương Văn Khoa',   gender: Gender.MALE,   code: 'B23DCDT003', faculty: 'Điện tử',            cls: 'D23CQDT01-N', province: 'Hải Phòng',  dist: 100 },
    { email: 'sv12@dormhub.com', name: 'Nguyễn Thị Hoa',   gender: Gender.FEMALE, code: 'B22DCVT009', faculty: 'Viễn thông',         cls: 'D22CQVT01-N', province: 'Nam Định',    dist: 90  },
    { email: 'sv13@dormhub.com', name: 'Vũ Thị Lan',        gender: Gender.FEMALE, code: 'B22DCCN010', faculty: 'Công nghệ thông tin', cls: 'D22CQCN02-N', province: 'Thái Bình',  dist: 110 },
    { email: 'sv14@dormhub.com', name: 'Đặng Thị Mai',      gender: Gender.FEMALE, code: 'B23DCCN004', faculty: 'Công nghệ thông tin', cls: 'D23CQCN02-N', province: 'Ninh Bình',  dist: 120 },
    { email: 'sv15@dormhub.com', name: 'Phan Thị Ngọc',     gender: Gender.FEMALE, code: 'B23DCVT005', faculty: 'Viễn thông',         cls: 'D23CQVT01-N', province: 'Hà Nam',      dist: 60  },
    { email: 'sv16@dormhub.com', name: 'Hoàng Thị Phương',  gender: Gender.FEMALE, code: 'B23DCDT006', faculty: 'Điện tử',            cls: 'D23CQDT02-N', province: 'Bắc Ninh',    dist: 30  },
  ];

  const extraStudents: any[] = [];
  for (const def of extraStudentDefs) {
    const u = await prisma.user.upsert({
      where: { email: def.email },
      update: {},
      create: { email: def.email, passwordHash: pw, role: UserRole.STUDENT, fullName: def.name, isActive: true },
    });
    const s = await prisma.student.upsert({
      where: { studentCode: def.code },
      update: {},
      create: {
        userId: u.id, studentCode: def.code, fullName: def.name,
        gender: def.gender, faculty: def.faculty, className: def.cls,
        hometownProvince: def.province, hometownDistance: def.dist,
      },
    });
    extraStudents.push(s);
  }
  console.log(`✅ Extra students: sv7-sv16`);

  // Hợp đồng ACTIVE học kỳ hiện tại (2025-2026 HK2)
  // sv1, sv2, sv3 không có contract ở đây vì họ có PENDING applications
  const contractDefs = [
    { code: 'HD-2026-001', studentId: extraStudents[0].id, roomCode: 'A101' },
    { code: 'HD-2026-002', studentId: extraStudents[1].id, roomCode: 'A101' },
    { code: 'HD-2026-003', studentId: extraStudents[2].id, roomCode: 'A101' },
    { code: 'HD-2026-004', studentId: extraStudents[3].id, roomCode: 'A201' },
    { code: 'HD-2026-005', studentId: extraStudents[4].id, roomCode: 'A201' },
    { code: 'HD-2026-006', studentId: extraStudents[5].id, roomCode: 'B201' },
    { code: 'HD-2026-007', studentId: extraStudents[6].id, roomCode: 'B201' },
    { code: 'HD-2026-008', studentId: extraStudents[7].id, roomCode: 'B102' },
    { code: 'HD-2026-009', studentId: extraStudents[8].id, roomCode: 'B202' },
    { code: 'HD-2026-010', studentId: extraStudents[9].id, roomCode: 'B202' },
    // sv1, sv2, sv3 giữ nguyên PENDING applications – không tạo contract trước
    // để admin có thể duyệt đơn và tạo hợp đồng cho họ
  ];

  for (const def of contractDefs) {
    const room = await prisma.room.findUnique({ where: { code: def.roomCode } });
    if (!room) continue;
    // Kiểm tra không tạo trùng cho sinh viên đã có hợp đồng active
    const existing = await prisma.contract.findFirst({
      where: { code: def.code },
    });
    if (!existing) {
      const alreadyActive = await prisma.contract.findFirst({
        where: { studentId: def.studentId, status: ContractStatus.ACTIVE },
      });
      if (!alreadyActive) {
        await prisma.contract.create({
          data: {
            code: def.code,
            studentId: def.studentId,
            roomId: room.id,
            startDate: new Date('2026-02-10'),
            endDate: new Date('2026-06-30'),
            monthlyRent: room.pricePerMonth,
            status: ContractStatus.ACTIVE,
            checkedInAt: new Date('2026-02-10'),
            createdById: admin.id,
          },
        });
      }
    }
  }
  console.log(`✅ Active contracts for current semester created`);

  // ─── 11a. Cập nhật isRoomLeader cho mỗi phòng ──────────────────────────────
  // Đặt trưởng phòng là hợp đồng đầu tiên trong mỗi phòng

  const leaderContracts = [
    'HD-2026-001', // sv7 – A101
    'HD-2026-004', // sv10 – A201
    'HD-2026-006', // sv12 – B201
    'HD-2026-008', // sv14 – B102
    'HD-2026-009', // sv15 – B202
    'HD-2024-004', // sv4 – B101
  ];
  for (const code of leaderContracts) {
    await prisma.contract.updateMany({
      where: { code },
      data: { isRoomLeader: true },
    });
  }
  console.log(`✅ Room leaders assigned`);

  // ─── 11b. Thêm hợp đồng cho sv1, sv2, sv3 (HK2 2025-2026) ─────────────────

  const semesterStart = new Date('2026-02-10');
  const semesterEnd   = new Date('2026-06-30');

  // Dùng findUnique để lấy roomId chắc chắn đúng (tránh cache biến bị sai ID)
  const roomA102 = await prisma.room.findUniqueOrThrow({ where: { code: 'A102' } });
  const roomA103 = await prisma.room.findUniqueOrThrow({ where: { code: 'A103' } });
  const roomB102 = await prisma.room.findUniqueOrThrow({ where: { code: 'B102' } });

  const sv1Contract = await prisma.contract.upsert({
    where: { code: 'HD-2026-011' },
    update: { status: ContractStatus.ACTIVE, roomId: roomA102.id },
    create: {
      code: 'HD-2026-011', studentId: sv1.id, roomId: roomA102.id,
      startDate: semesterStart, endDate: semesterEnd,
      monthlyRent: 350000, status: ContractStatus.ACTIVE,
      checkedInAt: semesterStart, isRoomLeader: true, createdById: admin.id,
    },
  });
  const sv2Contract = await prisma.contract.upsert({
    where: { code: 'HD-2026-012' },
    update: { status: ContractStatus.ACTIVE, roomId: roomA103.id },
    create: {
      code: 'HD-2026-012', studentId: sv2.id, roomId: roomA103.id,
      startDate: semesterStart, endDate: semesterEnd,
      monthlyRent: 550000, status: ContractStatus.ACTIVE,
      checkedInAt: semesterStart, isRoomLeader: true, createdById: admin.id,
    },
  });
  const sv3Contract = await prisma.contract.upsert({
    where: { code: 'HD-2026-013' },
    update: { status: ContractStatus.ACTIVE, roomId: roomB102.id },
    create: {
      code: 'HD-2026-013', studentId: sv3.id, roomId: roomB102.id,
      startDate: semesterStart, endDate: semesterEnd,
      monthlyRent: 550000, status: ContractStatus.ACTIVE,
      checkedInAt: semesterStart, isRoomLeader: false, createdById: admin.id,
    },
  });
  console.log(`✅ Active contracts for sv1 (A102), sv2 (A103), sv3 (B102) created`);

  // ─── 11c. Hàm upsert hóa đơn UTILITY ─────────────────────────────────────

  async function upsertUtilityInvoice(data: {
    code: string; roomCode: string; label: string; month: Date;
    kWh: number; m3: number; occupants: number;
    status: InvoiceStatus; paidAt?: Date; paymentProof?: string;
    approvedById?: number;
  }) {
    const room = await prisma.room.findUnique({ where: { code: data.roomCode } });
    if (!room) return;
    // Check by room+month+UTILITY type (partial unique index) to avoid conflicts with old seed data
    const existing = await prisma.invoice.findFirst({
      where: { roomId: room.id, billingMonth: data.month, type: InvoiceType.UTILITY },
    });
    if (existing) {
      const patch: any = {};
      if (existing.code !== data.code) patch.code = data.code;
      if (data.paymentProof !== undefined) patch.paymentProof = data.paymentProof;
      if (Object.keys(patch).length > 0) {
        await prisma.invoice.update({ where: { id: existing.id }, data: patch }).catch(() => {});
      }
      return;
    }

    const electricityFee = Math.round(data.kWh * 1786); // avg tier 2 price
    const waterFee       = data.m3 > data.occupants * 4 ? Math.round((data.m3 - data.occupants * 4) * 7000) : 0;
    const totalAmount    = electricityFee + waterFee;
    const dueDate = new Date(data.month);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(15);

    await prisma.invoice.create({
      data: {
        code: data.code, roomId: room.id, type: InvoiceType.UTILITY,
        billingMonth: data.month, roomFee: 0, electricityFee, waterFee, totalAmount,
        electricityUsage: data.kWh, waterUsage: data.m3, occupantsCount: data.occupants,
        dueDate, status: data.status,
        paidAt: data.paidAt,
        paymentProof: data.paymentProof,
        approvedById: data.approvedById,
        approvedAt: data.approvedById ? data.paidAt : undefined,
      },
    });
  }

  // ─── 11d. Hóa đơn UTILITY 5 tháng đã trả (Nov 25 → Mar 26) ───────────────

  const paidMonths = [
    { month: new Date('2025-11-01'), label: '2025-11', paid: new Date('2025-11-14') },
    { month: new Date('2025-12-01'), label: '2025-12', paid: new Date('2025-12-12') },
    { month: new Date('2026-01-01'), label: '2026-01', paid: new Date('2026-01-13') },
    { month: new Date('2026-02-01'), label: '2026-02', paid: new Date('2026-02-14') },
    { month: new Date('2026-03-01'), label: '2026-03', paid: new Date('2026-03-11') },
  ];

  const roomBillingDefs = [
    { roomCode: 'A101', kWhBase: 110, m3Base: 14, occupants: 3 },
    { roomCode: 'A102', kWhBase: 80,  m3Base: 8,  occupants: 2 },
    { roomCode: 'A103', kWhBase: 95,  m3Base: 6,  occupants: 2 },
    { roomCode: 'A201', kWhBase: 90,  m3Base: 10, occupants: 2 },
    { roomCode: 'A202', kWhBase: 75,  m3Base: 5,  occupants: 1 },
    { roomCode: 'B101', kWhBase: 100, m3Base: 12, occupants: 3 },
    { roomCode: 'B102', kWhBase: 85,  m3Base: 9,  occupants: 2 },
    { roomCode: 'B201', kWhBase: 88,  m3Base: 10, occupants: 2 },
    { roomCode: 'B202', kWhBase: 78,  m3Base: 8,  occupants: 2 },
  ];

  for (const m of paidMonths) {
    for (const r of roomBillingDefs) {
      const kWh = r.kWhBase + Math.floor(Math.random() * 20) - 10;
      const m3  = r.m3Base  + Math.floor(Math.random() * 4)  - 2;
      await upsertUtilityInvoice({
        code: `INV-UTL-${m.label}-${r.roomCode}`,
        roomCode: r.roomCode, label: m.label, month: m.month,
        kWh, m3, occupants: r.occupants,
        status: InvoiceStatus.PAID, paidAt: m.paid, approvedById: admin.id,
      });
    }
  }
  console.log(`✅ UTILITY invoices (PAID) for Nov25–Mar26 created`);

  // ─── 11e. Hóa đơn tháng 4/2026 – đa dạng trạng thái ─────────────────────

  const apr = new Date('2026-04-01');

  // PAID (đã thanh toán trước deadline)
  const paidAprRooms = ['A101', 'A102', 'A201', 'B101', 'B201'];
  for (const roomCode of paidAprRooms) {
    const def = roomBillingDefs.find((r) => r.roomCode === roomCode)!;
    await upsertUtilityInvoice({
      code: `INV-UTL-2026-04-${roomCode}`,
      roomCode, label: '2026-04', month: apr,
      kWh: def.kWhBase, m3: def.m3Base, occupants: def.occupants,
      status: InvoiceStatus.PAID, paidAt: new Date('2026-04-13'), approvedById: admin.id,
    });
  }

  // PENDING – có minh chứng chờ xác nhận
  const pendingWithProof = ['A103', 'B102'];
  for (const roomCode of pendingWithProof) {
    const def = roomBillingDefs.find((r) => r.roomCode === roomCode)!;
    await upsertUtilityInvoice({
      code: `INV-UTL-2026-04-${roomCode}`,
      roomCode, label: '2026-04', month: apr,
      kWh: def.kWhBase, m3: def.m3Base, occupants: def.occupants,
      status: InvoiceStatus.PENDING,
      paymentProof: `https://res.cloudinary.com/dfouucs9m/image/upload/v1778422885/9216b6a3-dce5-473e-893b-9a5bb85fbbdd_ojwfr4.jpg`,
    });
  }

  // PENDING – chưa có minh chứng
  await upsertUtilityInvoice({
    code: 'INV-UTL-2026-04-A202', roomCode: 'A202', label: '2026-04', month: apr,
    kWh: 72, m3: 4, occupants: 1, status: InvoiceStatus.PENDING,
  });

  // OVERDUE – dùng dueDate cũ để simulate overdue
  const room202 = await prisma.room.findUnique({ where: { code: 'B202' } });
  if (room202) {
    const existB202Apr = await prisma.invoice.findFirst({
      where: { roomId: room202.id, billingMonth: apr, type: InvoiceType.UTILITY },
    });
    if (existB202Apr) {
      await prisma.invoice.update({
        where: { id: existB202Apr.id },
        data: { code: 'INV-UTL-2026-04-B202', dueDate: new Date('2026-04-15'), status: InvoiceStatus.OVERDUE },
      });
    } else {
      await prisma.invoice.create({
        data: {
          code: 'INV-UTL-2026-04-B202', roomId: room202.id, type: InvoiceType.UTILITY,
          billingMonth: apr, roomFee: 0, electricityFee: 139280, waterFee: 0,
          totalAmount: 139280, electricityUsage: 78, waterUsage: 7, occupantsCount: 2,
          dueDate: new Date('2026-04-15'), status: InvoiceStatus.OVERDUE,
        },
      });
    }
  }

  // CANCELLED – dùng tháng 3/2026 (đã qua) để không conflict với tháng 4
  const roomB201 = await prisma.room.findUnique({ where: { code: 'B201' } });
  const cancelMonth = new Date('2026-03-01');
  if (roomB201 && !(await prisma.invoice.findFirst({ where: { code: 'INV-UTL-2026-03-B201-CANCEL' } }))) {
    const existB201Mar = await prisma.invoice.findFirst({
      where: { roomId: roomB201.id, billingMonth: cancelMonth, type: InvoiceType.UTILITY },
    });
    if (!existB201Mar) {
      await prisma.invoice.create({
        data: {
          code: 'INV-UTL-2026-03-B201-CANCEL', roomId: roomB201.id, type: InvoiceType.UTILITY,
          billingMonth: cancelMonth, roomFee: 0, electricityFee: 100000, waterFee: 0,
          totalAmount: 100000, electricityUsage: 56, waterUsage: 5, occupantsCount: 2,
          dueDate: new Date('2026-04-15'), status: InvoiceStatus.CANCELLED,
        },
      });
    }
  }

  console.log(`✅ UTILITY invoices for Apr 2026 (PAID/PENDING/OVERDUE/CANCELLED) created`);

  // ─── 11f. Hóa đơn tháng 5/2026 – tháng hiện tại (chủ yếu PENDING) ─────────

  const may = new Date('2026-05-01');
  const mayRooms = ['A101', 'A102', 'A103', 'A201', 'A202', 'B101', 'B102', 'B201', 'B202'];
  for (const roomCode of mayRooms) {
    const def = roomBillingDefs.find((r) => r.roomCode === roomCode)!;
    const kWh = def.kWhBase + Math.floor(Math.random() * 15);
    const m3  = def.m3Base  + Math.floor(Math.random() * 3);
    await upsertUtilityInvoice({
      code: `INV-UTL-2026-05-${roomCode}`,
      roomCode, label: '2026-05', month: may,
      kWh, m3, occupants: def.occupants,
      status: InvoiceStatus.PENDING,
    });
  }
  // B202 tháng 5 có minh chứng
  const b202May = await prisma.invoice.findFirst({ where: { code: 'INV-UTL-2026-05-B202' } });
  if (b202May) {
    await prisma.invoice.update({
      where: { id: b202May.id },
      data: { paymentProof: 'https://res.cloudinary.com/dfouucs9m/image/upload/v1778422885/9216b6a3-dce5-473e-893b-9a5bb85fbbdd_ojwfr4.jpg' },
    });
  }
  console.log(`✅ UTILITY invoices for May 2026 (current month, PENDING) created`);

  // ─── 11g. Meter readings (để staff có thể test tạo hóa đơn mới qua UI) ────

  const meterMonths = [
    new Date('2026-04-01'),
    new Date('2026-05-01'),
  ];
  for (const month of meterMonths) {
    for (const r of roomBillingDefs) {
      const room = await prisma.room.findUnique({ where: { code: r.roomCode } });
      if (!room) continue;
      for (const meterType of ['ELECTRICITY', 'WATER'] as const) {
        const prevReading = meterType === 'ELECTRICITY' ? 1200 + Math.floor(Math.random() * 200) : 50 + Math.floor(Math.random() * 20);
        const consumption = meterType === 'ELECTRICITY'
          ? r.kWhBase + Math.floor(Math.random() * 15)
          : r.m3Base  + Math.floor(Math.random() * 3);
        const existing = await prisma.meterReading.findUnique({
          where: { roomId_meterType_readingMonth: { roomId: room.id, meterType, readingMonth: month } },
        });
        if (!existing) {
          await prisma.meterReading.create({
            data: {
              roomId: room.id, meterType, readingMonth: month,
              previousReading: prevReading, currentReading: prevReading + consumption,
              consumption, recordedById: staff.id,
            },
          });
        }
      }
    }
  }
  console.log(`✅ Meter readings for Apr+May 2026 created`);

  // ─── 11h. ROOM_FEE invoices cho các hợp đồng active ──────────────────────

  async function upsertRoomFeeInvoice(contract: { id: number; code: string; roomId: number; startDate: Date; endDate: Date; monthlyRent: any }) {
    const existing = await prisma.invoice.findFirst({ where: { contractId: contract.id, type: InvoiceType.ROOM_FEE } });
    if (existing) return;
    const start  = new Date(contract.startDate);
    const end    = new Date(contract.endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (months <= 0) return;
    const roomFee  = Math.round(Number(contract.monthlyRent) * months);
    const waterFee = 30_000 * months;
    const billingMonth = new Date(start); billingMonth.setDate(1);
    const seqCount = await prisma.invoice.count({ where: { billingMonth } });
    const code = `RF-${billingMonth.getFullYear()}${String(billingMonth.getMonth() + 1).padStart(2, '0')}-${String(seqCount + 1).padStart(4, '0')}`;
    await prisma.invoice.create({
      data: {
        code, roomId: contract.roomId, contractId: contract.id,
        type: InvoiceType.ROOM_FEE, billingMonth, roomFee,
        electricityFee: 0, waterFee, totalAmount: roomFee + waterFee,
        electricityUsage: 0, waterUsage: 0, occupantsCount: 1,
        dueDate: start, status: InvoiceStatus.PAID, paidAt: start,
        approvedById: admin.id, approvedAt: start,
      },
    });
  }

  const activeContracts = await prisma.contract.findMany({
    where: { status: ContractStatus.ACTIVE },
    select: { id: true, code: true, roomId: true, startDate: true, endDate: true, monthlyRent: true },
  });
  for (const c of activeContracts) {
    await upsertRoomFeeInvoice(c);
  }
  console.log(`✅ ROOM_FEE invoices for ${activeContracts.length} active contracts created`);

  // ─── Sự cố bảo trì (MaintenanceTicket) ───────────────────────────────────
  // Phòng theo hợp đồng ACTIVE:
  //   sv1 → A102 | sv2 → A103 | sv3 → B102 | sv4 → B101
  //   sv7(extraStudents[0]) → A101 | sv10(extraStudents[3]) → A201
  //   sv12(extraStudents[5]) → B201 | sv15(extraStudents[8]) → B202

  const now3dAgo  = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 ngày trước (còn trong 7-ngày rating)
  const now14dAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 ngày trước (quá hạn rating)

  type TicketSeedDef = {
    code: string; roomCode: string; studentId: number;
    category: string; title: string; description?: string;
    priority: string; status: string;
    resolutionNote?: string; rejectionReason?: string;
    rating?: number; ratingComment?: string;
    completedAt?: Date; handledById?: number;
  };

  const ticketDefs: TicketSeedDef[] = [
    // ── NEW (mới, chưa xử lý) ─────────────────────────────────────────────────
    {
      code: 'TK-2026-001', roomCode: 'A101', studentId: extraStudents[0].id,
      category: 'AIR_CONDITIONER', priority: 'URGENT', status: 'NEW',
      title: 'Điều hòa không mát',
      description: 'Điều hòa phòng A101 chạy nhưng không ra khí lạnh, phòng rất nóng, ảnh hưởng đến sinh hoạt.',
    },
    {
      code: 'TK-2026-003', roomCode: 'A201', studentId: extraStudents[3].id,
      category: 'PLUMBING', priority: 'NORMAL', status: 'NEW',
      title: 'Vòi nước bị rỉ',
      description: 'Vòi nước trong nhà tắm bị rỉ nước, không vặn chặt được.',
    },
    {
      code: 'TK-2026-006', roomCode: 'B102', studentId: sv3.id,
      category: 'FURNITURE', priority: 'LOW', status: 'NEW',
      title: 'Tủ đồ bị vỡ bản lề',
      description: 'Cánh tủ bên trái bị tuột bản lề, không đóng được.',
    },
    {
      code: 'TK-2026-007', roomCode: 'A102', studentId: sv1.id,
      category: 'PLUMBING', priority: 'NORMAL', status: 'NEW',
      title: 'Áp lực nước yếu',
      description: 'Vòi hoa sen chảy rất yếu, không đủ để tắm.',
    },

    // ── IN_PROGRESS (đang xử lý) ───────────────────────────────────────────────
    {
      code: 'TK-2026-002', roomCode: 'B101', studentId: sv4.id,
      category: 'ELECTRICAL', priority: 'NORMAL', status: 'IN_PROGRESS',
      title: 'Bóng đèn phòng vệ sinh hỏng',
      description: 'Bóng đèn phòng tắm bị đứt dây tóc, không sáng.',
      resolutionNote: 'Đã liên hệ thợ điện, dự kiến thay bóng trong ngày hôm nay.',
      handledById: staff.id,
    },
    {
      code: 'TK-2026-004', roomCode: 'B202', studentId: extraStudents[8].id,
      category: 'DOOR_LOCK', priority: 'URGENT', status: 'IN_PROGRESS',
      title: 'Khóa cửa bị hỏng',
      description: 'Khóa cửa phòng bị kẹt, không mở được từ bên ngoài. Hiện đang dùng chìa dự phòng.',
      resolutionNote: 'Đã nhận báo cáo, thợ khóa sẽ đến kiểm tra lúc 14h chiều nay.',
      handledById: staff.id,
    },
    {
      code: 'TK-2026-010', roomCode: 'A103', studentId: sv2.id,
      category: 'AIR_CONDITIONER', priority: 'NORMAL', status: 'IN_PROGRESS',
      title: 'Điều hòa chảy nước',
      description: 'Điều hòa bị chảy nước xuống sàn khi bật, có thể do tắc đường thoát nước.',
      resolutionNote: 'Đã kiểm tra, cần vệ sinh dàn lạnh. Hẹn lịch sửa ngày mai.',
      handledById: staff.id,
    },

    // ── COMPLETED – sinh viên CÓ THỂ đánh giá (completedAt < 7 ngày) ──────────
    {
      code: 'TK-2026-005', roomCode: 'A103', studentId: sv2.id,
      category: 'ELECTRICAL', priority: 'LOW', status: 'COMPLETED',
      title: 'Quạt trần kêu to',
      description: 'Quạt trần phòng kêu tiếng ồn khi quay, khó ngủ vào ban đêm.',
      resolutionNote: 'Đã tra dầu mỡ vào ổ bi quạt, quạt chạy êm trở lại.',
      completedAt: now3dAgo,
      handledById: staff.id,
    },
    {
      code: 'TK-2026-008', roomCode: 'B201', studentId: extraStudents[5].id,
      category: 'PLUMBING', priority: 'NORMAL', status: 'COMPLETED',
      title: 'Tắc cống nhà tắm',
      description: 'Cống nhà tắm bị tắc, nước không thoát được sau khi tắm.',
      resolutionNote: 'Đã thông cống, nguyên nhân do tóc tích tụ. Đã dọn sạch.',
      completedAt: now3dAgo,
      handledById: staff.id,
    },

    // ── COMPLETED – sinh viên ĐÃ ĐÁNH GIÁ (có rating) ────────────────────────
    {
      code: 'TK-2026-009', roomCode: 'A101', studentId: extraStudents[2].id,
      category: 'FURNITURE', priority: 'LOW', status: 'COMPLETED',
      title: 'Giường bị gãy thanh ngang',
      description: 'Thanh ngang bên dưới giường bị gãy, ngủ bị lún.',
      resolutionNote: 'Đã thay thanh gỗ mới, giường chắc chắn trở lại.',
      completedAt: now14dAgo,
      handledById: staff.id,
      rating: 5,
      ratingComment: 'Xử lý rất nhanh và chuyên nghiệp, cảm ơn anh nhân viên!',
    },
    {
      code: 'TK-2026-011', roomCode: 'A102', studentId: sv1.id,
      category: 'ELECTRICAL', priority: 'NORMAL', status: 'COMPLETED',
      title: 'Ổ cắm điện không hoạt động',
      description: 'Ổ cắm điện gần cửa sổ không có điện, không sạc được điện thoại.',
      resolutionNote: 'Đã kiểm tra cầu dao và sửa lại dây điện bị lỏng.',
      completedAt: now14dAgo,
      handledById: staff.id,
      rating: 4,
      ratingComment: 'Xử lý ổn, chỉ hơi lâu chút.',
    },

    // ── COMPLETED – quá 7 ngày, chưa đánh giá (hết hạn rating) ───────────────
    {
      code: 'TK-2026-012', roomCode: 'B102', studentId: sv3.id,
      category: 'DOOR_LOCK', priority: 'NORMAL', status: 'COMPLETED',
      title: 'Cửa sổ không đóng kín',
      description: 'Cửa sổ bị cong, không đóng kín được, nước mưa hắt vào.',
      resolutionNote: 'Đã điều chỉnh lại bản lề và gioăng cao su cửa sổ.',
      completedAt: now14dAgo,
      handledById: staff.id,
      // Không có rating → hết hạn (quá 7 ngày)
    },

    // ── REJECTED (bị từ chối) ─────────────────────────────────────────────────
    {
      code: 'TK-2026-013', roomCode: 'B101', studentId: sv4.id,
      category: 'OTHER', priority: 'LOW', status: 'REJECTED',
      title: 'Yêu cầu thay thảm phòng',
      description: 'Thảm phòng đã cũ và bẩn, muốn được thay thảm mới.',
      rejectionReason: 'Không thuộc phạm vi bảo trì KTX. Thảm phòng là vật dụng cá nhân, sinh viên tự mua và sử dụng.',
      handledById: staff.id,
    },
    {
      code: 'TK-2026-014', roomCode: 'A103', studentId: sv2.id,
      category: 'OTHER', priority: 'NORMAL', status: 'REJECTED',
      title: 'Lắp thêm ổ cắm điện',
      description: 'Phòng thiếu ổ cắm điện, muốn lắp thêm 2 ổ cắm mới.',
      rejectionReason: 'Không thể lắp thêm ổ cắm vì liên quan đến tải điện toàn tòa nhà. Sinh viên có thể sử dụng ổ cắm mở rộng cá nhân.',
      handledById: admin.id,
    },
  ];

  for (const t of ticketDefs) {
    const room = await prisma.room.findUnique({ where: { code: t.roomCode } });
    if (!room) continue;
    const existing = await prisma.maintenanceTicket.findFirst({ where: { code: t.code } });
    if (!existing) {
      const isHandled = ['IN_PROGRESS', 'COMPLETED', 'REJECTED'].includes(t.status);
      await prisma.maintenanceTicket.create({
        data: {
          code: t.code,
          roomId: room.id,
          reportedById: t.studentId,
          category: t.category as any,
          title: t.title,
          description: t.description,
          priority: t.priority as any,
          status: t.status as any,
          resolutionNote: t.resolutionNote,
          rejectionReason: t.rejectionReason,
          handledById: isHandled ? (t.handledById ?? staff.id) : undefined,
          handledAt: isHandled ? now14dAgo : undefined,
          completedAt: t.completedAt,
          rating: t.rating,
          ratingComment: t.ratingComment,
          ratedAt: t.rating ? now14dAgo : undefined,
        },
      });
    }
  }
  console.log(`✅ Maintenance tickets created (${ticketDefs.length} tickets)`);
  console.log('  – NEW (4): TK-001, TK-003, TK-006, TK-007');
  console.log('  – IN_PROGRESS (3): TK-002, TK-004, TK-010');
  console.log('  – COMPLETED (5): TK-005/008 (chưa rate), TK-009/011 (đã rate), TK-012 (hết hạn)');
  console.log('  – REJECTED (2): TK-013, TK-014');

  // ─── 10. Refresh period stats ──────────────────────────────────────────────

  for (const period of [period1, period2]) {
    const statusCounts = await prisma.registrationApplication.groupBy({
      by: ['status'],
      where: { periodId: period.id },
      _count: { id: true },
    });
    const map: Record<string, number> = {};
    statusCounts.forEach((r) => { map[r.status] = r._count.id; });
    const total = Object.values(map).reduce((s, v) => s + v, 0);

    await prisma.registrationPeriod.update({
      where: { id: period.id },
      data: {
        totalApplications: total,
        approvedCount: map['APPROVED'] || 0,
        rejectedCount: map['REJECTED'] || 0,
        pendingCount: map['PENDING'] || 0,
      },
    });
  }

  console.log('✅ Period stats refreshed');

  // ─── 12. Settings ──────────────────────────────────────────────────────────

  const settingDefs = [
    { key: 'water_base_price',       value: '30000', description: 'Giá khoán nước/người/tháng (VNĐ)' },
    { key: 'water_per_person_monthly', value: '30000', description: 'Phí nước cố định/người/tháng' },
    { key: 'water_quota_per_person', value: '4',     description: 'Định mức nước/người (m³)' },
    { key: 'water_over_quota_price', value: '7000',  description: 'Giá nước vượt định mức (VNĐ/m³)' },
    { key: 'electricity_price',      value: '3500',  description: 'Đơn giá điện (VNĐ/kWh) – dự phòng' },
    { key: 'electricity_tier_1_limit', value: '50',  description: 'Bậc 1 điện – giới hạn (kWh)' },
    { key: 'electricity_tier_1_price', value: '1728', description: 'Bậc 1 điện – đơn giá (VNĐ/kWh)' },
    { key: 'electricity_tier_2_limit', value: '100', description: 'Bậc 2 điện – giới hạn (kWh)' },
    { key: 'electricity_tier_2_price', value: '1786', description: 'Bậc 2 điện – đơn giá (VNĐ/kWh)' },
    { key: 'electricity_tier_3_limit', value: '200', description: 'Bậc 3 điện – giới hạn (kWh)' },
    { key: 'electricity_tier_3_price', value: '2074', description: 'Bậc 3 điện – đơn giá (VNĐ/kWh)' },
    { key: 'electricity_tier_4_limit', value: '300', description: 'Bậc 4 điện – giới hạn (kWh)' },
    { key: 'electricity_tier_4_price', value: '2612', description: 'Bậc 4 điện – đơn giá (VNĐ/kWh)' },
    { key: 'electricity_tier_5_limit', value: '400', description: 'Bậc 5 điện – giới hạn (kWh)' },
    { key: 'electricity_tier_5_price', value: '2919', description: 'Bậc 5 điện – đơn giá (VNĐ/kWh)' },
    { key: 'electricity_tier_6_price', value: '3015', description: 'Bậc 6 điện – đơn giá (VNĐ/kWh)' },
  ];
  for (const s of settingDefs) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  console.log('\n🚀 Seed thành công!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TÀI KHOẢN ĐĂNG NHẬP  (mật khẩu: 123456)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  [ADMIN]  admin@dormhub.com');
  console.log('  [STAFF]  staff@dormhub.com');
  console.log('───────────────────────────────────────────────────────────');
  console.log('  SINH VIÊN – có hợp đồng ACTIVE + hóa đơn:');
  console.log('  sv1@dormhub.com   Phòng A102 – trưởng phòng – HĐ HD-2026-011');
  console.log('  sv2@dormhub.com   Phòng A103 – trưởng phòng – HĐ HD-2026-012');
  console.log('  sv3@dormhub.com   Phòng B102 – thành viên  – HĐ HD-2026-013');
  console.log('  sv4@dormhub.com   Phòng B101 – trưởng phòng – HĐ HD-2024-004');
  console.log('  sv7@dormhub.com   Phòng A101 – trưởng phòng – HĐ HD-2026-001');
  console.log('  sv8@dormhub.com   Phòng A101 – thành viên  – HĐ HD-2026-002');
  console.log('  sv9@dormhub.com   Phòng A101 – thành viên  – HĐ HD-2026-003');
  console.log('  sv10@dormhub.com  Phòng A201 – trưởng phòng – HĐ HD-2026-004');
  console.log('  sv12@dormhub.com  Phòng B201 – trưởng phòng – HĐ HD-2026-006');
  console.log('  sv14@dormhub.com  Phòng B102 – trưởng phòng – HĐ HD-2026-008');
  console.log('  sv15@dormhub.com  Phòng B202 – trưởng phòng – HĐ HD-2026-009');
  console.log('───────────────────────────────────────────────────────────');
  console.log('  SINH VIÊN – chờ duyệt đơn (chưa có HĐ HK2):');
  console.log('  sv5@dormhub.com   0đ – bị từ chối HK1, PENDING HK2');
  console.log('  sv6@dormhub.com   0đ – doc pending, PENDING HK2');
  console.log('───────────────────────────────────────────────────────────');
  console.log('  HÓA ĐƠN MẪU ĐỂ TEST:');
  console.log('  • PAID   : INV-UTL-2026-03-A101, INV-UTL-2026-04-A101');
  console.log('  • PENDING (có proof): INV-UTL-2026-04-A103, INV-UTL-2026-04-B102');
  console.log('  • PENDING (không proof): INV-UTL-2026-04-A202, INV-UTL-2026-05-*');
  console.log('  • OVERDUE: INV-UTL-2026-04-B202');
  console.log('  • CANCELLED: INV-UTL-2026-03-B201-CANCEL');
  console.log('  • ROOM_FEE: RF-202602-000x (tự động tạo theo HĐ)');
  console.log('───────────────────────────────────────────────────────────');
  console.log('  TICKET MẪU ĐỂ TEST:');
  console.log('  Admin/Staff → /tickets');
  console.log('  • NEW     : TK-2026-001(URGENT), TK-003, TK-006, TK-007');
  console.log('  • IN_PROG : TK-002(có note), TK-004(URGENT+note), TK-010');
  console.log('  • COMPLETED (chưa rate, còn hạn 7 ngày): TK-005, TK-008');
  console.log('  • COMPLETED (đã rate 4-5★): TK-009, TK-011');
  console.log('  • COMPLETED (hết hạn rate): TK-012');
  console.log('  • REJECTED (có lý do): TK-013, TK-014');
  console.log('  Sinh viên test tạo ticket → cần HĐ ACTIVE:');
  console.log('  sv1@dormhub.com  → tạo ticket phòng A102 (TK-007, TK-011 có sẵn)');
  console.log('  sv2@dormhub.com  → tạo ticket phòng A103 (TK-005, TK-010, TK-014 có sẵn)');
  console.log('  sv3@dormhub.com  → tạo ticket phòng B102 (TK-006, TK-012 có sẵn)');
  console.log('  sv4@dormhub.com  → tạo ticket phòng B101 (TK-002, TK-013 có sẵn)');
  console.log('═══════════════════════════════════════════════════════════');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
