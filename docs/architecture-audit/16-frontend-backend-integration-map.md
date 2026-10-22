# Frontend-Backend Integration Map

This document maps every existing frontend component, modal, and store function in `src/` to its corresponding proposed backend REST API endpoint, defining payload structures and minimal frontend integration adjustments.

---

## 1. Component to API Integration Matrix

| Frontend File / Component | Existing Function in `store.tsx` | Proposed Backend API Route | HTTP Method | Required Payload / Params | Required Frontend Change |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/features/drivers/DriverListView.tsx` | `drivers` | `/api/v1/drivers` | `GET` | `?page=1&limit=50&status=active` | Replace `useFleetStore().drivers` with async query hook (e.g. TanStack Query or fetch). |
| `src/features/drivers/CreateDriverModal.tsx` | `addDriver` | `/api/v1/drivers` | `POST` | `{ driverNumber, fullName, phone, licenseNumber, licenseExpiry, joiningDate, status, salaryStructureId, ... }` | Call API on submit; display server validation error messages if duplicate license/number. |
| `src/features/drivers/DriverDetailModal.tsx` | Derived arrays from `trips`, `advances`, `payrollRuns` | `/api/v1/drivers/:id/ledger` | `GET` | `:id` | Load unified financial ledger from server instead of client-side filtering. |
| `src/features/salary-structures/SalaryStructureView.tsx` | `addSalaryStructure` | `/api/v1/salary-structures` | `POST` | `{ name, code, description, effectiveDate, components: [...] }` | Post salary package to API; handle response. |
| `src/features/salary-structures/SalaryStructureView.tsx` | `assignSalaryStructure` | `/api/v1/salary-structures/:id/assign` | `POST` | `{ driverId, effectiveFrom }` | Post assignment to API; refresh driver record. |
| `src/features/advances/AdvanceListView.tsx` | `issueAdvance` | `/api/v1/advances` | `POST` | `{ driverId, vehicleId, tripId, advanceDate, advanceAmount, advanceType, paymentMethod, referenceNumber, notes }` | Submit advance form to API; update local advance list. |
| `src/features/advances/AdvanceListView.tsx` | `recordSettlementReturn` | `/api/v1/advances/:id/return` | `POST` | `{ amount, returnDate, receiptReference }` | Submit cash return to API; refresh advance status. |
| `src/features/vehicles/VehicleReferenceView.tsx` | `vehicles`, `syncVehicleMaster` | `/api/v1/vehicles`, `/api/v1/integrations/tlcm/sync-vehicle-master` | `GET`, `POST` | `{ vehicleId }` | Replace simulated timeout with call to background sync endpoint. |
| `src/features/fuel-topups/FuelTopUpListView.tsx` | `recordFuelTopUp` | `/api/v1/fuel-topups` | `POST` | `{ vehicleId, dateTime, litres, pricePerLitre, fuelStation, odometerReading, paymentMethod, receiptReference }` | Post top-up to API; refresh vehicle odometer and top-up list. |
| `src/features/trips/TripListView.tsx` | `trips` | `/api/v1/trips` | `GET` | `?page=1&limit=25&status=in_progress` | Fetch paginated trips from API. |
| `src/features/trips/TripWizardModal.tsx` | `createTrip` | `/api/v1/trips` | `POST` | Raw inputs: `{ driverId, vehicleId, startDate, purpose, odometer: { startingReading, endingReading, reportedDistance }, routeSegments, fuel, expenses, advanceIds }` | Frontend keeps calculation functions for real-time preview, but posts raw inputs; backend returns authoritative computed trip object. |
| `src/features/expenses/TripExpenseApprovalView.tsx` | `approveExpense` | `/api/v1/trips/:tripId/expenses/:expenseId/approve` | `POST` | `{ approvedAmount, reviewNotes }` | Call endpoint on "Approve" button click; re-fetch updated settlement balance. |
| `src/features/expenses/TripExpenseApprovalView.tsx` | `rejectExpense` | `/api/v1/trips/:tripId/expenses/:expenseId/reject` | `POST` | `{ reviewNotes }` | Call endpoint on "Reject" button click. |
| `src/features/settlements/SettlementListView.tsx` | `authorizePayrollAdvanceRecovery` | `/api/v1/trips/:tripId/settlement/authorize-payroll-recovery` | `POST` | `{ amount, notes }` | Call endpoint on "Authorize Recovery" click. |
| `src/features/fuel-deductions/FuelDeductionsView.tsx` | `approveFuelDeduction` | `/api/v1/fuel-deductions/:tripId/review` | `POST` | `{ action: "approve", notes }` | Submit approval action to server. |
| `src/features/fuel-deductions/FuelDeductionsView.tsx` | `adjustFuelDeduction` | `/api/v1/fuel-deductions/:tripId/review` | `POST` | `{ action: "adjust", adjustedAmount, reason }` | Enforce mandatory reason text before calling API. |
| `src/features/payroll/PayrollView.tsx` | `generatePayrollForMonth` | `/api/v1/payroll/runs/generate` | `POST` | `{ month: "2026-10" }` | Call server calculation engine; render preview table. |
| `src/features/payroll/PayrollView.tsx` | `finalizePayrollRun` | `/api/v1/payroll/runs/:id/finalize` | `POST` | `{}` | Submit finalization seal; lock UI editing controls. |
| `src/features/payslips/PayslipView.tsx` | `payrollRuns` | `/api/v1/payroll/runs/:id/payslips/:driverId` | `GET` | `:id, :driverId` | Fetch structured printable line items for selected driver. |
| `src/features/integrations/TLCMIntegrationView.tsx` | `retryIntegrationJob` | `/api/v1/integrations/tlcm/jobs/:id/retry` | `POST` | `:id` | Trigger background queue retry worker. |
| `src/features/audit/AuditLogView.tsx` | `auditLogs` | `/api/v1/audit/logs` | `GET` | `?entityType=Trip&page=1&limit=50` | Stream immutable server audit events with pagination and filters. |
| `src/features/settings/SettingsView.tsx` | `updateSettings` | `/api/v1/settings` | `PUT` | `{ companyName, defaultFuelPricePerLitre, defaultBenchmarkTolerancePercent, ... }` | Persist global operational parameters to database. |

---

## 2. Minimal Non-Destructive Integration Strategy

To connect the frontend to the backend without rewriting or breaking the existing UI:

1. **Keep `FleetStoreProvider` API Signature Stable**:
   * Rather than deleting `useFleetStore()`, modify the internal implementation of `src/services/store.tsx` to wrap API client calls (`fetch` / `axios`).
   * Example:
     ```typescript
     // Current mock:
     const addDriver = (driverData) => {
       const newDriver = { ...driverData, id: `drv-${Date.now()}` };
       setDrivers(prev => [newDriver, ...prev]);
     };

     // API-backed implementation:
     const addDriver = async (driverData) => {
       const res = await apiClient.post('/api/v1/drivers', driverData);
       if (res.data.success) {
         setDrivers(prev => [res.data.data, ...prev]);
         return { success: true };
       }
       return { success: false, error: res.data.error.message };
     };
     ```
2. **Preserve All TypeScript Interfaces**:
   * The backend's Prisma schema and DTOs are mapped directly to `src/types/index.ts`, ensuring that frontend table renderers, formatters, and badges need zero modifications.
3. **Preserve Client Calculations as Interactive Previews**:
   * In `TripWizardModal.tsx`, keep `evaluateOdometerAndDistance` and `calculateFuelConsumption` running live in the browser so that dispatchers receive instantaneous visual feedback as they type, while the backend recalculates and validates the values authoritatively upon submission.
