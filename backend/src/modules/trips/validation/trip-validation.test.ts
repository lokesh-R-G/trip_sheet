import { describe, it, expect } from 'vitest';
import { TripValidationEngine } from './trip-validation.engine.js';

describe('BE-08: Trip Domain Validation Engine', () => {
  const engine = new TripValidationEngine();

  const mockActiveDriver: any = {
    id: 'drv-1',
    fullName: 'Ananth',
    status: 'active',
    licenseExpiry: new Date('2030-01-01'),
  };

  const mockActiveVehicle: any = {
    id: 'veh-1',
    registrationNumber: 'TN-01-AB-1234',
    status: 'active',
  };

  it('approves creation with eligible active driver and vehicle', () => {
    const result = engine.validateForCreation({
      driver: mockActiveDriver,
      vehicle: mockActiveVehicle,
      startDate: new Date('2026-10-23T08:00:00Z'),
      startingLocation: 'Chennai',
      finalDestination: 'Bengaluru',
      isDraft: false,
    });

    expect(result.canProceed).toBe(true);
    expect(result.blockingErrors.length).toBe(0);
  });

  it('blocks dispatch creation when driver is on leave', () => {
    const inactiveDriver = { ...mockActiveDriver, status: 'on_leave' };

    const result = engine.validateForCreation({
      driver: inactiveDriver,
      vehicle: mockActiveVehicle,
      startDate: new Date('2026-10-23T08:00:00Z'),
      startingLocation: 'Chennai',
      finalDestination: 'Bengaluru',
      isDraft: false, // dispatch
    });

    expect(result.canProceed).toBe(false);
    expect(result.blockingErrors.some((m) => m.includes('on_leave'))).toBe(true);
  });

  it('allows draft creation with warning when driver is on leave', () => {
    const inactiveDriver = { ...mockActiveDriver, status: 'on_leave' };

    const result = engine.validateForCreation({
      driver: inactiveDriver,
      vehicle: mockActiveVehicle,
      startDate: new Date('2026-10-23T08:00:00Z'),
      startingLocation: 'Chennai',
      finalDestination: 'Bengaluru',
      isDraft: true, // draft mode
    });

    expect(result.canProceed).toBe(true);
    expect(result.warnings.some((w) => w.includes('on_leave'))).toBe(true);
  });

  it('blocks dispatch when driver license has expired', () => {
    const expiredDriver = { ...mockActiveDriver, licenseExpiry: new Date('2025-01-01') };

    const result = engine.validateForCreation({
      driver: expiredDriver,
      vehicle: mockActiveVehicle,
      startDate: new Date('2026-10-23T08:00:00Z'),
      startingLocation: 'Chennai',
      finalDestination: 'Bengaluru',
      isDraft: false,
    });

    expect(result.canProceed).toBe(false);
    expect(result.blockingErrors.some((m) => m.includes('license expired'))).toBe(true);
  });

  it('blocks trip completion when odometer/distance record is missing or zero', () => {
    const trip: any = { id: 'trip-1', status: 'in_progress' };

    const resultWithoutRecord = engine.validateForCompletion({
      trip,
      odometerRecord: null,
    });
    expect(resultWithoutRecord.canProceed).toBe(false);
    expect(resultWithoutRecord.blockingErrors.some((m) => m.includes('without an odometer'))).toBe(true);

    const resultWithZeroDistance = engine.validateForCompletion({
      trip,
      odometerRecord: { acceptedDistance: 0, discrepancyFlag: false } as any,
    });
    expect(resultWithZeroDistance.canProceed).toBe(false);
    expect(resultWithZeroDistance.blockingErrors.some((m) => m.includes('no accepted distance'))).toBe(true);
  });

  it('requires a mandatory reason of >= 5 characters when cancelling in-progress trip', () => {
    const inProgressTrip: any = { id: 'trip-2', status: 'in_progress' };

    const noReasonResult = engine.validateForCancellation(inProgressTrip, '');
    expect(noReasonResult.canProceed).toBe(false);

    const shortReasonResult = engine.validateForCancellation(inProgressTrip, 'bad');
    expect(shortReasonResult.canProceed).toBe(false);

    const validReasonResult = engine.validateForCancellation(inProgressTrip, 'Vehicle breakdown on highway');
    expect(validReasonResult.canProceed).toBe(true);
  });
});
