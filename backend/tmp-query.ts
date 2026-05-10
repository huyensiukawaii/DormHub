import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const inv = await prisma.invoice.findUnique({
    where: { id: 69 },
    include: { room: true },
  });
  console.log('Invoice 69:', inv?.id, inv?.code, inv?.status, 'room:', inv?.room?.code, 'roomId:', inv?.roomId);

  const contracts = await prisma.contract.findMany({
    where: { roomId: inv!.roomId },
    include: { student: { select: { studentCode: true, fullName: true } } },
  });
  contracts.forEach((c) =>
    console.log('Contract:', c.code, c.status, 'leader:', c.isRoomLeader, c.student.studentCode, c.student.fullName),
  );
}

main().catch(console.error).finally(() => prisma.$disconnect());
