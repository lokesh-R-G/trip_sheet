import { describe, it, expect } from 'vitest';
import { OdometerValidator } from './odometer-validator.js';
import { OdometerObservation } from './types.js';

describe('BE-07: Odometer Sequence Validation', () => {
  const validator = new OdometerValidator();

  it('validates a normal increasing sequence with matching reported distance', () => {
    const obs: OdometerObservation[] = [
      {
        vehicleId: 'v-1',
        reading: 100000,
        timestamp: new Date('2026-10-20T08:00:00Z'),
        source: 'measured',
        isStarting: true,
        context: 'trip_start',
      },
      {
        vehicleId: 'v-1',
        reading: 100450,
        timestamp: new Date('2026-10-20T18:00:00Z'),
        source: 'measured',
        isStarting: false,
        context: 'trip_end',
      },
    ];

    const result = validator.validateSequence({
      observations: obs,
      baselineOdometer: 99800,
      reportedDistance: 450,
    });

    expect(result.isValid).toBe(true);
    expect(result.hasBlockingDiscrepancy).toBe(false);
    expect(result.discrepancies.length).toBe(0);
  });

  it('detects decreasing readings (negative delta) as blocking discrepancy', () => {
    const obs: OdometerObservation[] = [
      {
        vehicleId: 'v-1',
        reading: 100500,
        timestamp: new Date('2026-10-20T08:00:00Z'),
        source: 'measured',
        isStarting: true,
        context: 'trip_start',
      },
      {
        vehicleId: 'v-1',
        reading: 100200,
        timestamp: new Date('2026-10-20T18:00:00Z'),
        source: 'measured',
        isStarting: false,
        context: 'trip_end',
      },
    ];

    const result = validator.validateSequence({
      observations: obs,
      baselineOdometer: 100000,
      reportedDistance: 300,
    });

    expect(result.isValid).toBe(false);
    expect(result.hasBlockingDiscrepancy).toBe(true);
    const negativeDiscrepancy = result.discrepancies.find((d) => d.code === 'NEGATIVE_DELTA');
    expect(negativeDiscrepancy).toBeDefined();
    expect(negativeDiscrepancy?.severity).toBe('blocking');
    expect(negativeDiscrepancy?.evidence.delta).toBe(-300);
  });

  it('detects historical rollback against vehicle baseline without arbitrary threshold', () => {
    const obs: OdometerObservation[] = [
      {
        vehicleId: 'v-1',
        reading: 98000,
        timestamp: new Date('2026-10-20T08:00:00Z'),
        source: 'measured',
        isStarting: true,
        context: 'trip_start',
      },
      {
        vehicleId: 'v-1',
        reading: 98500,
        timestamp: new Date('2026-10-20T18:00:00Z'),
        source: 'measured',
        isStarting: false,
        context: 'trip_end',
      },
    ];

    const result = validator.validateSequence({
      observations: obs,
      baselineOdometer: 100000, // Vehicle was already at 100,000 km!
    });

    expect(result.isValid).toBe(false);
    expect(result.hasBlockingDiscrepancy).toBe(true);
    const rollback = result.discrepancies.find((d) => d.code === 'HISTORICAL_ROLLBACK');
    expect(rollback).toBeDefined();
    expect(rollback?.severity).toBe('blocking');
    expect(rollback?.evidence.previousReading).toBe(100000);
    expect(rollback?.evidence.currentReading).toBe(98000);
  });

  it('detects mismatch between measured delta and reported distance as warning', () => {
    const obs: OdometerObservation[] = [
      {
        vehicleId: 'v-1',
        reading: 120000,
        timestamp: new Date('2026-10-20T08:00:00Z'),
        source: 'measured',
        isStarting: true,
        context: 'trip_start',
      },
      {
        vehicleId: 'v-1',
        reading: 120500, // measured = 500
        timestamp: new Date('2026-10-20T18:00:00Z'),
        source: 'measured',
        isStarting: false,
        context: 'trip_end',
      },
    ];

    const result = validator.validateSequence({
      observations: obs,
      reportedDistance: 480, // driver reported 480 km
    });

    expect(result.isValid).toBe(true); // not blocking
    expect(result.hasBlockingDiscrepancy).toBe(false);
    const mismatch = result.discrepancies.find((d) => d.code === 'REPORTED_DELTA_MISMATCH');
    expect(mismatch).toBeDefined();
    expect(mismatch?.severity).toBe('warning');
    expect(mismatch?.evidence.measuredDistance).toBe(500);
    expect(mismatch?.evidence.reportedDistance).toBe(480);
  });

  it('produces deterministic and repeatable validation outputs across repeated invocations', () => {
    const obs: OdometerObservation[] = [
      {
        vehicleId: 'v-1',
        reading: 100000,
        timestamp: new Date('2026-10-20T08:00:00Z'),
        source: 'measured',
        isStarting: true,
        context: 'trip_start',
      },
      {
        vehicleId: 'v-1',
        reading: 100400,
        timestamp: new Date('2026-10-20T18:00:00Z'),
        source: 'measured',
        isStarting: false,
        context: 'trip_end',
      },
    ];

    const run1 = validator.validateSequence({ observations: obs, baselineOdometer: 99000, reportedDistance: 400 });
    const run2 = validator.validateSequence({ observations: obs, baselineOdometer: 99000, reportedDistance: 400 });

    expect(run1).toEqual(run2);
  });
});
