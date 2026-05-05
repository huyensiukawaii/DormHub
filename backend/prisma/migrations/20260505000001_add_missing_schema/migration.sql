-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PriorityDocumentType" AS ENUM ('POOR_HOUSEHOLD', 'NEAR_POOR', 'ORPHAN', 'DISABLED', 'POLICY_FAMILY', 'GPA_TRANSCRIPT');

-- AlterTable: add allowed_building_ids, allowed_types; drop default from target_admission_years
ALTER TABLE "registration_periods"
ADD COLUMN     "allowed_building_ids" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "allowed_types" TEXT NOT NULL DEFAULT 'ALL',
ALTER COLUMN   "target_admission_years" DROP DEFAULT;

-- CreateTable
CREATE TABLE "user_buildings" (
    "user_id" INTEGER NOT NULL,
    "building_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by_id" INTEGER,

    CONSTRAINT "user_buildings_pkey" PRIMARY KEY ("user_id","building_id")
);

-- CreateTable
CREATE TABLE "priority_documents" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "type" "PriorityDocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "review_note" TEXT,
    "reviewed_by_id" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "priority_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_buildings_building_id_idx" ON "user_buildings"("building_id");

-- CreateIndex
CREATE INDEX "priority_documents_student_id_idx" ON "priority_documents"("student_id");

-- CreateIndex
CREATE INDEX "priority_documents_status_idx" ON "priority_documents"("status");

-- AddForeignKey
ALTER TABLE "user_buildings" ADD CONSTRAINT "user_buildings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_buildings" ADD CONSTRAINT "user_buildings_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_buildings" ADD CONSTRAINT "user_buildings_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_documents" ADD CONSTRAINT "priority_documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_documents" ADD CONSTRAINT "priority_documents_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
