-- CreateTable
CREATE TABLE "driver_attendances" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "attendance_date" DATE NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "check_in_time" TIMESTAMPTZ(6),
    "check_out_time" TIMESTAMPTZ(6),
    "source" VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    "remarks" TEXT,
    "marked_by" VARCHAR(100) NOT NULL,
    "approved_by" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "driver_attendances_attendance_date_idx" ON "driver_attendances"("attendance_date");

-- CreateIndex
CREATE INDEX "driver_attendances_status_idx" ON "driver_attendances"("status");

-- CreateIndex
CREATE INDEX "driver_attendances_driver_id_attendance_date_idx" ON "driver_attendances"("driver_id", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "driver_attendances_driver_id_attendance_date_key" ON "driver_attendances"("driver_id", "attendance_date");

-- AddForeignKey
ALTER TABLE "driver_attendances" ADD CONSTRAINT "driver_attendances_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
