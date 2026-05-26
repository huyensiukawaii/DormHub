import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
async function main() {
  const rows = await prisma.registrationPeriod.findMany({
    select: { id: true, code: true, name: true, status: true, startDate: true, endDate: true, totalApplications: true },
    orderBy: { createdAt: 'desc' },
  });
  rows.forEach(r => {
    const start = r.startDate.toISOString().slice(0,10);
    const end   = r.endDate.toISOString().slice(0,10);
    console.log(`[${r.id}] ${r.status.padEnd(10)} ${r.code.padEnd(22)} ${start}→${end}  apps:${r.totalApplications}`);
  });
}
main().finally(() => prisma.$disconnect());
