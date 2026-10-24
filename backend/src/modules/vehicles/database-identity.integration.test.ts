import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../../shared/database/prisma.js';
import { ExternalVehicleDatabase } from './external-vehicle.db.js';

describe('Database Runtime Identity Verification', () => {
  afterAll(async () => {
    await ExternalVehicleDatabase.disconnect();
  });

  it('Verifies primary Trip Sheet Prisma Client connects to "trip" database', async () => {
    const result = await prisma.$queryRawUnsafe<any[]>(
      'SELECT current_database(), current_schema(), inet_server_addr(), inet_server_port();'
    );
    console.log('--- PRIMARY TRIP SHEET PRISMA CLIENT IDENTITY ---');
    console.log('Database:', result[0].current_database);
    console.log('Schema:', result[0].current_schema);
    console.log('Port:', result[0].inet_server_port);

    expect(result[0].current_database).toBe('trip');
  });

  it('Verifies external vehicle database client connects to "tlcm" database', async () => {
    const client = ExternalVehicleDatabase.getClient();
    const result = await client.$queryRawUnsafe<any[]>(
      'SELECT current_database(), current_schema(), inet_server_addr(), inet_server_port();'
    );
    console.log('--- EXTERNAL TLCM DATABASE CLIENT IDENTITY ---');
    console.log('Database:', result[0].current_database);
    console.log('Schema:', result[0].current_schema);
    console.log('Port:', result[0].inet_server_port);

    expect(result[0].current_database).toBe('tlcm1');
  });

  it('Verifies actual vehicle record distribution across databases', async () => {
    // Query external TLCM DB
    const extClient = ExternalVehicleDatabase.getClient();
    const extVehicles = await extClient.$queryRawUnsafe<any[]>(
      'SELECT id, "vehicleNumber", status FROM "Vehicle" ORDER BY id LIMIT 5;'
    );
    const extCount = await extClient.$queryRawUnsafe<any[]>('SELECT COUNT(*) as count FROM "Vehicle";');

    console.log('--- TLCM DATABASE VEHICLES ---');
    console.log('Total vehicles in tlcm1:', extCount[0].count);
    console.log('Sample TLCM vehicles:', extVehicles);

    // Query local Trip Sheet DB
    const localCount = await prisma.vehicle.count();
    const localVehicles = await prisma.vehicle.findMany({ take: 5 });

    console.log('--- TRIP SHEET DATABASE VEHICLES ---');
    console.log('Total vehicles in trip:', localCount);
    console.log('Sample Trip Sheet vehicles:', localVehicles.map(v => ({ id: v.id, reg: v.registrationNumber, tlcmId: v.tlcmVehicleId })));

    expect(Number(extCount[0].count)).toBeGreaterThan(0);
  });
});
