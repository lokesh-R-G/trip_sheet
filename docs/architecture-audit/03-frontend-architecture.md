# Frontend Architecture Audit: Trip Sheet Management System

## 1. Routing & Navigation Architecture

The application implements a lightweight, state-driven client-side routing model rather than a path-based router (such as `react-router-dom`).

* **Route State Location**: Managed inside `src/App.tsx` (`const [currentPage, setCurrentPage] = useState<PageId>('dashboard')`).
* **Route Identifiers (`PageId`)**: Defined in `src/components/layout/Sidebar.tsx`:
  * `'dashboard'`
  * `'drivers'`
  * `'salary-structures'`
  * `'advances'`
  * `'vehicles'`
  * `'fuel-topups'`
  * `'trips'`
  * `'expenses'`
  * `'settlements'`
  * `'fuel-deductions'`
  * `'benchmarks'`
  * `'payroll-dashboard'` | `'monthly-payroll'`
  * `'payslips'`
  * `'tlcm-integration'`
  * `'integration-logs'`
  * `'users-permissions'`
  * `'audit-logs'`
  * `'settings'`
* **Evaluation**:
  * *Strengths*: Simple, zero routing bundle overhead, guarantees synchronized state across sub-views, seamlessly integrates modal deep-links (e.g., clicking on a driver's pending trip opens the trip sheet modal).
  * *Backend Readiness*: Small adjustment required. When transitioning to production, standard browser URL history (e.g., React Router 6/7 or TanStack Router) will be required so that operators can bookmark or link directly to a specific trip ID (`/trips/TRIP-2026-0042`) or driver profile (`/drivers/drv-101`).

---

## 2. Layout & Shell Architecture

The application layout is structured in `src/App.tsx` with two main layout components:

1. **`Sidebar` (`src/components/layout/Sidebar.tsx`)**:
   * Fixed-position left sidebar supporting full expanded view (width `w-64`) and collapsed icon-only view (width `w-18`).
   * Categorizes the 18 views into structured navigation sections:
     * *Overview* (Dashboard)
     * *Fleet Operations* (Drivers, Salary Structures, Advances, Vehicles, Fuel Top-Ups, Trips)
     * *Audits & Approvals* (Expense Approvals, Settlements, Fuel Deductions, Mileage Benchmarks)
     * *Payroll & Finance* (Monthly Payroll, Driver Payslips)
     * *TLCM Pro Integration* (Gateway Console, Job Logs)
     * *System & Security* (Users & RBAC, Audit Trail, Settings)
2. **`Header` (`src/components/layout/Header.tsx`)**:
   * Fixed-position top navigation bar (`h-16`) with dynamic width matching sidebar offset.
   * Houses global search, quick-action create buttons (Create Trip, Issue Advance, Record Top-up, Add Driver), notifications dropdown, and current active operator role display.
3. **Responsive Main Container**:
   * Smooth CSS transitions (`duration-200`) dynamically adjusting left margin (`ml-64` or `ml-18`).
   * Max-width layout containment (`max-w-[1600px] mx-auto p-6`) preventing excessive stretching on ultra-wide monitors.

---

## 3. Component Architecture & UI Hierarchy

The UI design follows a clean design system without third-party component libraries (like shadcn/ui or MUI), relying on bespoke React components styled with Tailwind CSS:

```
[App.tsx]
   │
   ├── <Sidebar />
   ├── <Header />
   │
   └── <main>
          ├── [View Level: e.g. TripListView]
          │      ├── <StatCard /> (KPIs)
          │      ├── <DataTable /> (Search, Sort, Pagination)
          │      │      └── <Badge /> (Status Pill)
          │      └── Action Buttons
          │
          └── [Modal Level: e.g. TripWizardModal, TripDetailModal]
                 └── <Modal />
                        ├── Form Steps / Tabs
                        ├── Dynamic Calculation Readouts
                        └── <ConfirmDialog />
```

### Shared UI Components
* **`DataTable<T>` (`src/components/common/DataTable.tsx`)**:
  * Accepts generic data array `data: T[]` and strongly typed column definitions `Column<T>[]`.
  * Features client-side search filtering, column sorting (ascending/descending), and pagination (10, 25, 50 rows per page).
  * Includes clean empty-state displays and row-click event handlers.
* **`Modal` (`src/components/common/Modal.tsx`)**:
  * Accessible overlay dialog with title, subtitle, close buttons, and configurable max-width (`sm` through `4xl`).
* **`Badge` (`src/components/common/Badge.tsx`)**:
  * Semantic color mapping for over 25 system status codes (e.g., `'active'`, `'completed'`, `'discrepancy_held'`, `'on_hold'`, `'posted_to_payroll'`, `'connected'`).
* **`StatCard` (`src/components/common/StatCard.tsx`)**:
  * Metric card with icon, title, main value, subtitle, and positive/negative trend pills.

---

## 4. State Management Architecture

The entire state is maintained in a single React Context provider:

* **Store Location**: `src/services/store.tsx` via `FleetStoreContext` and `useFleetStore()`.
* **Seed Data**: Pre-populated in `src/services/mockData.ts` (10 vehicles, 8 drivers, 4 salary packages, 8 advances, 12 fuel top-ups, 7 trips, 5 benchmarks, 2 payroll runs, 5 integration jobs, 20 audit logs).
* **Persistence Mechanism**:
  * Initial state runs `getStoredOr(key, fallback)` reading from browser `localStorage` with prefix `apex_fleet_`.
  * Multi-effect listeners synchronize each domain collection back to `localStorage` on any state update:
    ```typescript
    useEffect(() => {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'trips', JSON.stringify(trips));
    }, [trips]);
    ```
* **Store Capabilities**:
  * Defines 22 state mutation actions (e.g., `addDriver`, `issueAdvance`, `createTrip`, `approveExpense`, `adjustFuelDeduction`, `generatePayrollForMonth`, `finalizePayrollRun`).
  * Emits automated audit logs via `addAuditLog(...)` for all critical state changes.

---

## 5. Forms & Validation

### Current Validation Approach
* **HTML5 Attributes**: Standard `required`, `type="number"`, `min`, `step` attributes are used across inputs.
* **Component-Level Checks**: Forms validate mandatory inputs in `handleSubmit` handlers (e.g., ensuring driver numbers, names, and phone numbers are present before submission in `CreateDriverModal.tsx`).
* **Wizard Step Guards**: In `TripWizardModal.tsx`, dynamic calculation functions validate inputs before advancing steps (e.g., verifying that starting odometer, ending odometer, and fuel values produce valid calculations).
* **Missing Elements**:
  * No external validation schema library (such as Zod or Yup) is integrated in the frontend.
  * Form state is managed via multiple individual `useState` hooks rather than a unified form manager (such as React Hook Form).
  * Backend API readiness requires introducing Zod validation schemas shared or mirrored with backend API controllers.

---

## 6. API & Service Abstraction Assessment

* **Current API Layer**:
  * There is **no HTTP client abstraction** (no Axios, no `fetch` wrappers, no React Query / TanStack Query).
  * Direct state mutations occur synchronously in the Context store.
* **Backend Integration Readiness**:
  * The store interface `FleetStoreContextType` in `src/services/store.tsx` maps almost 1-to-1 to RESTful resource endpoints.
  * By introducing an API client layer (`src/services/api/`) and replacing local state mutations with asynchronous HTTP calls (backed by TanStack Query or standard fetchers), the existing UI components can remain virtually untouched.
