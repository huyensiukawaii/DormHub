import 'dotenv/config';
import { PrismaClient, UserRole, Gender, RoomType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set.');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('Bắt đầu gieo mầm (seed) data... 🌱');

  // Mã hóa mật khẩu chung là "123456"
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('123456', saltRounds);

  // 1. Tạo tài khoản Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dormhub.com' },
    update: {},
    create: {
      email: 'admin@dormhub.com',
      passwordHash,
      role: UserRole.ADMIN,
      fullName: 'Quản trị viên KTX',
      phone: '0123456789',
      isActive: true,
    },
  });
  console.log(`✅ Đã tạo Admin: ${admin.email}`);

  // 2. Tạo tài khoản Staff
  const staff = await prisma.user.upsert({
    where: { email: 'staff@dormhub.com' },
    update: {},
    create: {
      email: 'staff@dormhub.com',
      passwordHash,
      role: UserRole.STAFF,
      fullName: 'Nhân viên Ban Quản Lý',
      phone: '0987654321',
      isActive: true,
    },
  });
  console.log(`✅ Đã tạo Staff: ${staff.email}`);

  // 3. Tạo Tòa nhà mẫu
  const buildingA = await prisma.building.upsert({
    where: { code: 'A' },
    update: {},
    create: {
      code: 'A',
      name: 'Tòa A',
      totalFloors: 5,
      description: 'Khu KTX Trung tâm',
    },
  });
  console.log(`✅ Đã tạo Tòa nhà: ${buildingA.name}`);

  // 4. Tạo Phòng mẫu (Nam & Nữ)
  const roomA101 = await prisma.room.upsert({
    where: { code: 'A101' },
    update: {},
    create: {
      code: 'A101',
      buildingId: buildingA.id,
      floor: 1,
      gender: Gender.MALE, // Phòng Nam
      roomType: RoomType.STANDARD,
      capacity: 6,
      pricePerMonth: 350000,
    },
  });
  console.log(`✅ Đã tạo Phòng: ${roomA101.code} (Nam)`);

  const roomA102 = await prisma.room.upsert({
    where: { code: 'A102' },
    update: {},
    create: {
      code: 'A102',
      buildingId: buildingA.id,
      floor: 1,
      gender: Gender.FEMALE, // Phòng Nữ
      roomType: RoomType.AIR_CONDITIONED,
      capacity: 4,
      pricePerMonth: 550000,
    },
  });
  console.log(`✅ Đã tạo Phòng: ${roomA102.code} (Nữ)`);

  // Tạo thêm setting cấu hình điện nước mặc định
  await prisma.setting.upsert({
    where: { key: 'water_base_price' },
    update: {},
    create: { key: 'water_base_price', value: '30000', description: 'Giá khoán nước/người (VNĐ)' },
  });

  console.log('Seed data thành công! 🚀');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });