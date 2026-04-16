/*
  Warnings:

  - You are about to drop the column `type` on the `registration_periods` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `registration_periods` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `academic_year` to the `registration_periods` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `registration_periods` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `semester` on the `registration_periods` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PeriodStatus" ADD VALUE 'DRAFT';
ALTER TYPE "PeriodStatus" ADD VALUE 'CANCELLED';

-- DropIndex
DROP INDEX "registration_periods_semester_idx";

-- AlterTable
ALTER TABLE "registration_periods" DROP COLUMN "type",
ADD COLUMN     "academic_year" TEXT NOT NULL,
ADD COLUMN     "allow_room_preference" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "approved_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "auto_assign_room" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "max_applications_per_student" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "move_in_date" TIMESTAMP(3),
ADD COLUMN     "move_out_date" TIMESTAMP(3),
ADD COLUMN     "pending_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejected_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "target_admission_years" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "total_applications" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "semester",
ADD COLUMN     "semester" INTEGER NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- DropEnum
DROP TYPE "PeriodType";

-- CreateIndex
CREATE UNIQUE INDEX "registration_periods_code_key" ON "registration_periods"("code");

-- CreateIndex
CREATE INDEX "registration_periods_academic_year_semester_idx" ON "registration_periods"("academic_year", "semester");

-- AddForeignKey
ALTER TABLE "registration_periods" ADD CONSTRAINT "registration_periods_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
