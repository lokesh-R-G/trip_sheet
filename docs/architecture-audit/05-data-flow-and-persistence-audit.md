# Data Flow and Persistence Audit

## 1. Domain Entity Lifecycle Analysis

This section traces the lifecycle of all core business entities as implemented in the frontend codebase.

### 1.1 Driver & Salary Structure Assignment
1. **Creation**: Created in `CreateDriverModal.tsx` via `addDriver(driverData)` in `src/services/store.tsx`.
2. **Form Ownership**: `CreateDriverModal` owns state (`driverNumber`, `fullName`, `phone`, `licenseNumber`, `salaryStructureId`, `assignedVehicleId`).
3. **Storage**: Stored in `drivers: Driver[]` state, persisted to `localStorage` key `apex_fleet_drivers`.
4. **Cross-Page Flow**: Consumed by `DriverListView`, `DriverDetailModal`, `TripWizardModal`, `AdvanceListView`, and `PayrollView`.
5. **Persistence Flaw**: Salary structure is assigned by setting `driver.salaryStructureId`. If a driver's salary structure is changed in October, September's historical relationship is lost unless preserved inside an immutable payroll snapshot.

### 1.2 Vehicle Reference & Fuel Top-Up
1. **Vehicle Mirroring**: Seeded in `mockData.ts` as `initialVehicles`. Updated via `syncVehicleMaster(vehicleId)` which simulates pulling telemetry from TLCM Pro.
2. **Bunkering Fuel Top-Up**: Created in `FuelTopUpListView.tsx` via `recordFuelTopUp(...)`.
3. **Cross-Entity Effect**: If `data.odometerReading` is provided and exceeds `vehicle.latestOdometer`, the store automatically updates the vehicle's `latestOdometer`.
4. **Separation Rule Compliance**: Correctly adheres to Rule 7: Fuel top-ups are logged to `fuelTopUps[]` and are **not** mixed with trip fuel consumption records.

### 1.3 Trip Sheet, Odometer & Route Segments
1. **Creation**: Initiated in `TripWizardModal.tsx` (8-step stepper) and finalized via `createTrip(tripData)`.
2. **Odometer Evaluation**: Evaluated using `evaluateOdometerAndDistance(...)` from `src/utils/calculations.ts`.
   * Case 1: Start and end readings present -> `acceptedDistance = ending - starting`, `tyreAttributionEligible = true`.
   * Case 2: Start reading present, end missing -> `derivedEnding = starting + reported`, `acceptedDistance = reported`, marked `provisional`.
   * Case 3: Both odometer readings missing -> `acceptedDistance = reportedDistance`, marked `unverified`, `tyreAttributionEligible = false`, `tyreAttributionStatus = 'on_hold'`.
   * Case 4: Sequence inconsistency (end < start or start < vehicle latest odometer) -> discrepancy flagged, marked `discrepancy_held`, `tyreAttributionStatus = 'on_hold'`.
3. **Route Segments**: Array of `RouteSegment` objects attached to `trip.routeSegments`. Stored within the `Trip` object.
4. **Persistence Flaw**: Trip objects are large monolithic JSON documents containing nested sub-objects (`odometer`, `distance`, `fuel`, `settlement`, `fuelDeduction`, `tlcmIntegration`). In a database, these must be normalized into relational tables.

### 1.4 Trip Expenses & Advance Settlement
1. **Expense Creation**: Added during trip creation in `TripWizardModal` or added later in `TripDetailModal` via `addExpenseToTrip(...)`. Initial state is `'pending'`.
2. **Approval Workflow**: Approved in `TripExpenseApprovalView` or `TripDetailModal` via `approveExpense(tripId, expenseId, approvedAmount)`.
3. **Settlement Recomputation**: Once approved, the store immediately sums all approved expenses and recomputes:
   $$\text{Outstanding Balance} = \text{Total Advances} - \text{Total Approved Expenses} - \text{Amount Returned} - \text{Credits}$$
4. **Advance Linkage**: In `issueAdvance(...)`, if a `tripId` is linked, the trip's `settlement.advanceIds` is updated.
5. **Settlement Return & Recovery**:
   * Cash returns are logged via `recordSettlementReturn(tripId, returnAmount)`.
   * Payroll recovery authorization is recorded via `authorizePayrollAdvanceRecovery(tripId, recoveryAmount)` setting `settlement.authorizedPayrollRecoveryAmount`.

### 1.5 Fuel Deductions
1. **Calculation**: Computed automatically during trip creation using `calculateFuelDeduction(...)`:
   $$\text{Expected} = \frac{\text{Distance}}{\text{Benchmark}}, \quad \text{Allowed} = \text{Expected} \times (1 + \text{Tolerance}), \quad \text{Excess} = \max(0, \text{Accepted} - \text{Allowed})$$
   $$\text{Potential Deduction} = \text{Excess} \times \text{Fuel Price}$$
2. **Review Workflow**: Reviewed in `FuelDeductionsView.tsx` or `TripDetailModal.tsx`.
   * `approveFuelDeduction`: sets `approvedDeductionAmount = potentialDeductionAmount`, status `'approved'`.
   * `rejectFuelDeduction`: sets `approvedDeductionAmount = 0`, status `'rejected'`.
   * `adjustFuelDeduction`: sets `approvedDeductionAmount = adjustedAmount`, status `'adjusted'`, requires `mandatoryReason`.
3. **Posting to Payroll**: When payroll is finalized via `finalizePayrollRun`, the store marks `trip.fuelDeduction.reviewStatus = 'posted_to_payroll'`.

### 1.6 Monthly Payroll Run & Payslips
1. **Generation**: Generated on demand for a selected month (e.g. `'2026-10'`) in `PayrollView.tsx` via `generatePayrollForMonth(month)`.
2. **Aggregation**:
   * Evaluates each active driver.
   * Matches driver salary structure components (basic, HRA, bata, allowances, statutory deductions).
   * Aggregates approved fuel deductions for that driver.
   * Aggregates authorized advance recoveries for that driver.
   * Computes gross, total deductions, and net payable.
3. **Finalization Seal**: Operator confirms finalization. `finalizePayrollRun(runId)` marks the run as `'finalized'`, records `finalizedAt` and `finalizedBy`, and permanently locks the run from regeneration.
4. **Payslip Printing**: Consumed by `PayslipView.tsx` to generate printable payslip slips with company headers, driver license numbers, and itemized earnings/deductions.

---

## 2. Current Frontend Data Flow Diagram

```mermaid
graph TD
    subgraph Browser Storage (localStorage)
        LS_Drivers[(apex_fleet_drivers)]
        LS_Vehicles[(apex_fleet_vehicles)]
        LS_Advances[(apex_fleet_advances)]
        LS_Trips[(apex_fleet_trips)]
        LS_Salary[(apex_fleet_salaryStructures)]
        LS_Payroll[(apex_fleet_payrollRuns)]
        LS_Audit[(apex_fleet_auditLogs)]
    end

    subgraph Central React Context (src/services/store.tsx)
        Store[FleetStoreProvider]
    end

    LS_Drivers <--> Store
    LS_Vehicles <--> Store
    LS_Advances <--> Store
    LS_Trips <--> Store
    LS_Salary <--> Store
    LS_Payroll <--> Store
    LS_Audit <--> Store

    subgraph Feature Modules & User Actions
        Wizard[TripWizardModal.tsx] -- 1. createTrip() --> Store
        Wizard -- Odometer & Fuel Inputs --> Calcs[utils/calculations.ts]
        Calcs -- Validated Dist & Excess Fuel --> Wizard

        ExpensesView[TripExpenseApprovalView.tsx] -- 2. approveExpense() --> Store
        SettlementsView[SettlementListView.tsx] -- 3. recordSettlementReturn() --> Store
        SettlementsView -- 4. authorizePayrollAdvanceRecovery() --> Store

        FuelDedsView[FuelDeductionsView.tsx] -- 5. approve/adjustFuelDeduction() --> Store

        PayrollView[PayrollView.tsx] -- 6. generatePayrollForMonth() --> Store
        PayrollView -- 7. finalizePayrollRun() [SEAL] --> Store

        PayslipView[PayslipView.tsx] -- Reads Finalized Run --> Store

        TLCMView[TLCMIntegrationView.tsx] -- 8. triggerTLCMTyreAttribution() --> Store
    end

    Store -- Auto Audit Emission --> LS_Audit
```

---

## 3. Storage Vulnerabilities & Architectural Deficits

1. **Local Browser Isolation**: State changes made by one operator are invisible to other users on separate machines.
2. **Storage Quota Depletion**: Browser `localStorage` typically enforces a 5MB to 10MB limit. As trip sheets accumulate route segments, expenses, and audit logs, quota exhaustion exceptions will occur.
3. **Lack of Concurrency Control**: Two browser tabs modifying the same trip or approving the same advance will overwrite each other without optimistic locking (`version` field) or row-level database locking.
4. **Financial Ledger Inconsistency**: In `issueAdvance(...)`, updating `driver.outstandingAdvance` is a direct number addition rather than an append-only transaction ledger. If any state update fails halfway, the balance becomes permanently desynchronized.
5. **No Network Security Boundary**: All business rules (e.g. advance recovery limits, odometer validation flags, payroll finalization locks) are evaluated on the client. A user could alter JavaScript variables in DevTools and bypass controls.
