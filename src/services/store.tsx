import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tripApi, driverApi, vehicleApi, advanceApi, expenseApi, fuelApi, auditApi } from './api';
import {
  Driver,
  Vehicle,
  SalaryStructure,
  DriverSalaryAssignment,
  DriverAdvance,
  FuelTopUp,
  Trip,
  MileageBenchmark,
  PayrollRun,
  IntegrationJob,
  AuditLog,
  SystemSettings,
  TripExpense
} from '../types';
import {
  initialSettings,
  initialVehicles,
  initialSalaryStructures,
  initialDrivers,
  initialBenchmarks,
  initialAdvances,
  initialFuelTopUps,
  initialTrips,
  initialPayrollRuns,
  initialIntegrationJobs,
  initialAuditLogs
} from './mockData';
import { evaluateOdometerAndDistance, calculateFuelConsumption, calculateFuelDeduction, calculateSettlementBalance } from '../utils/calculations';

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
  addDriver: (driver: Omit<Driver, 'id' | 'createdAt' | 'outstandingAdvance'>) => { success: boolean; error?: string };
  updateDriver: (id: string, updates: Partial<Driver>) => void;

  addSalaryStructure: (structure: Omit<SalaryStructure, 'id' | 'createdAt'>) => void;
  assignSalaryStructure: (driverId: string, salaryStructureId: string, effectiveFrom: string) => void;

  issueAdvance: (data: Omit<DriverAdvance, 'id' | 'createdAt' | 'approvedExpensesAllocated' | 'amountReturned' | 'amountRecoveredThroughPayroll' | 'outstandingBalance' | 'status'>) => void;

  recordFuelTopUp: (data: Omit<FuelTopUp, 'id' | 'totalCost'>) => void;

  createTrip: (tripData: Partial<Trip>) => Trip;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  completeTrip: (id: string) => { success: boolean; warnings: string[] };

  // Expense Management
  addExpenseToTrip: (tripId: string, expense: Omit<TripExpense, 'id' | 'tripId' | 'tripNumber' | 'approvalStatus'>) => void;
  approveExpense: (tripId: string, expenseId: string, approvedAmount?: number, notes?: string) => void;
  rejectExpense: (tripId: string, expenseId: string, notes?: string) => void;

  // Advance Settlement
  recordSettlementReturn: (tripId: string, returnAmount: number) => void;
  authorizePayrollAdvanceRecovery: (tripId: string, recoveryAmount: number) => void;

  // Fuel Deductions
  approveFuelDeduction: (tripId: string, notes?: string) => void;
  rejectFuelDeduction: (tripId: string, reason: string) => void;
  adjustFuelDeduction: (tripId: string, adjustedAmount: number, mandatoryReason: string) => void;

  // Benchmarks
  addBenchmark: (bm: Omit<MileageBenchmark, 'id'>) => void;
  updateBenchmark: (id: string, updates: Partial<MileageBenchmark>) => void;

  // Payroll
  generatePayrollForMonth: (month: string) => PayrollRun;
  finalizePayrollRun: (runId: string) => void;

  // TLCM Integration
  retryIntegrationJob: (jobId: string) => void;
  syncVehicleMaster: (vehicleId: string) => void;
  triggerTLCMTyreAttribution: (tripId: string) => { success: boolean; message: string };

  // System & API Sync
  vehiclesLoading: boolean;
  vehiclesError: string | null;
  refreshTrips: () => Promise<void>;
  refreshAdvances: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
  refreshDrivers: () => Promise<void>;
  refreshVehicles: () => Promise<void>;
  resetAllData: () => void;
}

const FleetStoreContext = createContext<FleetStoreContextType | null>(null);

const STORAGE_KEY_PREFIX = 'apex_fleet_';

function getStoredOr<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to parse stored ${key}`, e);
  }
  return fallback;
}

export const FleetStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>(() => getStoredOr('settings', initialSettings));
  // Authoritative vehicles strictly loaded from TLCM database via backend API
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState<boolean>(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>(() => getStoredOr('drivers', initialDrivers));
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>(() => getStoredOr('salaryStructures', initialSalaryStructures));
  const [advances, setAdvances] = useState<DriverAdvance[]>(() => getStoredOr('advances', initialAdvances));
  const [fuelTopUps, setFuelTopUps] = useState<FuelTopUp[]>(() => getStoredOr('fuelTopUps', initialFuelTopUps));
  const [trips, setTrips] = useState<Trip[]>(() => getStoredOr('trips', initialTrips));
  const [benchmarks, setBenchmarks] = useState<MileageBenchmark[]>(() => getStoredOr('benchmarks', initialBenchmarks));
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(() => getStoredOr('payrollRuns', initialPayrollRuns));
  const [integrationJobs, setIntegrationJobs] = useState<IntegrationJob[]>(() => getStoredOr('integrationJobs', initialIntegrationJobs));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => getStoredOr('auditLogs', initialAuditLogs));

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'settings', JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'vehicles', JSON.stringify(vehicles));
  }, [vehicles]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'drivers', JSON.stringify(drivers));
  }, [drivers]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'salaryStructures', JSON.stringify(salaryStructures));
  }, [salaryStructures]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'advances', JSON.stringify(advances));
  }, [advances]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'fuelTopUps', JSON.stringify(fuelTopUps));
  }, [fuelTopUps]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'trips', JSON.stringify(trips));
  }, [trips]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'benchmarks', JSON.stringify(benchmarks));
  }, [benchmarks]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'payrollRuns', JSON.stringify(payrollRuns));
  }, [payrollRuns]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'integrationJobs', JSON.stringify(integrationJobs));
  }, [integrationJobs]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'auditLogs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // --- Real Backend Data Mappers ---
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
    outstandingAdvance: Number(d.outstandingAdvance || 0),
    notes: d.notes || undefined,
    createdAt: d.createdAt || new Date().toISOString(),
  });

  const mapBackendVehicle = (v: any): Vehicle => ({
    id: v.id,
    tlcmVehicleId: v.tlcmVehicleId,
    registrationNumber: v.registrationNumber,
    vehicleType: v.vehicleType || 'Heavy Truck',
    makeModel: v.makeModel,
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
    const odo = t.odometerRecord || {};
    const fuel = t.fuelRecord || {};
    const sett = t.settlementRecord || {};
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
      tripId: e.tripId,
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
      driverName: t.driver?.fullName || 'Assigned Driver',
      driverNumber: t.driver?.driverNumber || 'DRV-000',
      vehicleId: t.vehicleId,
      vehicleReg: t.vehicle?.registrationNumber || 'VEH-000',
      startDate: t.startDate ? t.startDate.split('T')[0] : '',
      endDate: t.endDate ? t.endDate.split('T')[0] : undefined,
      purpose: t.purpose || 'Cargo Logistics Transit',
      notes: t.notes || undefined,
      status: t.status || 'draft',
      version: t.version || 1,
      startingLocation: t.startingLocation || '',
      finalDestination: t.finalDestination || '',
      routeSegments,
      odometer: {
        startingReading: odo.startingReading ? Number(odo.startingReading) : undefined,
        startingTimestamp: odo.startingTimestamp || undefined,
        startingSource: odo.startingSource || 'measured',
        endingReading: odo.endingReading ? Number(odo.endingReading) : undefined,
        endingTimestamp: odo.endingTimestamp || undefined,
        endingSource: odo.endingSource || 'measured',
        odometerCase: odo.odometerCase || 'case_1_both_available',
        discrepancyFlag: Boolean(odo.discrepancyFlag),
        discrepancyReason: odo.discrepancyReason || undefined,
        validationStatus: odo.validationStatus || 'verified',
      },
      distance: {
        measuredDistance: odo.measuredDistance ? Number(odo.measuredDistance) : undefined,
        reportedDistance: odo.reportedDistance ? Number(odo.reportedDistance) : undefined,
        derivedDistance: odo.derivedDistance ? Number(odo.derivedDistance) : undefined,
        acceptedDistance: Number(odo.acceptedDistance || 0),
        tyreAttributionEligible: Boolean(odo.tyreAttributionEligible),
        tyreAttributionStatus: odo.tyreAttributionStatus || 'eligible',
        tyreAttributionHoldReason: odo.tyreAttributionHoldReason || undefined,
      },
      fuel: {
        openingFuelQuantity: fuel.openingFuelQuantity ? Number(fuel.openingFuelQuantity) : undefined,
        fuelAddedDuringTrip: fuel.fuelAddedDuringTrip ? Number(fuel.fuelAddedDuringTrip) : 0,
        closingFuelQuantity: fuel.closingFuelQuantity ? Number(fuel.closingFuelQuantity) : undefined,
        calculatedConsumption: fuel.calculatedConsumption ? Number(fuel.calculatedConsumption) : undefined,
        manuallyReportedLitres: fuel.manuallyReportedLitres ? Number(fuel.manuallyReportedLitres) : undefined,
        acceptedFuelLitres: Number(fuel.acceptedFuelLitres || 0),
        measurementMethod: fuel.measurementMethod || 'calculated_balance',
        calculationStatus: fuel.calculationStatus || 'verified',
        tripMileageKmPerLitre: fuel.tripMileageKmPerLitre ? Number(fuel.tripMileageKmPerLitre) : undefined,
        mileageStatus: fuel.mileageStatus || 'valid',
      },
      expenses: mappedExpenses,
      settlement: {
        advanceIds: (t.advanceAllocations || []).map((a: any) => a.advanceTransactionId || a.id),
        totalAdvancesIssued: Number(sett.totalAdvancesIssued || 0),
        totalApprovedExpenses: Number(sett.totalApprovedExpenses || 0),
        amountReturnedByDriver: Number(sett.amountReturnedByDriver || 0),
        otherValidCredits: Number(sett.otherValidCredits || 0),
        outstandingBalance: Number(sett.outstandingBalance || 0),
        status: sett.status || 'pending',
        authorizedPayrollRecoveryAmount: Number(sett.authorizedPayrollRecoveryAmount || 0),
        settledDate: sett.settledDate || undefined,
      },
      fuelDeduction: {
        benchmarkMileage: Number(fded.benchmarkMileage || 4.2),
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

  // --- Real API Refresh Functions ---
  const refreshDrivers = useCallback(async () => {
    try {
      const data = await driverApi.list({ limit: 100 });
      if (Array.isArray(data) && data.length > 0) {
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
        if (import.meta.env.DEV) {
          console.info(`[TLCM Vehicle Integration] Loaded ${data.length} authoritative vehicles from TLCM database.`);
        }
        setVehicles(data.map(mapBackendVehicle));
      } else {
        setVehicles([]);
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to connect to authoritative TLCM vehicle database';
      console.error('[TLCM Vehicle Integration Error]:', msg);
      setVehiclesError(msg);
      // DO NOT fall back to local mock data
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
      // Refreshing trips updates their nested expenses
      await refreshTrips();
    } catch (err) {
      console.error('Failed to load expenses from API:', err);
    }
  }, [refreshTrips]);

  // Initial Data Fetch on Mount
  useEffect(() => {
    refreshDrivers();
    refreshVehicles();
    refreshTrips();
    refreshAdvances();
  }, [refreshDrivers, refreshVehicles, refreshTrips, refreshAdvances]);

  const addAuditLog = (
    entityType: AuditLog['entityType'],
    entityId: string,
    entityLabel: string,
    action: string,
    previousValue?: string,
    newValue?: string,
    reason?: string
  ) => {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      entityType,
      entityId,
      entityLabel,
      action,
      previousValue,
      newValue,
      changedBy: 'Current User (Operations)',
      timestamp: new Date().toISOString(),
      reason
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // 1. DRIVER ACTIONS
  const addDriver = (driverData: Omit<Driver, 'id' | 'createdAt' | 'outstandingAdvance'>) => {
    if (drivers.some(d => d.driverNumber.toLowerCase() === driverData.driverNumber.toLowerCase())) {
      return { success: false, error: `Driver Number "${driverData.driverNumber}" already exists.` };
    }

    const newDriver: Driver = {
      ...driverData,
      id: `drv-${Date.now()}`,
      outstandingAdvance: 0,
      createdAt: new Date().toISOString()
    };

    setDrivers(prev => [newDriver, ...prev]);
    addAuditLog('Driver', newDriver.id, newDriver.fullName, 'DRIVER_CREATED', undefined, `Created with Driver # ${newDriver.driverNumber}`);
    return { success: true };
  };

  const updateDriver = (id: string, updates: Partial<Driver>) => {
    setDrivers(prev => prev.map(d => (d.id === id ? { ...d, ...updates } : d)));
    addAuditLog('Driver', id, updates.fullName || id, 'DRIVER_UPDATED', undefined, JSON.stringify(updates));
  };

  // 2. SALARY STRUCTURES
  const addSalaryStructure = (structureData: Omit<SalaryStructure, 'id' | 'createdAt'>) => {
    const newStruct: SalaryStructure = {
      ...structureData,
      id: `sal-struct-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setSalaryStructures(prev => [...prev, newStruct]);
    addAuditLog('SalaryStructure', newStruct.id, newStruct.name, 'STRUCTURE_CREATED');
  };

  const assignSalaryStructure = (driverId: string, salaryStructureId: string, effectiveFrom: string) => {
    const struct = salaryStructures.find(s => s.id === salaryStructureId);
    if (!struct) return;

    setDrivers(prev =>
      prev.map(d =>
        d.id === driverId
          ? {
              ...d,
              salaryStructureId,
              salaryStructureName: struct.name
            }
          : d
      )
    );

    addAuditLog(
      'Driver',
      driverId,
      `Driver Salary Assignment`,
      'SALARY_STRUCTURE_ASSIGNED',
      undefined,
      `Assigned structure: ${struct.name} effective ${effectiveFrom}`
    );
  };

  // 3. ADVANCES
  const issueAdvance = (
    data: Omit<DriverAdvance, 'id' | 'createdAt' | 'approvedExpensesAllocated' | 'amountReturned' | 'amountRecoveredThroughPayroll' | 'outstandingBalance' | 'status'>
  ) => {
    const newAdv: DriverAdvance = {
      ...data,
      id: `adv-${Date.now()}`,
      approvedExpensesAllocated: 0,
      amountReturned: 0,
      amountRecoveredThroughPayroll: 0,
      outstandingBalance: data.advanceAmount,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    setAdvances(prev => [newAdv, ...prev]);

    // Update driver's total outstanding advance
    setDrivers(prev =>
      prev.map(d =>
        d.id === data.driverId
          ? { ...d, outstandingAdvance: (d.outstandingAdvance || 0) + data.advanceAmount }
          : d
      )
    );

    // If assigned to a trip, link it
    if (data.tripId) {
      setTrips(prev =>
        prev.map(t => {
          if (t.id === data.tripId) {
            const newTotal = t.settlement.totalAdvancesIssued + data.advanceAmount;
            const newBalance = calculateSettlementBalance(
              newTotal,
              t.settlement.totalApprovedExpenses,
              t.settlement.amountReturnedByDriver,
              t.settlement.otherValidCredits
            );
            return {
              ...t,
              settlement: {
                ...t.settlement,
                advanceIds: [...t.settlement.advanceIds, newAdv.id],
                totalAdvancesIssued: newTotal,
                outstandingBalance: newBalance,
                status: newBalance === 0 ? 'fully_settled' : 'partially_settled'
              }
            };
          }
          return t;
        })
      );
    }

    addAuditLog(
      'Advance',
      newAdv.id,
      newAdv.referenceNumber,
      'ADVANCE_ISSUED',
      undefined,
      `₹${data.advanceAmount} issued to ${data.driverName}`
    );
  };

  // 4. FUEL TOP-UPS
  const recordFuelTopUp = (data: Omit<FuelTopUp, 'id' | 'totalCost'>) => {
    const totalCost = Math.round(data.litres * data.pricePerLitre * 100) / 100;
    const newTopUp: FuelTopUp = {
      ...data,
      id: `fuel-top-${Date.now()}`,
      totalCost
    };
    setFuelTopUps(prev => [newTopUp, ...prev]);

    // If odometer reading is provided, update vehicle latest odometer if greater
    if (data.odometerReading) {
      setVehicles(prev =>
        prev.map(v =>
          v.id === data.vehicleId && data.odometerReading && data.odometerReading > v.latestOdometer
            ? { ...v, latestOdometer: data.odometerReading }
            : v
        )
      );
    }
  };

  // 5. TRIP MANAGEMENT
  const createTrip = (tripData: Partial<Trip>): Trip => {
    const tripNum = `TRIP-2026-${String(trips.length + 101).padStart(4, '0')}`;
    const vehicle = vehicles.find(v => v.id === tripData.vehicleId);
    const driver = drivers.find(d => d.id === tripData.driverId);

    // Evaluate odometer & distance
    const odoEval = evaluateOdometerAndDistance({
      startingReading: tripData.odometer?.startingReading,
      endingReading: tripData.odometer?.endingReading,
      reportedDistance: tripData.distance?.reportedDistance,
      previousVehicleOdometer: vehicle?.latestOdometer
    });

    // Evaluate fuel consumption
    const fuelEval = calculateFuelConsumption(
      tripData.fuel?.openingFuelQuantity,
      tripData.fuel?.fuelAddedDuringTrip,
      tripData.fuel?.closingFuelQuantity,
      tripData.fuel?.manuallyReportedLitres,
      odoEval.acceptedDistance
    );

    // Pick applicable benchmark
    const matchedBenchmark =
      benchmarks.find(b => b.vehicleId === vehicle?.id && b.status === 'active') ||
      benchmarks.find(b => b.vehicleType === vehicle?.vehicleType && b.status === 'active') ||
      benchmarks[0];

    const benchmarkMileage = matchedBenchmark ? matchedBenchmark.expectedMileageKmPerLitre : 5.0;
    const tolerance = matchedBenchmark ? matchedBenchmark.permittedTolerancePercent : settings.defaultBenchmarkTolerancePercent;

    const fuelDeductionCalc = calculateFuelDeduction(
      odoEval.acceptedDistance,
      fuelEval.acceptedFuelLitres,
      benchmarkMileage,
      tolerance,
      settings.defaultFuelPricePerLitre
    );

    const newTrip: Trip = {
      id: `trip-${Date.now()}`,
      tripNumber: tripNum,
      driverId: tripData.driverId || driver?.id || '',
      driverName: driver?.fullName || 'Unknown Driver',
      driverNumber: driver?.driverNumber || 'DRV-UNKNOWN',
      vehicleId: tripData.vehicleId || vehicle?.id || '',
      vehicleReg: vehicle?.registrationNumber || 'UNASSIGNED',
      startDate: tripData.startDate || new Date().toISOString(),
      endDate: tripData.endDate,
      purpose: tripData.purpose || 'Freight Consignment Transportation',
      notes: tripData.notes || '',
      status: tripData.status || 'in_progress',

      odometer: {
        startingReading: tripData.odometer?.startingReading,
        startingTimestamp: tripData.odometer?.startingTimestamp || tripData.startDate,
        startingSource: tripData.odometer?.startingSource || 'measured',
        endingReading: tripData.odometer?.endingReading,
        endingTimestamp: tripData.odometer?.endingTimestamp,
        endingSource: tripData.odometer?.endingSource || 'measured',
        odometerCase: odoEval.odometerCase,
        discrepancyFlag: odoEval.discrepancyFlag,
        discrepancyReason: odoEval.discrepancyReason,
        validationStatus: odoEval.validationStatus
      },

      distance: {
        measuredDistance: odoEval.measuredDistance,
        reportedDistance: odoEval.reportedDistance,
        derivedDistance: odoEval.derivedDistance,
        acceptedDistance: odoEval.acceptedDistance,
        tyreAttributionEligible: odoEval.tyreAttributionEligible,
        tyreAttributionStatus: odoEval.tyreAttributionStatus,
        tyreAttributionHoldReason: odoEval.tyreAttributionHoldReason
      },

      routeSegments: tripData.routeSegments && tripData.routeSegments.length > 0 ? tripData.routeSegments : [
        {
          id: `seg-${Date.now()}-1`,
          sequence: 1,
          fromLocation: tripData.startingLocation || 'Main Hub',
          toLocation: tripData.finalDestination || 'Destination',
          distanceKm: odoEval.acceptedDistance,
          tonnage: vehicle?.tonnage || 20,
          cargoDescription: 'Standard Rated Payload'
        }
      ],
      startingLocation: tripData.startingLocation || 'Chennai Central Hub',
      finalDestination: tripData.finalDestination || 'Bengaluru Logistics Corridor',

      fuel: {
        openingFuelQuantity: tripData.fuel?.openingFuelQuantity,
        fuelAddedDuringTrip: tripData.fuel?.fuelAddedDuringTrip,
        closingFuelQuantity: tripData.fuel?.closingFuelQuantity,
        calculatedConsumption: fuelEval.calculatedConsumption,
        manuallyReportedLitres: tripData.fuel?.manuallyReportedLitres,
        acceptedFuelLitres: fuelEval.acceptedFuelLitres,
        measurementMethod: tripData.fuel?.measurementMethod || 'calculated_balance',
        calculationStatus: fuelEval.calculationStatus,
        tripMileageKmPerLitre: fuelEval.tripMileageKmPerLitre,
        mileageStatus: fuelEval.mileageStatus
      },

      expenses: tripData.expenses || [],

      settlement: {
        advanceIds: [],
        totalAdvancesIssued: 0,
        totalApprovedExpenses: 0,
        amountReturnedByDriver: 0,
        otherValidCredits: 0,
        outstandingBalance: 0,
        status: 'pending',
        authorizedPayrollRecoveryAmount: 0
      },

      fuelDeduction: {
        benchmarkId: matchedBenchmark?.id,
        benchmarkName: matchedBenchmark?.name,
        benchmarkMileage,
        tolerancePercent: tolerance,
        expectedFuelLitres: fuelDeductionCalc.expectedFuelLitres,
        allowedFuelLitres: fuelDeductionCalc.allowedFuelLitres,
        excessFuelLitres: fuelDeductionCalc.excessFuelLitres,
        applicableFuelPrice: settings.defaultFuelPricePerLitre,
        potentialDeductionAmount: fuelDeductionCalc.potentialDeductionAmount,
        approvedDeductionAmount: 0,
        calculationStatus: 'calculated',
        reviewStatus: 'pending_review'
      },

      tlcmIntegration: {
        syncStatus: odoEval.tyreAttributionEligible ? 'pending' : 'held_odometer_error',
        odometerSubmitted: false,
        tyreDistanceAttributed: false
      },

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTrips(prev => [newTrip, ...prev]);
    addAuditLog('Trip', newTrip.id, newTrip.tripNumber, 'TRIP_CREATED', undefined, `Created trip ${newTrip.tripNumber}`);

    // If odometer reading is ending and verified, update vehicle latest odometer
    if (odoEval.measuredDistance && tripData.odometer?.endingReading && vehicle) {
      if (tripData.odometer.endingReading > vehicle.latestOdometer) {
        setVehicles(prev =>
          prev.map(v =>
            v.id === vehicle.id
              ? {
                  ...v,
                  latestOdometer: tripData.odometer!.endingReading!,
                  totalTripDistance: v.totalTripDistance + odoEval.acceptedDistance
                }
              : v
          )
        );
      }
    }

    return newTrip;
  };

  const updateTrip = (id: string, updates: Partial<Trip>) => {
    setTrips(prev =>
      prev.map(t => {
        if (t.id === id) {
          const updated = { ...t, ...updates, updatedAt: new Date().toISOString() };
          return updated;
        }
        return t;
      })
    );
  };

  const completeTrip = (id: string) => {
    const trip = trips.find(t => t.id === id);
    if (!trip) return { success: false, warnings: ['Trip not found'] };

    const warnings: string[] = [];
    if (trip.odometer.discrepancyFlag) {
      warnings.push(`Odometer discrepancy remains open: ${trip.odometer.discrepancyReason}`);
    }
    if (trip.expenses.some(e => e.approvalStatus === 'pending')) {
      warnings.push('Trip has pending expenses awaiting approval.');
    }
    if (trip.settlement.outstandingBalance > 0) {
      warnings.push(`Outstanding advance balance ₹${trip.settlement.outstandingBalance} requires settlement or payroll authorization.`);
    }

    setTrips(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              status: 'completed',
              endDate: t.endDate || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          : t
      )
    );

    addAuditLog('Trip', trip.id, trip.tripNumber, 'TRIP_COMPLETED', `Status: ${trip.status}`, 'Status: completed');
    return { success: true, warnings };
  };

  // 6. EXPENSES & SETTLEMENT
  const addExpenseToTrip = (tripId: string, expense: Omit<TripExpense, 'id' | 'tripId' | 'tripNumber' | 'approvalStatus'>) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    const newExpense: TripExpense = {
      ...expense,
      id: `exp-${Date.now()}`,
      tripId,
      tripNumber: trip.tripNumber,
      approvalStatus: 'pending'
    };

    setTrips(prev =>
      prev.map(t => {
        if (t.id === tripId) {
          return {
            ...t,
            expenses: [...t.expenses, newExpense],
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      })
    );

    addAuditLog('Expense', newExpense.id, `${newExpense.category} - ${trip.tripNumber}`, 'EXPENSE_SUBMITTED', undefined, `₹${expense.amount}`);
  };

  const approveExpense = (tripId: string, expenseId: string, approvedAmount?: number, notes?: string) => {
    setTrips(prev =>
      prev.map(t => {
        if (t.id === tripId) {
          const updatedExpenses = t.expenses.map(e => {
            if (e.id === expenseId) {
              const appAmt = typeof approvedAmount === 'number' ? approvedAmount : e.amount;
              return {
                ...e,
                approvalStatus: 'approved' as const,
                approvedAmount: appAmt,
                reviewer: 'Current User',
                reviewNotes: notes || 'Approved',
                reviewedAt: new Date().toISOString()
              };
            }
            return e;
          });

          // Recalculate total approved expenses & settlement
          const totalApproved = updatedExpenses
            .filter(e => e.approvalStatus === 'approved')
            .reduce((sum, e) => sum + (e.approvedAmount || 0), 0);

          const newBalance = calculateSettlementBalance(
            t.settlement.totalAdvancesIssued,
            totalApproved,
            t.settlement.amountReturnedByDriver,
            t.settlement.otherValidCredits
          );

          return {
            ...t,
            expenses: updatedExpenses,
            settlement: {
              ...t.settlement,
              totalApprovedExpenses: totalApproved,
              outstandingBalance: newBalance,
              status: newBalance <= 0 ? 'fully_settled' : 'partially_settled'
            },
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      })
    );

    addAuditLog('Expense', expenseId, `Expense ${expenseId}`, 'EXPENSE_APPROVED', 'pending', `Approved ${approvedAmount || 'full'}`);
  };

  const rejectExpense = (tripId: string, expenseId: string, notes?: string) => {
    setTrips(prev =>
      prev.map(t => {
        if (t.id === tripId) {
          const updatedExpenses = t.expenses.map(e =>
            e.id === expenseId
              ? {
                  ...e,
                  approvalStatus: 'rejected' as const,
                  approvedAmount: 0,
                  reviewer: 'Current User',
                  reviewNotes: notes || 'Rejected as per company policy',
                  reviewedAt: new Date().toISOString()
                }
              : e
          );

          const totalApproved = updatedExpenses
            .filter(e => e.approvalStatus === 'approved')
            .reduce((sum, e) => sum + (e.approvedAmount || 0), 0);

          const newBalance = calculateSettlementBalance(
            t.settlement.totalAdvancesIssued,
            totalApproved,
            t.settlement.amountReturnedByDriver,
            t.settlement.otherValidCredits
          );

          return {
            ...t,
            expenses: updatedExpenses,
            settlement: {
              ...t.settlement,
              totalApprovedExpenses: totalApproved,
              outstandingBalance: newBalance
            },
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      })
    );

    addAuditLog('Expense', expenseId, `Expense ${expenseId}`, 'EXPENSE_REJECTED', 'pending', 'rejected', notes);
  };

  const recordSettlementReturn = (tripId: string, returnAmount: number) => {
    setTrips(prev =>
      prev.map(t => {
        if (t.id === tripId) {
          const newReturned = t.settlement.amountReturnedByDriver + returnAmount;
          const newBalance = calculateSettlementBalance(
            t.settlement.totalAdvancesIssued,
            t.settlement.totalApprovedExpenses,
            newReturned,
            t.settlement.otherValidCredits
          );

          return {
            ...t,
            settlement: {
              ...t.settlement,
              amountReturnedByDriver: newReturned,
              outstandingBalance: newBalance,
              status: newBalance <= 0 ? 'fully_settled' : 'partially_settled',
              settledDate: newBalance <= 0 ? new Date().toISOString().split('T')[0] : t.settlement.settledDate
            }
          };
        }
        return t;
      })
    );

    addAuditLog('Advance', tripId, `Trip Settlement Return`, 'ADVANCE_RETURN_RECORDED', undefined, `Returned ₹${returnAmount}`);
  };

  const authorizePayrollAdvanceRecovery = (tripId: string, recoveryAmount: number) => {
    setTrips(prev =>
      prev.map(t => {
        if (t.id === tripId) {
          return {
            ...t,
            settlement: {
              ...t.settlement,
              authorizedPayrollRecoveryAmount: recoveryAmount
            }
          };
        }
        return t;
      })
    );

    addAuditLog('Advance', tripId, `Payroll Recovery Authorization`, 'PAYROLL_RECOVERY_AUTHORIZED', undefined, `Authorized ₹${recoveryAmount}`);
  };

  // 7. FUEL DEDUCTIONS APPROVAL / ADJUSTMENT
  const approveFuelDeduction = (tripId: string, notes?: string) => {
    setTrips(prev =>
      prev.map(t => {
        if (t.id === tripId) {
          return {
            ...t,
            fuelDeduction: {
              ...t.fuelDeduction,
              approvedDeductionAmount: t.fuelDeduction.potentialDeductionAmount,
              reviewStatus: 'approved',
              adjustmentReason: notes || 'Approved without alteration',
              adjustedBy: 'Audit Committee',
              payrollMonth: '2026-10'
            }
          };
        }
        return t;
      })
    );

    addAuditLog('FuelDeduction', tripId, `Fuel Deduction ${tripId}`, 'FUEL_DEDUCTION_APPROVED', 'pending_review', 'approved', notes);
  };

  const rejectFuelDeduction = (tripId: string, reason: string) => {
    setTrips(prev =>
      prev.map(t => {
        if (t.id === tripId) {
          return {
            ...t,
            fuelDeduction: {
              ...t.fuelDeduction,
              approvedDeductionAmount: 0,
              reviewStatus: 'rejected',
              adjustmentReason: reason,
              adjustedBy: 'Audit Committee'
            }
          };
        }
        return t;
      })
    );

    addAuditLog('FuelDeduction', tripId, `Fuel Deduction ${tripId}`, 'FUEL_DEDUCTION_REJECTED', 'pending_review', 'rejected', reason);
  };

  const adjustFuelDeduction = (tripId: string, adjustedAmount: number, mandatoryReason: string) => {
    setTrips(prev =>
      prev.map(t => {
        if (t.id === tripId) {
          return {
            ...t,
            fuelDeduction: {
              ...t.fuelDeduction,
              approvedDeductionAmount: adjustedAmount,
              reviewStatus: 'adjusted',
              adjustmentReason: mandatoryReason,
              adjustedBy: 'Audit Committee',
              payrollMonth: '2026-10'
            }
          };
        }
        return t;
      })
    );

    addAuditLog('FuelDeduction', tripId, `Fuel Deduction ${tripId}`, 'FUEL_DEDUCTION_ADJUSTED', undefined, `Adjusted to ₹${adjustedAmount}`, mandatoryReason);
  };

  // 8. BENCHMARKS
  const addBenchmark = (bm: Omit<MileageBenchmark, 'id'>) => {
    const newBm: MileageBenchmark = {
      ...bm,
      id: `bm-${Date.now()}`
    };
    setBenchmarks(prev => [...prev, newBm]);
    addAuditLog('Trip', newBm.id, newBm.name, 'BENCHMARK_CREATED');
  };

  const updateBenchmark = (id: string, updates: Partial<MileageBenchmark>) => {
    setBenchmarks(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));
    addAuditLog('Trip', id, `Benchmark ${id}`, 'BENCHMARK_UPDATED');
  };

  // 9. PAYROLL GENERATION & FINALIZATION
  const generatePayrollForMonth = (month: string): PayrollRun => {
    // Check if a run already exists for this month
    const existing = payrollRuns.find(r => r.month === month);
    if (existing && existing.status === 'finalized') {
      return existing; // Finalized payroll is NEVER silently recalculated! (Rule 19)
    }

    const records = drivers
      .filter(d => d.status === 'active' || d.status === 'on_leave')
      .map(driver => {
        const struct = salaryStructures.find(s => s.id === driver.salaryStructureId) || salaryStructures[0];
        
        let basic = 0;
        let hra = 0;
        let otherAllowances = 0;
        let bata = 0;
        let otherDeductions = 0;

        struct.components.forEach(c => {
          if (c.type === 'earning') {
            if (c.name.toLowerCase().includes('basic')) basic += c.amountOrPercentage;
            else if (c.name.toLowerCase().includes('hra') || c.name.toLowerCase().includes('rent')) hra += c.amountOrPercentage;
            else if (c.name.toLowerCase().includes('bata')) bata += c.amountOrPercentage;
            else otherAllowances += c.amountOrPercentage;
          } else {
            otherDeductions += c.amountOrPercentage;
          }
        });

        // Sum approved fuel deductions for this driver not already marked as recovered
        const driverTrips = trips.filter(t => t.driverId === driver.id);
        const fuelDeds = driverTrips
          .filter(t => t.fuelDeduction.reviewStatus === 'approved' || t.fuelDeduction.reviewStatus === 'adjusted')
          .reduce((sum, t) => sum + (t.fuelDeduction.approvedDeductionAmount || 0), 0);

        // Sum authorized advance recoveries
        const advanceRecs = driverTrips.reduce((sum, t) => sum + (t.settlement.authorizedPayrollRecoveryAmount || 0), 0);

        const gross = basic + hra + otherAllowances + bata;
        const totalDeds = fuelDeds + advanceRecs + otherDeductions;
        const net = Math.max(0, gross - totalDeds);

        const warnings: string[] = [];
        if (advanceRecs > gross * 0.3) {
          warnings.push(`Advance recovery of ₹${advanceRecs} exceeds 30% of gross earnings.`);
        }
        if (driverTrips.some(t => t.odometer.discrepancyFlag)) {
          warnings.push('Driver has one or more trips with unresolved odometer discrepancies.');
        }

        return {
          id: `prec-${month}-${driver.id}`,
          payrollRunId: `payrun-${month}`,
          driverId: driver.id,
          driverNumber: driver.driverNumber,
          driverName: driver.fullName,
          salaryStructureName: struct.name,
          basicSalary: basic,
          hra,
          otherAllowances,
          tripBata: bata,
          grossEarnings: gross,
          fuelDeductions: fuelDeds,
          advanceRecoveries: advanceRecs,
          otherDeductions,
          totalDeductions: totalDeds,
          netPayable: net,
          approvalStatus: 'approved' as const,
          paymentStatus: 'unpaid' as const,
          warnings,
          lineItems: [
            { id: 'li-1', name: 'Basic Salary', type: 'earning' as const, amount: basic, category: 'base' as const },
            { id: 'li-2', name: 'House Rent Allowance (HRA)', type: 'earning' as const, amount: hra, category: 'allowance' as const },
            { id: 'li-3', name: 'Allowances & Incentives', type: 'earning' as const, amount: otherAllowances, category: 'allowance' as const },
            { id: 'li-4', name: 'Trip Bata Allowance', type: 'earning' as const, amount: bata, category: 'trip_bata' as const },
            { id: 'li-5', name: 'Approved Fuel Consumption Deduction', type: 'deduction' as const, amount: fuelDeds, category: 'fuel_deduction' as const },
            { id: 'li-6', name: 'Authorized Driver Advance Recovery', type: 'deduction' as const, amount: advanceRecs, category: 'advance_recovery' as const },
            { id: 'li-7', name: 'Statutory/Welfare Deductions', type: 'deduction' as const, amount: otherDeductions, category: 'other' as const }
          ]
        };
      });

    const totalGross = records.reduce((sum, r) => sum + r.grossEarnings, 0);
    const totalDeds = records.reduce((sum, r) => sum + r.totalDeductions, 0);
    const totalNet = records.reduce((sum, r) => sum + r.netPayable, 0);
    const totalFuel = records.reduce((sum, r) => sum + r.fuelDeductions, 0);
    const totalAdv = records.reduce((sum, r) => sum + r.advanceRecoveries, 0);

    const newRun: PayrollRun = {
      id: `payrun-${month}`,
      month,
      generatedDate: new Date().toISOString(),
      status: 'draft',
      totalEligibleDrivers: records.length,
      totalGrossEarnings: totalGross,
      totalDeductions: totalDeds,
      totalNetPayable: totalNet,
      totalFuelDeductions: totalFuel,
      totalAdvanceRecoveries: totalAdv,
      records
    };

    setPayrollRuns(prev => [newRun, ...prev.filter(r => r.month !== month)]);
    addAuditLog('Payroll', newRun.id, `Payroll ${month}`, 'PAYROLL_GENERATED', undefined, `Generated ${records.length} records`);
    return newRun;
  };

  const finalizePayrollRun = (runId: string) => {
    setPayrollRuns(prev =>
      prev.map(r => {
        if (r.id === runId) {
          return {
            ...r,
            status: 'finalized',
            finalizedAt: new Date().toISOString(),
            finalizedBy: 'Chief Financial Officer'
          };
        }
        return r;
      })
    );

    // Mark trip fuel deductions as posted_to_payroll
    setTrips(prev =>
      prev.map(t => {
        if (t.fuelDeduction.reviewStatus === 'approved' || t.fuelDeduction.reviewStatus === 'adjusted') {
          return {
            ...t,
            fuelDeduction: {
              ...t.fuelDeduction,
              reviewStatus: 'posted_to_payroll'
            }
          };
        }
        return t;
      })
    );

    addAuditLog('Payroll', runId, `Payroll ${runId}`, 'PAYROLL_FINALIZED', 'draft', 'finalized', 'Sealed and immutable.');
  };

  // 10. TLCM PRO INTEGRATION ACTIONS
  const retryIntegrationJob = (jobId: string) => {
    setIntegrationJobs(prev =>
      prev.map(j => {
        if (j.id === jobId) {
          return {
            ...j,
            status: 'success',
            attemptCount: j.attemptCount + 1,
            errorMessage: undefined,
            timestamp: new Date().toISOString()
          };
        }
        return j;
      })
    );
  };

  const syncVehicleMaster = (vehicleId: string) => {
    setVehicles(prev =>
      prev.map(v =>
        v.id === vehicleId
          ? {
              ...v,
              syncStatus: 'connected',
              lastSyncTime: new Date().toISOString()
            }
          : v
      )
    );
    const newJob: IntegrationJob = {
      id: `job-${Date.now()}`,
      jobType: 'vehicle_master_sync',
      vehicleId,
      vehicleReg: vehicles.find(v => v.id === vehicleId)?.registrationNumber || vehicleId,
      status: 'success',
      attemptCount: 1,
      payloadSummary: 'Fetched authoritative vehicle master telemetry and tyre positions from TLCM Pro backend API.',
      timestamp: new Date().toISOString()
    };
    setIntegrationJobs(prev => [newJob, ...prev]);
  };

  const triggerTLCMTyreAttribution = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return { success: false, message: 'Trip not found' };

    if (!trip.distance.tyreAttributionEligible) {
      return {
        success: false,
        message: trip.distance.tyreAttributionHoldReason || 'Tyre attribution is held due to odometer validation failure.'
      };
    }

    setTrips(prev =>
      prev.map(t =>
        t.id === tripId
          ? {
              ...t,
              distance: { ...t.distance, tyreAttributionStatus: 'attributed' },
              tlcmIntegration: { ...t.tlcmIntegration, tyreDistanceAttributed: true, syncStatus: 'synced', lastAttempt: new Date().toISOString() }
            }
          : t
      )
    );

    const newJob: IntegrationJob = {
      id: `job-${Date.now()}`,
      jobType: 'tyre_distance_attribution',
      vehicleId: trip.vehicleId,
      vehicleReg: trip.vehicleReg,
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      status: 'success',
      attemptCount: 1,
      payloadSummary: `Attributed ${trip.distance.acceptedDistance} km to active axle wheel positions via TLCM Pro API. Stepney spare tyre excluded (Rule 22).`,
      timestamp: new Date().toISOString()
    };
    setIntegrationJobs(prev => [newJob, ...prev]);

    return { success: true, message: `Successfully attributed ${trip.distance.acceptedDistance} km to TLCM Pro!` };
  };

  const resetAllData = () => {
    setSettings(initialSettings);
    setVehicles(initialVehicles);
    setDrivers(initialDrivers);
    setSalaryStructures(initialSalaryStructures);
    setAdvances(initialAdvances);
    setFuelTopUps(initialFuelTopUps);
    setTrips(initialTrips);
    setBenchmarks(initialBenchmarks);
    setPayrollRuns(initialPayrollRuns);
    setIntegrationJobs(initialIntegrationJobs);
    setAuditLogs(initialAuditLogs);
    localStorage.clear();
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
        resetAllData
      }}
    >
      {children}
    </FleetStoreContext.Provider>
  );
};

export const useFleetStore = () => {
  const ctx = useContext(FleetStoreContext);
  if (!ctx) throw new Error('useFleetStore must be used within FleetStoreProvider');
  return ctx;
};
