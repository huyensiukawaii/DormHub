-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "rejection_note" TEXT;
ALTER TABLE "invoices" ADD COLUMN "rejected_at" TIMESTAMP(3);
