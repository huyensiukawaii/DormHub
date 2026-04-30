import 'dotenv/config';
import { PrismaClient, Gender, RoomType, ContractStatus, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set.');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const pw = await bcrypt.hash('Test@123', 10);

  // Lấy tòa A (nam) và B (nữ) để tìm phòng
  const bldA = await prisma.building.findFirst({ where: { code: 'A' } });
  const bldB = await prisma.building.findFirst({ where: { code: 'B' } });
  if (!bldA || !bldB) throw new Error('Chưa có tòa nhà, hãy chạy seed chính trước');

  // Dùng phòng A203 (nam) và B203 (nữ) — ít dùng trong seed chính
  const roomMale = await prisma.room.findFirst({ where: { code: 'A203' } });
  const roomFemale = await prisma.room.findFirst({ where: { code: 'B203' } });
  if (!roomMale || !roomFemale) throw new Error('Phòng A203/B203 chưa tồn tại');

  const admin = await prisma.user.findFirst({ where: { email: 'admin@dormhub.com' } });

  // ── Nick A: có hợp đồng ACTIVE, checkedInAt = null → hiển thị hướng dẫn nhận phòng ──
  const uA = await prisma.user.upsert({
    where: { email: 'test.checkin.a@dormhub.com' },
    update: {},
    create: {
      email: 'test.checkin.a@dormhub.com',
      passwordHash: pw,
      role: UserRole.STUDENT,
      fullName: 'Test Nhận Phòng A',
      phone: '0900001111',
      isActive: true,
    },
  });

  const svA = await prisma.student.upsert({
    where: { studentCode: 'B22DCTEST01' },
    update: {},
    create: {
      userId: uA.id,
      studentCode: 'B22DCTEST01',
      fullName: 'Test Nhận Phòng A',
      gender: Gender.MALE,
      dateOfBirth: new Date('2004-01-01'),
      faculty: 'Công nghệ thông tin',
      className: 'D22CQCN-TEST',
      majorCode: 'CNTT',
      hometownProvince: 'Hà Nội',
      hometownDistance: 0,
    },
  });

  await prisma.contract.upsert({
    where: { code: 'HD-TEST-001' },
    update: { checkedInAt: null, status: ContractStatus.ACTIVE },
    create: {
      code: 'HD-TEST-001',
      studentId: svA.id,
      roomId: roomMale.id,
      startDate: new Date('2025-02-10'),
      endDate: new Date('2025-06-30'),
      monthlyRent: Number(roomMale.pricePerMonth),
      status: ContractStatus.ACTIVE,
      checkedInAt: null,
      createdById: admin?.id ?? null,
    },
  });

  // ── Nick B: có hợp đồng ACTIVE, checkedInAt đã set → hiển thị "đã nhận phòng" ──
  const uB = await prisma.user.upsert({
    where: { email: 'test.checkin.b@dormhub.com' },
    update: {},
    create: {
      email: 'test.checkin.b@dormhub.com',
      passwordHash: pw,
      role: UserRole.STUDENT,
      fullName: 'Test Nhận Phòng B',
      phone: '0900002222',
      isActive: true,
    },
  });

  const svB = await prisma.student.upsert({
    where: { studentCode: 'B22DCTEST02' },
    update: {},
    create: {
      userId: uB.id,
      studentCode: 'B22DCTEST02',
      fullName: 'Test Nhận Phòng B',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('2004-06-15'),
      faculty: 'Điện tử Viễn thông',
      className: 'D22CQVT-TEST',
      majorCode: 'VT',
      hometownProvince: 'Hải Phòng',
      hometownDistance: 120,
    },
  });

  await prisma.contract.upsert({
    where: { code: 'HD-TEST-002' },
    update: { checkedInAt: new Date('2025-02-10T08:30:00'), status: ContractStatus.ACTIVE },
    create: {
      code: 'HD-TEST-002',
      studentId: svB.id,
      roomId: roomFemale.id,
      startDate: new Date('2025-02-10'),
      endDate: new Date('2025-06-30'),
      monthlyRent: Number(roomFemale.pricePerMonth),
      status: ContractStatus.ACTIVE,
      checkedInAt: new Date('2025-02-10T08:30:00'),
      createdById: admin?.id ?? null,
    },
  });

  console.log('\n✅ Tạo tài khoản test thành công:\n');
  console.log('── Nick A (chưa nhận phòng) ──────────────────');
  console.log('  Email   : test.checkin.a@dormhub.com');
  console.log('  Password: Test@123');
  console.log('  Phòng   : A203 - Tòa A (Nam) | Hợp đồng: HD-TEST-001');
  console.log('  Trạng thái: ACTIVE, chưa checkin → hiện hướng dẫn nhận phòng');
  console.log();
  console.log('── Nick B (đã nhận phòng) ────────────────────');
  console.log('  Email   : test.checkin.b@dormhub.com');
  console.log('  Password: Test@123');
  console.log('  Phòng   : B203 - Tòa B (Nữ) | Hợp đồng: HD-TEST-002');
  console.log('  Trạng thái: ACTIVE, đã checkin 10/02/2025 → hiện banner "đã nhận phòng"');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
