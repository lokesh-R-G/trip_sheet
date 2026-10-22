# Business Calculation Audit

## 1. Inventory of Business Calculations

This audit inspects every mathematical formula and validation routine in `src/utils/calculations.ts` and `src/services/store.tsx`.

---

### Calculation 1: Odometer & Distance Evaluation
* **Source**: `src/utils/calculations.ts` -> `evaluateOdometerAndDistance(input: OdometerEvaluationInput)`
* **Input Parameters**:
  * `startingReading?: number` (km)
  * `endingReading?: number` (km)
  * `reportedDistance?: number` (km)
  * `previousVehicleOdometer?: number` (km from TLCM Pro master)
* **Outputs**:
  * `odometerCase: OdometerCase` (`'case_1_both_available' | 'case_2_derived_ending' | 'case_3_unreported_odometer' | 'case_4_inconsistent_sequence'`)
  * `measuredDistance?: number`
  * `derivedDistance?: number`
  * `reportedDistance?: number`
  * `acceptedDistance: number`
  * `derivedEndingReading?: number`
  * `discrepancyFlag: boolean`
  * `discrepancyReason?: string`
  * `validationStatus: OdometerValidationStatus`
  * `tyreAttributionEligible: boolean`
  * `tyreAttributionStatus: TyreAttributionStatus`
  * `tyreAttributionHoldReason?: string`
* **Formula & Logic**:
  * Check 1: Backward Sequence (`ending < starting`): Flags `case_4_inconsistent_sequence`, `discrepancyFlag = true`, `tyreAttributionStatus = 'on_hold'`.
  * Check 2: Historical Odometer Rollback (`starting < previousVehicleOdometer - 5`): Flags `case_4_inconsistent_sequence`, `discrepancyFlag = true`, `tyreAttributionStatus = 'on_hold'`.
  * Check 3 (Case 1): Both readings valid: `measuredDistance = ending - starting`, `acceptedDistance = measuredDistance`, `validationStatus = 'verified'`, `tyreAttributionEligible = true`.
  * Check 4 (Case 2): Start valid, end missing, reported valid: `derivedEnding = starting + reportedDistance`, `acceptedDistance = reportedDistance`, `validationStatus = 'provisional'`, `tyreAttributionEligible = true`.
  * Check 5 (Case 3): Unreported odometer readings: `acceptedDistance = reportedDistance`, `validationStatus = 'unverified'`, `tyreAttributionEligible = false`, `tyreAttributionStatus = 'on_hold'`.
* **Rounding**: Unrounded integer/decimal inputs.
* **Adherence to Business Rules**: **100% compliant** with Rules 8, 9, 10, and 21. Does not silently clamp or fabricate absolute readings. Derived readings are explicitly flagged as derived.
* **Backend Requirement**: Must be shared with or identically replicated on the backend. The backend must recalculate these outcomes authoritatively upon submission.

---

### Calculation 2: Fuel Consumption & Trip Mileage
* **Source**: `src/utils/calculations.ts` -> `calculateFuelConsumption(opening, added, closing, manualLitres, distance)`
* **Input Parameters**:
  * `opening?: number` (Litres)
  * `added?: number` (Litres)
  * `closing?: number` (Litres)
  * `manualLitres?: number` (Litres from fuel slip)
  * `distance: number` (Accepted km, default 0)
* **Outputs**:
  * `calculatedConsumption?: number`
  * `acceptedFuelLitres: number`
  * `calculationStatus: 'verified' | 'discrepancy' | 'provisional'`
  * `tripMileageKmPerLitre?: number`
  * `mileageStatus: 'valid' | 'pending_verification' | 'unavailable'`
* **Formula & Logic**:
  $$\text{Calculated Consumption} = \max(0, \text{Opening} + \text{Added} - \text{Closing})$$
  * If both calculated balance and manual slips exist:
    * If $|\text{Calculated} - \text{Manual}| > 5\text{ Litres}$, sets `calculationStatus = 'discrepancy'` and `mileageStatus = 'pending_verification'`.
    * Otherwise sets `calculationStatus = 'verified'`.
  * Trip Mileage:
    $$\text{Mileage} = \frac{\text{Distance}}{\text{Accepted Fuel}}$$
* **Rounding**: Rounded to 2 decimal places (`Math.round(val * 100) / 100`).
* **Adherence to Business Rules**: Compliant with Rule 11. Preserves manual reports while checking against calculated tank balance.
* **Backend Requirement**: The backend must authoritatively compute consumption and flag fuel discrepancies.

---

### Calculation 3: Fuel Deduction & Excess Fuel
* **Source**: `src/utils/calculations.ts` -> `calculateFuelDeduction(distanceKm, acceptedFuelLitres, benchmarkMileage, tolerancePercent, fuelPrice)`
* **Input Parameters**:
  * `distanceKm: number`
  * `acceptedFuelLitres: number`
  * `benchmarkMileage: number` (Target km/L)
  * `tolerancePercent: number` (e.g. 5%)
  * `fuelPrice: number` (₹ / Litre)
* **Outputs**:
  * `expectedFuelLitres: number`
  * `allowedFuelLitres: number`
  * `excessFuelLitres: number`
  * `potentialDeductionAmount: number`
  * `isExcess: boolean`
* **Formula & Logic**:
  $$\text{Expected Fuel} = \frac{\text{Distance}}{\text{Benchmark Mileage}}$$
  $$\text{Allowed Fuel} = \text{Expected Fuel} \times \left(1 + \frac{\text{Tolerance Percent}}{100}\right)$$
  $$\text{Excess Fuel} = \max(0, \text{Accepted Fuel} - \text{Allowed Fuel})$$
  $$\text{Potential Deduction} = \text{Excess Fuel} \times \text{Fuel Price}$$
* **Rounding**: All intermediate and final numbers rounded to 2 decimal places.
* **Adherence to Business Rules**: Fully adheres to Rule 15 and PRD Section 3.8.
* **Backend Requirement**: Authoritative financial calculation must happen server-side during trip processing. The frontend calculation is an interactive preview.

---

### Calculation 4: Driver Advance Settlement Balance
* **Source**: `src/utils/calculations.ts` -> `calculateSettlementBalance(totalAdvances, totalApprovedExpenses, amountReturned, otherCredits)`
* **Input Parameters**:
  * `totalAdvancesIssued: number`
  * `totalApprovedExpenses: number`
  * `amountReturnedByDriver: number`
  * `otherValidCredits: number` (default 0)
* **Outputs**: `balance: number`
* **Formula**:
  $$\text{Outstanding Settlement Balance} = \text{Total Advances} - \text{Total Approved Expenses} - \text{Amount Returned} - \text{Other Valid Credits}$$
* **Rounding**: Rounded to 2 decimal places.
* **Adherence to Business Rules**: Compliant with Rule 14.
* **Backend Requirement**: In the backend, this must not be a mutable field on a trip; it must be dynamically calculated or verified against an immutable settlement transaction ledger.

---

### Calculation 5: Monthly Driver Payroll & Net Pay
* **Source**: `src/services/store.tsx` -> `generatePayrollForMonth(month: string)` (lines 795-900)
* **Input Parameters**: Active drivers, salary structure components, driver trips for the month.
* **Formula**:
  $$\text{Basic} = \sum \text{Basic Components}, \quad \text{HRA} = \sum \text{HRA Components}, \quad \text{Bata} = \sum \text{Bata Components}$$
  $$\text{Gross Earnings} = \text{Basic} + \text{HRA} + \text{Other Allowances} + \text{Trip Bata}$$
  $$\text{Fuel Deductions} = \sum \text{Approved / Adjusted Fuel Deductions for Driver in Month}$$
  $$\text{Advance Recoveries} = \sum \text{Authorized Advance Recoveries for Driver in Month}$$
  $$\text{Total Deductions} = \text{Fuel Deductions} + \text{Advance Recoveries} + \text{Other Statutory Deductions}$$
  $$\text{Net Payable} = \max(0, \text{Gross Earnings} - \text{Total Deductions})$$
* **Assumed Business Policies (Warning Flags)**:
  * Line 838: Hardcoded warning if advance recovery exceeds 30% of gross earnings (`advanceRecs > gross * 0.3`).
  * Line 841: Warning added if driver has trips with unresolved odometer discrepancies.
  * Line 814: Hardcoded string matching on component names (`includes('basic')`, `includes('hra')`, `includes('bata')`) rather than structured category keys.
* **Backend Requirement**: High risk! The backend must implement a robust payroll engine using explicit component category codes (`BASIC`, `HRA`, `BATA`, `ALLOWANCE`, `STATUTORY_DEDUCTION`), and must store an immutable snapshot of all rates and variables used at the time of calculation.

---

## 2. Hardcoded Assumptions & Required Refactoring

| Location | Hardcoded Value / Pattern | Business Policy Implication | Required Backend Separation |
| :--- | :--- | :--- | :--- |
| `src/services/store.tsx:358` | Default benchmark `5.0 km/L` if none matches | Fallback assumption if vehicle type has no benchmark | Backend configuration must require an explicit active benchmark or throw a validation warning. |
| `src/services/store.tsx:366` | `settings.defaultFuelPricePerLitre` | Global single price for fuel deductions | Fuel price must be effective-dated or pulled from fuel top-up weighted average for that route/period. |
| `src/services/store.tsx:814-820` | String matching `.toLowerCase().includes('basic')` | Component categorization depends on arbitrary names | Schema must enforce an enum `ComponentCategory` (`BASIC`, `HRA`, `BATA`, `SPECIAL_ALLOWANCE`, `PF`, `ESI`, `TDS`). |
| `src/services/store.tsx:838` | `advanceRecs > gross * 0.3` (30% cap) | Unconfirmed policy on maximum advance recovery per payroll | Must be configurable in `SystemSettings` table (`maxAdvanceRecoveryPercentOfGross`). |
| `src/features/trips/TripWizardModal.tsx:225` | `totalAdvances = 10000` fallback | Fallback advance amount if no advance selected | Wizard must require selecting a real issued advance or explicitly entering 0. |
