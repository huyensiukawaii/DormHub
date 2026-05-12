/**
 * Seed data cho tính năng chuyển phòng.
 * Chạy: npx ts-node -r tsconfig-paths/register prisma/seed-room-transfer.ts
 */
import 'dotenv/config';
import { PrismaClient, RoomTransferStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set.');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding room transfer data...\n');

  // Tìm admin user để làm reviewer
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('Không tìm thấy admin user. Chạy seed.ts trước.');

  // Lấy tất cả hợp đồng ACTIVE kèm thông tin phòng + SV
  const activeContracts = await prisma.contract.findMany({
    where: { status: 'ACTIVE' },
    include: {
      room: { include: { building: true } },
      student: true,
    },
    orderBy: { startDate: 'asc' },
  });

  if (activeContracts.length < 2) {
    throw new Error('Cần ít nhất 2 hợp đồng ACTIVE. Chạy seed.ts trước.');
  }

  console.log(`✅ Tìm thấy ${activeContracts.length} hợp đồng ACTIVE`);

  // Lấy 2 sinh viên đầu tiên có hợp đồng active
  const contract1 = activeContracts[0]; // SV1 — dùng cho PENDING + APPROVED history
  const contract2 = activeContracts[1]; // SV2 — dùng cho REJECTED history

  // Tìm phòng trống khác giới tính phù hợp cho SV1
  const targetRoom1 = await prisma.room.findFirst({
    where: {
      id: { not: contract1.roomId },
      gender: contract1.student.gender,
      status: 'ACTIVE',
      contracts: { none: {} }, // phòng trống hoàn toàn để chắc chắn có chỗ
    },
    include: { building: true },
  });

  // Nếu không có phòng trống hoàn toàn, lấy phòng còn chỗ
  const targetRoomFallback1 = targetRoom1 ?? await prisma.room.findFirst({
    where: {
      gender: contract1.student.gender,
      status: 'ACTIVE',
      NOT: { id: contract1.roomId },
    },
    include: {
      building: true,
      contracts: { where: { status: 'ACTIVE' } },
    },
  });

  const toRoom1 = targetRoom1 ?? targetRoomFallback1;
  if (!toRoom1) throw new Error('Không tìm thấy phòng đích phù hợp cho SV1');

  // Phòng đích cho SV2 (cũng khác phòng hiện tại, cùng giới tính)
  const toRoom2 = await prisma.room.findFirst({
    where: {
      gender: contract2.student.gender,
      status: 'ACTIVE',
      NOT: [{ id: contract2.roomId }, { id: toRoom1.id }],
    },
    include: { building: true },
  }) ?? toRoom1;

  console.log(`\n📋 SV1: ${contract1.student.fullName}`);
  console.log(`   Phòng hiện tại: ${contract1.room.code} (${contract1.room.building.name}) — ${Number(contract1.monthlyRent).toLocaleString('vi-VN')}đ/tháng`);
  console.log(`   Phòng đích:     ${toRoom1.code} (${toRoom1.building.name}) — ${Number(toRoom1.pricePerMonth).toLocaleString('vi-VN')}đ/tháng`);
  console.log(`\n📋 SV2: ${contract2.student.fullName}`);
  console.log(`   Phòng hiện tại: ${contract2.room.code} (${contract2.room.building.name})`);
  console.log(`   Phòng đích:     ${toRoom2.code} (${toRoom2.building.name})`);

  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;

  // Xóa dữ liệu test cũ nếu có
  await prisma.roomTransferRequest.deleteMany({
    where: { code: { startsWith: 'CHPG-TEST-' } },
  });

  // ── 1. PENDING — SV1 đang chờ duyệt ───────────────────────────────────────
  const pending = await prisma.roomTransferRequest.create({
    data: {
      code: `CHPG-TEST-${dateStr}-0001`,
      studentId: contract1.studentId,
      fromRoomId: contract1.roomId,
      toRoomId: toRoom1.id,
      reason: 'Phòng hiện tại có vấn đề về tiếng ồn vào ban đêm, ảnh hưởng đến việc học. Tôi muốn chuyển sang phòng yên tĩnh hơn để tập trung học tập.',
      status: RoomTransferStatus.PENDING,
    },
  });
  console.log(`\n✅ PENDING:   ${pending.code}`);

  // ── 2. APPROVED — lịch sử đã duyệt ────────────────────────────────────────
  const approved = await prisma.roomTransferRequest.create({
    data: {
      code: `CHPG-TEST-${dateStr}-0002`,
      studentId: contract1.studentId,
      fromRoomId: toRoom1.id,         // từ phòng đích (lịch sử chuyển trước đó)
      toRoomId: contract1.roomId,     // về phòng hiện tại
      reason: 'Chuyển về phòng gần bạn bè hơn.',
      status: RoomTransferStatus.APPROVED,
      reviewedById: admin.id,
      reviewedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 ngày trước
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✅ APPROVED:  ${approved.code}`);

  // ── 3. REJECTED — lịch sử bị từ chối ──────────────────────────────────────
  const rejected = await prisma.roomTransferRequest.create({
    data: {
      code: `CHPG-TEST-${dateStr}-0003`,
      studentId: contract2.studentId,
      fromRoomId: contract2.roomId,
      toRoomId: toRoom2.id,
      reason: 'Muốn chuyển sang phòng có điều hòa để sức khỏe tốt hơn.',
      status: RoomTransferStatus.REJECTED,
      rejectionReason: 'Phòng đích hiện đang đủ người, không còn chỗ trống. Vui lòng theo dõi và đăng ký lại khi có chỗ.',
      reviewedById: admin.id,
      reviewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✅ REJECTED:  ${rejected.code}`);

  // ── 4. CANCELLED — lịch sử SV tự hủy ──────────────────────────────────────
  const cancelled = await prisma.roomTransferRequest.create({
    data: {
      code: `CHPG-TEST-${dateStr}-0004`,
      studentId: contract2.studentId,
      fromRoomId: contract2.roomId,
      toRoomId: toRoom1.id,
      reason: 'Muốn thử đổi phòng mới.',
      status: RoomTransferStatus.CANCELLED,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✅ CANCELLED: ${cancelled.code}`);

  console.log('\n✨ Seed hoàn tất!');
  console.log('\n📌 Tài khoản test:');
  console.log(`   SV1 (PENDING):  ${contract1.student.fullName} — sv1@dormhub.com / 123456`);
  console.log(`   SV2 (history):  ${contract2.student.fullName} — sv2@dormhub.com / 123456`);
  console.log(`   Admin (review): admin@dormhub.com / 123456`);
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
