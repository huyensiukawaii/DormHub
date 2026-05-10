/*
  Warnings:

  - A unique constraint covering the columns `[contract_id]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('ROOM_FEE', 'UTILITY');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "contract_id" INTEGER,
ADD COLUMN     "type" "InvoiceType" NOT NULL DEFAULT 'UTILITY';

-- CreateIndex
CREATE UNIQUE INDEX "invoices_contract_id_key" ON "invoices"("contract_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
