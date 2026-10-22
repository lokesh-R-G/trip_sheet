# Comprehensive Testing Strategy

## 1. Testing Pyramid & Tooling

To ensure zero financial errors and prevent regressions in operational calculations:

* **Unit Testing Framework**: **Vitest** (fast, native TypeScript, shares Vite configuration).
* **API Integration Testing**: **Supertest** + **Testcontainers** (spinning up ephemeral PostgreSQL 16 instances in Docker).
* **Database Constraint Testing**: Direct SQL assertion suites for check constraints and unique indexes.
* **End-to-End (E2E) Testing**: **Playwright** simulating full operational workflows from login to payslip generation.

---

## 2. Core Unit Test Specifications

### 2.1 Odometer & Distance Calculation (`calculations.test.ts`)
* **Test Case 1 (Case 1 Normal)**: `start = 100000`, `end = 100450` -> `acceptedDistance = 450`, `odometerCase = 'case_1_both_available'`, `tyreAttributionEligible = true`.
* **Test Case 2 (Case 2 Derived)**: `start = 100000`, `end = undefined`, `reported = 350` -> `derivedEnding = 100350`, `acceptedDistance = 350`, `odometerCase = 'case_2_derived_ending'`, `validationStatus = 'provisional'`.
* **Test Case 3 (Case 3 Unreported)**: `start = undefined`, `end = undefined`, `reported = 500` -> `acceptedDistance = 500`, `odometerCase = 'case_3_unreported_odometer'`, `tyreAttributionEligible = false`, `tyreAttributionStatus = 'on_hold'`.
* **Test Case 4 (Case 4 Negative Delta)**: `start = 100500`, `end = 100200` -> `discrepancyFlag = true`, `odometerCase = 'case_4_inconsistent_sequence'`, `tyreAttributionStatus = 'on_hold'`.
* **Test Case 5 (Case 4 Historical Rollback)**: `start = 98000`, `latestVehicleOdometer = 100000` -> `discrepancyFlag = true`, rollback flagged.

### 2.2 Fuel Balance & Discrepancy Checks
* **Test Case 6 (Normal Tank Balance)**: `opening = 100`, `added = 120`, `closing = 140` -> `consumption = 80L`, `status = 'verified'`.
* **Test Case 7 (Manual Slip Discrepancy)**: `calculated = 80L`, `manualSlip = 92L` (delta 12L > 5L tolerance) -> `accepted = 92L`, `calculationStatus = 'discrepancy'`, `mileageStatus = 'pending_verification'`.
* **Test Case 8 (Zero Fuel Guard)**: `distance = 400`, `fuel = 0` -> `mileageStatus = 'unavailable'`, prevents division by zero.

### 2.3 Fuel Deduction & Tolerance Formulas
* **Test Case 9 (Within Tolerance)**: `distance = 500km`, `benchmark = 5.0 km/L` -> expected = 100L. Tolerance = 5% -> allowed = 105L. `actual = 104L` -> `excessFuel = 0`, `potentialDeduction = 0`.
* **Test Case 10 (Excess Consumption)**: `distance = 500km`, `benchmark = 5.0 km/L`, `actual = 120L`, `tolerance = 5%`, `fuelPrice = 95` -> expected = 100L, allowed = 105L, excess = 15L, `potentialDeduction = ₹1425.00`.

### 2.4 Advance Settlement Balance
* **Test Case 11 (Settlement Reconcile)**: `issued = 10000`, `approvedExpenses = 6500`, `returned = 2000`, `credits = 0` -> `balance = 1500`.
* **Test Case 12 (Unapproved Expense Exclusion)**: `issued = 5000`, `approved = 2000`, `pending = 1500` -> balance computed strictly as $5000 - 2000 = 3000$ (pending expense ignored).

---

## 3. Integration & Concurrency Test Scenarios

1. **Concurrent Advance Issuance**: Execute 10 simultaneous requests to issue ₹1,000 advances to the same driver. Verify that all 10 records are inserted without locking deadlocks and the ledger sum equals ₹10,000.
2. **Double Expense Settlement Prevention**: Submit simultaneous approval for the same expense ID from two separate reviewer sessions. Verify only one succeeds with 200 OK; the second is rejected with 409 Conflict.
3. **Payroll Immutability Enforcement**:
   * Generate and finalize payroll for `2026-10`.
   * Attempt a `POST /api/v1/payroll/runs/generate` with `month: '2026-10'`. Verify rejection with `400 Bad Request ("Payroll run for this month is finalized and locked.")`.
   * Attempt to update an approved fuel deduction for an October trip. Verify that status remains `'posted_to_payroll'` and cannot be adjusted.
4. **TLCM Pro Failure & Retry**:
   * Simulate a 503 Service Unavailable response from TLCM Pro gateway.
   * Verify that local trip completes successfully (`201 Created`).
   * Verify that `integration_jobs` contains a row with status `'retry_queued'`.
   * Run the background worker with TLCM Pro mocked as healthy. Verify job status transitions to `'success'` and tyre attribution status updates.
