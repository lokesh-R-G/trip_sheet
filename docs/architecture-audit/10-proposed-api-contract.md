# Proposed REST API Contract

## 1. Global API Conventions

* **Base URL**: `/api/v1`
* **Content Type**: `application/json; charset=utf-8`
* **Authentication**: Bearer Token (`Authorization: Bearer <jwt_token>`)
* **Standard Response Envelope**:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": { "timestamp": "2026-10-20T17:15:00Z" }
  }
  ```
* **Standard Error Response**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Ending odometer cannot be less than starting odometer.",
      "details": [ ... ]
    }
  }
  ```

---

## 2. API Endpoint Specifications

### 2.1 Drivers & Salary Assignments

#### `GET /api/v1/drivers`
* **Description**: List all drivers with optional search by name, driver #, license, or status.
* **Permissions**: `drivers:read`
* **Query Params**: `page=1&limit=25&status=active&search=Ananth`
* **Response**: `200 OK` -> `{ success: true, data: Driver[], meta: { total, page, limit } }`

#### `POST /api/v1/drivers`
* **Description**: Create a new commercial fleet driver.
* **Permissions**: `drivers:create`
* **Request Body**:
  ```json
  {
    "driverNumber": "DRV-2026-009",
    "fullName": "Ananth Narayan",
    "phone": "+91 98765 43210",
    "email": "ananth.n@fleet.com",
    "address": "45 Trunk Road, Chennai, TN",
    "licenseNumber": "TN-04-2018-0081290",
    "licenseExpiry": "2030-12-31",
    "joiningDate": "2026-10-20",
    "status": "active",
    "currentVehicleId": "uuid-v-1",
    "salaryStructureId": "uuid-sal-1",
    "notes": "Hazardous materials endorsement"
  }
  ```
* **Validation**: Unique `driverNumber`, unique `licenseNumber`, valid phone regex, `licenseExpiry > today`.
* **Response**: `201 Created` -> `{ success: true, data: Driver }`

#### `GET /api/v1/drivers/:id/ledger`
* **Description**: Retrieve comprehensive driver financial ledger (advances, expense offsets, cash returns, payroll recoveries, net balance).
* **Permissions**: `finance:read`
* **Response**: `200 OK` -> `{ success: true, data: { driverId, outstandingAdvance, transactions: DriverAdvanceTransaction[] } }`

#### `POST /api/v1/salary-structures/:id/assign`
* **Description**: Assign a salary structure to a driver with effective dating.
* **Permissions**: `salary:assign`
* **Request Body**: `{ "driverId": "uuid", "effectiveFrom": "2026-11-01" }`
* **Response**: `200 OK` -> `{ success: true, data: DriverSalaryAssignment }`

---

### 2.2 Driver Advances & Returns

#### `GET /api/v1/advances`
* **Description**: List driver advances with filtering by driver, trip, date range, or status.
* **Permissions**: `advances:read`

#### `POST /api/v1/advances`
* **Description**: Issue a new cash/transfer advance to a driver.
* **Permissions**: `advances:issue`
* **Request Body**:
  ```json
  {
    "driverId": "uuid",
    "vehicleId": "uuid",
    "tripId": "uuid",
    "advanceDate": "2026-10-20",
    "advanceAmount": 5000,
    "advanceType": "trip_advance",
    "paymentMethod": "Bank Transfer",
    "referenceNumber": "ADV-VCH-8821",
    "notes": "Fuel and highway operational expenses"
  }
  ```
* **Transactions**: Inserts into `driver_advance_transactions` (debit); updates trip settlement if `tripId` supplied.
* **Response**: `201 Created`

#### `POST /api/v1/advances/:id/return`
* **Description**: Record physical cash returned by driver.
* **Permissions**: `advances:return`
* **Request Body**: `{ "amount": 1200, "returnDate": "2026-10-21", "receiptNumber": "RET-004" }`
* **Response**: `200 OK`

---

### 2.3 Fuel Top-Ups (Bunkering)

#### `POST /api/v1/fuel-topups`
* **Description**: Record vehicle bunkering event and optionally update vehicle master odometer.
* **Permissions**: `fuel:create`
* **Request Body**:
  ```json
  {
    "vehicleId": "uuid",
    "dateTime": "2026-10-20T10:30:00Z",
    "litres": 150.0,
    "pricePerLitre": 94.50,
    "fuelStation": "IndianOil Nelamangala Hub, NH-48",
    "odometerReading": 128450,
    "paymentMethod": "Company Fleet Card",
    "receiptReference": "IOCL-REC-99120"
  }
  ```
* **Transactions**: Inserts `fuel_top_ups`; if `odometerReading > vehicle.latest_odometer`, updates `vehicles.latest_odometer`.
* **Response**: `201 Created`

---

### 2.4 Trips, Odometer, Route Segments & Expenses

#### `POST /api/v1/trips`
* **Description**: Create a complete trip sheet with odometer evaluation, route segments, fuel balances, and initial expenses.
* **Permissions**: `trips:create`
* **Request Body**:
  ```json
  {
    "driverId": "uuid",
    "vehicleId": "uuid",
    "startDate": "2026-10-20T08:00:00Z",
    "endDate": "2026-10-21T18:00:00Z",
    "startingLocation": "Chennai Central Hub",
    "finalDestination": "Bengaluru Logistics Yard",
    "purpose": "Heavy Consignment Transit",
    "isDraft": false,
    "odometer": {
      "startingReading": 125000,
      "endingReading": 125450,
      "reportedDistance": 450
    },
    "routeSegments": [
      { "sequence": 1, "fromLocation": "Chennai", "toLocation": "Vellore", "distanceKm": 135 },
      { "sequence": 2, "fromLocation": "Vellore", "toLocation": "Bengaluru", "distanceKm": 315 }
    ],
    "fuel": {
      "openingFuelQuantity": 120,
      "fuelAddedDuringTrip": 100,
      "closingFuelQuantity": 130,
      "manuallyReportedLitres": 90,
      "measurementMethod": "calculated_balance"
    },
    "expenses": [
      { "category": "Tolls", "description": "FASTag NH48", "amount": 850, "paymentMethod": "FASTag" }
    ],
    "advanceIds": ["uuid-adv-1"]
  }
  ```
* **Server Processing**:
  * Runs authoritative `evaluateOdometerAndDistance`.
  * Runs authoritative `calculateFuelConsumption` and `calculateFuelDeduction`.
  * Generates `trip_number` sequentially (`TRIP-2026-XXXX`).
  * If tyre attribution eligible, enqueues `IntegrationJob` for TLCM Pro.
* **Response**: `201 Created` -> `{ success: true, data: Trip }`

#### `POST /api/v1/trips/:tripId/expenses/:expenseId/approve`
* **Description**: Approve trip expense and immediately credit to advance settlement.
* **Permissions**: `expenses:approve`
* **Request Body**: `{ "approvedAmount": 850, "reviewNotes": "Receipt verified" }`
* **Response**: `200 OK`

#### `POST /api/v1/trips/:tripId/settlement/authorize-payroll-recovery`
* **Description**: Authorize outstanding trip advance balance to be deducted from monthly payroll.
* **Permissions**: `advances:authorize_recovery`
* **Request Body**: `{ "amount": 1450, "notes": "Authorized by operations manager" }`
* **Response**: `200 OK`

---

### 2.5 Fuel Deductions Review

#### `POST /api/v1/fuel-deductions/:tripId/review`
* **Description**: Approve, reject/waive, or adjust proposed fuel deduction.
* **Permissions**: `fuel_deductions:review`
* **Request Body**:
  ```json
  {
    "action": "adjust", // "approve" | "reject" | "adjust"
    "adjustedAmount": 1500,
    "reason": "Extreme monsoon road detours verified via GPS logs (Rule 16 justification)."
  }
  ```
* **Validation**: If `action === 'adjust'`, `reason` is strictly required (`min(10)` characters).
* **Response**: `200 OK`

---

### 2.6 Monthly Payroll Runs & Payslips

#### `POST /api/v1/payroll/runs/generate`
* **Description**: Compute draft payroll for all eligible drivers for a target month.
* **Permissions**: `payroll:generate`
* **Request Body**: `{ "month": "2026-10" }`
* **Validation**: Fails if run for `month` is already in `'finalized'` status (Rule 19).
* **Response**: `200 OK` -> `{ success: true, data: PayrollRun }`

#### `POST /api/v1/payroll/runs/:id/finalize`
* **Description**: Seal and permanently lock payroll run, marking fuel deductions as posted and issuing payslips.
* **Permissions**: `payroll:finalize`
* **Response**: `200 OK` -> `{ success: true, message: "Payroll run finalized and sealed." }`

#### `GET /api/v1/payroll/runs/:id/payslips/:driverId`
* **Description**: Retrieve structured payslip payload or stream printable PDF.
* **Permissions**: `payslips:read`
* **Query Params**: `format=json|pdf`

---

### 2.7 TLCM Pro Integration & Gateway Jobs

#### `GET /api/v1/integrations/tlcm/jobs`
* **Description**: List outbox integration jobs with filter by status (`pending`, `failed`, `success`).
* **Permissions**: `integrations:read`

#### `POST /api/v1/integrations/tlcm/jobs/:id/retry`
* **Description**: Manually retry a failed integration job.
* **Permissions**: `integrations:manage`
* **Response**: `200 OK`

#### `POST /api/v1/integrations/tlcm/sync-vehicle-master`
* **Description**: Trigger sync of vehicles and tyre configurations from TLCM Pro backend API.
* **Permissions**: `integrations:manage`
* **Response**: `202 Accepted` -> `{ success: true, jobId: "uuid" }`
