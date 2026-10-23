/*
  Warnings:

  - Added the required column `trip_id` to the `advance_settlement_allocations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "advance_settlement_allocations" DROP CONSTRAINT "advance_settlement_allocations_trip_expense_id_fkey";

-- AlterTable
ALTER TABLE "advance_settlement_allocations" ADD COLUMN     "release_reason" TEXT,
ADD COLUMN     "released_at" TIMESTAMPTZ(6),
ADD COLUMN     "released_by" VARCHAR(100),
ADD COLUMN     "status" VARCHAR(30) NOT NULL DEFAULT 'active',
ADD COLUMN     "trip_id" UUID NOT NULL,
ALTER COLUMN "trip_expense_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "driver_advance_transactions" ADD COLUMN     "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
ADD COLUMN     "reversal_of_id" UUID,
ADD COLUMN     "status" VARCHAR(30) NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "trip_expenses" ADD COLUMN     "driver_id" UUID,
ADD COLUMN     "fuel_top_up_id" UUID,
ADD COLUMN     "is_settlement_eligible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "vendor_name" VARCHAR(150),
ALTER COLUMN "approval_status" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "trip_settlement_records" ADD COLUMN     "calculation_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "driver_recovery_due" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "finalized_at" TIMESTAMPTZ(6),
ADD COLUMN     "finalized_by" VARCHAR(100),
ADD COLUMN     "financial_posting_ref" VARCHAR(100),
ADD COLUMN     "is_finalized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "net_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "posting_status" VARCHAR(30) NOT NULL DEFAULT 'not_posted',
ADD COLUMN     "reimbursement_due" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "reopen_reason" TEXT,
ADD COLUMN     "reopened_at" TIMESTAMPTZ(6),
ADD COLUMN     "reopened_by" VARCHAR(100),
ADD COLUMN     "snapshot" JSONB,
ADD COLUMN     "total_advances_allocated" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_returned_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ALTER COLUMN "outstanding_balance" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "advance_settlement_allocations_trip_id_idx" ON "advance_settlement_allocations"("trip_id");

-- CreateIndex
CREATE INDEX "driver_advance_transactions_reversal_of_id_idx" ON "driver_advance_transactions"("reversal_of_id");

-- CreateIndex
CREATE INDEX "trip_expenses_fuel_top_up_id_idx" ON "trip_expenses"("fuel_top_up_id");

-- CreateIndex
CREATE INDEX "trip_settlement_records_is_finalized_idx" ON "trip_settlement_records"("is_finalized");

-- AddForeignKey
ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_fuel_top_up_id_fkey" FOREIGN KEY ("fuel_top_up_id") REFERENCES "fuel_top_ups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_advance_transactions" ADD CONSTRAINT "driver_advance_transactions_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "driver_advance_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_settlement_allocations" ADD CONSTRAINT "advance_settlement_allocations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_settlement_allocations" ADD CONSTRAINT "advance_settlement_allocations_trip_expense_id_fkey" FOREIGN KEY ("trip_expense_id") REFERENCES "trip_expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
