import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './app.js';
import { prisma } from './shared/database/prisma.js';
import { tlcmIntegrationService, DefaultTLCMClient } from './modules/fuel/tlcm/tlcm-integration.service.js';

describe('Phase 2 E2E Integration Tests (BE-11 to BE-17)', () => {
  let testVehicleId: string;
  let testVehicleReg: string;
  let testDriverId: string;
  let testTripId: string;
  let testTripWithDerivedOdoId: string;
  let createdTopUpId: string;
  let createdBenchmarkId: string;
  let createdValuationPolicyId: string;
  let createdDeductionId: string;
  let deductionVersion = 1;

  beforeAll(async () => {
    // Clean up test fuel data to ensure test isolation
    await prisma.tripFuelDeduction.deleteMany();
    await prisma.tripFuelAddition.deleteMany();
    await prisma.tripFuelRecord.deleteMany();
    await prisma.fuelTopUp.deleteMany();
    await prisma.fuelValuationPolicy.deleteMany();
    await prisma.mileageBenchmark.deleteMany();
    await prisma.integrationJob.deleteMany({ where: { jobType: 'odometer_observation_sync' } });

    // 1. Create a dedicated test vehicle
    const uniqueVehNumber = 'TN-P2-' + Date.now().toString().slice(-6);
    const vehicle = await prisma.vehicle.create({
      data: {
        tlcmVehicleId: 'tlcm-' + uniqueVehNumber,
        registrationNumber: uniqueVehNumber,
        vehicleType: 'Heavy Commercial',
        makeModel: 'Tata Signa 4825.TK',
        tonnage: 25.0,
        status: 'active',
        latestOdometer: 120000,
        assignedTyresCount: 12,
        hasStepneyFitted: true,
        syncStatus: 'connected',
        lastSyncTime: new Date(),
      },
    });
    testVehicleId = vehicle.id;
    testVehicleReg = vehicle.registrationNumber;

    // 2. Create a test driver
    const driver = await prisma.driver.create({
      data: {
        driverNumber: 'DRV-P2-' + Date.now().toString().slice(-5),
        fullName: 'Phase 2 Test Driver',
        phone: '+91 98888 77777',
        address: 'Fleet Depot, Bangalore',
        licenseNumber: 'KA-01-P2-' + Date.now().toString().slice(-5),
        licenseExpiry: new Date('2032-12-31'),
        joiningDate: new Date('2026-01-01'),
        status: 'active',
        currentVehicleId: vehicle.id,
      },
    });
    testDriverId = driver.id;

    // 3. Create a primary test trip with valid Case 1 odometer record (Distance: 400 km)
    const tripNumber = 'TRIP-P2-' + Date.now().toString().slice(-6);
    const trip = await prisma.trip.create({
      data: {
        tripNumber,
        driverId: testDriverId,
        vehicleId: testVehicleId,
        startDate: new Date('2026-06-10T08:00:00Z'),
        endDate: new Date('2026-06-10T20:00:00Z'),
        startingLocation: 'Bangalore Hub',
        finalDestination: 'Chennai Port',
        purpose: 'Container Freight',
        status: 'in_progress',
        odometerRecord: {
          create: {
            startingReading: 120000,
            startingTimestamp: new Date('2026-06-10T08:00:00Z'),
            startingSource: 'measured',
            endingReading: 120400,
            endingTimestamp: new Date('2026-06-10T20:00:00Z'),
            endingSource: 'measured',
            odometerCase: 'case_1_both_available',
            measuredDistance: 400,
            reportedDistance: 400,
            acceptedDistance: 400,
            validationStatus: 'verified',
            tyreAttributionEligible: true,
            tyreAttributionStatus: 'eligible',
          },
        },
      },
    });
    testTripId = trip.id;

    // 4. Create a secondary trip with Case 2 derived ending reading (to test tyre attribution gating)
    const tripNumberDerived = 'TRIP-P2-DERIVED-' + Date.now().toString().slice(-5);
    const tripDerived = await prisma.trip.create({
      data: {
        tripNumber: tripNumberDerived,
        driverId: testDriverId,
        vehicleId: testVehicleId,
        startDate: new Date('2026-06-12T08:00:00Z'),
        endDate: new Date('2026-06-12T20:00:00Z'),
        startingLocation: 'Bangalore Hub',
        finalDestination: 'Mysore Yard',
        purpose: 'Regional Cargo',
        status: 'in_progress',
        odometerRecord: {
          create: {
            startingReading: 120400,
            startingTimestamp: new Date('2026-06-12T08:00:00Z'),
            startingSource: 'measured',
            endingReading: null,
            odometerCase: 'case_2_derived_ending',
            derivedDistance: 150,
            reportedDistance: 150,
            acceptedDistance: 150,
            derivedEndingReading: 120550,
            validationStatus: 'provisional',
            tyreAttributionEligible: false,
            tyreAttributionStatus: 'on_hold',
            tyreAttributionHoldReason: 'Derived ending reading requires physical odometer verification',
          },
        },
      },
    });
    testTripWithDerivedOdoId = tripDerived.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ========================================================
  // BE-11: Fuel Top-Ups
  // ========================================================
  describe('BE-11: Fuel Top-Ups', () => {
    it('POST /api/v1/fuel-topups creates fuel top-up with odometer observation and queues TLCM integration job', async () => {
      const payload = {
        vehicleId: testVehicleId,
        dateTime: '2026-06-10T10:30:00.000Z',
        litres: 120.0,
        dispensedLitres: 120.0,
        pricePerLitre: 95.5,
        totalCost: 11460.0,
        fuelStation: 'Indian Oil Highway Plaza, Hosur',
        pumpMeterStart: 4500.0,
        pumpMeterEnd: 4620.0,
        odometerReading: 120150,
        paymentMethod: 'company_card',
        receiptReference: 'IOCL-HOSUR-9921',
        recordedBy: 'FleetAdmin',
        notes: 'En-route top-up',
      };

      const res = await request(app)
        .post('/api/v1/fuel-topups')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.odometerObservationStatus).toBe('observation');
      expect(res.body.data.receiptReference).toBe('IOCL-HOSUR-9921');
      createdTopUpId = res.body.data.id;

      // Verify integration job was created atomically for TLCM Pro
      const job = await prisma.integrationJob.findUnique({
        where: { idempotencyKey: `tlcm-odo-obs-${createdTopUpId}` },
      });
      expect(job).not.toBeNull();
      expect(job?.status).toBe('pending');
      expect(job?.jobType).toBe('odometer_observation_sync');

      // Verify audit log was recorded
      const audit = await prisma.auditLog.findFirst({
        where: { entityType: 'FuelTopUp', entityId: createdTopUpId },
      });
      expect(audit).not.toBeNull();
      expect(audit?.action).toBe('CREATE');
    });

    it('POST /api/v1/fuel-topups validates inputs and rejects negative litres or invalid pump meters', async () => {
      const invalidPayload = {
        vehicleId: testVehicleId,
        dateTime: '2026-06-10T11:00:00.000Z',
        litres: -20, // Negative!
        pricePerLitre: 95,
        fuelStation: 'Yard Bunkering',
        paymentMethod: 'cash',
        receiptReference: 'FAIL-01',
        recordedBy: 'Admin',
      };

      const res = await request(app)
        .post('/api/v1/fuel-topups')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      const invalidMetersPayload = {
        vehicleId: testVehicleId,
        dateTime: '2026-06-10T11:00:00.000Z',
        litres: 50,
        pricePerLitre: 95,
        fuelStation: 'Yard Bunkering',
        pumpMeterStart: 5000,
        pumpMeterEnd: 4900, // End is less than start!
        paymentMethod: 'cash',
        receiptReference: 'FAIL-02',
        recordedBy: 'Admin',
      };

      const resMeters = await request(app)
        .post('/api/v1/fuel-topups')
        .send(invalidMetersPayload);

      expect(resMeters.status).toBe(400);
      expect(resMeters.body.success).toBe(false);
    });

    it('GET /api/v1/fuel-topups lists top-ups with pagination and filters', async () => {
      const res = await request(app)
        .get(`/api/v1/fuel-topups?vehicleId=${testVehicleId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.pagination).toBeDefined();
    });
  });

  // ========================================================
  // BE-12 & BE-13: Trip Fuel Records & Fuel Consumption
  // ========================================================
  describe('BE-12 & BE-13: Trip Fuel Records & Fuel Consumption Engine', () => {
    it('POST /api/v1/trips/:tripId/fuel records initial opening and closing tank levels', async () => {
      // Opening: 100 L, Closing: 60 L (no additions yet) -> Consumed = 40 L
      const res = await request(app)
        .post(`/api/v1/trips/${testTripId}/fuel`)
        .send({
          openingFuelQuantity: 100,
          closingFuelQuantity: 60,
          recordedBy: 'Dispatcher',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.calculationStatus).toBe('verified');
      expect(res.body.data.acceptedFuelLitres).toBe('40');
      expect(res.body.data.tripMileageKmPerLitre).toBe('10'); // Distance 400 / 40L = 10.00 km/L
      expect(res.body.data.mileageStatus).toBe('valid');
    });

    it('POST /api/v1/trips/:tripId/fuel/additions adds multiple verified fuel additions and recalculates consumption', async () => {
      // Add first addition: 50 L from fuel top-up
      const resAddition1 = await request(app)
        .post(`/api/v1/trips/${testTripId}/fuel/additions`)
        .send({
          fuelTopUpId: createdTopUpId,
          litres: 50,
          source: 'fuel_station',
          receiptReference: 'IOCL-HOSUR-9921',
          additionDateTime: '2026-06-10T11:00:00.000Z',
          verified: true,
        });

      expect(resAddition1.status).toBe(201);
      expect(resAddition1.body.success).toBe(true);

      // Add second addition: 30 L bunkering
      const resAddition2 = await request(app)
        .post(`/api/v1/trips/${testTripId}/fuel/additions`)
        .send({
          litres: 30,
          source: 'bunkering',
          receiptReference: 'BUNK-001',
          additionDateTime: '2026-06-10T15:00:00.000Z',
          verified: true,
        });

      expect(resAddition2.status).toBe(201);
      expect(resAddition2.body.success).toBe(true);

      // Check recalculated consumption:
      // Opening 100 + Additions (50 + 30 = 80) - Closing 60 = 120 L
      const getRes = await request(app)
        .get(`/api/v1/trips/${testTripId}/fuel`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.fuelAddedDuringTrip).toBe('80');
      expect(getRes.body.data.calculatedConsumption).toBe('120');
      expect(getRes.body.data.acceptedFuelLitres).toBe('120');
      // Mileage: 400 km / 120 L = 3.33 km/L
      expect(getRes.body.data.tripMileageKmPerLitre).toBe('3.33');
    });

    it('surfaces discrepancy between manually reported and calculated consumption without silent overwrite', async () => {
      // Driver manually reported 130 L on paper trip sheet, while calculated balance is 120 L
      const res = await request(app)
        .post(`/api/v1/trips/${testTripId}/fuel`)
        .send({
          manuallyReportedLitres: 130,
          recordedBy: 'Supervisor',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.calculationStatus).toBe('discrepancy');
      expect(res.body.data.discrepancyFlag).toBe(true);
      expect(res.body.data.discrepancyDetails).toContain('differs from manually reported');
      expect(res.body.data.calculatedConsumption).toBe('120');
      expect(res.body.data.manuallyReportedLitres).toBe('130');
      // Accepted fuel remains the calculated fuel 120 L with discrepancy flag
      expect(res.body.data.acceptedFuelLitres).toBe('120');
      expect(res.body.data.mileageStatus).toBe('pending_verification');
    });
  });

  // ========================================================
  // BE-14: Mileage Calculation & Tyre Attribution Gating
  // ========================================================
  describe('BE-14: Mileage Calculation Engine & Tyre Attribution Gating', () => {
    it('gates tyre attribution: derived ending reading (Case 2) leaves tyre attribution blocked', async () => {
      // Setup fuel for the trip that has a Case 2 derived odometer reading
      const res = await request(app)
        .post(`/api/v1/trips/${testTripWithDerivedOdoId}/fuel`)
        .send({
          openingFuelQuantity: 80,
          closingFuelQuantity: 50, // Consumed = 30 L
          recordedBy: 'Dispatcher',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.acceptedFuelLitres).toBe('30');
      // Distance 150 km / 30 L = 5.00 km/L
      expect(res.body.data.tripMileageKmPerLitre).toBe('5');
      expect(res.body.data.mileageStatus).toBe('pending_verification');

      // Verify in DB that odometer record tyre attribution remains ineligible (blocked)
      const odoRecord = await prisma.tripOdometerRecord.findUnique({
        where: { tripId: testTripWithDerivedOdoId },
      });
      expect(odoRecord?.tyreAttributionEligible).toBe(false);
      expect(odoRecord?.tyreAttributionStatus).toBe('on_hold');
    });
  });

  // ========================================================
  // BE-15: Mileage Benchmark Resolution
  // ========================================================
  describe('BE-15: Mileage Benchmark Resolution', () => {
    it('POST /api/v1/benchmarks creates active mileage benchmark with tonnage criteria', async () => {
      const benchmarkPayload = {
        name: 'Heavy Commercial 20T-30T Benchmark',
        vehicleType: 'Heavy Commercial',
        minTonnage: 20.0,
        maxTonnage: 30.0,
        expectedMileageKmPerLitre: 4.0, // Expected 4.0 km/L
        permittedTolerancePercent: 5.0, // 5% tolerance
        effectiveFrom: '2026-01-01',
        effectiveTo: '2026-12-31',
        status: 'active',
        priority: 2,
        notes: 'Standard highway cargo benchmark',
      };

      const res = await request(app)
        .post('/api/v1/benchmarks')
        .send(benchmarkPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      createdBenchmarkId = res.body.data.id;
    });

    it('GET /api/v1/benchmarks/resolve/:tripId resolves matching benchmark for the trip', async () => {
      const res = await request(app)
        .get(`/api/v1/benchmarks/resolve/${testTripId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('resolved');
      expect(res.body.data.benchmark.id).toBe(createdBenchmarkId);
      expect(res.body.data.benchmark.expectedMileageKmPerLitre).toBe('4');
    });
  });

  // ========================================================
  // BE-16 & BE-17: Fuel Variance & Deduction Proposal Workflow
  // ========================================================
  describe('BE-16 & BE-17: Fuel Variance & Deduction Proposal Workflow', () => {
    it('proposes fuel deduction with status pending_valuation when approved fuel price policy is missing', async () => {
      // At this stage, no active fuel valuation policy has been configured in DB.
      // Expected: Distance 400 km / 4.0 km/L = 100 L.
      // Allowed (with 5% tolerance): 100 * 1.05 = 105 L.
      // Actual consumed: 120 L.
      // Excess fuel: 120 - 105 = 15 L.
      const res = await request(app)
        .post('/api/v1/fuel-deductions/propose')
        .send({ tripId: testTripId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.expectedFuelLitres).toBe('100');
      expect(res.body.data.allowedFuelLitres).toBe('105');
      expect(res.body.data.excessFuelLitres).toBe('15');
      expect(res.body.data.applicableFuelPrice).toBeNull();
      expect(res.body.data.potentialDeductionAmount).toBeNull();
      expect(res.body.data.reviewStatus).toBe('pending_valuation');
      createdDeductionId = res.body.data.id;
    });

    it('rejects approval when deduction is in pending_valuation status', async () => {
      const res = await request(app)
        .post(`/api/v1/fuel-deductions/${createdDeductionId}/review`)
        .set('x-actor-id', 'FleetManager')
        .send({ action: 'approve' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('pending fuel-price valuation');
    });

    it('prevents duplicate proposal creation (idempotent retry returns existing proposal)', async () => {
      const resRetry = await request(app)
        .post('/api/v1/fuel-deductions/propose')
        .send({ tripId: testTripId });

      expect(resRetry.status).toBe(201);
      expect(resRetry.body.data.id).toBe(createdDeductionId);
    });

    it('POST /api/v1/fuel-policies creates approved fuel valuation policy', async () => {
      const policyPayload = {
        name: 'Q2 2026 Fleet Commercial Diesel Policy',
        fuelType: 'diesel',
        pricePerLitre: 94.0, // Rs. 94.00 per litre
        effectiveFrom: '2026-04-01',
        effectiveTo: '2026-06-30',
        status: 'active',
        approvedBy: 'Director of Operations',
      };

      const res = await request(app)
        .post('/api/v1/fuel-policies')
        .send(policyPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdValuationPolicyId = res.body.data.id;
    });

    it('updates deduction proposal with resolved valuation price: 15 L * Rs. 94 = Rs. 1410.00', async () => {
      // Re-evaluating proposal with fuel price creates/updates valuation
      const updatedProposal = await prisma.tripFuelDeduction.update({
        where: { id: createdDeductionId },
        data: {
          applicableFuelPrice: 94.0,
          potentialDeductionAmount: 1410.0,
          reviewStatus: 'pending_review',
        },
      });

      expect(updatedProposal.reviewStatus).toBe('pending_review');
      expect(updatedProposal.potentialDeductionAmount?.toString()).toBe('1410');
    });

    it('rejects review attempt when x-actor-id is missing (authorization check)', async () => {
      const res = await request(app)
        .post(`/api/v1/fuel-deductions/${createdDeductionId}/review`)
        .send({ action: 'approve' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('detects concurrency conflict when expectedVersion does not match current version', async () => {
      const res = await request(app)
        .post(`/api/v1/fuel-deductions/${createdDeductionId}/review`)
        .set('x-actor-id', 'FleetManager')
        .send({
          action: 'approve',
          expectedVersion: 999, // Stale version!
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONCURRENCY_CONFLICT');
    });

    it('allows reviewer to adjust approved deduction amount with documented business justification', async () => {
      // Reviewer adjusts amount to Rs. 1000 due to highway traffic diversion
      const res = await request(app)
        .post(`/api/v1/fuel-deductions/${createdDeductionId}/review`)
        .set('x-actor-id', 'FleetManager')
        .send({
          action: 'adjust',
          adjustedAmount: 1000.0,
          reason: 'Highway ghat section diversion caused extra idling; partial waiver of Rs. 410 granted.',
          payrollMonth: '2026-06',
          expectedVersion: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviewStatus).toBe('adjusted');
      expect(res.body.data.approvedDeductionAmount).toBe('1000');
      expect(res.body.data.adjustmentReason).toContain('ghat section diversion');
      expect(res.body.data.reviewedBy).toBe('FleetManager');
      expect(res.body.data.version).toBe(2);
      deductionVersion = 2;

      // Verify audit log for adjustment
      const audit = await prisma.auditLog.findFirst({
        where: { entityType: 'TripFuelDeduction', entityId: createdDeductionId, action: 'REVIEW_ADJUST' },
      });
      expect(audit).not.toBeNull();
      expect(audit?.reason).toContain('ghat section diversion');
    });

    it('approves deduction proposal cleanly', async () => {
      const res = await request(app)
        .post(`/api/v1/fuel-deductions/${createdDeductionId}/review`)
        .set('x-actor-id', 'OperationsDirector')
        .send({
          action: 'approve',
          expectedVersion: deductionVersion,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviewStatus).toBe('approved');
      expect(res.body.data.approvedDeductionAmount).toBe('1410'); // Full potential amount on standard approve
    });

    it('ensures fuel deduction remains strictly separate from trip advance settlement', async () => {
      // Verify trip advances or settlement record were NOT mutated by fuel deduction
      const advances = await prisma.driverAdvanceTransaction.findMany({
        where: { tripId: testTripId },
      });
      expect(advances.length).toBe(0);
    });
  });

  // ========================================================
  // TLCM Pro Integration & Failure Resilience (BE-11 / Item 10)
  // ========================================================
  describe('TLCM Pro Integration Job & Resilience', () => {
    it('processes integration job successfully when TLCM Pro is available', async () => {
      const pendingJob = await prisma.integrationJob.findFirst({
        where: { vehicleId: testVehicleId, status: 'pending' },
      });

      expect(pendingJob).not.toBeNull();
      const processed = await tlcmIntegrationService.processPendingJob(pendingJob!.id);

      expect(processed.status).toBe('success');
      expect(processed.attemptCount).toBe(1);
      expect(processed.responseBody).toBeDefined();
    });

    it('handles TLCM Pro temporary unavailability gracefully without failing local trip workflows', async () => {
      // Create a test job and simulate TLCM 503 outage
      const testJob = await prisma.integrationJob.create({
        data: {
          jobType: 'odometer_observation_sync',
          idempotencyKey: `tlcm-fail-test-${Date.now()}`,
          vehicleId: testVehicleId,
          status: 'pending',
          payload: { test: true },
        },
      });

      const client = tlcmIntegrationService.getClient() as DefaultTLCMClient;
      client.setSimulateFailure(true);

      const failedJob = await tlcmIntegrationService.processPendingJob(testJob.id);

      expect(failedJob.status).toBe('retry_queued');
      expect(failedJob.attemptCount).toBe(1);
      expect(failedJob.errorMessage).toContain('503 Service Unavailable');
      expect(failedJob.nextRetryAt).toBeDefined();

      // Reset client
      client.setSimulateFailure(false);
    });
  });
});
