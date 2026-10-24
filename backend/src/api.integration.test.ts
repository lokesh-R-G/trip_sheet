import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './app.js';
import { prisma } from './shared/database/prisma.js';

describe('Phase 1 E2E API Integration Tests (BE-01 to BE-10)', () => {
  let createdDriverId: string;
  let testVehicleId: string;
  let testVehicleReg: string;
  let createdTripId: string;
  let tripVersion = 1;

  beforeAll(async () => {
    // Create unique test vehicle for this run
    const uniqueVehNumber = 'TN-TEST-' + Date.now().toString().slice(-6);
    const vehicle = await prisma.vehicle.create({
      data: {
        tlcmVehicleId: 'tlcm-' + uniqueVehNumber,
        registrationNumber: uniqueVehNumber,
        vehicleType: 'Heavy Truck',
        makeModel: 'BharatBenz 2823R',
        tonnage: 28.0,
        status: 'active',
        latestOdometer: 100000,
        assignedTyresCount: 10,
        hasStepneyFitted: true,
        syncStatus: 'connected',
        lastSyncTime: new Date(),
      },
    });
    testVehicleId = vehicle.id;
    testVehicleReg = vehicle.registrationNumber;

    const driver = await prisma.driver.upsert({
      where: { driverNumber: 'DRV-TEST-SEED-001' },
      update: { status: 'active' },
      create: {
        driverNumber: 'DRV-TEST-SEED-001',
        fullName: 'Test Master Driver',
        phone: '+91 99999 88888',
        address: 'HQ Chennai',
        licenseNumber: 'TN-01-TEST-SEED-999',
        licenseExpiry: new Date('2035-12-31'),
        joiningDate: new Date('2026-01-01'),
        status: 'active',
        currentVehicleId: vehicle.id,
      },
    });
    createdDriverId = driver.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/v1/health returns healthy and database connected', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.database).toBe('connected');
  });

  describe('BE-03: Driver Management Endpoints', () => {
    const uniqueDriverNumber = `DRV-TEST-${Date.now()}`;
    const uniqueLicense = `TN-LIC-${Date.now()}`;

    it('POST /api/v1/drivers creates a new commercial driver', async () => {
      const res = await request(app)
        .post('/api/v1/drivers')
        .send({
          driverNumber: uniqueDriverNumber,
          fullName: 'Muthuvel Karunanidhi',
          phone: '+91 98765 00001',
          email: 'muthuvel@fleet.com',
          address: '12 Mount Road, Chennai',
          licenseNumber: uniqueLicense,
          licenseExpiry: '2032-12-31',
          joiningDate: '2026-01-15',
          status: 'active',
          currentVehicleId: testVehicleId,
          notes: 'Experienced heavy haul driver',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.driverNumber).toBe(uniqueDriverNumber);
      expect(res.body.data.fullName).toBe('Muthuvel Karunanidhi');
      expect(res.body.data.status).toBe('active');
      createdDriverId = res.body.data.id;
    });

    it('POST /api/v1/drivers rejects duplicate driver number with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/drivers')
        .send({
          driverNumber: uniqueDriverNumber, // duplicate!
          fullName: 'Duplicate Driver',
          phone: '+91 98765 00002',
          address: 'Madurai',
          licenseNumber: `TN-LIC-DUP-${Date.now()}`,
          licenseExpiry: '2030-12-31',
          joiningDate: '2026-01-15',
          status: 'active',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT_ERROR');
    });

    it('GET /api/v1/drivers/:id retrieves driver with vehicle reference', async () => {
      const res = await request(app).get(`/api/v1/drivers/${createdDriverId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdDriverId);
      expect(res.body.data.currentVehicleReg).toBe(testVehicleReg);
    });

    it('GET /api/v1/drivers lists drivers with pagination and search filter', async () => {
      const res = await request(app)
        .get('/api/v1/drivers')
        .query({ search: 'Muthuvel', limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('PATCH /api/v1/drivers/:id updates permitted driver details', async () => {
      const res = await request(app)
        .patch(`/api/v1/drivers/${createdDriverId}`)
        .send({
          notes: 'Updated safety certification in 2026',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe('Updated safety certification in 2026');
    });

    it('PATCH /api/v1/drivers/:id/status updates status and records audit log', async () => {
      const res = await request(app)
        .patch(`/api/v1/drivers/${createdDriverId}/status`)
        .send({
          status: 'on_leave',
          reason: 'Annual family leave',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('on_leave');

      // Change back to active
      await request(app)
        .patch(`/api/v1/drivers/${createdDriverId}/status`)
        .send({ status: 'active', reason: 'Returned from leave' });
    });
  });

  describe('BE-04 / BE-06 / BE-08: Trip Creation & Odometer Engine', () => {
    it('POST /api/v1/trips creates trip in draft with Case 1 odometer evaluation', async () => {
      const res = await request(app)
        .post('/api/v1/trips')
        .send({
          driverId: createdDriverId,
          vehicleId: testVehicleId,
          startDate: '2026-10-23T08:00:00.000Z',
          endDate: '2026-10-23T18:00:00.000Z',
          startingLocation: 'Chennai Central Hub',
          finalDestination: 'Bengaluru Logistics Corridor',
          purpose: 'Automotive Parts Transit',
          isDraft: true,
          odometer: {
            startingReading: 100000,
            endingReading: 100350,
            reportedDistance: 350,
          },
          routeSegments: [
            {
              sequence: 1,
              fromLocation: 'Chennai Hub',
              toLocation: 'Vellore Stop',
              distanceKm: '135.50',
              tonnage: '24.50',
              cargoDescription: 'Machinery Parts',
            },
            {
              sequence: 2,
              fromLocation: 'Vellore Stop',
              toLocation: 'Bengaluru Corridor',
              distanceKm: '214.50',
              tonnage: '24.50',
              cargoDescription: 'Machinery Parts',
            },
          ],
        });

      if (res.status !== 201) {
        console.error('TRIP CREATION FAILED:', res.status, JSON.stringify(res.body, null, 2));
      }
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.tripNumber).toMatch(/^TRIP-2026-\d{4}$/);
      createdTripId = res.body.data.id;
      tripVersion = res.body.data.version;
      expect(res.body.data.odometer.odometerCase).toBe('case_1_both_available');
      expect(res.body.data.odometer.measuredDistance).toBe(350);
      expect(res.body.data.odometer.acceptedDistance).toBe(350);
      expect(res.body.data.odometer.validationStatus).toBe('verified');
      expect(res.body.data.odometer.tyreAttributionEligible).toBe(true);
      expect(res.body.data.routeSegments.length).toBe(2);

      createdTripId = res.body.data.id;
      tripVersion = res.body.data.version;
    });

    it('GET /api/v1/trips/:id retrieves trip with populated relations', async () => {
      const res = await request(app).get(`/api/v1/trips/${createdTripId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdTripId);
      expect(res.body.data.driverName).toBe('Muthuvel Karunanidhi');
      expect(res.body.data.vehicleReg).toBe(testVehicleReg);
    });
  });

  describe('BE-05: Route Segments Management', () => {
    it('GET /api/v1/trips/:id/segments returns segments ordered by sequence', async () => {
      const res = await request(app).get(`/api/v1/trips/${createdTripId}/segments`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].sequence).toBe(1);
      expect(res.body.data[1].sequence).toBe(2);
    });

    it('POST /api/v1/trips/:id/segments adds third segment', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${createdTripId}/segments`)
        .send({
          sequence: 3,
          fromLocation: 'Bengaluru Corridor',
          toLocation: 'Nelamangala Depot',
          distanceKm: '35.00',
          tonnage: '0.00',
          cargoDescription: 'Empty Return Leg',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.sequence).toBe(3);
      expect(res.body.data.fromLocation).toBe('Bengaluru Corridor');
    });

    it('PUT /api/v1/trips/:id/segments/reorder reorders segments transactionally without duplicate conflicts', async () => {
      const segmentsRes = await request(app).get(`/api/v1/trips/${createdTripId}/segments`);
      const [seg1, seg2, seg3] = segmentsRes.body.data;

      // Reverse order: seg3 -> 1, seg2 -> 2, seg1 -> 3
      const reorderRes = await request(app)
        .put(`/api/v1/trips/${createdTripId}/segments/reorder`)
        .send({
          segments: [
            { segmentId: seg3.id, sequence: 1 },
            { segmentId: seg2.id, sequence: 2 },
            { segmentId: seg1.id, sequence: 3 },
          ],
        });

      expect(reorderRes.status).toBe(200);
      expect(reorderRes.body.data[0].id).toBe(seg3.id);
      expect(reorderRes.body.data[0].sequence).toBe(1);
      expect(reorderRes.body.data[2].id).toBe(seg1.id);
      expect(reorderRes.body.data[2].sequence).toBe(3);
    });
  });

  describe('BE-04 / BE-10: Trip Lifecycle State Machine & Concurrency Control', () => {
    it('POST /api/v1/trips/:id/transition dispatches trip: draft -> in_progress', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${createdTripId}/transition`)
        .send({
          targetStatus: 'in_progress',
          expectedVersion: tripVersion,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
      tripVersion = res.body.data.version;
    });

    it('POST /api/v1/trips/:id/transition rejects concurrent transition with stale version (HTTP 409 Conflict)', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${createdTripId}/transition`)
        .send({
          targetStatus: 'completed',
          expectedVersion: tripVersion - 1, // Stale expectedVersion!
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONCURRENCY_CONFLICT');
    });

    it('POST /api/v1/trips/:id/transition completes trip: in_progress -> completed', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${createdTripId}/transition`)
        .send({
          targetStatus: 'completed',
          expectedVersion: tripVersion,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.endDate).not.toBeNull();
      tripVersion = res.body.data.version;
    });

    it('POST /api/v1/trips/:id/transition rejects reopening completed trip (terminal state)', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${createdTripId}/transition`)
        .send({
          targetStatus: 'in_progress',
          expectedVersion: tripVersion,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('DOMAIN_RULE_VIOLATION');
    });

    it('PATCH /api/v1/trips/:id rejects ordinary updates on completed trip', async () => {
      const res = await request(app)
        .patch(`/api/v1/trips/${createdTripId}`)
        .send({
          startingLocation: 'Illegal Change',
          expectedVersion: tripVersion,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('DOMAIN_RULE_VIOLATION');
    });

    it('POST /api/v1/trips/:id/exceptional-correction allows authorized supervisor correction notes on closed trip', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${createdTripId}/exceptional-correction`)
        .send({
          reason: 'Supervisor manual review verified toll receipts on leg 2.',
          notes: 'Toll variance approved by operations lead.',
          expectedVersion: tripVersion,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe('Toll variance approved by operations lead.');
    });
  });

  describe('BE-09: Audit Logs Verification', () => {
    it('GET /api/v1/audit-logs retrieves audit trail generated by driver and trip operations', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .query({ entityId: createdTripId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const actions = res.body.data.map((l: any) => l.action);
      expect(actions).toContain('TRIP_CREATED');
      expect(actions).toContain('TRIP_STATUS_IN_PROGRESS');
      expect(actions).toContain('TRIP_STATUS_COMPLETED');
    });
  });
});
