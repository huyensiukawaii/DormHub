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
    update: {},
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

  // ─── 11. Settings ──────────────────────────────────────────────────────────

  await prisma.setting.upsert({ where: { key: 'water_base_price' },  update: {}, create: { key: 'water_base_price',  value: '30000', description: 'Giá khoán nước/người (VNĐ)' } });
  await prisma.setting.upsert({ where: { key: 'electricity_price' }, update: {}, create: { key: 'electricity_price', value: '3500',  description: 'Đơn giá điện (VNĐ/kWh)' } });

  console.log('\n🚀 Seed thành công!\n');
  console.log('─── Tài khoản đăng nhập ─────────────────────────────────');
  console.log('  Admin  : admin@dormhub.com  / 123456');
  console.log('  Staff  : staff@dormhub.com  / 123456');
  console.log('  SV1 K67: sv1@dormhub.com    / 123456  (hộ nghèo, 15đ – có đơn HK1 APPROVED)');
  console.log('  SV2 K67: sv2@dormhub.com    / 123456  (mồ côi+GPA, 25đ – PENDING HK2)');
  console.log('  SV3 K67: sv3@dormhub.com    / 123456  (chính sách, 10đ – PENDING HK2)');
  console.log('  SV4 K67: sv4@dormhub.com    / 123456  (đang ở B101 – gia hạn PENDING HK2)');
  console.log('  SV5 K66: sv5@dormhub.com    / 123456  (0đ – bị từ chối HK1, PENDING HK2)');
  console.log('  SV6 K67: sv6@dormhub.com    / 123456  (0đ – doc pending, PENDING HK2)');
  console.log('─────────────────────────────────────────────────────────');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
