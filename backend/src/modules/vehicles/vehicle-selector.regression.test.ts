import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app.js';
import { prisma } from '../../shared/database/prisma.js';
import { ExternalVehicleDatabase } from './external-vehicle.db.js';

describe('Regression Tests: Vehicle Selector & Authoritative TLCM Database Ownership', () => {
  it('1. GET /api/v1/vehicles returns only authoritative TLCM vehicles, not local-only records', async () => {
    // 1. Check count of authoritative records directly in TLCM database
    const tlcmClient = ExternalVehicleDatabase.getClient();
    const tlcmVehicles = await tlcmClient.$queryRawUnsafe<any[]>('SELECT id, "vehicleNumber" FROM "Vehicle";');
    const localCount = await prisma.vehicle.count();

    // The local database contains test fixtures / cached vehicles, which may exceed TLCM vehicles
    console.log(`TLCM DB vehicle count: ${tlcmVehicles.length}, Local Trip DB count: ${localCount}`);

    // 2. Query the vehicle API endpoint used by the frontend
    const res = await request(app).get('/api/v1/vehicles');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta.source).toBe('tlcm_database');

    const apiVehicles = res.body.data;
    // Must match the authoritative TLCM database count exactly
    expect(apiVehicles.length).toBe(tlcmVehicles.length);

    // Every returned vehicle's tlcmVehicleId must exist in the authoritative TLCM database
    const tlcmIds = new Set(tlcmVehicles.map(v => v.id));
    for (const v of apiVehicles) {
      expect(tlcmIds.has(v.tlcmVehicleId)).toBe(true);
    }
  });

  it('2. A vehicle present ONLY in the Trip Sheet database is NOT included in the vehicle selector response', async () => {
    // Create a local-only vehicle that does NOT exist in TLCM database
    const localOnlyReg = `LOCAL-ONLY-${Date.now().toString().slice(-6)}`;
    const localOnlyTlcmId = `LOCAL-NOT-IN-TLCM-${Date.now().toString().slice(-6)}`;

    const localOnly = await prisma.vehicle.create({
      data: {
        tlcmVehicleId: localOnlyTlcmId,
        registrationNumber: localOnlyReg,
        vehicleType: 'Heavy Truck',
        makeModel: 'Local Only Phantom',
        tonnage: 28,
        status: 'active',
        latestOdometer: 50000,
        totalTripDistance: 0,
        assignedTyresCount: 10,
        hasStepneyFitted: true,
        syncStatus: 'connected',
        lastSyncTime: new Date(),
      },
    });

    try {
      const res = await request(app).get('/api/v1/vehicles');
      expect(res.status).toBe(200);

      const found = res.body.data.find(
        (v: any) => v.registrationNumber === localOnlyReg || v.tlcmVehicleId === localOnlyTlcmId
      );
      // The local-only vehicle must NOT appear in the authoritative selector response
      expect(found).toBeUndefined();
    } finally {
      // Clean up the local-only test record
      await prisma.vehicle.delete({ where: { id: localOnly.id } });
    }
  });

  it('3. An authoritative TLCM vehicle is returned even if no prior local Trip Sheet record existed', async () => {
    const tlcmClient = ExternalVehicleDatabase.getClient();
    const tlcmVehicles = await tlcmClient.$queryRawUnsafe<any[]>('SELECT id, "vehicleNumber" FROM "Vehicle" LIMIT 1;');
    expect(tlcmVehicles.length).toBeGreaterThan(0);

    const target = tlcmVehicles[0];

    const res = await request(app).get('/api/v1/vehicles');
    expect(res.status).toBe(200);

    const found = res.body.data.find((v: any) => v.tlcmVehicleId === target.id);
    expect(found).toBeDefined();
    expect(found.registrationNumber).toBe(target.vehicleNumber);
    expect(typeof found.id).toBe('string'); // Valid local ID populated or auto-synced
  });

  it('4. Local metadata cannot overwrite authoritative vehicle identity or odometer', async () => {
    const tlcmClient = ExternalVehicleDatabase.getClient();
    const tlcmVehicles = await tlcmClient.$queryRawUnsafe<any[]>(
      'SELECT id, "vehicleNumber" FROM "Vehicle" LIMIT 1;'
    );
    const target = tlcmVehicles[0];

    // Find the matching local record
    const local = await prisma.vehicle.findFirst({
      where: { OR: [{ tlcmVehicleId: target.id }, { registrationNumber: target.vehicleNumber }] }
    });

    if (local) {
      const originalLocalOdo = local.latestOdometer;
      // Mutate local record's latestOdometer to a bogus value
      await prisma.vehicle.update({
        where: { id: local.id },
        data: { latestOdometer: 9999999 },
      });

      const res = await request(app).get('/api/v1/vehicles');
      expect(res.status).toBe(200);

      const found = res.body.data.find((v: any) => v.tlcmVehicleId === target.id);
      expect(found).toBeDefined();
      // Must reflect authoritative TLCM odometer, NOT the mutated local bogus value 9999999
      expect(found.latestOdometer).not.toBe(9999999);

      // Restore local cached value
      await prisma.vehicle.update({
        where: { id: local.id },
        data: { latestOdometer: originalLocalOdo },
      });
    }
  });

  it('5. Trip creation with selected vehicle preserves authoritative TLCM vehicle identity and updates authoritative baseline', async () => {
    // Fetch real driver
    const driver = await prisma.driver.findFirst({ where: { status: 'active' } });
    expect(driver).toBeDefined();

    // Fetch vehicles from authoritative API endpoint
    const vehRes = await request(app).get('/api/v1/vehicles');
    expect(vehRes.body.data.length).toBeGreaterThan(0);
    const selected = vehRes.body.data[0];

    const startOdo = Math.round(selected.latestOdometer || 100000);
    const endOdo = startOdo + 20;

    const tripRes = await request(app)
      .post('/api/v1/trips')
      .send({
        driverId: driver!.id,
        vehicleId: selected.id,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
        startingLocation: 'Chennai Depot',
        finalDestination: 'Coimbatore Hub',
        purpose: 'Automotive Component Logistics',
        odometer: {
          startingReading: startOdo,
          endingReading: endOdo,
          startingSource: 'measured',
          endingSource: 'measured',
        },
      });

    expect(tripRes.status).toBe(201);
    expect(tripRes.body.success).toBe(true);
    expect(tripRes.body.data.vehicleReg).toBe(selected.registrationNumber);

    // Verify that the external TLCM database was updated with the verified ending reading in VehicleOdometerLog
    const tlcmClient = ExternalVehicleDatabase.getClient();
    const updated = await tlcmClient.$queryRawUnsafe<any[]>(
      'SELECT "odometer" FROM "VehicleOdometerLog" WHERE "vehicleId" = $1 ORDER BY date DESC LIMIT 1;',
      selected.tlcmVehicleId
    );
    expect(updated[0].odometer).toBe(endOdo);
  });

  it('6. Diagnostics endpoint /api/v1/vehicles/diagnostics/identity returns distinct database identities', async () => {
    const res = await request(app).get('/api/v1/vehicles/diagnostics/identity');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.primaryDatabase.database).toBe('trip');
    expect(res.body.data.externalTlcmDatabase.database).toBe('tlcm1');
    expect(typeof res.body.data.externalTlcmDatabase.authoritativeVehicleCount).toBe('number');
  });
});
