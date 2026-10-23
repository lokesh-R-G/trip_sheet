import { describe, it, expect } from 'vitest';
import { TripDistanceCalculator } from './trip-distance-calculator.js';

describe('BE-06: Trip Distance Calculation Engine', () => {
  const calculator = new TripDistanceCalculator();

  it('Case A (Case 1): calculates distance when both opening and closing readings are available', () => {
    const result = calculator.calculate({
      tripId: 'trip-1',
      startingReading: 100000,
      endingReading: 100450,
      reportedDistance: 450,
      sequenceValidation: {
        isValid: true,
        hasBlockingDiscrepancy: false,
        discrepancies: [],
        observations: [],
      },
    });

    expect(result.odometerCase).toBe('case_1_both_available');
    expect(result.measuredDistance).toBe(450);
    expect(result.acceptedDistance).toBe(450);
    expect(result.distanceSource).toBe('measured');
    expect(result.validationStatus).toBe('verified');
    expect(result.isAcceptedForAnalytics).toBe(true);
    expect(result.isTyreAttributionEligible).toBe(true);
    expect(result.tyreAttributionStatus).toBe('eligible');
    expect(result.discrepancyFlag).toBe(false);
  });

  it('Case B (Case 2): derives closing reading from reported distance and marks as derived, not measured', () => {
    const result = calculator.calculate({
      tripId: 'trip-2',
      startingReading: 100000,
      endingReading: null, // missing closing reading
      reportedDistance: 350,
      sequenceValidation: {
        isValid: true,
        hasBlockingDiscrepancy: false,
        discrepancies: [],
        observations: [],
      },
    });

    expect(result.odometerCase).toBe('case_2_derived_ending');
    expect(result.measuredDistance).toBeUndefined();
    expect(result.derivedDistance).toBe(350);
    expect(result.acceptedDistance).toBe(350);
    expect(result.derivedEndingReading).toBe(100350);
    expect(result.distanceSource).toBe('derived');
    expect(result.validationStatus).toBe('provisional');
    expect(result.isAcceptedForAnalytics).toBe(true);
    expect(result.isTyreAttributionEligible).toBe(true);
  });

  it('Case C (Case 3): distance-only trip without odometer readings accepts reported distance for analytics but suspends tyre attribution', () => {
    const result = calculator.calculate({
      tripId: 'trip-3',
      startingReading: null,
      endingReading: null,
      reportedDistance: 500,
      sequenceValidation: {
        isValid: true,
        hasBlockingDiscrepancy: false,
        discrepancies: [],
        observations: [],
      },
    });

    expect(result.odometerCase).toBe('case_3_unreported_odometer');
    expect(result.measuredDistance).toBeUndefined();
    expect(result.derivedEndingReading).toBeUndefined(); // NEVER fabricated
    expect(result.acceptedDistance).toBe(500);
    expect(result.distanceSource).toBe('reported');
    expect(result.validationStatus).toBe('unverified');
    expect(result.isAcceptedForAnalytics).toBe(true);
    expect(result.isTyreAttributionEligible).toBe(false);
    expect(result.tyreAttributionStatus).toBe('on_hold');
    expect(result.tyreAttributionHoldReason).toContain('TLCM Pro');
  });

  it('Case D (Case 4): backward sequence / negative delta flags discrepancy and blocks tyre attribution', () => {
    const result = calculator.calculate({
      tripId: 'trip-4',
      startingReading: 100500,
      endingReading: 100200, // negative delta -300
      reportedDistance: 300,
      sequenceValidation: {
        isValid: false,
        hasBlockingDiscrepancy: true,
        discrepancies: [
          {
            code: 'NEGATIVE_DELTA',
            message: 'Ending odometer (100200 km) is lower than starting odometer (100500 km).',
            severity: 'blocking',
            evidence: { delta: -300 },
          },
        ],
        observations: [],
      },
    });

    expect(result.odometerCase).toBe('case_4_inconsistent_sequence');
    expect(result.validationStatus).toBe('discrepancy_held');
    expect(result.discrepancyFlag).toBe(true);
    expect(result.isTyreAttributionEligible).toBe(false);
    expect(result.tyreAttributionStatus).toBe('on_hold');
    // Reported distance preserved for analytics
    expect(result.acceptedDistance).toBe(300);
  });

  it('preserves measured and reported distances when they disagree and flags a warning discrepancy', () => {
    const result = calculator.calculate({
      tripId: 'trip-5',
      startingReading: 100000,
      endingReading: 100500, // measured = 500
      reportedDistance: 480, // reported = 480
      sequenceValidation: {
        isValid: true,
        hasBlockingDiscrepancy: false,
        discrepancies: [
          {
            code: 'REPORTED_DELTA_MISMATCH',
            message: 'Reported distance (480 km) disagrees with measured odometer delta (500 km).',
            severity: 'warning',
            evidence: { measuredDistance: 500, reportedDistance: 480 },
          },
        ],
        observations: [],
      },
    });

    expect(result.odometerCase).toBe('case_1_both_available');
    expect(result.measuredDistance).toBe(500);
    expect(result.reportedDistance).toBe(480);
    expect(result.acceptedDistance).toBe(500);
    expect(result.discrepancyFlag).toBe(true);
    expect(result.discrepancies.length).toBe(1);
  });
});
