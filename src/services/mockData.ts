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
  SystemSettings
} from '../types';

export const initialSettings: SystemSettings = {
  companyName: 'Apex Translogistics Fleet & Supply Chain Ltd.',
  companyAddress: 'Plot 42, Logistics Gateway Corridor, Madhavaram, Chennai - 600060',
  companyPhone: '+91 (044) 4899-2300',
  currencySymbol: '₹',
  defaultFuelPricePerLitre: 95.50,
  odometerSequenceStrictness: 'flag_discrepancy_allow_trip',
  defaultBenchmarkTolerancePercent: 5.0,
  tlcmApiEndpoint: 'https://api.tlcmpro-enterprise.internal/v2',
  tlcmApiKeyConfigured: true,
  autoHoldTyreAttributionOnDiscrepancy: true
};

export const initialVehicles: Vehicle[] = [
  {
    id: 'veh-001',
    tlcmVehicleId: 'TLCM-V-9011',
    registrationNumber: 'TN-04-AX-8912',
    vehicleType: 'Heavy Truck',
    makeModel: 'BharatBenz 2823C (6x4)',
    tonnage: 28,
    status: 'Active',
    currentDriverId: 'drv-101',
    currentDriverName: 'Ramesh Kumar',
    latestOdometer: 125450,
    totalTripDistance: 48920,
    syncStatus: 'connected',
    lastSyncTime: '2026-10-20T03:15:00Z',
    assignedTyresCount: 10,
    hasStepneyFitted: true
  },
  {
    id: 'veh-002',
    tlcmVehicleId: 'TLCM-V-9012',
    registrationNumber: 'TN-09-CB-4410',
    vehicleType: 'Multi-Axle Trailer',
    makeModel: 'Tata Signa 4825.TK (10x2)',
    tonnage: 48,
    status: 'Active',
    currentDriverId: 'drv-102',
    currentDriverName: 'Murugan S.',
    latestOdometer: 218900,
    totalTripDistance: 92340,
    syncStatus: 'connected',
    lastSyncTime: '2026-10-20T02:40:00Z',
    assignedTyresCount: 16,
    hasStepneyFitted: true
  },
  {
    id: 'veh-003',
    tlcmVehicleId: 'TLCM-V-9013',
    registrationNumber: 'KA-01-MJ-9921',
    vehicleType: 'Medium Hauler',
    makeModel: 'Ashok Leyland Ecomet 1615 HE',
    tonnage: 16,
    status: 'Active',
    currentDriverId: 'drv-103',
    currentDriverName: 'Rajesh Patil',
    latestOdometer: 84320,
    totalTripDistance: 31200,
    syncStatus: 'connected',
    lastSyncTime: '2026-10-20T03:00:00Z',
    assignedTyresCount: 6,
    hasStepneyFitted: true
  },
  {
    id: 'veh-004',
    tlcmVehicleId: 'TLCM-V-9014',
    registrationNumber: 'MH-12-PQ-3388',
    vehicleType: 'Container',
    makeModel: 'Volvo FM 420 4x2 Tractor',
    tonnage: 40,
    status: 'In Maintenance',
    currentDriverId: 'drv-104',
    currentDriverName: 'Suresh Naidu',
    latestOdometer: 312400,
    totalTripDistance: 114500,
    syncStatus: 'last_sync',
    lastSyncTime: '2026-10-18T18:20:00Z',
    assignedTyresCount: 12,
    hasStepneyFitted: true
  },
  {
    id: 'veh-005',
    tlcmVehicleId: 'TLCM-V-9015',
    registrationNumber: 'KA-51-EF-1123',
    vehicleType: 'Tipper',
    makeModel: 'Eicher Pro 6028T',
    tonnage: 28,
    status: 'Active',
    currentDriverId: 'drv-105',
    currentDriverName: 'Vikram Singh',
    latestOdometer: 67800,
    totalTripDistance: 18400,
    syncStatus: 'sync_pending',
    lastSyncTime: '2026-10-19T21:10:00Z',
    assignedTyresCount: 10,
    hasStepneyFitted: true
  }
];

export const initialSalaryStructures: SalaryStructure[] = [
  {
    id: 'sal-struct-01',
    name: 'Long-Haul Multi-Axle Standard',
    code: 'SS-LH-MAXLE',
    description: 'Applicable to multi-axle trailer and 40T+ container fleet drivers with interstate routes.',
    effectiveDate: '2026-01-01',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    components: [
      {
        id: 'comp-101',
        name: 'Basic Salary',
        type: 'earning',
        calculationType: 'fixed',
        amountOrPercentage: 22000,
        applicabilityRules: 'Monthly baseline guaranteed compensation',
        isActive: true
      },
      {
        id: 'comp-102',
        name: 'House Rent Allowance (HRA)',
        type: 'earning',
        calculationType: 'fixed',
        amountOrPercentage: 4500,
        applicabilityRules: 'Taxable residential support allowance',
        isActive: true
      },
      {
        id: 'comp-103',
        name: 'Interstate Long-Haul Allowance',
        type: 'earning',
        calculationType: 'fixed',
        amountOrPercentage: 3500,
        applicabilityRules: 'Operational compensation for outstation trips > 500km',
        isActive: true
      },
      {
        id: 'comp-104',
        name: 'Trip Bata (Average Monthly Estimate)',
        type: 'earning',
        calculationType: 'fixed',
        amountOrPercentage: 4000,
        applicabilityRules: 'Daily per-diem and night halt incentive',
        isActive: true
      },
      {
        id: 'comp-105',
        name: 'Safety & Welfare Fund',
        type: 'deduction',
        calculationType: 'fixed',
        amountOrPercentage: 500,
        applicabilityRules: 'Driver health and emergency benefit fund contribution',
        isActive: true
      }
    ]
  },
  {
    id: 'sal-struct-02',
    name: 'Regional Heavy Rigid Freight',
    code: 'SS-REG-RIGID',
    description: 'Applicable to 16T to 28T rigid body trucks operating intra-state and neighbouring zones.',
    effectiveDate: '2026-01-01',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    components: [
      {
        id: 'comp-201',
        name: 'Basic Salary',
        type: 'earning',
        calculationType: 'fixed',
        amountOrPercentage: 18500,
        applicabilityRules: 'Monthly base pay',
        isActive: true
      },
      {
        id: 'comp-202',
        name: 'House Rent Allowance (HRA)',
        type: 'earning',
        calculationType: 'fixed',
        amountOrPercentage: 3500,
        applicabilityRules: 'Housing allowance',
        isActive: true
      },
      {
        id: 'comp-203',
        name: 'Regional Transport Allowance',
        type: 'earning',
        calculationType: 'fixed',
        amountOrPercentage: 2500,
        applicabilityRules: 'Short-haul routing compensation',
        isActive: true
      },
      {
        id: 'comp-204',
        name: 'Trip Bata',
        type: 'earning',
        calculationType: 'fixed',
        amountOrPercentage: 3000,
        applicabilityRules: 'Variable trip day allowance',
        isActive: true
      },
      {
        id: 'comp-205',
        name: 'Staff Benevolent Deduction',
        type: 'deduction',
        calculationType: 'fixed',
        amountOrPercentage: 350,
        applicabilityRules: 'Voluntary company association fee',
        isActive: true
      }
    ]
  },
  {
    id: 'sal-struct-03',
    name: 'Tipper & Mining Haulage Tier-1',
    code: 'SS-TIPPER-T1',
    description: 'Specialized structure for heavy tipper quarry and infrastructure project routes.',
    effectiveDate: '2026-03-01',
    isActive: true,
    createdAt: '2026-03-01T00:00:00Z',
    components: [
      {
        id: 'comp-301',
        name: 'Basic Salary',
        type: 'earning',
        calculationType: 'fixed',
        amountOrPercentage: 20000,
        applicabilityRules: 'Base salary',
        isActive: true
      },
      {
        id: 'comp-302',
        name: 'Site Hazard & Heavy Operations Allowance',
        type: 'earning',
        calculationType: 'fixed',
        amountOrPercentage: 5000,
        applicabilityRules: 'Site condition premium',
        isActive: true
      },
      {
        id: 'comp-303',
        name: 'Safety & Welfare Fund',
        type: 'deduction',
        calculationType: 'fixed',
        amountOrPercentage: 500,
        applicabilityRules: 'Standard driver deduction',
        isActive: true
      }
    ]
  }
];

export const initialDrivers: Driver[] = [
  {
    id: 'drv-101',
    driverNumber: 'DRV-2024-001',
    fullName: 'Ramesh Kumar',
    phone: '+91 98401 23456',
    email: 'ramesh.k@apexhaul.com',
    address: 'No. 14, Gandhi Street, Ambattur, Chennai, TN',
    joiningDate: '2024-03-15',
    licenseNumber: 'TN-02-2015-0048291',
    licenseExpiry: '2028-11-20',
    status: 'active',
    currentVehicleId: 'veh-001',
    assignedVehicleReg: 'TN-04-AX-8912',
    salaryStructureId: 'sal-struct-02',
    salaryStructureName: 'Regional Heavy Rigid Freight',
    outstandingAdvance: 8400,
    notes: 'Senior heavy vehicle pilot with zero accident record.',
    createdAt: '2024-03-15T09:00:00Z'
  },
  {
    id: 'drv-102',
    driverNumber: 'DRV-2024-002',
    fullName: 'Murugan S.',
    phone: '+91 94432 87654',
    email: 'murugan.s@apexhaul.com',
    address: 'Plot 8B, Periyar Nagar, Madurai, TN',
    joiningDate: '2023-08-10',
    licenseNumber: 'TN-58-2012-0091823',
    licenseExpiry: '2027-05-14',
    status: 'active',
    currentVehicleId: 'veh-002',
    assignedVehicleReg: 'TN-09-CB-4410',
    salaryStructureId: 'sal-struct-01',
    salaryStructureName: 'Long-Haul Multi-Axle Standard',
    outstandingAdvance: 0,
    notes: 'Handles high-capacity multi-axle trailers on Golden Quadrilateral.',
    createdAt: '2023-08-10T10:00:00Z'
  },
  {
    id: 'drv-103',
    driverNumber: 'DRV-2024-003',
    fullName: 'Rajesh Patil',
    phone: '+91 98220 54321',
    email: 'rajesh.patil@apexhaul.com',
    address: '112/4 Anand Nagar, Belagavi, KA',
    joiningDate: '2024-01-20',
    licenseNumber: 'KA-22-2016-0031920',
    licenseExpiry: '2029-02-18',
    status: 'active',
    currentVehicleId: 'veh-003',
    assignedVehicleReg: 'KA-01-MJ-9921',
    salaryStructureId: 'sal-struct-02',
    salaryStructureName: 'Regional Heavy Rigid Freight',
    outstandingAdvance: 2500,
    notes: 'Primary driver for South Zone FMCG distribution.',
    createdAt: '2024-01-20T09:30:00Z'
  },
  {
    id: 'drv-104',
    driverNumber: 'DRV-2024-004',
    fullName: 'Suresh Naidu',
    phone: '+91 97033 11223',
    address: '22 Railway Colony, Vijayawada, AP',
    joiningDate: '2022-11-05',
    licenseNumber: 'AP-16-2010-0081729',
    licenseExpiry: '2026-12-30',
    status: 'on_leave',
    currentVehicleId: 'veh-004',
    assignedVehicleReg: 'MH-12-PQ-3388',
    salaryStructureId: 'sal-struct-01',
    salaryStructureName: 'Long-Haul Multi-Axle Standard',
    outstandingAdvance: 5000,
    notes: 'On medical leave till month end. Assigned to Volvo Container unit.',
    createdAt: '2022-11-05T11:00:00Z'
  },
  {
    id: 'drv-105',
    driverNumber: 'DRV-2024-005',
    fullName: 'Vikram Singh',
    phone: '+91 98110 99887',
    address: 'Sector 14, Transport Nagar, Jaipur, RJ',
    joiningDate: '2025-02-01',
    licenseNumber: 'RJ-14-2018-0055112',
    licenseExpiry: '2030-08-15',
    status: 'active',
    currentVehicleId: 'veh-005',
    assignedVehicleReg: 'KA-51-EF-1123',
    salaryStructureId: 'sal-struct-03',
    salaryStructureName: 'Tipper & Mining Haulage Tier-1',
    outstandingAdvance: 0,
    notes: 'Handles infrastructure raw materials logistics.',
    createdAt: '2025-02-01T08:30:00Z'
  }
];

export const initialBenchmarks: MileageBenchmark[] = [
  {
    id: 'bm-001',
    name: 'Medium Hauler 16T Standard Route',
    vehicleType: 'Medium Hauler',
    minTonnage: 12,
    maxTonnage: 18,
    expectedMileageKmPerLitre: 6.0,
    permittedTolerancePercent: 5.0,
    effectiveFrom: '2026-01-01',
    status: 'active',
    priority: 10,
    notes: 'Calibrated on inter-city express corridors.'
  },
  {
    id: 'bm-002',
    name: 'Heavy Truck 28T Standard Rigid',
    vehicleType: 'Heavy Truck',
    minTonnage: 20,
    maxTonnage: 30,
    expectedMileageKmPerLitre: 4.5,
    permittedTolerancePercent: 5.0,
    effectiveFrom: '2026-01-01',
    status: 'active',
    priority: 10,
    notes: 'Applicable to 28-tonne 6x4 trucks with full rated payload.'
  },
  {
    id: 'bm-003',
    name: 'Multi-Axle Trailer 48T Long Haul',
    vehicleType: 'Multi-Axle Trailer',
    minTonnage: 40,
    maxTonnage: 55,
    expectedMileageKmPerLitre: 3.2,
    permittedTolerancePercent: 6.0,
    effectiveFrom: '2026-01-01',
    status: 'active',
    priority: 10,
    notes: 'High-gross vehicle weight benchmark.'
  },
  {
    id: 'bm-004',
    name: 'Container 40T Inter-State',
    vehicleType: 'Container',
    minTonnage: 30,
    maxTonnage: 45,
    expectedMileageKmPerLitre: 3.8,
    permittedTolerancePercent: 5.0,
    effectiveFrom: '2026-01-01',
    status: 'active',
    priority: 10,
    notes: 'Port container transit routes.'
  },
  {
    id: 'bm-005',
    name: 'Specific Vehicle Override: TN-04-AX-8912',
    vehicleId: 'veh-001',
    vehicleReg: 'TN-04-AX-8912',
    expectedMileageKmPerLitre: 5.0,
    permittedTolerancePercent: 5.0,
    effectiveFrom: '2026-02-01',
    status: 'active',
    priority: 50, // Specific vehicle has higher priority over type
    notes: 'Engine tuned with higher efficiency; vehicle-specific benchmark.'
  }
];

export const initialAdvances: DriverAdvance[] = [
  {
    id: 'adv-001',
    driverId: 'drv-101',
    driverName: 'Ramesh Kumar',
    driverNumber: 'DRV-2024-001',
    vehicleId: 'veh-001',
    vehicleReg: 'TN-04-AX-8912',
    tripId: 'trip-2026-101',
    tripNumber: 'TRIP-2026-0101',
    advanceDate: '2026-10-14',
    advanceAmount: 10000,
    advanceType: 'trip_advance',
    paymentMethod: 'Cash',
    referenceNumber: 'ADV-VCH-8921',
    notes: 'Issued prior to Chennai-Bengaluru dispatch for tolls and loading.',
    approvedExpensesAllocated: 1600,
    amountReturned: 0,
    amountRecoveredThroughPayroll: 0,
    outstandingBalance: 8400,
    status: 'partially_settled',
    createdAt: '2026-10-14T08:00:00Z'
  },
  {
    id: 'adv-002',
    driverId: 'drv-103',
    driverName: 'Rajesh Patil',
    driverNumber: 'DRV-2024-003',
    vehicleId: 'veh-003',
    vehicleReg: 'KA-01-MJ-9921',
    tripId: 'trip-2026-103',
    tripNumber: 'TRIP-2026-0103',
    advanceDate: '2026-10-15',
    advanceAmount: 6000,
    advanceType: 'trip_advance',
    paymentMethod: 'Bank Transfer',
    referenceNumber: 'NEFT-5591028',
    notes: 'Fuel top-up and octroi allowance.',
    approvedExpensesAllocated: 3500,
    amountReturned: 0,
    amountRecoveredThroughPayroll: 0,
    outstandingBalance: 2500,
    status: 'partially_settled',
    createdAt: '2026-10-15T09:15:00Z'
  },
  {
    id: 'adv-003',
    driverId: 'drv-104',
    driverName: 'Suresh Naidu',
    driverNumber: 'DRV-2024-004',
    advanceDate: '2026-10-02',
    advanceAmount: 5000,
    advanceType: 'operational_advance',
    paymentMethod: 'Cash',
    referenceNumber: 'OP-ADV-3310',
    notes: 'Emergency medical assistance advance - approved for phased recovery.',
    approvedExpensesAllocated: 0,
    amountReturned: 0,
    amountRecoveredThroughPayroll: 0,
    outstandingBalance: 5000,
    status: 'active',
    createdAt: '2026-10-02T14:30:00Z'
  },
  {
    id: 'adv-004',
    driverId: 'drv-102',
    driverName: 'Murugan S.',
    driverNumber: 'DRV-2024-002',
    vehicleId: 'veh-002',
    vehicleReg: 'TN-09-CB-4410',
    tripId: 'trip-2026-102',
    tripNumber: 'TRIP-2026-0102',
    advanceDate: '2026-10-08',
    advanceAmount: 12000,
    advanceType: 'trip_advance',
    paymentMethod: 'Bank Transfer',
    referenceNumber: 'IMPS-9901844',
    notes: 'Madurai to Hyderabad long haul advance.',
    approvedExpensesAllocated: 7800,
    amountReturned: 4200,
    amountRecoveredThroughPayroll: 0,
    outstandingBalance: 0,
    status: 'settled',
    createdAt: '2026-10-08T07:30:00Z'
  }
];

export const initialFuelTopUps: FuelTopUp[] = [
  {
    id: 'fuel-top-01',
    vehicleId: 'veh-001',
    vehicleReg: 'TN-04-AX-8912',
    dateTime: '2026-10-14T07:45:00Z',
    litres: 100,
    pricePerLitre: 95.00,
    totalCost: 9500,
    fuelStation: 'IndianOil Nelamangala Hub, NH-48',
    odometerReading: 125000,
    paymentMethod: 'Company Fleet Card',
    receiptReference: 'IOCL-INV-992182',
    recordedBy: 'Terminal Manager - Nelamangala',
    notes: 'Pre-departure full tank top-up before Trip TRIP-2026-0101.'
  },
  {
    id: 'fuel-top-02',
    vehicleId: 'veh-002',
    vehicleReg: 'TN-09-CB-4410',
    dateTime: '2026-10-15T11:20:00Z',
    litres: 240,
    pricePerLitre: 95.50,
    totalCost: 22920,
    fuelStation: 'BPCL COCO Outpost, Hosur Bypass',
    odometerReading: 218550,
    paymentMethod: 'Corporate Account',
    receiptReference: 'BPCL-REC-48192',
    recordedBy: 'Logistics Supervisor',
    notes: 'En route multi-axle bunkering.'
  },
  {
    id: 'fuel-top-03',
    vehicleId: 'veh-003',
    vehicleReg: 'KA-01-MJ-9921',
    dateTime: '2026-10-16T14:10:00Z',
    litres: 75,
    pricePerLitre: 96.00,
    totalCost: 7200,
    fuelStation: 'HPCL AutoCare, Electronic City Bengaluru',
    odometerReading: 84100,
    paymentMethod: 'Driver Advance',
    receiptReference: 'HP-BLR-11029',
    recordedBy: 'Fleet Accountant',
    notes: 'Reimbursed through trip advance.'
  },
  {
    id: 'fuel-top-04',
    vehicleId: 'veh-005',
    vehicleReg: 'KA-51-EF-1123',
    dateTime: '2026-10-17T09:00:00Z',
    litres: 120,
    pricePerLitre: 95.20,
    totalCost: 11424,
    fuelStation: 'Shell Logistics Corridor, Peenya',
    odometerReading: 67650,
    paymentMethod: 'Company Fleet Card',
    receiptReference: 'SHELL-B2B-0918',
    recordedBy: 'Depot Yard In-Charge',
    notes: 'Scheduled fleet fueling.'
  }
];

export const initialTrips: Trip[] = [
  // CASE 1: Both readings available (Chennai - Vellore - Bengaluru - Hosur - Chennai)
  // Distance: 450 km, Benchmark: 6 km/L, Tolerance: 5%, Fuel: 90L, Price: 95.
  // Expected: 75L, Allowed: 78.75L, Excess: 11.25L, Potential deduction: ₹1,068.75
  {
    id: 'trip-2026-101',
    tripNumber: 'TRIP-2026-0101',
    driverId: 'drv-101',
    driverName: 'Ramesh Kumar',
    driverNumber: 'DRV-2024-001',
    vehicleId: 'veh-001',
    vehicleReg: 'TN-04-AX-8912',
    startDate: '2026-10-14T08:00:00Z',
    endDate: '2026-10-15T18:30:00Z',
    purpose: 'Automotive Components Consignment Dispatch to OEM Assembly Hub',
    notes: 'Full loop delivery completed on schedule. Driver reported headwind and hill grade.',
    status: 'completed',

    odometer: {
      startingReading: 125000,
      startingTimestamp: '2026-10-14T08:00:00Z',
      startingSource: 'measured',
      endingReading: 125450,
      endingTimestamp: '2026-10-15T18:30:00Z',
      endingSource: 'measured',
      odometerCase: 'case_1_both_available',
      discrepancyFlag: false,
      validationStatus: 'verified'
    },

    distance: {
      measuredDistance: 450,
      acceptedDistance: 450,
      tyreAttributionEligible: true,
      tyreAttributionStatus: 'eligible'
    },

    startingLocation: 'Chennai Logistics Park, Madhavaram',
    finalDestination: 'Chennai Logistics Park, Madhavaram',

    routeSegments: [
      {
        id: 'seg-101-1',
        sequence: 1,
        fromLocation: 'Chennai',
        toLocation: 'Vellore',
        departureTime: '2026-10-14 08:30',
        arrivalTime: '2026-10-14 11:45',
        distanceKm: 135,
        tonnage: 28,
        cargoDescription: 'OEM Auto Parts (Full Load)',
        notes: 'NH48 smooth transit'
      },
      {
        id: 'seg-101-2',
        sequence: 2,
        fromLocation: 'Vellore',
        toLocation: 'Bengaluru',
        departureTime: '2026-10-14 12:30',
        arrivalTime: '2026-10-14 16:30',
        distanceKm: 215,
        tonnage: 28,
        cargoDescription: 'OEM Auto Parts (Unloading)',
        notes: 'Unloading at Bommasandra Industrial Area'
      },
      {
        id: 'seg-101-3',
        sequence: 3,
        fromLocation: 'Bengaluru',
        toLocation: 'Hosur',
        departureTime: '2026-10-15 08:00',
        arrivalTime: '2026-10-15 09:30',
        distanceKm: 40,
        tonnage: 0,
        cargoDescription: 'Empty Repositioning',
        notes: 'Return consignment loading'
      },
      {
        id: 'seg-101-4',
        sequence: 4,
        fromLocation: 'Hosur',
        toLocation: 'Chennai',
        departureTime: '2026-10-15 10:15',
        arrivalTime: '2026-10-15 18:30',
        distanceKm: 60,
        tonnage: 18,
        cargoDescription: 'Return Spares Backhaul',
        notes: 'Final leg to Madhavaram yard'
      }
    ],

    fuel: {
      openingFuelQuantity: 120,
      fuelAddedDuringTrip: 100,
      closingFuelQuantity: 130,
      calculatedConsumption: 90,
      manuallyReportedLitres: 90,
      acceptedFuelLitres: 90,
      measurementMethod: 'calculated_balance',
      calculationStatus: 'verified',
      tripMileageKmPerLitre: 5.0, // 450 / 90 = 5.0 km/L (benchmark is 6 km/L)
      mileageStatus: 'valid'
    },

    expenses: [
      {
        id: 'exp-101-1',
        tripId: 'trip-2026-101',
        tripNumber: 'TRIP-2026-0101',
        category: 'Tolls',
        description: 'FASTag toll collection NH-48 Sriperumbudur & Chennasamudram',
        amount: 850,
        expenseDate: '2026-10-14',
        paymentMethod: 'FASTag Wallet',
        receiptReference: 'NHAI-FASTAG-98210',
        submittedBy: 'Ramesh Kumar',
        approvalStatus: 'approved',
        approvedAmount: 850,
        reviewer: 'Fleet Auditor (Accounts)',
        reviewNotes: 'Verified against NHAI electronic portal toll records.',
        reviewedAt: '2026-10-16T10:00:00Z'
      },
      {
        id: 'exp-101-2',
        tripId: 'trip-2026-101',
        tripNumber: 'TRIP-2026-0101',
        category: 'Loading & Unloading',
        description: 'Unloading hamali charges at Bommasandra OEM dock',
        amount: 500,
        expenseDate: '2026-10-14',
        paymentMethod: 'Cash',
        receiptReference: 'VCH-UNLOAD-112',
        submittedBy: 'Ramesh Kumar',
        approvalStatus: 'approved',
        approvedAmount: 500,
        reviewer: 'Operations Manager',
        reviewNotes: 'Standard warehouse union unloading voucher verified.',
        reviewedAt: '2026-10-16T10:15:00Z'
      },
      {
        id: 'exp-101-3',
        tripId: 'trip-2026-101',
        tripNumber: 'TRIP-2026-0101',
        category: 'Parking',
        description: 'Secure overnight parking at Electronic City logistics yard',
        amount: 250,
        expenseDate: '2026-10-14',
        paymentMethod: 'Cash',
        receiptReference: 'PRK-EC-991',
        submittedBy: 'Ramesh Kumar',
        approvalStatus: 'approved',
        approvedAmount: 250,
        reviewer: 'Operations Manager',
        reviewNotes: 'Authorized overnight halt.',
        reviewedAt: '2026-10-16T10:20:00Z'
      }
    ],

    settlement: {
      advanceIds: ['adv-001'],
      totalAdvancesIssued: 10000,
      totalApprovedExpenses: 1600, // 850 + 500 + 250
      amountReturnedByDriver: 0,
      otherValidCredits: 0,
      outstandingBalance: 8400, // 10000 - 1600 = 8400
      status: 'partially_settled',
      authorizedPayrollRecoveryAmount: 8400
    },

    fuelDeduction: {
      benchmarkId: 'bm-001',
      benchmarkName: 'Medium Hauler 16T Standard Route',
      benchmarkMileage: 6.0,
      tolerancePercent: 5.0,
      expectedFuelLitres: 75.0, // 450 / 6 = 75
      allowedFuelLitres: 78.75, // 75 * 1.05 = 78.75
      excessFuelLitres: 11.25, // 90 - 78.75 = 11.25
      applicableFuelPrice: 95.0,
      potentialDeductionAmount: 1068.75, // 11.25 * 95 = 1068.75
      approvedDeductionAmount: 1068.75,
      calculationStatus: 'calculated',
      reviewStatus: 'approved',
      adjustmentReason: 'Verified excess consumption against terrain telemetry; approved for monthly payroll deduction.',
      adjustedBy: 'Audit Committee Supervisor',
      payrollMonth: '2026-10'
    },

    tlcmIntegration: {
      syncStatus: 'synced',
      odometerSubmitted: true,
      tyreDistanceAttributed: true,
      lastAttempt: '2026-10-16T11:00:00Z'
    },

    createdAt: '2026-10-14T07:30:00Z',
    updatedAt: '2026-10-16T11:00:00Z'
  },

  // CASE 2: Starting reading available, ending reading unavailable (provisional derived ending reading)
  {
    id: 'trip-2026-102',
    tripNumber: 'TRIP-2026-0102',
    driverId: 'drv-102',
    driverName: 'Murugan S.',
    driverNumber: 'DRV-2024-002',
    vehicleId: 'veh-002',
    vehicleReg: 'TN-09-CB-4410',
    startDate: '2026-10-16T06:00:00Z',
    endDate: '2026-10-18T14:00:00Z',
    purpose: 'Multi-Axle Steel Coils Express Dispatch',
    notes: 'Ending odometer instrument cluster display faulted; driver documented verified trip distance via GPS log slip.',
    status: 'completed',

    odometer: {
      startingReading: 218550,
      startingTimestamp: '2026-10-16T06:00:00Z',
      startingSource: 'measured',
      endingReading: undefined,
      odometerCase: 'case_2_derived_ending',
      discrepancyFlag: false,
      discrepancyReason: 'Ending odometer derived (218550 + 640 = 219190 km) from driver GPS waybill. Marked derived, not measured.',
      validationStatus: 'provisional'
    },

    distance: {
      reportedDistance: 640,
      derivedDistance: 640,
      acceptedDistance: 640,
      tyreAttributionEligible: true,
      tyreAttributionStatus: 'eligible'
    },

    startingLocation: 'Madurai Industrial Zone',
    finalDestination: 'Hyderabad Sanathnagar Yard',

    routeSegments: [
      {
        id: 'seg-102-1',
        sequence: 1,
        fromLocation: 'Madurai',
        toLocation: 'Salem',
        departureTime: '2026-10-16 06:30',
        arrivalTime: '2026-10-16 11:30',
        distanceKm: 235,
        tonnage: 48,
        cargoDescription: 'Cold-Rolled Steel Coils (Full 48T Load)'
      },
      {
        id: 'seg-102-2',
        sequence: 2,
        fromLocation: 'Salem',
        toLocation: 'Hyderabad',
        departureTime: '2026-10-16 13:00',
        arrivalTime: '2026-10-18 13:30',
        distanceKm: 405,
        tonnage: 48,
        cargoDescription: 'Cold-Rolled Steel Coils'
      }
    ],

    fuel: {
      openingFuelQuantity: 300,
      fuelAddedDuringTrip: 100,
      closingFuelQuantity: 210,
      calculatedConsumption: 190,
      manuallyReportedLitres: 190,
      acceptedFuelLitres: 190,
      measurementMethod: 'calculated_balance',
      calculationStatus: 'verified',
      tripMileageKmPerLitre: 3.37, // 640 / 190 = 3.37 km/L (benchmark is 3.2 km/L -> superior performance!)
      mileageStatus: 'valid'
    },

    expenses: [
      {
        id: 'exp-102-1',
        tripId: 'trip-2026-102',
        tripNumber: 'TRIP-2026-0102',
        category: 'Tolls',
        description: 'NH-44 Hyderabad corridor multi-axle tolls',
        amount: 2450,
        expenseDate: '2026-10-17',
        paymentMethod: 'Corporate Card',
        submittedBy: 'Murugan S.',
        approvalStatus: 'approved',
        approvedAmount: 2450,
        reviewer: 'Fleet Auditor (Accounts)',
        reviewedAt: '2026-10-19T09:00:00Z'
      }
    ],

    settlement: {
      advanceIds: ['adv-004'],
      totalAdvancesIssued: 12000,
      totalApprovedExpenses: 7800,
      amountReturnedByDriver: 4200,
      otherValidCredits: 0,
      outstandingBalance: 0,
      status: 'fully_settled',
      authorizedPayrollRecoveryAmount: 0,
      settledDate: '2026-10-19'
    },

    fuelDeduction: {
      benchmarkId: 'bm-003',
      benchmarkName: 'Multi-Axle Trailer 48T Long Haul',
      benchmarkMileage: 3.2,
      tolerancePercent: 6.0,
      expectedFuelLitres: 200.0,
      allowedFuelLitres: 212.0,
      excessFuelLitres: 0, // 190L used < 212L allowed -> No deduction
      applicableFuelPrice: 95.50,
      potentialDeductionAmount: 0,
      approvedDeductionAmount: 0,
      calculationStatus: 'calculated',
      reviewStatus: 'approved',
      adjustmentReason: 'Excellent driver fuel efficiency. Zero deduction applicable.',
      adjustedBy: 'Audit Committee Supervisor',
      payrollMonth: '2026-10'
    },

    tlcmIntegration: {
      syncStatus: 'synced',
      odometerSubmitted: true,
      tyreDistanceAttributed: true,
      lastAttempt: '2026-10-19T10:00:00Z'
    },

    createdAt: '2026-10-16T05:30:00Z',
    updatedAt: '2026-10-19T10:00:00Z'
  },

  // CASE 3: Odometer readings unavailable (Reported distance used for operational analytics, tyre attribution ON HOLD)
  {
    id: 'trip-2026-103',
    tripNumber: 'TRIP-2026-0103',
    driverId: 'drv-103',
    driverName: 'Rajesh Patil',
    driverNumber: 'DRV-2024-003',
    vehicleId: 'veh-003',
    vehicleReg: 'KA-01-MJ-9921',
    startDate: '2026-10-17T09:00:00Z',
    endDate: '2026-10-18T17:00:00Z',
    purpose: 'FMCG Retail Supermarket Replenishment',
    notes: 'Mechanical cable failure on instrument cluster. Manual trip log sheet submitted with verified retail gate receipts.',
    status: 'completed',

    odometer: {
      odometerCase: 'case_3_unreported_odometer',
      discrepancyFlag: false,
      discrepancyReason: 'Both odometer readings unavailable. Valid for operational trip analytics; absolute odometer readings cannot be fabricated.',
      validationStatus: 'unverified'
    },

    distance: {
      reportedDistance: 380,
      acceptedDistance: 380,
      tyreAttributionEligible: false,
      tyreAttributionStatus: 'on_hold',
      tyreAttributionHoldReason: 'Tyre attribution suspended: TLCM Pro requires measured odometer telemetry for tyre lifecycle accumulation.'
    },

    startingLocation: 'Bengaluru Nelamangala Depot',
    finalDestination: 'Mysuru Kadakola Warehouse',

    routeSegments: [
      {
        id: 'seg-103-1',
        sequence: 1,
        fromLocation: 'Nelamangala Depot',
        toLocation: 'Mandya Hub',
        distanceKm: 180,
        tonnage: 16,
        cargoDescription: 'FMCG Pallet Cargo'
      },
      {
        id: 'seg-103-2',
        sequence: 2,
        fromLocation: 'Mandya Hub',
        toLocation: 'Kadakola Mysuru',
        distanceKm: 200,
        tonnage: 10,
        cargoDescription: 'Retail Distribution Replenishment'
      }
    ],

    fuel: {
      manuallyReportedLitres: 68,
      acceptedFuelLitres: 68,
      measurementMethod: 'manual_slip',
      calculationStatus: 'provisional',
      tripMileageKmPerLitre: 5.59, // 380 / 68 = 5.59 km/L
      mileageStatus: 'valid'
    },

    expenses: [
      {
        id: 'exp-103-1',
        tripId: 'trip-2026-103',
        tripNumber: 'TRIP-2026-0103',
        category: 'Refreshments',
        description: 'Night shift driver meals & tea',
        amount: 350,
        expenseDate: '2026-10-17',
        paymentMethod: 'Cash',
        submittedBy: 'Rajesh Patil',
        approvalStatus: 'approved',
        approvedAmount: 350,
        reviewer: 'Fleet Auditor (Accounts)'
      },
      {
        id: 'exp-103-2',
        tripId: 'trip-2026-103',
        tripNumber: 'TRIP-2026-0103',
        category: 'Tolls',
        description: 'Bengaluru-Mysuru Access-Controlled Expressway',
        amount: 320,
        expenseDate: '2026-10-17',
        paymentMethod: 'FASTag',
        submittedBy: 'Rajesh Patil',
        approvalStatus: 'pending'
      }
    ],

    settlement: {
      advanceIds: ['adv-002'],
      totalAdvancesIssued: 6000,
      totalApprovedExpenses: 350,
      amountReturnedByDriver: 0,
      otherValidCredits: 0,
      outstandingBalance: 5650,
      status: 'pending',
      authorizedPayrollRecoveryAmount: 0
    },

    fuelDeduction: {
      benchmarkId: 'bm-001',
      benchmarkName: 'Medium Hauler 16T Standard Route',
      benchmarkMileage: 6.0,
      tolerancePercent: 5.0,
      expectedFuelLitres: 63.33,
      allowedFuelLitres: 66.5,
      excessFuelLitres: 1.5,
      applicableFuelPrice: 96.0,
      potentialDeductionAmount: 144.0,
      approvedDeductionAmount: 0,
      calculationStatus: 'calculated',
      reviewStatus: 'pending_review',
      payrollMonth: '2026-10'
    },

    tlcmIntegration: {
      syncStatus: 'held_odometer_error',
      odometerSubmitted: false,
      tyreDistanceAttributed: false,
      lastAttempt: '2026-10-19T14:00:00Z',
      errorDetails: 'Odometer readings absent. Tyre distance attribution held until certified odometer inspection log is submitted.'
    },

    createdAt: '2026-10-17T08:30:00Z',
    updatedAt: '2026-10-19T14:00:00Z'
  },

  // CASE 4: Inconsistent sequence flagged (Ending < Starting error, require manual review)
  {
    id: 'trip-2026-104',
    tripNumber: 'TRIP-2026-0104',
    driverId: 'drv-105',
    driverName: 'Vikram Singh',
    driverNumber: 'DRV-2024-005',
    vehicleId: 'veh-005',
    vehicleReg: 'KA-51-EF-1123',
    startDate: '2026-10-18T10:00:00Z',
    purpose: 'Crushed Granite Aggregate Transport to Metro Construction Pier 19',
    notes: 'Driver typed 67200 instead of 67800 at departure. Flagged by system.',
    status: 'in_progress',

    odometer: {
      startingReading: 67900,
      startingTimestamp: '2026-10-18T10:00:00Z',
      startingSource: 'manual',
      endingReading: 67800, // Inconsistent sequence! Less than starting!
      odometerCase: 'case_4_inconsistent_sequence',
      discrepancyFlag: true,
      discrepancyReason: 'Ending odometer (67,800 km) is less than starting odometer (67,900 km). Backward sequence detected.',
      validationStatus: 'discrepancy_held'
    },

    distance: {
      reportedDistance: 120,
      acceptedDistance: 120,
      tyreAttributionEligible: false,
      tyreAttributionStatus: 'on_hold',
      tyreAttributionHoldReason: 'Negative odometer delta requires supervisor audit before tyre attribution can be processed.'
    },

    startingLocation: 'Peenya Quarry Site',
    finalDestination: 'Metro Rail Casting Yard',

    routeSegments: [
      {
        id: 'seg-104-1',
        sequence: 1,
        fromLocation: 'Peenya Quarry',
        toLocation: 'Casting Yard',
        distanceKm: 60,
        tonnage: 28,
        cargoDescription: 'Crushed Granite Aggregate'
      },
      {
        id: 'seg-104-2',
        sequence: 2,
        fromLocation: 'Casting Yard',
        toLocation: 'Peenya Quarry',
        distanceKm: 60,
        tonnage: 0,
        cargoDescription: 'Unladen Return to Quarry'
      }
    ],

    fuel: {
      openingFuelQuantity: 140,
      fuelAddedDuringTrip: 50,
      closingFuelQuantity: 155,
      calculatedConsumption: 35,
      acceptedFuelLitres: 35,
      measurementMethod: 'calculated_balance',
      calculationStatus: 'verified',
      tripMileageKmPerLitre: 3.43,
      mileageStatus: 'valid'
    },

    expenses: [],

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
      benchmarkMileage: 3.8,
      tolerancePercent: 5.0,
      expectedFuelLitres: 31.58,
      allowedFuelLitres: 33.16,
      excessFuelLitres: 1.84,
      applicableFuelPrice: 95.20,
      potentialDeductionAmount: 175.17,
      approvedDeductionAmount: 0,
      calculationStatus: 'calculated',
      reviewStatus: 'pending_review',
      payrollMonth: '2026-10'
    },

    tlcmIntegration: {
      syncStatus: 'held_odometer_error',
      odometerSubmitted: false,
      tyreDistanceAttributed: false,
      lastAttempt: '2026-10-18T16:00:00Z',
      errorDetails: 'Odometer sequence inconsistency. Tyre attribution held on hold.'
    },

    createdAt: '2026-10-18T09:45:00Z',
    updatedAt: '2026-10-18T16:00:00Z'
  }
];

export const initialPayrollRuns: PayrollRun[] = [
  {
    id: 'payrun-2026-09',
    month: '2026-09',
    generatedDate: '2026-10-01T10:00:00Z',
    status: 'finalized',
    finalizedAt: '2026-10-05T15:30:00Z',
    finalizedBy: 'Chief Financial Controller',
    totalEligibleDrivers: 4,
    totalGrossEarnings: 112500,
    totalDeductions: 5850,
    totalNetPayable: 106650,
    totalFuelDeductions: 1250,
    totalAdvanceRecoveries: 3000,
    records: [
      {
        id: 'prec-09-101',
        payrollRunId: 'payrun-2026-09',
        driverId: 'drv-101',
        driverNumber: 'DRV-2024-001',
        driverName: 'Ramesh Kumar',
        salaryStructureName: 'Regional Heavy Rigid Freight',
        basicSalary: 18500,
        hra: 3500,
        otherAllowances: 2500,
        tripBata: 3000,
        grossEarnings: 27500,
        fuelDeductions: 850,
        advanceRecoveries: 1500,
        otherDeductions: 350,
        totalDeductions: 2700,
        netPayable: 24800,
        approvalStatus: 'approved',
        paymentStatus: 'paid',
        paymentReference: 'NEFT-AXIS-9018241',
        lineItems: [
          { id: 'li-1', name: 'Basic Salary', type: 'earning', amount: 18500, category: 'base' },
          { id: 'li-2', name: 'House Rent Allowance (HRA)', type: 'earning', amount: 3500, category: 'allowance' },
          { id: 'li-3', name: 'Regional Transport Allowance', type: 'earning', amount: 2500, category: 'allowance' },
          { id: 'li-4', name: 'Trip Bata Allowance', type: 'earning', amount: 3000, category: 'trip_bata' },
          { id: 'li-5', name: 'Approved Fuel Consumption Deduction', type: 'deduction', amount: 850, category: 'fuel_deduction' },
          { id: 'li-6', name: 'Authorized Advance Recovery', type: 'deduction', amount: 1500, category: 'advance_recovery' },
          { id: 'li-7', name: 'Staff Benevolent Fund', type: 'deduction', amount: 350, category: 'other' }
        ]
      },
      {
        id: 'prec-09-102',
        payrollRunId: 'payrun-2026-09',
        driverId: 'drv-102',
        driverNumber: 'DRV-2024-002',
        driverName: 'Murugan S.',
        salaryStructureName: 'Long-Haul Multi-Axle Standard',
        basicSalary: 22000,
        hra: 4500,
        otherAllowances: 3500,
        tripBata: 4000,
        grossEarnings: 34000,
        fuelDeductions: 0,
        advanceRecoveries: 0,
        otherDeductions: 500,
        totalDeductions: 500,
        netPayable: 33500,
        approvalStatus: 'approved',
        paymentStatus: 'paid',
        paymentReference: 'NEFT-AXIS-9018242',
        lineItems: [
          { id: 'li-8', name: 'Basic Salary', type: 'earning', amount: 22000, category: 'base' },
          { id: 'li-9', name: 'House Rent Allowance (HRA)', type: 'earning', amount: 4500, category: 'allowance' },
          { id: 'li-10', name: 'Interstate Long-Haul Allowance', type: 'earning', amount: 3500, category: 'allowance' },
          { id: 'li-11', name: 'Trip Bata Allowance', type: 'earning', amount: 4000, category: 'trip_bata' },
          { id: 'li-12', name: 'Safety & Welfare Fund', type: 'deduction', amount: 500, category: 'other' }
        ]
      }
    ]
  },
  {
    id: 'payrun-2026-10',
    month: '2026-10',
    generatedDate: '2026-10-20T02:00:00Z',
    status: 'draft',
    totalEligibleDrivers: 5,
    totalGrossEarnings: 139500,
    totalDeductions: 12518.75,
    totalNetPayable: 126981.25,
    totalFuelDeductions: 1068.75,
    totalAdvanceRecoveries: 8400,
    records: [
      {
        id: 'prec-10-101',
        payrollRunId: 'payrun-2026-10',
        driverId: 'drv-101',
        driverNumber: 'DRV-2024-001',
        driverName: 'Ramesh Kumar',
        salaryStructureName: 'Regional Heavy Rigid Freight',
        basicSalary: 18500,
        hra: 3500,
        otherAllowances: 2500,
        tripBata: 3000,
        grossEarnings: 27500,
        fuelDeductions: 1068.75, // From Trip TRIP-2026-0101
        advanceRecoveries: 8400, // Authorized from settlement
        otherDeductions: 350,
        totalDeductions: 9818.75,
        netPayable: 17681.25,
        approvalStatus: 'pending',
        paymentStatus: 'unpaid',
        warnings: [
          'High advance recovery amount (₹8,400) accounts for 30.5% of gross earnings.',
          'Approved fuel deduction (₹1,068.75) included from TRIP-2026-0101.'
        ],
        lineItems: [
          { id: 'li-101', name: 'Basic Salary', type: 'earning', amount: 18500, category: 'base' },
          { id: 'li-102', name: 'House Rent Allowance (HRA)', type: 'earning', amount: 3500, category: 'allowance' },
          { id: 'li-103', name: 'Regional Transport Allowance', type: 'earning', amount: 2500, category: 'allowance' },
          { id: 'li-104', name: 'Trip Bata Allowance', type: 'earning', amount: 3000, category: 'trip_bata' },
          { id: 'li-105', name: 'Approved Fuel Deduction (TRIP-2026-0101)', type: 'deduction', amount: 1068.75, category: 'fuel_deduction' },
          { id: 'li-106', name: 'Authorized Advance Recovery (ADV-001)', type: 'deduction', amount: 8400, category: 'advance_recovery' },
          { id: 'li-107', name: 'Staff Benevolent Deduction', type: 'deduction', amount: 350, category: 'other' }
        ]
      },
      {
        id: 'prec-10-102',
        payrollRunId: 'payrun-2026-10',
        driverId: 'drv-102',
        driverNumber: 'DRV-2024-002',
        driverName: 'Murugan S.',
        salaryStructureName: 'Long-Haul Multi-Axle Standard',
        basicSalary: 22000,
        hra: 4500,
        otherAllowances: 3500,
        tripBata: 4000,
        grossEarnings: 34000,
        fuelDeductions: 0,
        advanceRecoveries: 0,
        otherDeductions: 500,
        totalDeductions: 500,
        netPayable: 33500,
        approvalStatus: 'approved',
        paymentStatus: 'unpaid',
        lineItems: [
          { id: 'li-108', name: 'Basic Salary', type: 'earning', amount: 22000, category: 'base' },
          { id: 'li-109', name: 'House Rent Allowance (HRA)', type: 'earning', amount: 4500, category: 'allowance' },
          { id: 'li-110', name: 'Interstate Long-Haul Allowance', type: 'earning', amount: 3500, category: 'allowance' },
          { id: 'li-111', name: 'Trip Bata Allowance', type: 'earning', amount: 4000, category: 'trip_bata' },
          { id: 'li-112', name: 'Safety & Welfare Fund', type: 'deduction', amount: 500, category: 'other' }
        ]
      },
      {
        id: 'prec-10-103',
        payrollRunId: 'payrun-2026-10',
        driverId: 'drv-103',
        driverNumber: 'DRV-2024-003',
        driverName: 'Rajesh Patil',
        salaryStructureName: 'Regional Heavy Rigid Freight',
        basicSalary: 18500,
        hra: 3500,
        otherAllowances: 2500,
        tripBata: 3000,
        grossEarnings: 27500,
        fuelDeductions: 0,
        advanceRecoveries: 0,
        otherDeductions: 350,
        totalDeductions: 350,
        netPayable: 27150,
        approvalStatus: 'pending',
        paymentStatus: 'unpaid',
        warnings: [
          'TRIP-2026-0103 fuel deduction (₹144) is pending review; not yet posted to this payroll.'
        ],
        lineItems: [
          { id: 'li-113', name: 'Basic Salary', type: 'earning', amount: 18500, category: 'base' },
          { id: 'li-114', name: 'House Rent Allowance (HRA)', type: 'earning', amount: 3500, category: 'allowance' },
          { id: 'li-115', name: 'Regional Transport Allowance', type: 'earning', amount: 2500, category: 'allowance' },
          { id: 'li-116', name: 'Trip Bata Allowance', type: 'earning', amount: 3000, category: 'trip_bata' },
          { id: 'li-117', name: 'Staff Benevolent Deduction', type: 'deduction', amount: 350, category: 'other' }
        ]
      },
      {
        id: 'prec-10-104',
        payrollRunId: 'payrun-2026-10',
        driverId: 'drv-104',
        driverNumber: 'DRV-2024-004',
        driverName: 'Suresh Naidu',
        salaryStructureName: 'Long-Haul Multi-Axle Standard',
        basicSalary: 22000,
        hra: 4500,
        otherAllowances: 0,
        tripBata: 0,
        grossEarnings: 26500,
        fuelDeductions: 0,
        advanceRecoveries: 1000,
        otherDeductions: 500,
        totalDeductions: 1500,
        netPayable: 25000,
        approvalStatus: 'pending',
        paymentStatus: 'unpaid',
        warnings: [
          'Driver was on leave for 14 days in October. Bata and outstation allowances prorated.'
        ],
        lineItems: [
          { id: 'li-118', name: 'Basic Salary', type: 'earning', amount: 22000, category: 'base' },
          { id: 'li-119', name: 'House Rent Allowance (HRA)', type: 'earning', amount: 4500, category: 'allowance' },
          { id: 'li-120', name: 'Medical Advance Recovery Installment 1/5', type: 'deduction', amount: 1000, category: 'advance_recovery' },
          { id: 'li-121', name: 'Safety & Welfare Fund', type: 'deduction', amount: 500, category: 'other' }
        ]
      },
      {
        id: 'prec-10-105',
        payrollRunId: 'payrun-2026-10',
        driverId: 'drv-105',
        driverNumber: 'DRV-2024-005',
        driverName: 'Vikram Singh',
        salaryStructureName: 'Tipper & Mining Haulage Tier-1',
        basicSalary: 20000,
        hra: 0,
        otherAllowances: 5000,
        tripBata: 0,
        grossEarnings: 25000,
        fuelDeductions: 0,
        advanceRecoveries: 0,
        otherDeductions: 500,
        totalDeductions: 500,
        netPayable: 24500,
        approvalStatus: 'pending',
        paymentStatus: 'unpaid',
        warnings: [
          'Trip TRIP-2026-0104 has open odometer discrepancy; fuel deduction on hold.'
        ],
        lineItems: [
          { id: 'li-122', name: 'Basic Salary', type: 'earning', amount: 20000, category: 'base' },
          { id: 'li-123', name: 'Site Hazard & Heavy Operations Allowance', type: 'earning', amount: 5000, category: 'allowance' },
          { id: 'li-124', name: 'Safety & Welfare Fund', type: 'deduction', amount: 500, category: 'other' }
        ]
      }
    ]
  }
];

export const initialIntegrationJobs: IntegrationJob[] = [
  {
    id: 'job-001',
    jobType: 'tyre_distance_attribution',
    vehicleId: 'veh-001',
    vehicleReg: 'TN-04-AX-8912',
    tripId: 'trip-2026-101',
    tripNumber: 'TRIP-2026-0101',
    status: 'success',
    attemptCount: 1,
    payloadSummary: 'Attributed 450 km across 10 active axle wheel positions. Stepney spare tyre excluded as per Rule 22.',
    timestamp: '2026-10-16T11:00:00Z'
  },
  {
    id: 'job-002',
    jobType: 'odometer_push',
    vehicleId: 'veh-001',
    vehicleReg: 'TN-04-AX-8912',
    tripId: 'trip-2026-101',
    tripNumber: 'TRIP-2026-0101',
    status: 'success',
    attemptCount: 1,
    payloadSummary: 'Updated vehicle master odometer to 125,450 km.',
    timestamp: '2026-10-16T11:00:05Z'
  },
  {
    id: 'job-003',
    jobType: 'tyre_distance_attribution',
    vehicleId: 'veh-003',
    vehicleReg: 'KA-01-MJ-9921',
    tripId: 'trip-2026-103',
    tripNumber: 'TRIP-2026-0103',
    status: 'failed',
    attemptCount: 3,
    payloadSummary: 'Attribution payload rejected by TLCM Pro validation: Odometer readings missing in Case 3.',
    errorMessage: 'HTTP 422: Missing measured odometer endpoints required for wheel lifecycle attribution.',
    timestamp: '2026-10-19T14:02:00Z'
  },
  {
    id: 'job-004',
    jobType: 'vehicle_master_sync',
    vehicleId: 'veh-005',
    vehicleReg: 'KA-51-EF-1123',
    status: 'retry_queued',
    attemptCount: 2,
    payloadSummary: 'Scheduled vehicle sync queued for retry following gateway timeout.',
    errorMessage: 'HTTP 504: Gateway timeout on TLCM Pro master replica.',
    timestamp: '2026-10-20T01:15:00Z'
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'audit-001',
    entityType: 'Trip',
    entityId: 'trip-2026-101',
    entityLabel: 'TRIP-2026-0101',
    action: 'TRIP_COMPLETED',
    previousValue: 'Status: in_progress',
    newValue: 'Status: completed, Distance: 450 km',
    changedBy: 'Logistics Supervisor (Madhavaram)',
    timestamp: '2026-10-15T18:35:00Z',
    reason: 'Vehicle returned to base, driver completed gate checkout.'
  },
  {
    id: 'audit-002',
    entityType: 'FuelDeduction',
    entityId: 'trip-2026-101',
    entityLabel: 'TRIP-2026-0101',
    action: 'FUEL_DEDUCTION_APPROVED',
    previousValue: 'Status: pending_review (Potential: ₹1,068.75)',
    newValue: 'Status: approved (Amount: ₹1,068.75)',
    changedBy: 'Audit Committee Supervisor',
    timestamp: '2026-10-16T10:30:00Z',
    reason: 'Excess fuel 11.25 L confirmed against benchmark 6 km/L + 5% tolerance.'
  },
  {
    id: 'audit-003',
    entityType: 'Expense',
    entityId: 'exp-101-1',
    entityLabel: 'FASTag Tolls (TRIP-2026-0101)',
    action: 'EXPENSE_APPROVED',
    previousValue: 'Status: pending (₹850)',
    newValue: 'Status: approved (₹850)',
    changedBy: 'Fleet Auditor (Accounts)',
    timestamp: '2026-10-16T10:00:00Z',
    reason: 'Verified against NHAI electronic portal toll records.'
  },
  {
    id: 'audit-004',
    entityType: 'Advance',
    entityId: 'adv-001',
    entityLabel: 'ADV-VCH-8921',
    action: 'SETTLEMENT_ALLOCATION',
    previousValue: 'Outstanding: ₹10,000',
    newValue: 'Outstanding: ₹8,400 (Expenses: ₹1,600 approved)',
    changedBy: 'Fleet Accountant',
    timestamp: '2026-10-16T10:25:00Z',
    reason: 'Allocated approved expenses from TRIP-2026-0101 against trip advance.'
  },
  {
    id: 'audit-005',
    entityType: 'Odometer',
    entityId: 'trip-2026-104',
    entityLabel: 'TRIP-2026-0104',
    action: 'ODOMETER_DISCREPANCY_FLAGGED',
    previousValue: 'Validation: unverified',
    newValue: 'Validation: discrepancy_held (Ending 67,800 < Starting 67,900)',
    changedBy: 'Validation Engine (Automated)',
    timestamp: '2026-10-18T10:05:00Z',
    reason: 'Negative odometer distance delta detected. Flagged for supervisor review.'
  }
];
