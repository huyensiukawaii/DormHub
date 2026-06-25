import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

export const TEST_PASSWORD = 'Test@1234';
export const ADMIN_EMAIL = 'admin.integration@dormhub.test';
export const STAFF_EMAIL = 'staff.integration@dormhub.test';
export const STUDENT_EMAIL = 'sv20220001@sis.hust.edu.vn';
export const STUDENT_CODE = '20220001';
export const BUILDING_CODE = 'TST';
export const MALE_ROOM_CODE = 'TST101';
export const FEMALE_ROOM_CODE = 'TST201';

export interface TestSeeds {
  adminUser: { id: number; email: string };
  staffUser: { id: number; email: string };
  studentUser: { id: number; email: string; studentId: number };
  building: { id: number; code: string };
  maleRoom: { id: number; code: string };
  femaleRoom: { id: number; code: string };
}

// Hardcode test URL — tránh vấn đề timing với process.env và dotenv/config
const TEST_DB_URL = 'postgresql://postgres:postgres@localhost:5433/dormhub_test';
const pool = new Pool({ connectionString: TEST_DB_URL });
const adapter = new PrismaPg(pool);
export const testPrisma = new PrismaClient({ adapter });

export async function cleanup(): Promise<void> {
  // Truncate toàn bộ tables trong schema (trừ _prisma_migrations)
  // Dùng DO block để đảm bảo tất cả tables đều được clean, kể cả tables không có FK đến users/buildings
  await testPrisma.$executeRawUnsafe(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN (
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT IN ('_prisma_migrations')
      ) LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END $$
  `);
}

export async function seedBase(): Promise<TestSeeds> {
  await cleanup();

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const adminUser = await testPrisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
      fullName: 'Admin Integration Test',
      isActive: true,
    },
  });

  const staffUser = await testPrisma.user.create({
    data: {
      email: STAFF_EMAIL,
      passwordHash,
      role: 'STAFF',
      fullName: 'Staff Integration Test',
      isActive: true,
    },
  });

  const studentUserRecord = await testPrisma.user.create({
    data: {
      email: STUDENT_EMAIL,
      passwordHash,
      role: 'STUDENT',
      fullName: 'Sinh Viên Integration Test',
      isActive: true,
    },
  });

  const studentRecord = await testPrisma.student.create({
    data: {
      userId: studentUserRecord.id,
      studentCode: STUDENT_CODE,
      fullName: 'Sinh Viên Integration Test',
      gender: 'MALE',
      majorCode: 'ET-E10',
    },
  });

  const building = await testPrisma.building.create({
    data: {
      code: BUILDING_CODE,
      name: 'Tòa Integration Test',
      totalFloors: 5,
      status: 'ACTIVE',
    },
  });

  await testPrisma.userBuilding.create({
    data: {
      userId: staffUser.id,
      buildingId: building.id,
      assignedById: adminUser.id,
    },
  });

  const maleRoom = await testPrisma.room.create({
    data: {
      code: MALE_ROOM_CODE,
      buildingId: building.id,
      floor: 1,
      gender: 'MALE',
      roomType: 'STANDARD',
      capacity: 6,
      pricePerMonth: 350000,
      status: 'ACTIVE',
    },
  });

  const femaleRoom = await testPrisma.room.create({
    data: {
      code: FEMALE_ROOM_CODE,
      buildingId: building.id,
      floor: 2,
      gender: 'FEMALE',
      roomType: 'STANDARD',
      capacity: 6,
      pricePerMonth: 350000,
      status: 'ACTIVE',
    },
  });

  return {
    adminUser: { id: adminUser.id, email: adminUser.email },
    staffUser: { id: staffUser.id, email: staffUser.email },
    studentUser: {
      id: studentUserRecord.id,
      email: studentUserRecord.email,
      studentId: studentRecord.id,
    },
    building: { id: building.id, code: building.code },
    maleRoom: { id: maleRoom.id, code: maleRoom.code },
    femaleRoom: { id: femaleRoom.id, code: femaleRoom.code },
  };
}

export async function disconnectDb(): Promise<void> {
  await testPrisma.$disconnect();
  await pool.end();
}
