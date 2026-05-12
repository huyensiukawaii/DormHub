-- CreateEnum
CREATE TYPE "RoomTransferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "room_transfer_requests" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "student_id" INTEGER NOT NULL,
    "from_room_id" INTEGER NOT NULL,
    "to_room_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RoomTransferStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "reviewed_by_id" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_transfer_requests_code_key" ON "room_transfer_requests"("code");

-- CreateIndex
CREATE INDEX "room_transfer_requests_student_id_idx" ON "room_transfer_requests"("student_id");

-- CreateIndex
CREATE INDEX "room_transfer_requests_status_idx" ON "room_transfer_requests"("status");

-- AddForeignKey
ALTER TABLE "room_transfer_requests" ADD CONSTRAINT "room_transfer_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_transfer_requests" ADD CONSTRAINT "room_transfer_requests_from_room_id_fkey" FOREIGN KEY ("from_room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_transfer_requests" ADD CONSTRAINT "room_transfer_requests_to_room_id_fkey" FOREIGN KEY ("to_room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_transfer_requests" ADD CONSTRAINT "room_transfer_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
