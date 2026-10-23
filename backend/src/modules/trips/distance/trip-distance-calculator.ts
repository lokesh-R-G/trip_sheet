import {
  OdometerCase,
  OdometerValidationStatus,
  TripDistanceCalculationResult,
  TyreAttributionStatus,
} from './distance.types.js';
import { OdometerSequenceValidationResult } from '../../odometer/types.js';

export interface CalculatorInput {
  tripId?: string;
  startingReading?: number | null;
  endingReading?: number | null;
  reportedDistance?: number | null;
  sequenceValidation: OdometerSequenceValidationResult;
}

export class TripDistanceCalculator {
  /**
   * Evaluates candidate and accepted distances according to the 4 strict enterprise cases.
   * Preserves source readings and enforces distinct rules for analytics vs tyre attribution.
   */
  public calculate(input: CalculatorInput): TripDistanceCalculationResult {
    const { tripId, startingReading, endingReading, reportedDistance, sequenceValidation } = input;

    const hasStart = typeof startingReading === 'number' && !isNaN(startingReading);
    const hasEnd = typeof endingReading === 'number' && !isNaN(endingReading);
    const hasReported = typeof reportedDistance === 'number' && !isNaN(reportedDistance) && reportedDistance > 0;
    const now = new Date();

    // Case D: Sequence is inconsistent or blocking discrepancy exists (Case 4)
    if (sequenceValidation.hasBlockingDiscrepancy || (hasStart && hasEnd && endingReading! < startingReading!)) {
      const measured = hasStart && hasEnd ? endingReading! - startingReading! : undefined;
      const accepted = hasReported ? reportedDistance! : Math.max(0, measured || 0);

      const blockingMsg = sequenceValidation.discrepancies
        .filter((d) => d.severity === 'blocking')
        .map((d) => d.message)
        .join(' ');

      return {
        tripId,
        candidateDistance: measured ?? (reportedDistance || 0),
        measuredDistance: measured,
        reportedDistance: reportedDistance ?? undefined,
        acceptedDistance: accepted,
        distanceSource: hasReported ? 'reported' : 'measured',
        calculationMethod: 'case_4_inconsistent_sequence',
        odometerCase: 'case_4_inconsistent_sequence',
        validationStatus: 'discrepancy_held',
        isAcceptedForAnalytics: accepted > 0,
        isTyreAttributionEligible: false,
        tyreAttributionStatus: 'on_hold',
        tyreAttributionHoldReason: `Tyre attribution suspended due to odometer sequence discrepancy: ${blockingMsg || 'Inconsistent readings.'}`,
        discrepancyFlag: true,
        discrepancyReason: blockingMsg || 'Inconsistent odometer sequence detected.',
        discrepancies: sequenceValidation.discrepancies,
        calculatedAt: now,
      };
    }

    // Case A: Both readings available (Case 1)
    if (hasStart && hasEnd) {
      const measured = endingReading! - startingReading!;
      const warningDiscrepancies = sequenceValidation.discrepancies.filter((d) => d.severity === 'warning');

      return {
        tripId,
        candidateDistance: measured,
        measuredDistance: measured,
        reportedDistance: reportedDistance ?? undefined,
        acceptedDistance: measured,
        distanceSource: 'measured',
        calculationMethod: 'case_1_both_available (ending - starting)',
        odometerCase: 'case_1_both_available',
        validationStatus: 'verified',
        isAcceptedForAnalytics: true,
        isTyreAttributionEligible: true,
        tyreAttributionStatus: 'eligible',
        discrepancyFlag: warningDiscrepancies.length > 0,
        discrepancyReason: warningDiscrepancies.map((d) => d.message).join(' ') || undefined,
        discrepancies: sequenceValidation.discrepancies,
        calculatedAt: now,
      };
    }

    // Case B: Starting reading exists, ending reading missing, reported distance exists (Case 2)
    if (hasStart && !hasEnd && hasReported) {
      const derivedEnding = startingReading! + reportedDistance!;

      return {
        tripId,
        candidateDistance: reportedDistance!,
        derivedDistance: reportedDistance!,
        reportedDistance: reportedDistance!,
        acceptedDistance: reportedDistance!,
        derivedEndingReading: derivedEnding,
        distanceSource: 'derived',
        calculationMethod: 'case_2_derived_ending (starting + reportedDistance)',
        odometerCase: 'case_2_derived_ending',
        validationStatus: 'provisional',
        isAcceptedForAnalytics: true,
        isTyreAttributionEligible: true,
        tyreAttributionStatus: 'eligible',
        discrepancyFlag: false,
        discrepancyReason: 'Ending odometer derived from driver reported distance. Marked as derived, not measured.',
        discrepancies: sequenceValidation.discrepancies,
        calculatedAt: now,
      };
    }

    // Case C: Neither absolute reading available, reported distance exists (Case 3)
    if (!hasStart && !hasEnd && hasReported) {
      return {
        tripId,
        candidateDistance: reportedDistance!,
        reportedDistance: reportedDistance!,
        acceptedDistance: reportedDistance!,
        distanceSource: 'reported',
        calculationMethod: 'case_3_unreported_odometer (reported only)',
        odometerCase: 'case_3_unreported_odometer',
        validationStatus: 'unverified',
        isAcceptedForAnalytics: true,
        isTyreAttributionEligible: false,
        tyreAttributionStatus: 'on_hold',
        tyreAttributionHoldReason: 'Tyre attribution on hold: measured odometer sequence required by TLCM Pro.',
        discrepancyFlag: false,
        discrepancyReason: 'Odometer readings unavailable. Trip accepted for operational analytics only; absolute readings cannot be fabricated.',
        discrepancies: sequenceValidation.discrepancies,
        calculatedAt: now,
      };
    }

    // Fallback: No odometer readings and no reported distance
    return {
      tripId,
      candidateDistance: 0,
      acceptedDistance: 0,
      distanceSource: 'none',
      calculationMethod: 'missing_all_inputs',
      odometerCase: 'case_3_unreported_odometer',
      validationStatus: 'unverified',
      isAcceptedForAnalytics: false,
      isTyreAttributionEligible: false,
      tyreAttributionStatus: 'on_hold',
      tyreAttributionHoldReason: 'Both odometer readings and reported distance are missing.',
      discrepancyFlag: false,
      discrepancies: sequenceValidation.discrepancies,
      calculatedAt: now,
    };
  }
}

export const tripDistanceCalculator = new TripDistanceCalculator();
