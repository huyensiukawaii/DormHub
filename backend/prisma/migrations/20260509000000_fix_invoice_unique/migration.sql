-- Drop the old unique constraint that blocks ROOM_FEE + UTILITY coexisting in the same room/month
DROP INDEX IF EXISTS "invoices_room_id_billing_month_key";

-- Add a partial unique index: only one UTILITY invoice per room per billing month
CREATE UNIQUE INDEX "invoices_utility_room_billing_unique"
  ON "invoices"("room_id", "billing_month")
  WHERE "type" = 'UTILITY';
