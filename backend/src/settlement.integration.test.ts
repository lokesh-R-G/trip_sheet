import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './app.js';
import { prisma } from './shared/database/prisma.js';

describe('Phase 3 E2E Integration Tests (BE-18 to BE-22: Advances, Expenses, Settlement, Bata)', () => {
  let testDriverId: string;
  let testVehicleId: string;
  let tripAId: string;
  let tripBId: string;
  let tripCId: string;
  let tripDId: string;

  let advance1Id: string;
  let advance2Id: string;
  let advance3Id: string;
  let reversalAdvanceId: string;

  let allocation1Id: string;
  let allocation2TripBId: string;

  let tollExpenseId: string;
  let parkingExpenseId: string;
  let refreshmentsExpenseId: string;
  let repairExpenseId: string;
  let fuelTopUpExpenseId: string;
  let testFuelTopUpId: string;

  beforeAll(async () => {
    // 1. Create dedicated vehicle
    const vehReg = 'TN-P3-' + Date.now().toString().slice(-6);
    const vehicle = await prisma.vehicle.create({
      data: {
        tlcmVehicleId: 'tlcm-' + vehReg,
        registrationNumber: vehReg,
        vehicleType: 'Multi-Axle Cargo',
        makeModel: 'BharatBenz 3528R',
        tonnage: 35.0,
        status: 'active',
        latestOdometer: 50000,
        assignedTyresCount: 12,
        hasStepneyFitted: true,
        syncStatus: 'connected',
        lastSyncTime: new Date(),
      },
    });
    testVehicleId = vehicle.id;

    // 2. Create dedicated driver
    const driver = await prisma.driver.create({
      data: {
        driverNumber: 'DRV-P3-' + Date.now().toString().slice(-5),
        fullName: 'Phase 3 Settlement Driver',
        phone: '+91 91234 56789',
        address: 'Logistics Hub, Hosur',
        licenseNumber: 'TN-P3-LIC-' + Date.now().toString().slice(-5),
        licenseExpiry: new Date('2035-01-01'),
        joiningDate: new Date('2026-01-01'),
        status: 'active',
        currentVehicleId: vehicle.id,
      },
    });
    testDriverId = driver.id;

    // 3. Create helper trips
    const tripA = await prisma.trip.create({
      data: {
        tripNumber: 'TRIP-P3-A-' + Date.now().toString().slice(-5),
        driverId: testDriverId,
        vehicleId: testVehicleId,
        startDate: new Date('2026-07-01T06:00:00Z'),
        endDate: new Date('2026-07-03T18:00:00Z'),
        startingLocation: 'Chennai Depot',
        finalDestination: 'Coimbatore Hub',
        purpose: 'Textile Consignment',
        status: 'completed',
      },
    });
    tripAId = tripA.id;

    const tripB = await prisma.trip.create({
      data: {
        tripNumber: 'TRIP-P3-B-' + Date.now().toString().slice(-5),
        driverId: testDriverId,
        vehicleId: testVehicleId,
        startDate: new Date('2026-07-04T06:00:00Z'),
        endDate: new Date('2026-07-06T18:00:00Z'),
        startingLocation: 'Coimbatore Hub',
        finalDestination: 'Salem Warehouse',
        purpose: 'Yarn Cargo',
        status: 'completed',
      },
    });
    tripBId = tripB.id;

    const tripC = await prisma.trip.create({
      data: {
        tripNumber: 'TRIP-P3-C-' + Date.now().toString().slice(-5),
        driverId: testDriverId,
        vehicleId: testVehicleId,
        startDate: new Date('2026-07-07T06:00:00Z'),
        endDate: new Date('2026-07-09T18:00:00Z'),
        startingLocation: 'Salem Warehouse',
        finalDestination: 'Bengaluru ICD',
        purpose: 'Automotive Spares',
        status: 'completed',
      },
    });
    tripCId = tripC.id;

    const tripD = await prisma.trip.create({
      data: {
        tripNumber: 'TRIP-P3-D-' + Date.now().toString().slice(-5),
        driverId: testDriverId,
        vehicleId: testVehicleId,
        startDate: new Date('2026-07-10T06:00:00Z'),
        endDate: new Date('2026-07-12T18:00:00Z'),
        startingLocation: 'Bengaluru ICD',
        finalDestination: 'Chennai Depot',
        purpose: 'Return Empty Pallets',
        status: 'completed',
      },
    });
    tripDId = tripD.id;
  });

  afterAll(async () => {
    // Clean up created records cleanly
    if (testDriverId) {
      await prisma.tripSettlementRecord.deleteMany({
        where: { tripId: { in: [tripAId, tripBId, tripCId, tripDId] } },
      });
      await prisma.advanceSettlementAllocation.deleteMany({
        where: { tripId: { in: [tripAId, tripBId, tripCId, tripDId] } },
      });
      await prisma.tripExpense.deleteMany({
        where: { driverId: testDriverId },
      });
      await prisma.driverAdvanceTransaction.deleteMany({
        where: { driverId: testDriverId },
      });
      if (testFuelTopUpId) {
        await prisma.fuelTopUp.deleteMany({ where: { id: testFuelTopUpId } });
      }
      await prisma.trip.deleteMany({
        where: { id: { in: [tripAId, tripBId, tripCId, tripDId] } },
      });
      await prisma.driver.deleteMany({ where: { id: testDriverId } });
      if (testVehicleId) {
        await prisma.vehicle.deleteMany({ where: { id: testVehicleId } });
      }
    }
    await prisma.$disconnect();
  });

  // =========================================================================
  // BE-18: Advance Transaction Ledger
  // =========================================================================
  describe('BE-18: Advance Transaction Ledger', () => {
    it('creates multiple advance transactions for a driver before trip assignment', async () => {
      // 1. Primary Trip Cash Advance: ₹10,000
      const adv1 = await request(app)
        .post('/api/v1/advances')
        .set('x-actor-id', 'CashierRaj')
        .send({
          driverId: testDriverId,
          referenceNumber: 'ADV-P3-001-' + Date.now(),
          transactionDate: '2026-07-01T08:00:00Z',
          transactionType: 'advance_issued',
          advanceType: 'trip_advance',
          amount: 10000,
          currency: 'INR',
          paymentMethod: 'cash',
          purpose: 'Initial Route Cash Advance',
        });

      expect(adv1.status).toBe(201);
      expect(adv1.body.success).toBe(true);
      expect(adv1.body.data.debitAmount).toBe('10000');
      expect(adv1.body.data.status).toBe('active');
      advance1Id = adv1.body.data.id;

      // 2. Fuel Advance: ₹5,000 (disbursed in cash)
      const adv2 = await request(app)
        .post('/api/v1/advances')
        .set('x-actor-id', 'CashierRaj')
        .send({
          driverId: testDriverId,
          referenceNumber: 'ADV-P3-002-' + Date.now(),
          transactionDate: '2026-07-01T09:00:00Z',
          transactionType: 'additional_advance',
          advanceType: 'fuel_advance',
          amount: 5000,
          currency: 'INR',
          paymentMethod: 'bank_transfer',
          purpose: 'En-route Fuel Contingency',
        });

      expect(adv2.status).toBe(201);
      expect(adv2.body.data.debitAmount).toBe('5000');
      advance2Id = adv2.body.data.id;

      // 3. Toll Advance: ₹2,000 (FASTag card top-up disbursed)
      const adv3 = await request(app)
        .post('/api/v1/advances')
        .set('x-actor-id', 'CashierRaj')
        .send({
          driverId: testDriverId,
          referenceNumber: 'ADV-P3-003-' + Date.now(),
          transactionDate: '2026-07-01T10:00:00Z',
          transactionType: 'driver_disbursement',
          advanceType: 'toll_advance',
          amount: 2000,
          currency: 'INR',
          paymentMethod: 'fastag',
          purpose: 'Highway Toll Advance',
        });

      expect(adv3.status).toBe(201);
      expect(adv3.body.data.debitAmount).toBe('2000');
      advance3Id = adv3.body.data.id;
    });

    it('enforces unique reference numbers across transactions', async () => {
      const duplicateRes = await request(app)
        .post('/api/v1/advances')
        .send({
          driverId: testDriverId,
          referenceNumber: 'ADV-DUPLICATE-KEY',
          transactionDate: '2026-07-01T11:00:00Z',
          transactionType: 'advance_issued',
          amount: 1000,
        });
      expect(duplicateRes.status).toBe(201);

      const retryRes = await request(app)
        .post('/api/v1/advances')
        .send({
          driverId: testDriverId,
          referenceNumber: 'ADV-DUPLICATE-KEY',
          transactionDate: '2026-07-01T11:00:00Z',
          transactionType: 'advance_issued',
          amount: 1000,
        });
      expect(retryRes.status).toBe(409);
      expect(retryRes.body.error.code).toBe('CONFLICT_ERROR');
    });

    it('calculates driver summary correctly across multiple debit transactions', async () => {
      // Driver has 10,000 + 5,000 + 2,000 + 1,000 = 18,000 debits
      const summaryRes = await request(app).get(`/api/v1/advances/driver/${testDriverId}/summary`);
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.success).toBe(true);
      expect(summaryRes.body.data.totalDebits).toBe('18000');
      expect(summaryRes.body.data.totalCredits).toBe('0');
      expect(summaryRes.body.data.netOutstandingBalance).toBe('18000');
      expect(summaryRes.body.data.availableUnallocatedBalance).toBe('18000');
    });

    it('reverses an advance transaction and updates ledger & unallocated balance', async () => {
      // Reverse the toll advance of ₹2,000
      const revRes = await request(app)
        .post('/api/v1/advances')
        .set('x-actor-id', 'FinanceAudit')
        .send({
          driverId: testDriverId,
          referenceNumber: 'REV-P3-003-' + Date.now(),
          transactionDate: '2026-07-01T12:00:00Z',
          transactionType: 'reversal',
          amount: 2000,
          reversalOfId: advance3Id,
          reason: 'Erroneous duplicate Fastag disbursement',
        });

      expect(revRes.status).toBe(201);
      expect(revRes.body.data.creditAmount).toBe('2000');
      reversalAdvanceId = revRes.body.data.id;

      // Verify original transaction is now status = 'reversed'
      const originalAdv = await request(app).get(`/api/v1/advances/${advance3Id}`);
      expect(originalAdv.body.data.status).toBe('reversed');

      // Verify driver summary: totalDebits = 18,000, totalCredits = 2,000, netOutstanding = 16,000
      // Available unallocated excludes the reversed transaction: 10,000 + 5,000 + 1,000 = 16,000
      const updatedSummary = await request(app).get(`/api/v1/advances/driver/${testDriverId}/summary`);
      expect(updatedSummary.body.data.netOutstandingBalance).toBe('16000');
      expect(updatedSummary.body.data.availableUnallocatedBalance).toBe('16000');
    });

    it('rejects duplicate reversal attempt on an already reversed transaction', async () => {
      const secondRev = await request(app)
        .post('/api/v1/advances')
        .set('x-actor-id', 'FinanceAudit')
        .send({
          driverId: testDriverId,
          referenceNumber: 'REV-P3-SECOND-' + Date.now(),
          transactionDate: '2026-07-01T13:00:00Z',
          transactionType: 'reversal',
          amount: 2000,
          reversalOfId: advance3Id,
          reason: 'Second reversal attempt',
        });

      expect(secondRev.status).toBe(422);
      expect(secondRev.body.error.code).toBe('DOMAIN_RULE_VIOLATION');
      expect(secondRev.body.error.message).toContain('already reversed');
    });
  });

  // =========================================================================
  // BE-19: Advance Allocation (FIFO Policy, Multi-Trip & Partial Allocation)
  // =========================================================================
  describe('BE-19: Advance Allocation & FIFO Distribution', () => {
    it('performs partial advance allocation to a trip', async () => {
      // Driver has available: Adv1 (10,000), Adv2 (5,000), AdvDuplicate (1,000). Total: 16,000.
      // Allocate 6,000 to Trip A. FIFO takes 6,000 from Adv 1 (oldest).
      const allocRes = await request(app)
        .post(`/api/v1/advances/trips/${tripAId}/allocate`)
        .set('x-actor-id', 'TripPlanner')
        .send({ amount: 6000 });

      expect(allocRes.status).toBe(201);
      expect(allocRes.body.success).toBe(true);
      expect(allocRes.body.data).toHaveLength(1);
      expect(allocRes.body.data[0].allocatedAmount).toBe('6000');
      expect(allocRes.body.data[0].advanceTransactionId).toBe(advance1Id);
      allocation1Id = allocRes.body.data[0].id;

      // Check driver summary: 6,000 allocated, 10,000 unallocated remaining
      const summary = await request(app).get(`/api/v1/advances/driver/${testDriverId}/summary`);
      expect(summary.body.data.totalAllocatedToTrips).toBe('6000');
      expect(summary.body.data.availableUnallocatedBalance).toBe('10000');
    });

    it('allocates across multiple advances using FIFO policy (spans Adv 1 remainder and Adv 2)', async () => {
      // Remaining on Adv 1: 4,000. Available on Adv 2: 5,000.
      // Request 7,000 for Trip B.
      // FIFO policy allocates: 4,000 from Adv 1 (fully exhausts Adv 1) + 3,000 from Adv 2.
      const allocRes = await request(app)
        .post(`/api/v1/advances/trips/${tripBId}/allocate`)
        .set('x-actor-id', 'TripPlanner')
        .send({ amount: 7000 });

      expect(allocRes.status).toBe(201);
      expect(allocRes.body.data).toHaveLength(2);

      const allocFromAdv1 = allocRes.body.data.find((a: any) => a.advanceTransactionId === advance1Id);
      const allocFromAdv2 = allocRes.body.data.find((a: any) => a.advanceTransactionId === advance2Id);

      expect(allocFromAdv1).toBeDefined();
      expect(allocFromAdv1.allocatedAmount).toBe('4000');

      expect(allocFromAdv2).toBeDefined();
      expect(allocFromAdv2.allocatedAmount).toBe('3000');
      allocation2TripBId = allocFromAdv2.id;

      // Total allocated: 6,000 + 7,000 = 13,000. Available unallocated: 3,000.
      const summary = await request(app).get(`/api/v1/advances/driver/${testDriverId}/summary`);
      expect(summary.body.data.totalAllocatedToTrips).toBe('13000');
      expect(summary.body.data.availableUnallocatedBalance).toBe('3000');
    });

    it('rejects advance allocation when requested amount exceeds available unallocated balance', async () => {
      // Driver only has 3,000 unallocated. Requesting 5,000 must fail.
      const overAllocRes = await request(app)
        .post(`/api/v1/advances/trips/${tripAId}/allocate`)
        .set('x-actor-id', 'TripPlanner')
        .send({ amount: 5000 });

      expect(overAllocRes.status).toBe(422);
      expect(overAllocRes.body.error.code).toBe('DOMAIN_RULE_VIOLATION');
      expect(overAllocRes.body.error.message).toContain('Insufficient unallocated advance balance');
    });

    it('releases an advance allocation and restores available unallocated balance', async () => {
      // Release the 3,000 allocation from Trip B
      const releaseRes = await request(app)
        .post(`/api/v1/advances/allocations/${allocation2TripBId}/release`)
        .set('x-actor-id', 'OperationsManager')
        .send({ reason: 'Trip route shortened, advance returned to pool' });

      expect(releaseRes.status).toBe(200);
      expect(releaseRes.body.success).toBe(true);
      expect(releaseRes.body.data.status).toBe('released');
      expect(releaseRes.body.data.releaseReason).toBe('Trip route shortened, advance returned to pool');

      // Total allocated decreases from 13,000 to 10,000; unallocated increases from 3,000 to 6,000
      const summary = await request(app).get(`/api/v1/advances/driver/${testDriverId}/summary`);
      expect(summary.body.data.totalAllocatedToTrips).toBe('10000');
      expect(summary.body.data.availableUnallocatedBalance).toBe('6000');
    });
  });

  // =========================================================================
  // BE-20: Expense Recording & Approval Workflow
  // =========================================================================
  describe('BE-20: Expense Recording & Review Workflow', () => {
    beforeAll(async () => {
      // Allocate ₹5,000 advance to Trip C for expense and settlement tests
      await request(app)
        .post(`/api/v1/advances/trips/${tripCId}/allocate`)
        .send({ amount: 5000 });
    });

    it('submits expenses across multiple categories', async () => {
      // 1. Toll expense: ₹1,200
      const tollRes = await request(app)
        .post('/api/v1/expenses')
        .send({
          tripId: tripCId,
          driverId: testDriverId,
          category: 'tolls',
          description: 'NH44 Fastag Toll Plaza charges',
          amount: 1200,
          expenseDate: '2026-07-07T10:00:00Z',
          paymentMethod: 'fastag',
          vendorName: 'IHMCL / NHAI Tolls',
          receiptReference: 'RCPT-TOLL-001',
          isSettlementEligible: true,
        });

      expect(tollRes.status).toBe(201);
      expect(tollRes.body.data.approvalStatus).toBe('pending');
      expect(tollRes.body.data.amount).toBe('1200');
      tollExpenseId = tollRes.body.data.id;

      // 2. Parking expense: ₹300
      const parkingRes = await request(app)
        .post('/api/v1/expenses')
        .send({
          tripId: tripCId,
          driverId: testDriverId,
          category: 'parking',
          description: 'Depot overnight secure truck parking',
          amount: 300,
          expenseDate: '2026-07-07T21:00:00Z',
          paymentMethod: 'cash',
          receiptReference: 'RCPT-PARK-002',
          isSettlementEligible: true,
        });

      expect(parkingRes.status).toBe(201);
      parkingExpenseId = parkingRes.body.data.id;

      // 3. Refreshments expense: ₹500
      const refRes = await request(app)
        .post('/api/v1/expenses')
        .send({
          tripId: tripCId,
          driverId: testDriverId,
          category: 'refreshments',
          description: 'Driver highway meal and tea allowance',
          amount: 500,
          expenseDate: '2026-07-08T08:00:00Z',
          paymentMethod: 'cash',
          receiptReference: 'RCPT-MEAL-003',
          isSettlementEligible: true,
        });

      expect(refRes.status).toBe(201);
      refreshmentsExpenseId = refRes.body.data.id;

      // 4. Minor Repair expense: ₹2,000
      const repRes = await request(app)
        .post('/api/v1/expenses')
        .send({
          tripId: tripCId,
          driverId: testDriverId,
          category: 'repairs',
          description: 'Emergency air hose puncture patching',
          amount: 2000,
          expenseDate: '2026-07-08T14:00:00Z',
          paymentMethod: 'cash',
          vendorName: 'Salem Tyres & Air Workshop',
          receiptReference: 'RCPT-REP-004',
          isSettlementEligible: true,
        });

      expect(repRes.status).toBe(201);
      repairExpenseId = repRes.body.data.id;
    });

    it('prevents double-counting by detecting duplicate receipt references within same trip', async () => {
      const dupReceipt = await request(app)
        .post('/api/v1/expenses')
        .send({
          tripId: tripCId,
          driverId: testDriverId,
          category: 'tolls',
          description: 'Duplicate receipt submission',
          amount: 1200,
          expenseDate: '2026-07-07T10:00:00Z',
          paymentMethod: 'fastag',
          receiptReference: 'RCPT-TOLL-001',
        });

      expect(dupReceipt.status).toBe(409);
      expect(dupReceipt.body.error.code).toBe('CONFLICT_ERROR');
      expect(dupReceipt.body.error.message).toContain('already exists for this trip');
    });

    it('prevents double-counting by linking and preventing duplicate fuel top-up expense claims', async () => {
      // Create dedicated fuel top-up right before test to ensure isolation in parallel test runs
      const topUp = await prisma.fuelTopUp.create({
        data: {
          vehicleId: testVehicleId,
          dateTime: new Date('2026-07-07T12:00:00Z'),
          litres: 150.0,
          pricePerLitre: 94.5,
          totalCost: 14175.0,
          fuelStation: 'Indian Oil Highway Depot',
          paymentMethod: 'driver_cash',
          receiptReference: 'RCPT-FUEL-' + Date.now(),
          recordedBy: 'FuelOfficer',
          fuelType: 'diesel',
          odometerReading: 51200,
        },
      });
      testFuelTopUpId = topUp.id;

      // 1. Submit expense linked to fuel top-up
      const fuelExp = await request(app)
        .post('/api/v1/expenses')
        .send({
          tripId: tripCId,
          driverId: testDriverId,
          category: 'fuel',
          description: 'Diesel top-up at highway depot',
          amount: 14175,
          expenseDate: '2026-07-07T12:00:00Z',
          paymentMethod: 'driver_cash',
          fuelTopUpId: testFuelTopUpId,
          isSettlementEligible: false, // Fuel settlement handled through fuel domain
        });

      expect(fuelExp.status).toBe(201);
      fuelTopUpExpenseId = fuelExp.body.data.id;

      // 2. Attempt to claim the same fuelTopUpId in a second expense
      const dupFuelExp = await request(app)
        .post('/api/v1/expenses')
        .send({
          tripId: tripCId,
          driverId: testDriverId,
          category: 'fuel',
          description: 'Attempted duplicate fuel claim',
          amount: 14175,
          expenseDate: '2026-07-07T12:00:00Z',
          paymentMethod: 'driver_cash',
          fuelTopUpId: testFuelTopUpId,
        });

      expect(dupFuelExp.status).toBe(409);
      expect(dupFuelExp.body.error.code).toBe('CONFLICT_ERROR');
      expect(dupFuelExp.body.error.message).toContain('Duplicate expense claims are prevented');
    });

    it('executes full review workflow: approve, adjust, reject, and return_for_correction', async () => {
      // 1. Approve Tolls (full amount ₹1,200)
      const approveRes = await request(app)
        .post(`/api/v1/expenses/${tollExpenseId}/review`)
        .set('x-actor-id', 'SupervisorAnand')
        .send({
          action: 'approve',
          comments: 'Fastag statement verified against trip route',
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.approvalStatus).toBe('approved');
      expect(approveRes.body.data.approvedAmount).toBe('1200');

      // 2. Adjust Parking: reduce from ₹300 to ₹250
      const adjustRes = await request(app)
        .post(`/api/v1/expenses/${parkingExpenseId}/review`)
        .set('x-actor-id', 'SupervisorAnand')
        .send({
          action: 'adjust',
          adjustedAmount: 250,
          comments: 'Tariff cap is ₹250 for 12hr parking',
        });

      expect(adjustRes.status).toBe(200);
      expect(adjustRes.body.data.approvalStatus).toBe('approved');
      expect(adjustRes.body.data.approvedAmount).toBe('250');
      expect(adjustRes.body.data.amount).toBe('250');

      // 3. Reject Repairs: unapproved workshop
      const rejectRes = await request(app)
        .post(`/api/v1/expenses/${repairExpenseId}/review`)
        .set('x-actor-id', 'FleetManagerBala')
        .send({
          action: 'reject',
          rejectionReason: 'Repairs done without prior depot maintenance authorization',
        });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.approvalStatus).toBe('rejected');
      expect(rejectRes.body.data.rejectionReason).toContain('without prior depot maintenance authorization');

      // 4. Return Refreshments for correction: missing voucher
      const returnRes = await request(app)
        .post(`/api/v1/expenses/${refreshmentsExpenseId}/review`)
        .set('x-actor-id', 'SupervisorAnand')
        .send({
          action: 'return_for_correction',
          rejectionReason: 'Attach physical signed receipt slip from highway motel',
        });

      expect(returnRes.status).toBe(200);
      expect(returnRes.body.data.approvalStatus).toBe('returned_for_correction');
    });

    it('excludes unapproved, rejected, and settlement-ineligible expenses from live settlement calculation', async () => {
      // Live calculation for Trip C:
      // Allocated Advances: ₹5,000
      // Approved Eligible Expenses: Toll (1,200) + Parking (250) = 1,450.
      // Refreshments (returned_for_correction) is EXCLUDED.
      // Repair (rejected) is EXCLUDED.
      // FuelTopUp (isSettlementEligible: false) is EXCLUDED.
      const calcRes = await request(app).get(`/api/v1/settlements/trip/${tripCId}`);
      expect(calcRes.status).toBe(200);
      expect(calcRes.body.success).toBe(true);

      const data = calcRes.body.data;
      expect(data.totalAdvancesAllocated).toBe('5000');
      expect(data.totalApprovedExpenses).toBe('1450');
      expect(data.totalCashReturns).toBe('0');
      // Net Balance = 5,000 - 1,450 = +3,550 (Driver owes recovery)
      expect(data.netBalance).toBe('3550');
      expect(data.driverRecoveryDue).toBe('3550');
      expect(data.reimbursementDue).toBe('0');
    });
  });

  // =========================================================================
  // BE-21: Trip Settlement (Formulas, Snapshot, Concurrency, Reopening)
  // =========================================================================
  describe('BE-21: Trip Settlement Engine & Finalization Workflow', () => {
    it('prevents settlement finalization when expenses are in unreviewed or returned_for_correction status', async () => {
      // Refreshments is still in 'returned_for_correction' status
      const finalizeRes = await request(app)
        .post(`/api/v1/settlements/trip/${tripCId}/finalize`)
        .set('x-actor-id', 'AuditorPriya')
        .send({});

      expect(finalizeRes.status).toBe(422);
      expect(finalizeRes.body.error.code).toBe('DOMAIN_RULE_VIOLATION');
      expect(finalizeRes.body.error.message).toContain('uncorrected expense claim(s)');
    });

    it('rejects finalization and reopening when authorized reviewer header is missing', async () => {
      const noAuthRes = await request(app)
        .post(`/api/v1/settlements/trip/${tripCId}/finalize`)
        .send({});

      expect(noAuthRes.status).toBe(401);
      expect(noAuthRes.body.error.code).toBe('UNAUTHORIZED');
    });

    it('resolves pending expense and calculates positive balance settlement (driver owes recovery)', async () => {
      // Resolve the refreshments expense by approving ₹500
      await request(app)
        .post(`/api/v1/expenses/${refreshmentsExpenseId}/review`)
        .set('x-actor-id', 'SupervisorAnand')
        .send({ action: 'approve' });

      // Live settlement now has approved expenses: 1,200 + 250 + 500 = 1,950.
      // Net Balance = 5,000 - 1,950 = +3,050.
      const calcRes = await request(app).get(`/api/v1/settlements/trip/${tripCId}`);
      expect(calcRes.body.data.totalApprovedExpenses).toBe('1950');
      expect(calcRes.body.data.netBalance).toBe('3050');
      expect(calcRes.body.data.driverRecoveryDue).toBe('3050');
      expect(calcRes.body.data.reimbursementDue).toBe('0');
    });

    it('records driver cash return for trip and reduces outstanding recovery due', async () => {
      // Driver returns ₹3,050 cash to cashier
      const returnRes = await request(app)
        .post(`/api/v1/settlements/trip/${tripCId}/return`)
        .set('x-actor-id', 'CashierRaj')
        .send({
          amount: 3050,
          referenceNumber: 'RET-P3-C-' + Date.now(),
          transactionDate: '2026-07-09T17:00:00Z',
          paymentMethod: 'cash',
          notes: 'Driver handed surplus advance cash in envelope',
        });

      expect(returnRes.status).toBe(201);
      expect(returnRes.body.success).toBe(true);

      // Now Net Balance = 5,000 - 1,950 (expenses) - 3,050 (returns) = 0.
      const calcAfterReturn = await request(app).get(`/api/v1/settlements/trip/${tripCId}`);
      expect(calcAfterReturn.body.data.totalCashReturns).toBe('3050');
      expect(calcAfterReturn.body.data.netBalance).toBe('0');
      expect(calcAfterReturn.body.data.driverRecoveryDue).toBe('0');
      expect(calcAfterReturn.body.data.reimbursementDue).toBe('0');
    });

    it('verifies negative balance preservation (expenses > advances) where company owes driver reimbursement', async () => {
      // Allocate small advance of ₹1,000 to Trip D
      await request(app)
        .post(`/api/v1/advances/trips/${tripDId}/allocate`)
        .send({ amount: 1000 });

      // Driver incurs approved eligible expense of ₹3,500
      const expRes = await request(app)
        .post('/api/v1/expenses')
        .send({
          tripId: tripDId,
          driverId: testDriverId,
          category: 'repairs',
          description: 'Emergency fan belt & alternator replacement',
          amount: 3500,
          expenseDate: '2026-07-11T10:00:00Z',
          paymentMethod: 'driver_cash',
          isSettlementEligible: true,
        });

      await request(app)
        .post(`/api/v1/expenses/${expRes.body.data.id}/review`)
        .set('x-actor-id', 'SupervisorAnand')
        .send({ action: 'approve' });

      // Live settlement for Trip D:
      // Advances: 1,000. Expenses: 3,500. Returns: 0.
      // Net Balance = 1,000 - 3,500 = -2,500.
      // Reimbursement Due = 2,500. Recovery Due = 0.
      // Net balance is strictly preserved as a negative decimal, NOT clamped to zero!
      const calcRes = await request(app).get(`/api/v1/settlements/trip/${tripDId}`);
      expect(calcRes.status).toBe(200);
      expect(calcRes.body.data.totalAdvancesAllocated).toBe('1000');
      expect(calcRes.body.data.totalApprovedExpenses).toBe('3500');
      expect(calcRes.body.data.netBalance).toBe('-2500');
      expect(calcRes.body.data.reimbursementDue).toBe('2500');
      expect(calcRes.body.data.driverRecoveryDue).toBe('0');
    });

    it('finalizes settlement, creates immutable frozen snapshot, and sets version = 1', async () => {
      const finalizeRes = await request(app)
        .post(`/api/v1/settlements/trip/${tripDId}/finalize`)
        .set('x-actor-id', 'SettlementAuditor')
        .send({
          expectedVersion: 1,
          settledDate: '2026-07-12',
          notes: 'Settlement finalized. Direct bank reimbursement queued for driver.',
        });

      expect(finalizeRes.status).toBe(200);
      expect(finalizeRes.body.success).toBe(true);

      const record = finalizeRes.body.data;
      expect(record.isFinalized).toBe(true);
      expect(record.calculationVersion).toBe(1);
      expect(record.finalizedBy).toBe('SettlementAuditor');
      expect(record.netBalance).toBe('-2500');
      expect(record.reimbursementDue).toBe('2500');

      // Verify immutable snapshot JSON contains complete data structure
      expect(record.snapshot).toBeDefined();
      expect(record.snapshot.tripId).toBe(tripDId);
      expect(record.snapshot.totals.netBalance).toBe('-2500');
      expect(record.snapshot.totals.reimbursementDue).toBe('2500');
      expect(record.snapshot.approvedExpenses).toHaveLength(1);
      expect(record.snapshot.advanceAllocations).toHaveLength(1);
    });

    it('supports duplicate finalization idempotency without altering record or version', async () => {
      const idempotentRes = await request(app)
        .post(`/api/v1/settlements/trip/${tripDId}/finalize`)
        .set('x-actor-id', 'SettlementAuditor')
        .send({ expectedVersion: 1 });

      expect(idempotentRes.status).toBe(200);
      expect(idempotentRes.body.data.isFinalized).toBe(true);
      expect(idempotentRes.body.data.calculationVersion).toBe(1);
    });

    it('rejects concurrent finalization with version conflict (409)', async () => {
      const conflictRes = await request(app)
        .post(`/api/v1/settlements/trip/${tripDId}/finalize`)
        .set('x-actor-id', 'SettlementAuditor')
        .send({ expectedVersion: 99 }); // Outdated version

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error.code).toBe('CONCURRENCY_CONFLICT');
    });

    it('reopens finalized settlement with documented reason and increments calculationVersion to 2', async () => {
      const reopenRes = await request(app)
        .post(`/api/v1/settlements/trip/${tripDId}/reopen`)
        .set('x-actor-id', 'OperationsSupervisor')
        .send({
          reason: 'Discovered additional toll plaza receipt needing inclusion prior to accounts posting',
        });

      expect(reopenRes.status).toBe(200);
      expect(reopenRes.body.success).toBe(true);
      expect(reopenRes.body.data.isFinalized).toBe(false);
      expect(reopenRes.body.data.calculationVersion).toBe(2);
      expect(reopenRes.body.data.reopenedBy).toBe('OperationsSupervisor');
      expect(reopenRes.body.data.reopenReason).toContain('Discovered additional toll plaza receipt');
    });

    it('prevents reopening when settlement postingStatus is already posted', async () => {
      // Re-finalize settlement
      await request(app)
        .post(`/api/v1/settlements/trip/${tripDId}/finalize`)
        .set('x-actor-id', 'SettlementAuditor')
        .send({ expectedVersion: 2 });

      // Simulate external accounting sync marking record as posted
      await prisma.tripSettlementRecord.update({
        where: { tripId: tripDId },
        data: {
          postingStatus: 'posted',
          financialPostingRef: 'SAP-JV-2026-07-8899',
        },
      });

      const reopenPostedRes = await request(app)
        .post(`/api/v1/settlements/trip/${tripDId}/reopen`)
        .set('x-actor-id', 'OperationsSupervisor')
        .send({ reason: 'Attempting to reopen posted record' });

      expect(reopenPostedRes.status).toBe(422);
      expect(reopenPostedRes.body.error.code).toBe('DOMAIN_RULE_VIOLATION');
      expect(reopenPostedRes.body.error.message).toContain('financial records are already posted');
    });
  });

  // =========================================================================
  // BE-22: Bata Calculation Policy Status
  // =========================================================================
  describe('BE-22: Bata Policy Inspection & Status Endpoint', () => {
    it('returns deferred status with questionnaire reference and inspected domain components', async () => {
      const res = await request(app).get('/api/v1/bata/status');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.status).toBe('deferred');
      expect(data.policyQuestionnaire).toBe('backend/src/modules/bata/bata-policy.questionnaire.md');
      expect(data.inspectedComponents).toContain('Trip departure and arrival timestamps');
      expect(data.inspectedComponents).toContain('Vehicle tonnage');
      expect(data.inspectedComponents).toContain('Driver master profile');
      expect(data.reason).toContain('pending stakeholder policy confirmation');
    });
  });
});
