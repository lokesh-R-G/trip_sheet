-- AlterTable
ALTER TABLE "fuel_top_ups" ADD COLUMN     "dispensed_litres" DECIMAL(10,2),
ADD COLUMN     "fuel_type" VARCHAR(50) NOT NULL DEFAULT 'diesel',
ADD COLUMN     "odometer_observation_status" VARCHAR(30) NOT NULL DEFAULT 'observation',
ADD COLUMN     "pump_meter_end" DECIMAL(10,2),
ADD COLUMN     "pump_meter_start" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "mileage_benchmarks" ADD COLUMN     "route_category" VARCHAR(50),
ADD COLUMN     "terrain" VARCHAR(50),
ALTER COLUMN "permitted_tolerance_percent" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "trip_fuel_deductions" ADD COLUMN     "reviewed_at" TIMESTAMPTZ(6),
ADD COLUMN     "reviewed_by" VARCHAR(100),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "applicable_fuel_price" DROP NOT NULL,
ALTER COLUMN "potential_deduction_amount" DROP NOT NULL;

-- AlterTable
ALTER TABLE "trip_fuel_records" ADD COLUMN     "calculation_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "discrepancy_details" TEXT,
ADD COLUMN     "discrepancy_flag" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "trip_fuel_additions" (
    "id" UUID NOT NULL,
    "trip_fuel_record_id" UUID NOT NULL,
    "fuel_top_up_id" UUID,
    "litres" DECIMAL(10,2) NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "receipt_reference" VARCHAR(100),
    "addition_date_time" TIMESTAMPTZ(6) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_fuel_additions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_valuation_policies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "fuel_type" VARCHAR(50) NOT NULL DEFAULT 'diesel',
    "price_per_litre" DECIMAL(10,2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "approved_by" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fuel_valuation_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_fuel_additions_trip_fuel_record_id_idx" ON "trip_fuel_additions"("trip_fuel_record_id");

-- CreateIndex
CREATE INDEX "trip_fuel_additions_fuel_top_up_id_idx" ON "trip_fuel_additions"("fuel_top_up_id");

-- CreateIndex
CREATE INDEX "fuel_valuation_policies_fuel_type_effective_from_idx" ON "fuel_valuation_policies"("fuel_type", "effective_from");

-- AddForeignKey
ALTER TABLE "trip_fuel_additions" ADD CONSTRAINT "trip_fuel_additions_trip_fuel_record_id_fkey" FOREIGN KEY ("trip_fuel_record_id") REFERENCES "trip_fuel_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_fuel_additions" ADD CONSTRAINT "trip_fuel_additions_fuel_top_up_id_fkey" FOREIGN KEY ("fuel_top_up_id") REFERENCES "fuel_top_ups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
