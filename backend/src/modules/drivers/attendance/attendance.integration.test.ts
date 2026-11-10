import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';
import { prisma } from '../../../shared/database/prisma.js';

describe('Driver Attendance Module Integration Tests', () => {
  let driver1Id: string;
  let driver2Id: string;
  let vehicleId: string;
  const testDate = '2026-11-15';
  let createdAttendanceId: string;

  beforeAll(async () => {
    // 1. Setup clean drivers
    const d1 = await prisma.driver.create({
      data: {
        driverNumber: `DRV-ATT-TEST-01-${Date.now()}`,
        fullName: 'Attendance Test Driver 1',
        phone: '9876543210',
        address: '123 Test Yard',
        licenseNumber: `LIC-ATT-01-${Date.now()}`,
        licenseExpiry: new Date('2029-12-31'),
        joiningDate: new Date('2024-01-01'),
        status: 'active',
      },
    });
    driver1Id = d1.id;

    const d2 = await prisma.driver.create({
      data: {
        driverNumber: `DRV-ATT-TEST-02-${Date.now()}`,
        fullName: 'Attendance Test Driver 2',
        phone: '9876543211',
        address: '124 Test Yard',
        licenseNumber: `LIC-ATT-02-${Date.now()}`,
        licenseExpiry: new Date('2029-12-31'),
        joiningDate: new Date('2024-01-01'),
        status: 'active',
      },
    });
    driver2Id = d2.id;

    // Get an existing vehicle
    const v = await prisma.vehicle.findFirst();
    vehicleId = v!.id;
  });

  afterAll(async () => {
    // Cleanup any trips referencing test drivers first
    const testTrips = await prisma.trip.findMany({
      where: { driverId: { in: [driver1Id, driver2Id] } },
      select: { id: true },
    });
    if (testTrips.length > 0) {
      const tripIds = testTrips.map((t) => t.id);
      await prisma.tripOdometerRecord.deleteMany({ where: { tripId: { in: tripIds } } });
      await prisma.trip.deleteMany({ where: { id: { in: tripIds } } });
    }

    await prisma.driverAttendance.deleteMany({
      where: { driverId: { in: [driver1Id, driver2Id] } },
    });
    await prisma.driver.deleteMany({
      where: { id: { in: [driver1Id, driver2Id] } },
    });
    await prisma.$disconnect();
  });

  it('1. Daily attendance marking API marks driver attendance successfully', async () => {
    const res = await request(app)
      .post('/api/v1/attendances')
      .send({
        driverId: driver1Id,
        attendanceDate: testDate,
        status: 'present',
        checkInTime: `${testDate}T08:30:00.000Z`,
        checkOutTime: `${testDate}T17:30:00.000Z`,
        source: 'MANUAL',
        remarks: 'On duty on time',
        approvedBy: 'Fleet Supervisor',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.driverId).toBe(driver1Id);
    expect(res.body.data.status).toBe('present');
    expect(res.body.data.source).toBe('MANUAL');
    expect(res.body.data.attendanceDate).toBe(testDate);
    createdAttendanceId = res.body.data.id;
  });

  it('2. Duplicate attendance prevention: cannot record attendance for same driver on same date twice', async () => {
    const res = await request(app)
      .post('/api/v1/attendances')
      .send({
        driverId: driver1Id,
        attendanceDate: testDate,
        status: 'present',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT_ERROR');
  });

  it('3. Attendance without trips: driver has valid attendance record even with no trips assigned', async () => {
    const res = await request(app)
      .get(`/api/v1/attendances/${createdAttendanceId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdAttendanceId);

    // Verify driver has 0 trips
    const trips = await prisma.trip.findMany({ where: { driverId: driver1Id } });
    expect(trips.length).toBe(0);
  });

  it('4. Attendance listing API with filters (driver, date, status)', async () => {
    const res = await request(app)
      .get('/api/v1/attendances')
      .query({ driverId: driver1Id, date: testDate });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(createdAttendanceId);
  });

  it('5. Bulk attendance marking API handles multiple drivers', async () => {
    const res = await request(app)
      .post('/api/v1/attendances/bulk')
      .send({
        attendanceDate: '2026-11-16',
        records: [
          { driverId: driver1Id, status: 'present' },
          { driverId: driver2Id, status: 'on_leave', remarks: 'Annual leave' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recorded.length).toBe(2);
    expect(res.body.data.skipped.length).toBe(0);
  });

  it('6. Attendance update and correction API records audit log', async () => {
    const res = await request(app)
      .patch(`/api/v1/attendances/${createdAttendanceId}`)
      .send({
        status: 'half_day',
        remarks: 'Left early for personal work',
        reason: 'Driver requested half day permission after morning shift',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('half_day');

    // Check audit history
    const auditRes = await request(app)
      .get(`/api/v1/attendances/${createdAttendanceId}/audit`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.success).toBe(true);
    expect(auditRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(auditRes.body.data[0].action).toBe('ATTENDANCE_CORRECTED');
    expect(auditRes.body.data[0].reason).toBe('Driver requested half day permission after morning shift');
  });

  it('7. Monthly attendance summary API aggregates statuses accurately', async () => {
    const res = await request(app)
      .get('/api/v1/attendances/summary/monthly')
      .query({ month: '2026-11', driverId: driver1Id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.month).toBe('2026-11');
    expect(res.body.data.driverSummaries.length).toBe(1);
    expect(res.body.data.driverSummaries[0].driverId).toBe(driver1Id);
    expect(res.body.data.driverSummaries[0].totalMarkedDays).toBe(2); // Nov 15 & Nov 16
  });

  it('8. Multiple trips for one driver on one date while having one daily attendance record', async () => {
    const tripDate = '2026-11-15T09:00:00.000Z';
    // Trip 1
    const trip1Res = await request(app)
      .post('/api/v1/trips')
      .send({
        driverId: driver1Id,
        vehicleId,
        startDate: tripDate,
        startingLocation: 'Chennai Hub',
        finalDestination: 'Sriperumbudur Hub',
        purpose: 'Morning Logistics',
        isDraft: true,
      });
    expect(trip1Res.status).toBe(201);

    // Trip 2 on same day
    const trip2Res = await request(app)
      .post('/api/v1/trips')
      .send({
        driverId: driver1Id,
        vehicleId,
        startDate: '2026-11-15T14:00:00.000Z',
        startingLocation: 'Sriperumbudur Hub',
        finalDestination: 'Chennai Hub',
        purpose: 'Afternoon Return',
        isDraft: true,
      });
    expect(trip2Res.status).toBe(201);

    // Verify still exactly one attendance record on 2026-11-15 for driver1
    const attList = await prisma.driverAttendance.findMany({
      where: {
        driverId: driver1Id,
        attendanceDate: new Date('2026-11-15'),
      },
    });
    expect(attList.length).toBe(1);

    // Clean up test trips
    await prisma.tripOdometerRecord.deleteMany({
      where: { tripId: { in: [trip1Res.body.data.id, trip2Res.body.data.id] } },
    });
    await prisma.trip.deleteMany({
      where: { id: { in: [trip1Res.body.data.id, trip2Res.body.data.id] } },
    });
  });

  it('9. Overnight trips: multi-day trip does not automatically create duplicate attendance records', async () => {
    // Overnight trip from Nov 20 to Nov 22
    const tripRes = await request(app)
      .post('/api/v1/trips')
      .send({
        driverId: driver1Id,
        vehicleId,
        startDate: '2026-11-20T20:00:00.000Z',
        endDate: '2026-11-22T06:00:00.000Z',
        startingLocation: 'Chennai',
        finalDestination: 'Bengaluru',
        purpose: 'Long Haul Overnight Cargo',
        isDraft: true,
      });
    expect(tripRes.status).toBe(201);

    // Check attendance records around Nov 20, 21, 22
    const attRecords = await prisma.driverAttendance.findMany({
      where: {
        driverId: driver1Id,
        attendanceDate: {
          gte: new Date('2026-11-20'),
          lte: new Date('2026-11-22'),
        },
      },
    });
    // Trip creation must NOT automatically create attendance
    expect(attRecords.length).toBe(0);

    // Clean up test trip
    await prisma.tripOdometerRecord.deleteMany({
      where: { tripId: tripRes.body.data.id },
    });
    await prisma.trip.deleteMany({
      where: { id: tripRes.body.data.id },
    });
  });

  it('10. Trip integration displays warnings for absent driver or driver on leave', async () => {
    // driver2 is on leave on 2026-11-16
    const tripRes = await request(app)
      .post('/api/v1/trips')
      .send({
        driverId: driver2Id,
        vehicleId,
        startDate: '2026-11-16T10:00:00.000Z',
        startingLocation: 'Chennai',
        finalDestination: 'Coimbatore',
        purpose: 'Inter-branch Delivery',
        isDraft: true,
      });

    expect(tripRes.status).toBe(201);
    // Warnings should be present in response
    expect(tripRes.body.data.warnings).toBeDefined();
    const hasLeaveWarning = tripRes.body.data.warnings.some((w: string) =>
      w.includes('APPROVED LEAVE')
    );
    expect(hasLeaveWarning).toBe(true);

    // Clean up
    await prisma.tripOdometerRecord.deleteMany({
      where: { tripId: tripRes.body.data.id },
    });
    await prisma.trip.deleteMany({
      where: { id: tripRes.body.data.id },
    });
  });
});
