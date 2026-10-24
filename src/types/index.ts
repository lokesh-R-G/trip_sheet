export type EmploymentStatus = 'active' | 'on_leave' | 'suspended' | 'resigned' | 'terminated';

export interface Driver {
  id: string;
  driverNumber: string;
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  joiningDate: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: EmploymentStatus;
  currentVehicleId?: string;
  assignedVehicleReg?: string;
  salaryStructureId?: string;
  salaryStructureName?: string;
  outstandingAdvance: number;
  notes?: string;
  createdAt: string;
}

export type ComponentType = 'earning' | 'deduction';
export type CalculationType = 'fixed' | 'percentage';

export interface SalaryComponent {
  id: string;
  name: string;
  type: ComponentType;
  calculationType: CalculationType;
  amountOrPercentage: number;
  applicabilityRules: string;
  isActive: boolean;
}

export interface SalaryStructure {
  id: string;
  name: string;
  code: string;
  description: string;
  effectiveDate: string;
  isActive: boolean;
  components: SalaryComponent[];
  createdAt: string;
}

export interface DriverSalaryAssignment {
  id: string;
  driverId: string;
  driverName: string;
  salaryStructureId: string;
  salaryStructureName: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'active' | 'scheduled' | 'expired';
  createdAt: string;
}

export type AdvanceType = 'trip_advance' | 'operational_advance' | 'other_approved';
export type AdvanceStatus = 'active' | 'partially_settled' | 'settled' | 'written_off';

export interface DriverAdvance {
  id: string;
  driverId: string;
  driverName: string;
  driverNumber: string;
  vehicleId?: string;
  vehicleReg?: string;
  tripId?: string;
  tripNumber?: string;
  advanceDate: string;
  advanceAmount: number;
  advanceType: AdvanceType;
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Fuel Card' | 'Cheque';
  referenceNumber: string;
  notes?: string;
  approvedExpensesAllocated: number;
  amountReturned: number;
  amountRecoveredThroughPayroll: number;
  outstandingBalance: number;
  status: AdvanceStatus;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  tlcmVehicleId: string;
  registrationNumber: string;
  vehicleType: 'Heavy Truck' | 'Medium Hauler' | 'Multi-Axle Trailer' | 'Tipper' | 'Container';
  makeModel: string;
  tonnage: number;
  status: 'Active' | 'In Maintenance' | 'Idle' | 'Decommissioned';
  currentDriverId?: string;
  currentDriverName?: string;
  latestOdometer: number;
  totalTripDistance: number;
  syncStatus: 'connected' | 'last_sync' | 'sync_pending' | 'sync_failed';
  lastSyncTime: string;
  assignedTyresCount: number;
  hasStepneyFitted: boolean;
}

export interface FuelTopUp {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  dateTime: string;
  litres: number;
  pricePerLitre: number;
  totalCost: number;
  fuelStation: string;
  odometerReading?: number;
  paymentMethod: 'Company Fleet Card' | 'Driver Advance' | 'Corporate Account' | 'Cash';
  receiptReference: string;
  recordedBy: string;
  notes?: string;
}

export interface RouteSegment {
  id: string;
  sequence: number;
  fromLocation: string;
  toLocation: string;
  departureTime?: string;
  arrivalTime?: string;
  distanceKm: number;
  tonnage?: number; // Segment payload in Metric Tonnes (e.g. 28T, 15T, or 0T for unladen/empty leg)
  cargoDescription?: string;
  notes?: string;
}

export type ExpenseCategory = 
  | 'Refreshments' 
  | 'RTO Charges' 
  | 'Tolls' 
  | 'Parking' 
  | 'Loading & Unloading' 
  | 'Repairs' 
  | 'Other Operational';

export type ExpenseApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface TripExpense {
  id: string;
  tripId: string;
  tripNumber: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: string;
  paymentMethod: string;
  receiptReference?: string;
  submittedBy: string;
  approvalStatus: ExpenseApprovalStatus;
  approvedAmount?: number;
  reviewer?: string;
  reviewNotes?: string;
  reviewedAt?: string;
}

export interface MileageBenchmark {
  id: string;
  name: string;
  vehicleType?: string;
  vehicleId?: string;
  vehicleReg?: string;
  minTonnage?: number;
  maxTonnage?: number;
  expectedMileageKmPerLitre: number;
  permittedTolerancePercent: number;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'active' | 'inactive';
  priority: number;
  notes?: string;
}

export type OdometerCase = 
  | 'case_1_both_available' 
  | 'case_2_derived_ending' 
  | 'case_3_unreported_odometer' 
  | 'case_4_inconsistent_sequence';

export type TripStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
export type OdometerValidationStatus = 'verified' | 'provisional' | 'discrepancy_held' | 'unverified';
export type TyreAttributionStatus = 'eligible' | 'on_hold' | 'attributed';

export interface Trip {
  id: string;
  tripNumber: string;
  driverId: string;
  driverName: string;
  driverNumber: string;
  vehicleId: string;
  vehicleReg: string;
  startDate: string;
  endDate?: string;
  purpose: string;
  notes?: string;
  status: TripStatus;
  version?: number;

  // Section B: Odometer & Distance
  odometer: {
    startingReading?: number;
    startingTimestamp?: string;
    startingSource?: 'measured' | 'manual';
    endingReading?: number;
    endingTimestamp?: string;
    endingSource?: 'measured' | 'manual';
    odometerCase: OdometerCase;
    discrepancyFlag: boolean;
    discrepancyReason?: string;
    validationStatus: OdometerValidationStatus;
  };

  distance: {
    measuredDistance?: number;
    reportedDistance?: number;
    derivedDistance?: number;
    acceptedDistance: number;
    tyreAttributionEligible: boolean;
    tyreAttributionStatus: TyreAttributionStatus;
    tyreAttributionHoldReason?: string;
  };

  // Section C: Route segments
  routeSegments: RouteSegment[];
  startingLocation: string;
  finalDestination: string;

  // Section D: Fuel consumption
  fuel: {
    openingFuelQuantity?: number;
    fuelAddedDuringTrip?: number;
    closingFuelQuantity?: number;
    calculatedConsumption?: number;
    manuallyReportedLitres?: number;
    acceptedFuelLitres: number;
    measurementMethod: 'calculated_balance' | 'manual_slip' | 'fuel_sensor';
    calculationStatus: 'verified' | 'discrepancy' | 'provisional';
    tripMileageKmPerLitre?: number;
    mileageStatus: 'valid' | 'pending_verification' | 'unavailable';
  };

  // Section E: Expenses
  expenses: TripExpense[];

  // Section F: Advance settlement
  settlement: {
    advanceIds: string[];
    totalAdvancesIssued: number;
    totalApprovedExpenses: number;
    amountReturnedByDriver: number;
    otherValidCredits: number;
    outstandingBalance: number;
    status: 'pending' | 'partially_settled' | 'fully_settled' | 'requires_review';
    authorizedPayrollRecoveryAmount: number;
    settledDate?: string;
  };

  // Section G: Fuel deduction
  fuelDeduction: {
    benchmarkId?: string;
    benchmarkName?: string;
    benchmarkMileage: number;
    tolerancePercent: number;
    expectedFuelLitres: number;
    allowedFuelLitres: number;
    excessFuelLitres: number;
    applicableFuelPrice: number;
    potentialDeductionAmount: number;
    approvedDeductionAmount: number;
    calculationStatus: 'calculated' | 'exemption_applied' | 'na';
    reviewStatus: 'pending_review' | 'approved' | 'rejected' | 'adjusted' | 'posted_to_payroll' | 'recovered_through_payroll';
    adjustmentReason?: string;
    adjustedBy?: string;
    payrollMonth?: string;
  };

  // Section H: TLCM Pro Integration
  tlcmIntegration: {
    syncStatus: 'synced' | 'pending' | 'held_odometer_error' | 'failed';
    odometerSubmitted: boolean;
    tyreDistanceAttributed: boolean;
    lastAttempt?: string;
    errorDetails?: string;
  };

  createdAt: string;
  updatedAt: string;
}

export type PayrollStatus = 'draft' | 'under_review' | 'approved' | 'finalized';

export interface PayrollLineItem {
  id: string;
  name: string;
  type: ComponentType;
  amount: number;
  category: 'base' | 'allowance' | 'trip_bata' | 'fuel_deduction' | 'advance_recovery' | 'other';
}

export interface PayrollRecord {
  id: string;
  payrollRunId: string;
  driverId: string;
  driverNumber: string;
  driverName: string;
  salaryStructureName: string;
  basicSalary: number;
  hra: number;
  otherAllowances: number;
  tripBata: number;
  grossEarnings: number;
  fuelDeductions: number;
  advanceRecoveries: number;
  otherDeductions: number;
  totalDeductions: number;
  netPayable: number;
  approvalStatus: 'pending' | 'approved' | 'on_hold';
  paymentStatus: 'unpaid' | 'processing' | 'paid';
  paymentReference?: string;
  lineItems: PayrollLineItem[];
  warnings?: string[];
}

export interface PayrollRun {
  id: string;
  month: string; // e.g. "2026-10"
  generatedDate: string;
  status: PayrollStatus;
  totalEligibleDrivers: number;
  totalGrossEarnings: number;
  totalDeductions: number;
  totalNetPayable: number;
  totalFuelDeductions: number;
  totalAdvanceRecoveries: number;
  records: PayrollRecord[];
  finalizedAt?: string;
  finalizedBy?: string;
}

export interface IntegrationJob {
  id: string;
  jobType: 'vehicle_master_sync' | 'odometer_push' | 'tyre_distance_attribution' | 'tyre_lifecycle_sync';
  vehicleId: string;
  vehicleReg: string;
  tripId?: string;
  tripNumber?: string;
  status: 'success' | 'pending' | 'failed' | 'retry_queued';
  attemptCount: number;
  payloadSummary: string;
  errorMessage?: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  entityType: 'Trip' | 'Driver' | 'Advance' | 'Expense' | 'FuelDeduction' | 'SalaryStructure' | 'Payroll' | 'Odometer';
  entityId: string;
  entityLabel: string;
  action: string;
  previousValue?: string;
  newValue?: string;
  changedBy: string;
  timestamp: string;
  reason?: string;
}

export interface SystemSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  currencySymbol: string;
  defaultFuelPricePerLitre: number;
  odometerSequenceStrictness: 'strict_block' | 'flag_discrepancy_allow_trip';
  defaultBenchmarkTolerancePercent: number;
  tlcmApiEndpoint: string;
  tlcmApiKeyConfigured: boolean;
  autoHoldTyreAttributionOnDiscrepancy: boolean;
}
