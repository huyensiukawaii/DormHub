/*
  Warnings:

  - You are about to drop the column `bed_id` on the `contracts` table. All the data in the column will be lost.
  - You are about to drop the `beds` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "beds" DROP CONSTRAINT "beds_room_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_bed_id_fkey";

-- DropIndex
DROP INDEX "contracts_bed_id_idx";

-- AlterTable
ALTER TABLE "contracts" DROP COLUMN "bed_id";

-- DropTable
DROP TABLE "beds";

-- DropEnum
DROP TYPE "BedStatus";
