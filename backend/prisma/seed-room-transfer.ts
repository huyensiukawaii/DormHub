/**
 * Seed data cho tính năng chuyển phòng.
 * Chạy: npx ts-node -r tsconfig-paths/register prisma/seed-room-transfer.ts
 */
import 'dotenv/config';
import { PrismaClient, RoomTransferStatus, Gender, Prisma } from '@prisma/client';
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

  // Lấy tối đa 5 sinh viên đầu tiên có hợp đồng active (mỗi SV chỉ lấy 1 contract)
  const seen = new Set<number>();
  const contracts: typeof activeContracts = [];
  for (const c of activeContracts) {
    if (!seen.has(c.studentId)) { seen.add(c.studentId); contracts.push(c); }
    if (contracts.length === 5) break;
  }
  if (contracts.length < 2) throw new Error('Cần ít nhất 2 hợp đồng ACTIVE. Chạy seed.ts trước.');

  const [contract1, contract2, contract3, contract4] = contracts;

  type RoomWithBuilding = Prisma.RoomGetPayload<{ include: { building: true } }>;

  // Helper: tìm phòng đích khác phòng hiện tại, cùng giới tính, còn chỗ
  async function findTargetRoom(gender: Gender, excludeIds: number[]): Promise<RoomWithBuilding | null> {
    return prisma.room.findFirst({
      where: {
        gender,
        status: 'ACTIVE',
        NOT: excludeIds.map((id) => ({ id })),
      },
      include: { building: true },
    });
  }

  const toRoom1 = await findTargetRoom(contract1.student.gender, [contract1.roomId]);
  if (!toRoom1) throw new Error('Không tìm thấy phòng đích phù hợp cho SV1');

  const toRoom2 = await findTargetRoom(contract2.student.gender, [contract2.roomId, toRoom1.id]);
  if (!toRoom2) throw new Error('Không tìm thấy phòng đích phù hợp cho SV2');

  const toRoom3 = contract3
    ? await findTargetRoom(contract3.student.gender, [contract3.roomId, toRoom1.id, toRoom2.id])
    : null;

  const toRoom4 = contract4
    ? await findTargetRoom(contract4.student.gender, [contract4.roomId, toRoom1.id, toRoom2.id, ...(toRoom3 ? [toRoom3.id] : [])])
    : null;

  console.log(`\n📋 SV1: ${contract1.student.fullName} → ${toRoom1.code} (${toRoom1.building.name})`);
  console.log(`📋 SV2: ${contract2.student.fullName} → ${toRoom2.code} (${toRoom2.building.name})`);
  if (contract3 && toRoom3) console.log(`📋 SV3: ${contract3.student.fullName} → ${toRoom3.code} (${toRoom3.building.name})`);
  if (contract4 && toRoom4) console.log(`📋 SV4: ${contract4.student.fullName} → ${toRoom4.code} (${toRoom4.building.name})`);

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

  // ── 5. PENDING — SV3 (nếu có) ─────────────────────────────────────────────
  if (contract3 && toRoom3) {
    const pending3 = await prisma.roomTransferRequest.create({
      data: {
        code: `CHPG-TEST-${dateStr}-0005`,
        studentId: contract3.studentId,
        fromRoomId: contract3.roomId,
        toRoomId: toRoom3.id,
        reason: 'Muốn chuyển sang phòng gần thư viện hơn để tiện học nhóm và mượn sách.',
        status: RoomTransferStatus.PENDING,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`✅ PENDING:   ${pending3.code} — ${contract3.student.fullName}`);
  }

  // ── 6. PENDING — SV4 (nếu có) ─────────────────────────────────────────────
  if (contract4 && toRoom4) {
    const pending4 = await prisma.roomTransferRequest.create({
      data: {
        code: `CHPG-TEST-${dateStr}-0006`,
        studentId: contract4.studentId,
        fromRoomId: contract4.roomId,
        toRoomId: toRoom4.id,
        reason: 'Phòng hiện tại bị thấm dột khi trời mưa, ảnh hưởng đến đồ dùng và sức khỏe. Đề nghị được chuyển sang phòng khô ráo hơn.',
        status: RoomTransferStatus.PENDING,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    });
    console.log(`✅ PENDING:   ${pending4.code} — ${contract4.student.fullName}`);
  }

  console.log('\n✨ Seed hoàn tất!');
  console.log('\n📌 Tài khoản test:');
  console.log(`   SV1 (PENDING):  ${contract1.student.fullName}`);
  console.log(`   SV2 (history):  ${contract2.student.fullName}`);
  if (contract3 && toRoom3) console.log(`   SV3 (PENDING):  ${contract3.student.fullName}`);
  if (contract4 && toRoom4) console.log(`   SV4 (PENDING):  ${contract4.student.fullName}`);
  console.log(`   Admin (review): admin@dormhub.com / 123456`);
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
