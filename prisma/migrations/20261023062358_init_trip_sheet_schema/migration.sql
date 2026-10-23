-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "driver_number" VARCHAR(50) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255),
    "address" TEXT NOT NULL,
    "license_number" VARCHAR(100) NOT NULL,
    "license_expiry" DATE NOT NULL,
    "joining_date" DATE NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "current_vehicle_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_structures" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "effective_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_components" (
    "id" UUID NOT NULL,
    "salary_structure_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "calculation_type" VARCHAR(20) NOT NULL,
    "amount_or_percentage" DECIMAL(12,2) NOT NULL,
    "applicability_rules" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "salary_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_salary_assignments" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "salary_structure_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "status" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_salary_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "tlcm_vehicle_id" VARCHAR(100) NOT NULL,
    "registration_number" VARCHAR(50) NOT NULL,
    "vehicle_type" VARCHAR(50) NOT NULL,
    "make_model" VARCHAR(100) NOT NULL,
    "tonnage" DECIMAL(6,2) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "latest_odometer" INTEGER NOT NULL DEFAULT 0,
    "total_trip_distance" INTEGER NOT NULL DEFAULT 0,
    "assigned_tyres_count" INTEGER NOT NULL,
    "has_stepney_fitted" BOOLEAN NOT NULL DEFAULT true,
    "sync_status" VARCHAR(30) NOT NULL,
    "last_sync_time" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_top_ups" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "date_time" TIMESTAMPTZ(6) NOT NULL,
    "litres" DECIMAL(10,2) NOT NULL,
    "price_per_litre" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "fuel_station" VARCHAR(255) NOT NULL,
    "odometer_reading" INTEGER,
    "payment_method" VARCHAR(50) NOT NULL,
    "receipt_reference" VARCHAR(100) NOT NULL,
    "recorded_by" VARCHAR(100) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fuel_top_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mileage_benchmarks" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "vehicle_id" UUID,
    "vehicle_type" VARCHAR(50),
    "min_tonnage" DECIMAL(6,2),
    "max_tonnage" DECIMAL(6,2),
    "expected_mileage_km_per_litre" DECIMAL(6,2) NOT NULL,
    "permitted_tolerance_percent" DECIMAL(5,2) NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "status" VARCHAR(20) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mileage_benchmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "trip_number" VARCHAR(50) NOT NULL,
    "driver_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6),
    "starting_location" VARCHAR(255) NOT NULL,
    "final_destination" VARCHAR(255) NOT NULL,
    "purpose" VARCHAR(255) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_route_segments" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "from_location" VARCHAR(255) NOT NULL,
    "to_location" VARCHAR(255) NOT NULL,
    "departure_time" TIMESTAMPTZ(6),
    "arrival_time" TIMESTAMPTZ(6),
    "distance_km" DECIMAL(10,2) NOT NULL,
    "tonnage" DECIMAL(6,2),
    "cargo_description" VARCHAR(255),
    "notes" TEXT,

    CONSTRAINT "trip_route_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_odometer_records" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "starting_reading" INTEGER,
    "starting_timestamp" TIMESTAMPTZ(6),
    "starting_source" VARCHAR(20),
    "ending_reading" INTEGER,
    "ending_timestamp" TIMESTAMPTZ(6),
    "ending_source" VARCHAR(20),
    "odometer_case" VARCHAR(40) NOT NULL,
    "measured_distance" INTEGER,
    "derived_distance" INTEGER,
    "reported_distance" INTEGER,
    "accepted_distance" INTEGER NOT NULL,
    "derived_ending_reading" INTEGER,
    "discrepancy_flag" BOOLEAN NOT NULL DEFAULT false,
    "discrepancy_reason" TEXT,
    "validation_status" VARCHAR(30) NOT NULL,
    "tyre_attribution_eligible" BOOLEAN NOT NULL DEFAULT false,
    "tyre_attribution_status" VARCHAR(30) NOT NULL,
    "tyre_attribution_hold_reason" TEXT,

    CONSTRAINT "trip_odometer_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_fuel_records" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "opening_fuel_quantity" DECIMAL(10,2),
    "fuel_added_during_trip" DECIMAL(10,2),
    "closing_fuel_quantity" DECIMAL(10,2),
    "calculated_consumption" DECIMAL(10,2),
    "manually_reported_litres" DECIMAL(10,2),
    "accepted_fuel_litres" DECIMAL(10,2) NOT NULL,
    "measurement_method" VARCHAR(40) NOT NULL,
    "calculation_status" VARCHAR(30) NOT NULL,
    "trip_mileage_km_per_litre" DECIMAL(8,2),
    "mileage_status" VARCHAR(30) NOT NULL,

    CONSTRAINT "trip_fuel_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_expenses" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "expense_date" DATE NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL,
    "receipt_reference" VARCHAR(100),
    "submitted_by" VARCHAR(100) NOT NULL,
    "approval_status" VARCHAR(20) NOT NULL,
    "approved_amount" DECIMAL(12,2),
    "reviewer" VARCHAR(100),
    "review_notes" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_advance_transactions" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "trip_id" UUID,
    "reference_number" VARCHAR(100) NOT NULL,
    "transaction_date" DATE NOT NULL,
    "transaction_type" VARCHAR(40) NOT NULL,
    "advance_type" VARCHAR(40) NOT NULL,
    "debit_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_method" VARCHAR(50) NOT NULL,
    "notes" TEXT,
    "created_by" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_advance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advance_settlement_allocations" (
    "id" UUID NOT NULL,
    "advance_transaction_id" UUID NOT NULL,
    "trip_expense_id" UUID NOT NULL,
    "allocated_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advance_settlement_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_settlement_records" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "total_advances_issued" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_approved_expenses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amount_returned_by_driver" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_valid_credits" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outstanding_balance" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "authorized_payroll_recovery_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "settled_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_settlement_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_fuel_deductions" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "benchmark_id" UUID,
    "benchmark_mileage" DECIMAL(6,2) NOT NULL,
    "tolerance_percent" DECIMAL(5,2) NOT NULL,
    "expected_fuel_litres" DECIMAL(10,2) NOT NULL,
    "allowed_fuel_litres" DECIMAL(10,2) NOT NULL,
    "excess_fuel_litres" DECIMAL(10,2) NOT NULL,
    "applicable_fuel_price" DECIMAL(10,2) NOT NULL,
    "potential_deduction_amount" DECIMAL(12,2) NOT NULL,
    "approved_deduction_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "review_status" VARCHAR(40) NOT NULL,
    "adjustment_reason" TEXT,
    "adjusted_by" VARCHAR(100),
    "payroll_month" VARCHAR(7),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_fuel_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" UUID NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "generated_date" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "total_eligible_drivers" INTEGER NOT NULL,
    "total_gross_earnings" DECIMAL(14,2) NOT NULL,
    "total_deductions" DECIMAL(14,2) NOT NULL,
    "total_net_payable" DECIMAL(14,2) NOT NULL,
    "total_fuel_deductions" DECIMAL(14,2) NOT NULL,
    "total_advance_recoveries" DECIMAL(14,2) NOT NULL,
    "finalized_at" TIMESTAMPTZ(6),
    "finalized_by" VARCHAR(100),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_records" (
    "id" UUID NOT NULL,
    "payroll_run_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "salary_structure_name" VARCHAR(150) NOT NULL,
    "basic_salary" DECIMAL(12,2) NOT NULL,
    "hra" DECIMAL(12,2) NOT NULL,
    "other_allowances" DECIMAL(12,2) NOT NULL,
    "trip_bata" DECIMAL(12,2) NOT NULL,
    "gross_earnings" DECIMAL(12,2) NOT NULL,
    "fuel_deductions" DECIMAL(12,2) NOT NULL,
    "advance_recoveries" DECIMAL(12,2) NOT NULL,
    "other_deductions" DECIMAL(12,2) NOT NULL,
    "total_deductions" DECIMAL(12,2) NOT NULL,
    "net_payable" DECIMAL(12,2) NOT NULL,
    "approval_status" VARCHAR(30) NOT NULL,
    "payment_status" VARCHAR(30) NOT NULL,
    "payment_reference" VARCHAR(100),
    "warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "payroll_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_line_items" (
    "id" UUID NOT NULL,
    "payroll_record_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "source_ref_id" UUID,

    CONSTRAINT "payroll_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_jobs" (
    "id" UUID NOT NULL,
    "job_type" VARCHAR(50) NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "trip_id" UUID,
    "status" VARCHAR(30) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "payload" JSONB NOT NULL,
    "response_body" JSONB,
    "error_message" TEXT,
    "next_retry_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "integration_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(100) NOT NULL,
    "entity_label" VARCHAR(255) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "previous_value" JSONB,
    "new_value" JSONB,
    "reason" TEXT,
    "changed_by" VARCHAR(150) NOT NULL,
    "ip_address" VARCHAR(45),
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_driver_number_key" ON "drivers"("driver_number");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_license_number_key" ON "drivers"("license_number");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"("status");

-- CreateIndex
CREATE INDEX "drivers_current_vehicle_id_idx" ON "drivers"("current_vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "salary_structures_code_key" ON "salary_structures"("code");

-- CreateIndex
CREATE INDEX "salary_components_salary_structure_id_idx" ON "salary_components"("salary_structure_id");

-- CreateIndex
CREATE INDEX "driver_salary_assignments_driver_id_effective_from_idx" ON "driver_salary_assignments"("driver_id", "effective_from");

-- CreateIndex
CREATE INDEX "driver_salary_assignments_salary_structure_id_idx" ON "driver_salary_assignments"("salary_structure_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_tlcm_vehicle_id_key" ON "vehicles"("tlcm_vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registration_number_key" ON "vehicles"("registration_number");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE INDEX "vehicles_sync_status_idx" ON "vehicles"("sync_status");

-- CreateIndex
CREATE INDEX "fuel_top_ups_vehicle_id_date_time_idx" ON "fuel_top_ups"("vehicle_id", "date_time");

-- CreateIndex
CREATE INDEX "mileage_benchmarks_vehicle_id_idx" ON "mileage_benchmarks"("vehicle_id");

-- CreateIndex
CREATE INDEX "mileage_benchmarks_vehicle_type_idx" ON "mileage_benchmarks"("vehicle_type");

-- CreateIndex
CREATE INDEX "mileage_benchmarks_status_effective_from_idx" ON "mileage_benchmarks"("status", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "trips_trip_number_key" ON "trips"("trip_number");

-- CreateIndex
CREATE INDEX "trips_driver_id_idx" ON "trips"("driver_id");

-- CreateIndex
CREATE INDEX "trips_vehicle_id_idx" ON "trips"("vehicle_id");

-- CreateIndex
CREATE INDEX "trips_status_start_date_idx" ON "trips"("status", "start_date");

-- CreateIndex
CREATE INDEX "trip_route_segments_trip_id_idx" ON "trip_route_segments"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_route_segments_trip_id_sequence_key" ON "trip_route_segments"("trip_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "trip_odometer_records_trip_id_key" ON "trip_odometer_records"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_fuel_records_trip_id_key" ON "trip_fuel_records"("trip_id");

-- CreateIndex
CREATE INDEX "trip_expenses_trip_id_idx" ON "trip_expenses"("trip_id");

-- CreateIndex
CREATE INDEX "trip_expenses_approval_status_idx" ON "trip_expenses"("approval_status");

-- CreateIndex
CREATE UNIQUE INDEX "driver_advance_transactions_reference_number_key" ON "driver_advance_transactions"("reference_number");

-- CreateIndex
CREATE INDEX "driver_advance_transactions_driver_id_transaction_date_idx" ON "driver_advance_transactions"("driver_id", "transaction_date");

-- CreateIndex
CREATE INDEX "driver_advance_transactions_trip_id_idx" ON "driver_advance_transactions"("trip_id");

-- CreateIndex
CREATE INDEX "driver_advance_transactions_transaction_type_idx" ON "driver_advance_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "advance_settlement_allocations_advance_transaction_id_idx" ON "advance_settlement_allocations"("advance_transaction_id");

-- CreateIndex
CREATE INDEX "advance_settlement_allocations_trip_expense_id_idx" ON "advance_settlement_allocations"("trip_expense_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_settlement_records_trip_id_key" ON "trip_settlement_records"("trip_id");

-- CreateIndex
CREATE INDEX "trip_settlement_records_status_idx" ON "trip_settlement_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "trip_fuel_deductions_trip_id_key" ON "trip_fuel_deductions"("trip_id");

-- CreateIndex
CREATE INDEX "trip_fuel_deductions_benchmark_id_idx" ON "trip_fuel_deductions"("benchmark_id");

-- CreateIndex
CREATE INDEX "trip_fuel_deductions_review_status_idx" ON "trip_fuel_deductions"("review_status");

-- CreateIndex
CREATE INDEX "trip_fuel_deductions_payroll_month_idx" ON "trip_fuel_deductions"("payroll_month");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_month_key" ON "payroll_runs"("month");

-- CreateIndex
CREATE INDEX "payroll_runs_status_idx" ON "payroll_runs"("status");

-- CreateIndex
CREATE INDEX "payroll_records_payroll_run_id_idx" ON "payroll_records"("payroll_run_id");

-- CreateIndex
CREATE INDEX "payroll_records_driver_id_idx" ON "payroll_records"("driver_id");

-- CreateIndex
CREATE INDEX "payroll_records_approval_status_idx" ON "payroll_records"("approval_status");

-- CreateIndex
CREATE INDEX "payroll_records_payment_status_idx" ON "payroll_records"("payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_records_payroll_run_id_driver_id_key" ON "payroll_records"("payroll_run_id", "driver_id");

-- CreateIndex
CREATE INDEX "payroll_line_items_payroll_record_id_idx" ON "payroll_line_items"("payroll_record_id");

-- CreateIndex
CREATE INDEX "payroll_line_items_source_ref_id_idx" ON "payroll_line_items"("source_ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_jobs_idempotency_key_key" ON "integration_jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "integration_jobs_status_idx" ON "integration_jobs"("status");

-- CreateIndex
CREATE INDEX "integration_jobs_job_type_idx" ON "integration_jobs"("job_type");

-- CreateIndex
CREATE INDEX "integration_jobs_vehicle_id_idx" ON "integration_jobs"("vehicle_id");

-- CreateIndex
CREATE INDEX "integration_jobs_trip_id_idx" ON "integration_jobs"("trip_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_current_vehicle_id_fkey" FOREIGN KEY ("current_vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_salary_structure_id_fkey" FOREIGN KEY ("salary_structure_id") REFERENCES "salary_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_salary_assignments" ADD CONSTRAINT "driver_salary_assignments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_salary_assignments" ADD CONSTRAINT "driver_salary_assignments_salary_structure_id_fkey" FOREIGN KEY ("salary_structure_id") REFERENCES "salary_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_top_ups" ADD CONSTRAINT "fuel_top_ups_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mileage_benchmarks" ADD CONSTRAINT "mileage_benchmarks_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_route_segments" ADD CONSTRAINT "trip_route_segments_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_odometer_records" ADD CONSTRAINT "trip_odometer_records_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_fuel_records" ADD CONSTRAINT "trip_fuel_records_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_advance_transactions" ADD CONSTRAINT "driver_advance_transactions_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_advance_transactions" ADD CONSTRAINT "driver_advance_transactions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_settlement_allocations" ADD CONSTRAINT "advance_settlement_allocations_advance_transaction_id_fkey" FOREIGN KEY ("advance_transaction_id") REFERENCES "driver_advance_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_settlement_allocations" ADD CONSTRAINT "advance_settlement_allocations_trip_expense_id_fkey" FOREIGN KEY ("trip_expense_id") REFERENCES "trip_expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_settlement_records" ADD CONSTRAINT "trip_settlement_records_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_fuel_deductions" ADD CONSTRAINT "trip_fuel_deductions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_fuel_deductions" ADD CONSTRAINT "trip_fuel_deductions_benchmark_id_fkey" FOREIGN KEY ("benchmark_id") REFERENCES "mileage_benchmarks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_payroll_record_id_fkey" FOREIGN KEY ("payroll_record_id") REFERENCES "payroll_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_source_ref_id_fkey" FOREIGN KEY ("source_ref_id") REFERENCES "trip_fuel_deductions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_jobs" ADD CONSTRAINT "integration_jobs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_jobs" ADD CONSTRAINT "integration_jobs_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
