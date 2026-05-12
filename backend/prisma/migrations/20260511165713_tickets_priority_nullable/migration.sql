-- AlterTable
ALTER TABLE "maintenance_tickets" ALTER COLUMN "priority" DROP NOT NULL,
ALTER COLUMN "priority" DROP DEFAULT;
