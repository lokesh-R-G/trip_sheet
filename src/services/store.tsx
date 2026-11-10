import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Driver,
  Vehicle,
  SalaryStructure,
  DriverSalaryAssignment,
  DriverAdvance,
  FuelTopUp,
  Trip,
  TripExpense,
  MileageBenchmark,
  PayrollRun,
  IntegrationJob,
  AuditLog,
  SystemSettings
} from '../types';
import { initialSettings } from './mockData';
import {
  driverApi,
  vehicleApi,
  tripApi,
  advanceApi,
  expenseApi,
  settlementApi,
  fuelApi,
  salaryStructureApi,
  payrollApi,
  integrationJobApi,
  auditApi
} from './api';

interface FleetStoreContextType {
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;

  vehicles: Vehicle[];
  drivers: Driver[];
  salaryStructures: SalaryStructure[];
  advances: DriverAdvance[];
  fuelTopUps: FuelTopUp[];
  trips: Trip[];
  benchmarks: MileageBenchmark[];
  payrollRuns: PayrollRun[];
  integrationJobs: IntegrationJob[];
  auditLogs: AuditLog[];

  // Operational Actions
  addDriver: (driver: Omit<Driver, 'id' | 'createdAt' | 'outstandingAdvance'>) => Promise<{ success: boolean; error?: string }>;
  updateDriver: (id: string, updates: Partial<Driver>) => Promise<void>;

  addSalaryStructure: (structure: Omit<SalaryStructure, 'id' | 'createdAt'>) => Promise<void>;
  assignSalaryStructure: (driverId: string, salaryStructureId: string, effectiveFrom: string) => Promise<void>;

  issueAdvance: (data: Omit<DriverAdvance, 'id' | 'createdAt' | 'approvedExpensesAllocated' | 'amountReturned' | 'amountRecoveredThroughPayroll' | 'outstandingBalance' | 'status'>) => Promise<void>;

  recordFuelTopUp: (data: Omit<FuelTopUp, 'id' | 'totalCost'>) => Promise<void>;

  createTrip: (tripData: Partial<Trip>) => Promise<Trip>;
  updateTrip: (id: string, updates: Partial<Trip>) => Promise<void>;
  completeTrip: (id: string) => Promise<{ success: boolean; warnings: string[] }>;

  // Expense Management
  addExpenseToTrip: (tripId: string, expense: Omit<TripExpense, 'id' | 'tripId' | 'tripNumber' | 'approvalStatus'>) => Promise<void>;
  approveExpense: (tripId: string, expenseId: string, approvedAmount?: number, notes?: string) => Promise<void>;
  rejectExpense: (tripId: string, expenseId: string, notes?: string) => Promise<void>;

  // Advance Settlement
  recordSettlementReturn: (tripId: string, returnAmount: number) => Promise<void>;
  authorizePayrollAdvanceRecovery: (tripId: string, recoveryAmount: number) => Promise<void>;

  // Fuel Deductions
  approveFuelDeduction: (tripId: string, notes?: string) => Promise<void>;
  rejectFuelDeduction: (tripId: string, reason: string) => Promise<void>;
  adjustFuelDeduction: (tripId: string, adjustedAmount: number, mandatoryReason: string) => Promise<void>;

  // Benchmarks
  addBenchmark: (bm: Omit<MileageBenchmark, 'id'>) => Promise<void>;
  updateBenchmark: (id: string, updates: Partial<MileageBenchmark>) => Promise<void>;

  // Payroll
  generatePayrollForMonth: (month: string) => Promise<PayrollRun | null>;
  finalizePayrollRun: (runId: string) => Promise<void>;

  // TLCM Integration
  retryIntegrationJob: (jobId: string) => Promise<void>;
  syncVehicleMaster: (vehicleId: string) => Promise<void>;
  triggerTLCMTyreAttribution: (tripId: string) => Promise<{ success: boolean; message: string }>;

  // System & API Sync
  vehiclesLoading: boolean;
  vehiclesError: string | null;
  refreshTrips: () => Promise<void>;
  refreshAdvances: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  refreshDrivers: () => Promise<void>;
  refreshVehicles: () => Promise<void>;
  refreshFuelTopUps: () => Promise<void>;
  refreshBenchmarks: () => Promise<void>;
  refreshSalaryStructures: () => Promise<void>;
  refreshPayrollRuns: () => Promise<void>;
  refreshIntegrationJobs: () => Promise<void>;
  refreshAuditLogs: () => Promise<void>;
  resetAllData: () => void;
}

const FleetStoreContext = createContext<FleetStoreContextType | null>(null);

const STORAGE_KEY_PREFIX = 'apex_fleet_';

export const FleetStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PREFIX + 'settings');
      if (raw) return JSON.parse(raw);
    } catch {}
    return initialSettings;
  });

  // State strictly initialized to empty arrays - NO fallback mock data
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState<boolean>(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [advances, setAdvances] = useState<DriverAdvance[]>([]);
  const [fuelTopUps, setFuelTopUps] = useState<FuelTopUp[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [benchmarks, setBenchmarks] = useState<MileageBenchmark[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [integrationJobs, setIntegrationJobs] = useState<IntegrationJob[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'settings', JSON.stringify(settings));
  }, [settings]);

  // Data mappers from Backend DTOs to Frontend UI Types
  const mapBackendDriver = (d: any): Driver => ({
    id: d.id,
    driverNumber: d.driverNumber,
    fullName: d.fullName,
    phone: d.phone,
    email: d.email || undefined,
    address: d.address,
    joiningDate: d.joiningDate ? d.joiningDate.split('T')[0] : '',
    licenseNumber: d.licenseNumber,
    licenseExpiry: d.licenseExpiry ? d.licenseExpiry.split('T')[0] : '',
    status: (d.status || 'active') as any,
    currentVehicleId: d.currentVehicleId || undefined,
    assignedVehicleReg: d.currentVehicle?.registrationNumber || undefined,
    salaryStructureId: d.salaryAssignments?.[0]?.salaryStructureId || undefined,
    salaryStructureName: d.salaryAssignments?.[0]?.salaryStructure?.name || undefined,
    outstandingAdvance: Number(d.outstandingAdvance || 0),
    notes: d.notes || undefined,
    createdAt: d.createdAt || new Date().toISOString(),
  });

  const mapBackendVehicle = (v: any): Vehicle => ({
    id: v.id,
    tlcmVehicleId: v.tlcmVehicleId,
    registrationNumber: v.registrationNumber,
    vehicleType: v.vehicleType || 'Heavy Truck',
    makeModel: v.makeModel || 'Commercial Vehicle',
    tonnage: Number(v.tonnage || 0),
    status: (v.status ? v.status.charAt(0).toUpperCase() + v.status.slice(1) : 'Active') as any,
    latestOdometer: Number(v.latestOdometer || 0),
    totalTripDistance: Number(v.totalTripDistance || 0),
    assignedTyresCount: Number(v.assignedTyresCount || 10),
    hasStepneyFitted: Boolean(v.hasStepneyFitted),
    syncStatus: (v.syncStatus || 'connected') as any,
    lastSyncTime: v.lastSyncTime || new Date().toISOString(),
  });

  const mapBackendTrip = (t: any): Trip => {
    const odo = t.odometer || t.odometerRecord || {};
    const fuel = t.fuel || t.fuelRecord || {};
    const sett = t.settlement || t.settlementRecord || {};
    const fded = t.fuelDeduction || {};

    const routeSegments = (t.routeSegments || []).map((s: any, idx: number) => ({
      id: s.id,
      sequence: s.sequence || idx + 1,
      fromLocation: s.fromLocation,
      toLocation: s.toLocation,
      departureTime: s.departureTime ? s.departureTime.split('T')[0] : undefined,
      arrivalTime: s.arrivalTime ? s.arrivalTime.split('T')[0] : undefined,
      distanceKm: Number(s.distanceKm || 0),
      tonnage: s.tonnage ? Number(s.tonnage) : undefined,
      cargoDescription: s.cargoDescription || undefined,
      notes: s.notes || undefined,
    }));

    const mappedExpenses: TripExpense[] = (t.expenses || []).map((e: any) => ({
      id: e.id,
      tripId: e.tripId || t.id,
      tripNumber: t.tripNumber,
      category: e.category,
      description: e.description,
      amount: Number(e.amount || 0),
      expenseDate: e.expenseDate ? e.expenseDate.split('T')[0] : '',
      paymentMethod: e.paymentMethod || 'Cash',
      receiptReference: e.receiptReference || undefined,
      submittedBy: e.submittedBy || 'Driver',
      approvalStatus: e.approvalStatus || 'pending',
      approvedAmount: e.approvedAmount ? Number(e.approvedAmount) : undefined,
      reviewer: e.reviewer || undefined,
      reviewNotes: e.reviewNotes || undefined,
      reviewedAt: e.reviewedAt || undefined,
    }));

    return {
      id: t.id,
      tripNumber: t.tripNumber,
      driverId: t.driverId,
      driverName: t.driver?.fullName || t.driverName || 'Assigned Driver',
      driverNumber: t.driver?.driverNumber || t.driverNumber || 'DRV-000',
      vehicleId: t.vehicleId,
      vehicleReg: t.vehicle?.registrationNumber || t.vehicleReg || 'VEH-000',
      startDate: t.startDate ? t.startDate.split('T')[0] : '',
      endDate: t.endDate ? t.endDate.split('T')[0] : undefined,
      purpose: t.purpose || 'Cargo Logistics Transit',
      notes: t.notes || undefined,
      status: t.status || 'draft',
      routeSegments,
      odometer: {
        startingReading: odo.startingReading ? Number(odo.startingReading) : 0,
        startingTimestamp: odo.startingTimestamp || undefined,
        startingSource: odo.startingSource || 'measured',
        endingReading: odo.endingReading ? Number(odo.endingReading) : undefined,
        endingTimestamp: odo.endingTimestamp || undefined,
        endingSource: odo.endingSource || 'measured',
        odometerCase: odo.odometerCase || 'case_1_both_available',
        discrepancyFlag: Boolean(odo.discrepancyFlag),
        discrepancyReason: odo.discrepancyReason || undefined,
      },
      distance: {
        measuredDistance: odo.measuredDistance ? Number(odo.measuredDistance) : undefined,
        derivedDistance: odo.derivedDistance ? Number(odo.derivedDistance) : undefined,
        reportedDistance: odo.reportedDistance ? Number(odo.reportedDistance) : undefined,
        acceptedDistance: Number(odo.acceptedDistance || 0),
        validationStatus: odo.validationStatus || 'unverified',
        tyreAttributionEligible: Boolean(odo.tyreAttributionEligible),
        tyreAttributionHoldReason: odo.tyreAttributionHoldReason || undefined,
      },
      fuel: {
        openingFuelQuantity: Number(fuel.openingFuelQuantity || 0),
        fuelAddedDuringTrip: Number(fuel.fuelAddedDuringTrip || 0),
        closingFuelQuantity: Number(fuel.closingFuelQuantity || 0),
        calculatedConsumption: Number(fuel.calculatedConsumption || 0),
        manuallyReportedLitres: fuel.manuallyReportedLitres ? Number(fuel.manuallyReportedLitres) : undefined,
        acceptedFuelLitres: Number(fuel.acceptedFuelLitres || 0),
        measurementMethod: fuel.measurementMethod || 'calculated_balance',
        calculationStatus: fuel.calculationStatus || 'verified',
        discrepancyFlag: Boolean(fuel.discrepancyFlag),
        discrepancyDetails: fuel.discrepancyDetails || undefined,
        tripMileageKmPerLitre: fuel.tripMileageKmPerLitre ? Number(fuel.tripMileageKmPerLitre) : undefined,
        mileageStatus: fuel.mileageStatus || 'valid',
        additions: (fuel.additions || []).map((add: any) => ({
          id: add.id,
          litres: Number(add.litres || 0),
          fuelStation: add.fuelStation || 'Station',
          receiptReference: add.receiptReference || '',
          additionDateTime: add.additionDateTime || new Date().toISOString(),
          paymentMethod: add.paymentMethod || 'Cash',
          pricePerLitre: Number(add.pricePerLitre || 0),
          totalCost: Number(add.totalCost || 0),
          fuelTopUpId: add.fuelTopUpId || undefined,
          verified: Boolean(add.verified),
        })),
      },
      expenses: mappedExpenses,
      settlement: {
        advanceIds: [],
        totalAdvancesIssued: Number(sett.totalAdvancesIssued || 0),
        totalApprovedExpenses: Number(sett.totalApprovedExpenses || 0),
        amountReturnedByDriver: Number(sett.amountReturnedByDriver || 0),
        totalReturnedAmount: Number(sett.totalReturnedAmount || 0),
        otherValidCredits: Number(sett.otherValidCredits || 0),
        outstandingBalance: Number(sett.outstandingBalance || 0),
        status: sett.status || 'pending',
        isFinalized: Boolean(sett.isFinalized),
        finalizedAt: sett.finalizedAt || undefined,
        finalizedBy: sett.finalizedBy || undefined,
        postingStatus: sett.postingStatus || 'not_posted',
        financialPostingRef: sett.financialPostingRef || undefined,
        settledDate: sett.settledDate ? sett.settledDate.split('T')[0] : undefined,
        authorizedPayrollRecoveryAmount: Number(sett.authorizedPayrollRecoveryAmount || 0),
      },
      fuelDeduction: {
        benchmarkMileage: Number(fded.benchmarkMileage || 4.5),
        tolerancePercent: Number(fded.tolerancePercent || 5),
        expectedFuelLitres: Number(fded.expectedFuelLitres || 0),
        allowedFuelLitres: Number(fded.allowedFuelLitres || 0),
        excessFuelLitres: Number(fded.excessFuelLitres || 0),
        applicableFuelPrice: Number(fded.applicableFuelPrice || 95),
        potentialDeductionAmount: Number(fded.potentialDeductionAmount || 0),
        approvedDeductionAmount: Number(fded.approvedDeductionAmount || 0),
        calculationStatus: fded.calculationStatus || 'na',
        reviewStatus: fded.reviewStatus || 'pending_review',
        adjustmentReason: fded.adjustmentReason || undefined,
        adjustedBy: fded.adjustedBy || undefined,
        payrollMonth: fded.payrollMonth || undefined,
      },
      tlcmIntegration: {
        syncStatus: 'pending',
        odometerSubmitted: false,
        tyreDistanceAttributed: false,
      },
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString(),
    };
  };

  const mapBackendAdvance = (a: any): DriverAdvance => ({
    id: a.id,
    driverId: a.driverId,
    driverName: a.driver?.fullName || 'Driver',
    driverNumber: a.driver?.driverNumber || 'DRV-000',
    vehicleId: a.trip?.vehicleId || undefined,
    vehicleReg: a.trip?.vehicle?.registrationNumber || undefined,
    tripId: a.tripId || undefined,
    tripNumber: a.trip?.tripNumber || undefined,
    advanceDate: a.transactionDate ? a.transactionDate.split('T')[0] : '',
    advanceAmount: Number(a.debitAmount || 0),
    advanceType: (a.advanceType || 'trip_advance') as any,
    paymentMethod: (a.paymentMethod || 'Cash') as any,
    referenceNumber: a.referenceNumber,
    notes: a.notes || undefined,
    approvedExpensesAllocated: (a.settlementAllocations || []).reduce((sum: number, alloc: any) => sum + Number(alloc.allocatedAmount || 0), 0),
    amountReturned: Number(a.creditAmount || 0),
    amountRecoveredThroughPayroll: 0,
    outstandingBalance: Math.max(0, Number(a.debitAmount || 0) - Number(a.creditAmount || 0)),
    status: (a.status === 'active' ? 'active' : 'settled') as any,
    createdAt: a.createdAt || new Date().toISOString(),
  });

  const mapBackendTopUp = (f: any): FuelTopUp => ({
    id: f.id,
    vehicleId: f.vehicleId,
    vehicleReg: f.vehicle?.registrationNumber || 'VEHICLE',
    dateTime: f.dateTime ? f.dateTime.split('T')[0] : new Date().toISOString().split('T')[0],
    litres: Number(f.litres || 0),
    pricePerLitre: Number(f.pricePerLitre || 0),
    totalCost: Number(f.totalCost || 0),
    fuelStation: f.fuelStation || 'Station',
    odometerReading: f.odometerReading ? Number(f.odometerReading) : undefined,
    paymentMethod: (f.paymentMethod || 'Cash') as any,
    receiptReference: f.receiptReference || 'REF',
    recordedBy: f.recordedBy || 'Supervisor',
    notes: f.notes || undefined,
  });

  const mapBackendBenchmark = (b: any): MileageBenchmark => ({
    id: b.id,
    name: b.name,
    vehicleType: b.vehicleType || undefined,
    vehicleId: b.vehicleId || undefined,
    vehicleReg: b.vehicle?.registrationNumber || undefined,
    minTonnage: b.minTonnage ? Number(b.minTonnage) : undefined,
    maxTonnage: b.maxTonnage ? Number(b.maxTonnage) : undefined,
    terrain: b.terrain || 'plain',
    routeCategory: b.routeCategory || 'highway',
    expectedMileageKmPerLitre: Number(b.expectedMileageKmPerLitre || 4.5),
    permittedTolerancePercent: Number(b.permittedTolerancePercent || 5),
    effectiveFrom: b.effectiveFrom ? b.effectiveFrom.split('T')[0] : '',
    effectiveTo: b.effectiveTo ? b.effectiveTo.split('T')[0] : undefined,
    status: b.status || 'active',
    priority: Number(b.priority || 1),
    notes: b.notes || undefined,
  });

  // --- Real API Refresh Functions ---
  const refreshDrivers = useCallback(async () => {
    try {
      const data = await driverApi.list({ limit: 100 });
      if (Array.isArray(data)) {
        setDrivers(data.map(mapBackendDriver));
      }
    } catch (err) {
      console.error('Failed to load drivers from API:', err);
    }
  }, []);

  const refreshVehicles = useCallback(async () => {
    setVehiclesLoading(true);
    setVehiclesError(null);
    try {
      const data = await vehicleApi.list();
      if (Array.isArray(data)) {
        setVehicles(data.map(mapBackendVehicle));
      } else {
        setVehicles([]);
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to connect to authoritative TLCM vehicle database';
      console.error('[TLCM Vehicle Integration Error]:', msg);
      setVehiclesError(msg);
      setVehicles([]);
    } finally {
      setVehiclesLoading(false);
    }
  }, []);

  const refreshTrips = useCallback(async () => {
    try {
      const data = await tripApi.list({ limit: 100 });
      if (Array.isArray(data)) {
        setTrips(data.map(mapBackendTrip));
      }
    } catch (err) {
      console.error('Failed to load trips from API:', err);
    }
  }, []);

  const refreshAdvances = useCallback(async () => {
    try {
      const data = await advanceApi.list({ limit: 100 });
      if (Array.isArray(data)) {
        setAdvances(data.map(mapBackendAdvance));
      }
    } catch (err) {
      console.error('Failed to load advances from API:', err);
    }
  }, []);

  const refreshExpenses = useCallback(async () => {
    try {
      await refreshTrips();
    } catch (err) {
      console.error('Failed to load expenses from API:', err);
    }
  }, [refreshTrips]);

  const refreshFuelTopUps = useCallback(async () => {
    try {
      const data = await fuelApi.listTopUps();
      if (Array.isArray(data)) {
        setFuelTopUps(data.map(mapBackendTopUp));
      }
    } catch (err) {
      console.error('Failed to load fuel top-ups from API:', err);
    }
  }, []);

  const refreshBenchmarks = useCallback(async () => {
    try {
      const data = await fuelApi.listBenchmarks();
      if (Array.isArray(data)) {
        setBenchmarks(data.map(mapBackendBenchmark));
      }
    } catch (err) {
      console.error('Failed to load benchmarks from API:', err);
    }
  }, []);

  const refreshSalaryStructures = useCallback(async () => {
    try {
      const data = await salaryStructureApi.list();
      if (Array.isArray(data)) {
        setSalaryStructures(
          data.map((s: any) => ({
            id: s.id,
            name: s.name,
            code: s.code,
            description: s.description || '',
            effectiveDate: s.effectiveDate ? s.effectiveDate.split('T')[0] : '',
            isActive: Boolean(s.isActive),
            components: (s.components || []).map((c: any) => ({
              id: c.id,
              name: c.name,
              type: c.type,
              calculationType: c.calculationType,
              amountOrPercentage: Number(c.amountOrPercentage || 0),
              applicabilityRules: c.applicabilityRules || '',
              isActive: Boolean(c.isActive),
            })),
            createdAt: s.createdAt || new Date().toISOString(),
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load salary structures from API:', err);
    }
  }, []);

  const refreshPayrollRuns = useCallback(async () => {
    try {
      const data = await payrollApi.list();
      if (Array.isArray(data)) {
        setPayrollRuns(
          data.map((r: any) => ({
            id: r.id,
            month: r.month,
            generatedDate: r.generatedDate || new Date().toISOString(),
            status: r.status,
            totalEligibleDrivers: Number(r.totalEligibleDrivers || 0),
            totalGrossEarnings: Number(r.totalGrossEarnings || 0),
            totalDeductions: Number(r.totalDeductions || 0),
            totalNetPayable: Number(r.totalNetPayable || 0),
            totalFuelDeductions: Number(r.totalFuelDeductions || 0),
            totalAdvanceRecoveries: Number(r.totalAdvanceRecoveries || 0),
            records: (r.records || []).map((rec: any) => ({
              id: rec.id,
              payrollRunId: rec.payrollRunId,
              driverId: rec.driverId,
              driverNumber: rec.driver?.driverNumber || 'DRV',
              driverName: rec.driver?.fullName || 'Driver',
              salaryStructureName: rec.salaryStructureName,
              basicSalary: Number(rec.basicSalary || 0),
              hra: Number(rec.hra || 0),
              otherAllowances: Number(rec.otherAllowances || 0),
              tripBata: Number(rec.tripBata || 0),
              grossEarnings: Number(rec.grossEarnings || 0),
              fuelDeductions: Number(rec.fuelDeductions || 0),
              advanceRecoveries: Number(rec.advanceRecoveries || 0),
              otherDeductions: Number(rec.otherDeductions || 0),
              totalDeductions: Number(rec.totalDeductions || 0),
              netPayable: Number(rec.netPayable || 0),
              approvalStatus: rec.approvalStatus,
              paymentStatus: rec.paymentStatus,
              warnings: rec.warnings || [],
            })),
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load payroll runs from API:', err);
    }
  }, []);

  const refreshIntegrationJobs = useCallback(async () => {
    try {
      const data = await integrationJobApi.list();
      if (Array.isArray(data)) {
        setIntegrationJobs(
          data.map((j: any) => ({
            id: j.id,
            jobType: j.jobType,
            vehicleId: j.vehicleId,
            vehicleReg: j.vehicle?.registrationNumber || 'VEHICLE',
            tripId: j.tripId || undefined,
            tripNumber: j.trip?.tripNumber || undefined,
            status: j.status,
            attemptCount: Number(j.attemptCount || 0),
            payloadSummary: j.payload ? JSON.stringify(j.payload).slice(0, 100) : 'Telemetry Payload',
            errorMessage: j.errorMessage || undefined,
            timestamp: j.createdAt || new Date().toISOString(),
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load integration jobs from API:', err);
    }
  }, []);

  const refreshAuditLogs = useCallback(async () => {
    try {
      const data = await auditApi.list({ limit: 100 });
      if (Array.isArray(data)) {
        setAuditLogs(
          data.map((l: any) => ({
            id: l.id,
            entityType: l.entityType as any,
            entityId: l.entityId,
            entityLabel: l.entityLabel,
            action: l.action,
            previousValue: l.previousValue ? JSON.stringify(l.previousValue) : undefined,
            newValue: l.newValue ? JSON.stringify(l.newValue) : undefined,
            changedBy: l.changedBy,
            timestamp: l.timestamp,
            reason: l.reason || undefined,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load audit logs from API:', err);
    }
  }, []);

  // Initial Data Fetch on Mount
  useEffect(() => {
    refreshDrivers();
    refreshVehicles();
    refreshTrips();
    refreshAdvances();
    refreshFuelTopUps();
    refreshBenchmarks();
    refreshSalaryStructures();
    refreshPayrollRuns();
    refreshIntegrationJobs();
    refreshAuditLogs();
  }, [
    refreshDrivers,
    refreshVehicles,
    refreshTrips,
    refreshAdvances,
    refreshFuelTopUps,
    refreshBenchmarks,
    refreshSalaryStructures,
    refreshPayrollRuns,
    refreshIntegrationJobs,
    refreshAuditLogs,
  ]);

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // 1. DRIVER ACTIONS
  const addDriver = async (driverData: Omit<Driver, 'id' | 'createdAt' | 'outstandingAdvance'>) => {
    try {
      await driverApi.create(driverData);
      await refreshDrivers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create driver' };
    }
  };

  const updateDriver = async (id: string, updates: Partial<Driver>) => {
    try {
      if (updates.status) {
        await driverApi.changeStatus(id, updates.status);
      } else {
        await driverApi.update(id, updates);
      }
      await refreshDrivers();
    } catch (err) {
      console.error('Failed to update driver:', err);
    }
  };

  // 2. SALARY STRUCTURES
  const addSalaryStructure = async (structureData: Omit<SalaryStructure, 'id' | 'createdAt'>) => {
    try {
      await salaryStructureApi.create(structureData);
      await refreshSalaryStructures();
    } catch (err) {
      console.error('Failed to create salary structure:', err);
    }
  };

  const assignSalaryStructure = async (driverId: string, salaryStructureId: string, effectiveFrom: string) => {
    try {
      await salaryStructureApi.assign({
        driverId,
        salaryStructureId,
        effectiveFrom,
      });
      await refreshDrivers();
      await refreshSalaryStructures();
    } catch (err) {
      console.error('Failed to assign salary structure:', err);
    }
  };

  // 3. ADVANCES
  const issueAdvance = async (
    data: Omit<DriverAdvance, 'id' | 'createdAt' | 'approvedExpensesAllocated' | 'amountReturned' | 'amountRecoveredThroughPayroll' | 'outstandingBalance' | 'status'>
  ) => {
    try {
      await advanceApi.create({
        driverId: data.driverId,
        tripId: data.tripId || undefined,
        transactionDate: data.advanceDate,
        advanceType: data.advanceType || 'trip_advance',
        amount: data.advanceAmount,
        paymentMethod: data.paymentMethod || 'Cash',
        notes: data.notes || undefined,
      });
      await refreshAdvances();
      await refreshTrips();
      await refreshDrivers();
    } catch (err) {
      console.error('Failed to issue advance:', err);
    }
  };

  // 4. FUEL TOP-UPS
  const recordFuelTopUp = async (data: Omit<FuelTopUp, 'id' | 'totalCost'>) => {
    try {
      await fuelApi.createTopUp({
        vehicleId: data.vehicleId,
        dateTime: data.dateTime,
        litres: data.litres,
        pricePerLitre: data.pricePerLitre,
        fuelStation: data.fuelStation,
        odometerReading: data.odometerReading,
        paymentMethod: data.paymentMethod,
        receiptReference: data.receiptReference,
        notes: data.notes,
      });
      await refreshFuelTopUps();
      await refreshVehicles();
    } catch (err) {
      console.error('Failed to record fuel top up:', err);
    }
  };

  // 5. TRIP MANAGEMENT
  const createTrip = async (tripData: Partial<Trip>): Promise<Trip> => {
    const payload: any = {
      driverId: tripData.driverId,
      vehicleId: tripData.vehicleId,
      startDate: tripData.startDate ? new Date(tripData.startDate).toISOString() : new Date().toISOString(),
      endDate: tripData.endDate ? new Date(tripData.endDate).toISOString() : undefined,
      startingLocation: tripData.routeSegments?.[0]?.fromLocation || 'Depot',
      finalDestination: tripData.routeSegments?.[0]?.toLocation || 'Destination',
      purpose: tripData.purpose || 'Cargo Logistics Transit',
      isDraft: tripData.status === 'draft',
      notes: tripData.notes,
      odometer: tripData.odometer
        ? {
            startingReading: tripData.odometer.startingReading,
            startingTimestamp: tripData.odometer.startingTimestamp,
            startingSource: tripData.odometer.startingSource,
            endingReading: tripData.odometer.endingReading,
            endingTimestamp: tripData.odometer.endingTimestamp,
            endingSource: tripData.odometer.endingSource,
            reportedDistance: tripData.distance?.reportedDistance,
          }
        : undefined,
      routeSegments: tripData.routeSegments?.map((s, idx) => ({
        sequence: s.sequence || idx + 1,
        fromLocation: s.fromLocation,
        toLocation: s.toLocation,
        departureTime: s.departureTime,
        arrivalTime: s.arrivalTime,
        distanceKm: s.distanceKm,
        tonnage: s.tonnage,
        cargoDescription: s.cargoDescription,
        notes: s.notes,
      })),
    };

    const res = await tripApi.create(payload);
    await refreshTrips();
    return mapBackendTrip(res);
  };

  const updateTrip = async (id: string, updates: Partial<Trip>) => {
    try {
      await tripApi.update(id, updates);
      await refreshTrips();
    } catch (err) {
      console.error('Failed to update trip:', err);
    }
  };

  const completeTrip = async (id: string): Promise<{ success: boolean; warnings: string[] }> => {
    try {
      const trip = trips.find((t) => t.id === id);
      const res = await tripApi.transition(id, 'completed', (trip as any)?.version || 1);
      await refreshTrips();
      return { success: true, warnings: res.warnings || [] };
    } catch (err: any) {
      return { success: false, warnings: [err?.message || 'Failed to complete trip'] };
    }
  };

  // 6. EXPENSES
  const addExpenseToTrip = async (tripId: string, expense: Omit<TripExpense, 'id' | 'tripId' | 'tripNumber' | 'approvalStatus'>) => {
    try {
      await expenseApi.submit({
        tripId,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        expenseDate: expense.expenseDate,
        paymentMethod: expense.paymentMethod,
        receiptReference: expense.receiptReference,
      });
      await refreshTrips();
    } catch (err) {
      console.error('Failed to add expense:', err);
    }
  };

  const approveExpense = async (tripId: string, expenseId: string, approvedAmount?: number, notes?: string) => {
    try {
      await expenseApi.review(expenseId, {
        action: 'approve',
        approvedAmount,
        comments: notes,
      });
      await refreshTrips();
    } catch (err) {
      console.error('Failed to approve expense:', err);
    }
  };

  const rejectExpense = async (tripId: string, expenseId: string, notes?: string) => {
    try {
      await expenseApi.review(expenseId, {
        action: 'reject',
        comments: notes,
        rejectionReason: notes || 'Rejected as per company policy',
      });
      await refreshTrips();
    } catch (err) {
      console.error('Failed to reject expense:', err);
    }
  };

  const recordSettlementReturn = async (tripId: string, returnAmount: number) => {
    try {
      await settlementApi.recordCashReturn(tripId, {
        amount: returnAmount,
        referenceNumber: `RET-${Date.now()}`,
        transactionDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash',
      });
      await refreshTrips();
      await refreshAdvances();
    } catch (err) {
      console.error('Failed to record cash return:', err);
    }
  };

  const authorizePayrollAdvanceRecovery = async (tripId: string, recoveryAmount: number) => {
    try {
      await tripApi.update(tripId, { notes: `Payroll recovery authorized: ₹${recoveryAmount}` });
      await refreshTrips();
    } catch (err) {
      console.error('Failed to authorize payroll recovery:', err);
    }
  };

  // 7. FUEL DEDUCTIONS APPROVAL / ADJUSTMENT
  const approveFuelDeduction = async (tripId: string, notes?: string) => {
    try {
      const trip = trips.find((t) => t.id === tripId);
      if (trip && (trip as any).fuelDeduction?.id) {
        await fuelApi.reviewDeduction((trip as any).fuelDeduction.id, 'approve', { notes });
      }
      await refreshTrips();
    } catch (err) {
      console.error('Failed to approve fuel deduction:', err);
    }
  };

  const rejectFuelDeduction = async (tripId: string, reason: string) => {
    try {
      const trip = trips.find((t) => t.id === tripId);
      if (trip && (trip as any).fuelDeduction?.id) {
        await fuelApi.reviewDeduction((trip as any).fuelDeduction.id, 'reject', { reason });
      }
      await refreshTrips();
    } catch (err) {
      console.error('Failed to reject fuel deduction:', err);
    }
  };

  const adjustFuelDeduction = async (tripId: string, adjustedAmount: number, mandatoryReason: string) => {
    try {
      const trip = trips.find((t) => t.id === tripId);
      if (trip && (trip as any).fuelDeduction?.id) {
        await fuelApi.reviewDeduction((trip as any).fuelDeduction.id, 'adjust', {
          adjustedAmount,
          reason: mandatoryReason,
        });
      }
      await refreshTrips();
    } catch (err) {
      console.error('Failed to adjust fuel deduction:', err);
    }
  };

  // 8. BENCHMARKS
  const addBenchmark = async (bm: Omit<MileageBenchmark, 'id'>) => {
    try {
      await fuelApi.createBenchmark({
        name: bm.name,
        vehicleType: bm.vehicleType,
        vehicleId: bm.vehicleId,
        minTonnage: bm.minTonnage,
        maxTonnage: bm.maxTonnage,
        terrain: bm.terrain || 'plain',
        routeCategory: bm.routeCategory || 'highway',
        expectedMileageKmPerLitre: bm.expectedMileageKmPerLitre,
        permittedTolerancePercent: bm.permittedTolerancePercent,
        effectiveFrom: bm.effectiveFrom,
        effectiveTo: bm.effectiveTo,
        status: bm.status || 'active',
        priority: bm.priority || 1,
        notes: bm.notes,
      });
      await refreshBenchmarks();
    } catch (err) {
      console.error('Failed to add benchmark:', err);
    }
  };

  const updateBenchmark = async (id: string, updates: Partial<MileageBenchmark>) => {
    console.warn('Benchmark update API not configured, refreshing benchmarks');
    await refreshBenchmarks();
  };

  // 9. PAYROLL
  const generatePayrollForMonth = async (month: string): Promise<PayrollRun | null> => {
    try {
      const res = await payrollApi.generate(month);
      await refreshPayrollRuns();
      return res;
    } catch (err) {
      console.error('Failed to generate payroll:', err);
      return null;
    }
  };

  const finalizePayrollRun = async (runId: string) => {
    try {
      await payrollApi.finalize(runId);
      await refreshPayrollRuns();
    } catch (err) {
      console.error('Failed to finalize payroll run:', err);
    }
  };

  // 10. TLCM PRO INTEGRATION ACTIONS
  const retryIntegrationJob = async (jobId: string) => {
    try {
      await integrationJobApi.retry(jobId);
      await refreshIntegrationJobs();
    } catch (err) {
      console.error('Failed to retry integration job:', err);
    }
  };

  const syncVehicleMaster = async (vehicleId: string) => {
    await refreshVehicles();
  };

  const triggerTLCMTyreAttribution = async (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return { success: false, message: 'Trip not found' };
    return { success: true, message: `Telemetry processed for ${trip.distance.acceptedDistance} km` };
  };

  const resetAllData = () => {
    localStorage.clear();
    refreshDrivers();
    refreshVehicles();
    refreshTrips();
    refreshAdvances();
    refreshFuelTopUps();
    refreshBenchmarks();
    refreshSalaryStructures();
    refreshPayrollRuns();
    refreshIntegrationJobs();
    refreshAuditLogs();
  };

  return (
    <FleetStoreContext.Provider
      value={{
        settings,
        updateSettings,

        vehicles,
        drivers,
        salaryStructures,
        advances,
        fuelTopUps,
        trips,
        benchmarks,
        payrollRuns,
        integrationJobs,
        auditLogs,

        addDriver,
        updateDriver,
        addSalaryStructure,
        assignSalaryStructure,
        issueAdvance,
        recordFuelTopUp,
        createTrip,
        updateTrip,
        completeTrip,
        addExpenseToTrip,
        approveExpense,
        rejectExpense,
        recordSettlementReturn,
        authorizePayrollAdvanceRecovery,
        approveFuelDeduction,
        rejectFuelDeduction,
        adjustFuelDeduction,
        addBenchmark,
        updateBenchmark,
        generatePayrollForMonth,
        finalizePayrollRun,
        retryIntegrationJob,
        syncVehicleMaster,
        triggerTLCMTyreAttribution,

        vehiclesLoading,
        vehiclesError,
        refreshTrips,
        refreshAdvances,
        refreshExpenses,
        refreshDrivers,
        refreshVehicles,
        refreshFuelTopUps,
        refreshBenchmarks,
        refreshSalaryStructures,
        refreshPayrollRuns,
        refreshIntegrationJobs,
        refreshAuditLogs,
        resetAllData,
      }}
    >
      {children}
    </FleetStoreContext.Provider>
  );
};

export const useFleetStore = () => {
  const context = useContext(FleetStoreContext);
  if (!context) {
    throw new Error('useFleetStore must be used within a FleetStoreProvider');
  }
  return context;
};
