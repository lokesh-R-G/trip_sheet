# Complete Repository Audit & Production-Ready Integration Assessment

**Project**: Trip Sheet / Bata Sheet Management System  
**Audit Scope**: Entire Frontend (`src/`), Backend (`backend/`), Database Schema (`prisma/`), and Integration State  
**Timestamp**: 2026-11-10T11:47:00+05:30  

---

## 1. Repository Architecture Overview

The repository consists of two integrated tiers:
1. **Frontend**: Vite + React 18 + TypeScript + TailwindCSS.
   - State management currently centers around `src/services/store.tsx` (`FleetStoreContext`), which historically loaded initial mock data from `src/services/mockData.ts` and mirrored it into `localStorage`.
   - Central API client exists at `src/services/api.ts`, communicating with backend REST endpoints at `/api/v1/*`.
2. **Backend**: Express + TypeScript + Prisma ORM + PostgreSQL.
   - Core PostgreSQL database `trip` holding operational entities: `drivers`, `trips`, `trip_odometer_records`, `trip_fuel_records`, `trip_expenses`, `driver_advance_transactions`, `trip_settlement_records`, `trip_fuel_deductions`, `driver_attendances`, `audit_logs`.
   - External PostgreSQL database `tlcm1` holding authoritative master records: `Vehicle`, `VehicleType`, `VehicleOdometerLog`, `Installation`.
   - Clean domain separation in `backend/src/modules/` with routers, controllers, services, repositories, domain calculation engines, DTOs, and validation middlewares.

---

## 2. Frontend Module Inventory

| Frontend View / Feature | File Path | Current Data Source | Integration Status |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `src/features/dashboard/DashboardView.tsx` | `useFleetStore()` | Partially integrated (reads in-memory arrays populated from initial sync) |
| **Vehicles (TLCM Master)** | `src/features/vehicles/VehicleReferenceView.tsx` | Backend API `/api/v1/vehicles` via store | FULLY INTEGRATED (External DB) |
| **Driver Management** | `src/features/drivers/DriverListView.tsx` | Backend API `/api/v1/drivers` via store | FULLY INTEGRATED |
| **Create Driver Modal** | `src/features/drivers/CreateDriverModal.tsx` | Local store & Mock fallback | PARTIALLY INTEGRATED |
| **Driver Attendance** | `src/features/attendance/*` | Backend API `/api/v1/attendances` | FULLY INTEGRATED |
| **Salary Structures** | `src/features/salary-structures/SalaryStructureView.tsx` | `initialSalaryStructures` / localStorage | FRONTEND ONLY / MOCK DATA |
| **Driver Advances** | `src/features/advances/AdvanceListView.tsx` | `useFleetStore()` + `api.ts` | PARTIALLY INTEGRATED |
| **Fuel Top-Ups** | `src/features/fuel-topups/FuelTopUpListView.tsx` | `initialFuelTopUps` / local mutations | PARTIALLY INTEGRATED |
| **Trip Sheet Management** | `src/features/trips/TripListView.tsx` | Backend API `/api/v1/trips` via store | FULLY INTEGRATED |
| **Trip Wizard Modal** | `src/features/trips/TripWizardModal.tsx` | Backend API `/api/v1/trips` + external TLCM odo | FULLY INTEGRATED |
| **Trip Expenses Approval** | `src/features/expenses/TripExpenseApprovalView.tsx` | `useFleetStore()` + `api.ts` | PARTIALLY INTEGRATED |
| **Advance Settlements** | `src/features/settlements/SettlementListView.tsx` | `useFleetStore()` / local calculations | PARTIALLY INTEGRATED |
| **Fuel Deductions** | `src/features/fuel-deductions/FuelDeductionsView.tsx` | `useFleetStore()` / local mutations | PARTIALLY INTEGRATED |
| **Mileage Benchmarks** | `src/features/mileage-benchmarks/BenchmarkListView.tsx` | `initialBenchmarks` / local mutations | PARTIALLY INTEGRATED |
| **Monthly Payroll** | `src/features/payroll/PayrollView.tsx` | `initialPayrollRuns` / local mock generation | MOCK DATA / SIMULATED |
| **Payslips** | `src/features/payslips/PayslipView.tsx` | `payrollRuns` in localStorage | MOCK DATA / SIMULATED |
| **TLCM Integration View** | `src/features/integrations/TLCMIntegrationView.tsx` | `initialIntegrationJobs` / mock trigger | PARTIALLY INTEGRATED |
| **Audit Logs View** | `src/features/audit/AuditLogView.tsx` | `initialAuditLogs` / in-memory | PARTIALLY INTEGRATED |
| **System Settings** | `src/features/settings/SettingsView.tsx` | `initialSettings` / localStorage | FRONTEND ONLY |
| **Users & Permissions** | `src/features/settings/UsersPermissionsView.tsx` | Static mock permissions array | FRONTEND ONLY / STATIC |

---

## 3. Backend Module Inventory

| Backend Module | Routers & Controllers | Database Tables Accessed | Status |
| :--- | :--- | :--- | :--- |
| **Drivers** | `/api/v1/drivers` | `drivers`, `audit_logs` | FULLY IMPLEMENTED |
| **Driver Attendance** | `/api/v1/attendances` | `driver_attendances`, `drivers`, `audit_logs` | FULLY IMPLEMENTED |
| **Vehicles (TLCM)** | `/api/v1/vehicles` | `tlcm1` DB (`Vehicle`, `VehicleOdometerLog`) | FULLY IMPLEMENTED |
| **Trips & Distance** | `/api/v1/trips` | `trips`, `trip_odometer_records`, `trip_route_segments`, `audit_logs` | FULLY IMPLEMENTED |
| **Fuel Top-Ups** | `/api/v1/fuel-topups` | `fuel_top_ups` | FULLY IMPLEMENTED |
| **Benchmarks** | `/api/v1/benchmarks` | `mileage_benchmarks` | FULLY IMPLEMENTED |
| **Fuel Policies** | `/api/v1/fuel-policies` | `fuel_valuation_policies` | FULLY IMPLEMENTED |
| **Fuel Deductions** | `/api/v1/fuel-deductions` | `trip_fuel_deductions`, `mileage_benchmarks` | FULLY IMPLEMENTED |
| **Advances** | `/api/v1/advances` | `driver_advance_transactions`, `advance_settlement_allocations` | FULLY IMPLEMENTED |
| **Expenses** | `/api/v1/expenses` | `trip_expenses`, `advance_settlement_allocations` | FULLY IMPLEMENTED |
| **Settlements** | `/api/v1/settlements` | `trip_settlement_records`, `trips`, `driver_advance_transactions` | FULLY IMPLEMENTED |
| **Audit Logs** | `/api/v1/audit-logs` | `audit_logs` | FULLY IMPLEMENTED |
| **Salary Structures** | *Missing REST Router* | `salary_structures`, `salary_components` | BACKEND DB ONLY (Missing Router/Service) |
| **Payroll Runs** | *Missing REST Router* | `payroll_runs`, `payroll_records`, `payroll_line_items` | BACKEND DB ONLY (Missing Router/Service) |
| **Integration Jobs** | *Missing REST Router* | `integration_jobs` | BACKEND DB ONLY (Missing Router/Service) |
| **Bata Policy** | `/api/v1/bata/status` | In-memory status stub | PENDING SPECIFICATION (Approved constraint) |

---

## 4. Database Model Inventory

The Prisma schema defines 24 models:
1. `Driver` (PostgreSQL `drivers`)
2. `SalaryStructure` (PostgreSQL `salary_structures`)
3. `SalaryComponent` (PostgreSQL `salary_components`)
4. `DriverSalaryAssignment` (PostgreSQL `driver_salary_assignments`)
5. `Vehicle` (PostgreSQL `vehicles` - local cache/reference mapped from TLCM)
6. `FuelTopUp` (PostgreSQL `fuel_top_ups`)
7. `MileageBenchmark` (PostgreSQL `mileage_benchmarks`)
8. `Trip` (PostgreSQL `trips`)
9. `TripRouteSegment` (PostgreSQL `trip_route_segments`)
10. `TripOdometerRecord` (PostgreSQL `trip_odometer_records`)
11. `TripFuelRecord` (PostgreSQL `trip_fuel_records`)
12. `TripFuelAddition` (PostgreSQL `trip_fuel_additions`)
13. `TripExpense` (PostgreSQL `trip_expenses`)
14. `DriverAdvanceTransaction` (PostgreSQL `driver_advance_transactions`)
15. `AdvanceSettlementAllocation` (PostgreSQL `advance_settlement_allocations`)
16. `TripSettlementRecord` (PostgreSQL `trip_settlement_records`)
17. `TripFuelDeduction` (PostgreSQL `trip_fuel_deductions`)
18. `FuelValuationPolicy` (PostgreSQL `fuel_valuation_policies`)
19. `PayrollRun` (PostgreSQL `payroll_runs`)
20. `PayrollRecord` (PostgreSQL `payroll_records`)
21. `PayrollLineItem` (PostgreSQL `payroll_line_items`)
22. `IntegrationJob` (PostgreSQL `integration_jobs`)
23. `AuditLog` (PostgreSQL `audit_logs`)
24. `DriverAttendance` (PostgreSQL `driver_attendances`)

---

## 5. Complete API Inventory

| Path | Method | Module | Implementation |
| :--- | :--- | :--- | :--- |
| `/api/v1/health` | GET | Health | Real DB Query (`SELECT 1`) |
| `/api/v1/drivers` | GET, POST | Drivers | Real DB Query & Persistence |
| `/api/v1/drivers/:id` | GET, PATCH | Drivers | Real DB Query & Persistence |
| `/api/v1/drivers/:id/status` | PATCH | Drivers | Real DB Query & Persistence |
| `/api/v1/attendances` | GET, POST | Attendance | Real DB Query & Persistence |
| `/api/v1/attendances/bulk` | POST | Attendance | Real DB Batch Persistence |
| `/api/v1/attendances/:id` | GET, PATCH | Attendance | Real DB Query & Audited Update |
| `/api/v1/attendances/summary/monthly` | GET | Attendance | Real DB Date Range Aggregation |
| `/api/v1/attendances/:id/audit` | GET | Attendance | Real DB AuditLog Query |
| `/api/v1/vehicles` | GET | Vehicles | Direct Authoritative TLCM Query |
| `/api/v1/vehicles/:id` | GET | Vehicles | Direct Authoritative TLCM Query |
| `/api/v1/vehicles/:id/latest-odometer` | GET | Vehicles | Direct TLCM Telemetry & Log Resolution |
| `/api/v1/trips` | GET, POST | Trips | Real DB Query & Transactional Multi-Entity Write |
| `/api/v1/trips/:id` | GET, PATCH | Trips | Real DB Query & Persistence |
| `/api/v1/trips/:id/transition` | POST | Trips | Real DB State Machine & Concurrency Control |
| `/api/v1/trips/:id/exceptional-correction` | POST | Trips | Real DB Audited Update |
| `/api/v1/trips/:id/validate` | GET | Trips | Real Engine Validation |
| `/api/v1/trips/:id/segments` | POST | Route Segments | Real DB Persistence |
| `/api/v1/trips/:tripId/fuel` | GET, POST, PUT | Fuel Consumption | Real DB Calculations & Persistence |
| `/api/v1/trips/:tripId/fuel/additions` | POST | Fuel Consumption | Real DB Persistence |
| `/api/v1/fuel-topups` | GET, POST | Fuel Top-Ups | Real DB Query & Persistence |
| `/api/v1/benchmarks` | GET, POST | Benchmarks | Real DB Query & Persistence |
| `/api/v1/fuel-deductions` | GET | Fuel Deductions | Real DB Query |
| `/api/v1/fuel-deductions/propose` | POST | Fuel Deductions | Real DB Evaluation & Persistence |
| `/api/v1/fuel-deductions/:id/review` | POST | Fuel Deductions | Real DB State Update & Audit |
| `/api/v1/fuel-policies` | GET, POST | Fuel Valuation | Real DB Query & Persistence |
| `/api/v1/advances` | GET, POST | Advances | Real DB Ledger & Audit Logging |
| `/api/v1/advances/driver/:id/summary` | GET | Advances | Real DB Aggregation |
| `/api/v1/advances/trips/:tripId/allocate` | POST | Advances | FIFO Engine & Allocations Persistence |
| `/api/v1/advances/allocations/:id/release` | POST | Advances | Real DB Unallocation & Audit |
| `/api/v1/expenses` | GET, POST | Expenses | Real DB Query & Expense Submission |
| `/api/v1/expenses/:id/review` | POST | Expenses | Real DB Review & Settlement Impact |
| `/api/v1/settlements/trip/:tripId` | GET | Settlements | Real DB Financial Engine Calculation |
| `/api/v1/settlements/trip/:tripId/finalize` | POST | Settlements | Real DB Snapshotting & Audit |
| `/api/v1/settlements/trip/:tripId/reopen` | POST | Settlements | Real DB Reopening & Audit |
| `/api/v1/settlements/trip/:tripId/return` | POST | Settlements | Real DB Cash Return & Ledger Posting |
| `/api/v1/audit-logs` | GET | Audit | Real DB AuditLog Query with Filters |
| `/api/v1/bata/status` | GET | Bata | Static Pending Specs (per business rule mandate) |

---

## 6. Mock Data Inventory & Root Cause in `src/services/store.tsx`

`src/services/mockData.ts` holds extensive fabricated static datasets:
- `initialSettings`
- `initialVehicles`
- `initialSalaryStructures`
- `initialDrivers`
- `initialBenchmarks`
- `initialAdvances`
- `initialFuelTopUps`
- `initialTrips`
- `initialPayrollRuns`
- `initialIntegrationJobs`
- `initialAuditLogs`

**Root Cause**:
In `src/services/store.tsx`:
```typescript
const [drivers, setDrivers] = useState<Driver[]>(() => getStoredOr('drivers', initialDrivers));
const [advances, setAdvances] = useState<DriverAdvance[]>(() => getStoredOr('advances', initialAdvances));
const [fuelTopUps, setFuelTopUps] = useState<FuelTopUp[]>(() => getStoredOr('fuelTopUps', initialFuelTopUps));
const [trips, setTrips] = useState<Trip[]>(() => getStoredOr('trips', initialTrips));
// ...
```
When `localStorage` is empty or cleared, or on initial load before API completion, the frontend populates its entire state with `initial*` mock arrays.
Furthermore, operations like `recordFuelTopUp`, `addBenchmark`, `approveFuelDeduction`, and `finalizePayrollRun` perform in-memory local state mutations instead of delegating to `api.ts`.

---

## 7. Frontend/Backend Integration Gaps

1. **Fuel Top-Ups**:
   - Backend endpoint `POST /api/v1/fuel-topups` and `GET /api/v1/fuel-topups` are live.
   - Frontend `recordFuelTopUp` inside `store.tsx` generates an in-memory object and pushes it to local state instead of calling `fuelApi.createTopUp()`.
2. **Mileage Benchmarks**:
   - Backend endpoint `POST /api/v1/benchmarks` and `GET /api/v1/benchmarks` are live.
   - Frontend `BenchmarkListView` reads and mutates local state.
3. **Fuel Deductions**:
   - Backend endpoints `GET /api/v1/fuel-deductions` and `POST /api/v1/fuel-deductions/:id/review` are live.
   - Frontend `FuelDeductionsView` reads from nested trip objects in local state.
4. **Advance Settlements**:
   - Backend endpoints `POST /api/v1/settlements/trip/:id/return` and `finalize` are live.
   - Frontend `SettlementListView` calls local `recordSettlementReturn`.
5. **Salary Structures & Payroll**:
   - Backend database schema has `salary_structures`, `salary_components`, `payroll_runs`, and `payroll_records`.
   - Backend missing HTTP routes for Salary Structures and Payroll Runs.
6. **Integration Logs & Jobs**:
   - Backend has `integration_jobs` database table.
   - Missing REST router for integration jobs.
7. **Audit Logs**:
   - Backend has `/api/v1/audit-logs`.
   - Frontend `AuditLogView` reads from `auditLogs` in store instead of fetching `/api/v1/audit-logs`.

---

## 8. Implementation Plan & Priority

1. **Phase 2 — Elimination of Mock Data**:
   - Remove `initial*` mock fallbacks from `store.tsx`.
   - Replace initial fallback states with empty arrays `[]` and proper loading/error flags.
   - Isolate `mockData.ts` or retain it purely as a development reference script.
2. **Phase 3 — Backend Endpoints Completion**:
   - Add backend routes and controllers for:
     - Salary Structures (`/api/v1/salary-structures`).
     - Payroll Runs (`/api/v1/payroll`).
     - Integration Jobs (`/api/v1/integration-jobs`).
3. **Phase 4 — Frontend Store & Views Direct Integration**:
   - Wire `recordFuelTopUp` to `fuelApi.createTopUp()` and refresh from API.
   - Wire `addBenchmark` to `fuelApi.createBenchmark()` and refresh from API.
   - Wire `approveFuelDeduction` / `rejectFuelDeduction` / `adjustFuelDeduction` to `fuelApi.reviewDeduction()`.
   - Wire `recordSettlementReturn` to `settlementApi.recordCashReturn()`.
   - Wire `AuditLogView` to `auditApi.list()`.
   - Wire `SalaryStructureView` to `salaryStructureApi.list()`.
   - Wire `PayrollView` to `payrollApi.list()`.
4. **Phase 5 & 8 — E2E Testing & Verification**:
   - Verify every screen loads from PostgreSQL and shows genuine database or empty states.
   - Run complete regression test suite (`npm test`) and frontend build (`npm run build`).

