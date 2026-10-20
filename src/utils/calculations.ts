import { OdometerCase, OdometerValidationStatus, TyreAttributionStatus } from '../types';

export interface OdometerEvaluationInput {
  startingReading?: number;
  endingReading?: number;
  reportedDistance?: number;
  previousVehicleOdometer?: number;
}

export interface OdometerEvaluationResult {
  odometerCase: OdometerCase;
  measuredDistance?: number;
  derivedDistance?: number;
  reportedDistance?: number;
  acceptedDistance: number;
  derivedEndingReading?: number;
  discrepancyFlag: boolean;
  discrepancyReason?: string;
  validationStatus: OdometerValidationStatus;
  tyreAttributionEligible: boolean;
  tyreAttributionStatus: TyreAttributionStatus;
  tyreAttributionHoldReason?: string;
}

/**
 * Business Rule 8 & 9 & 10:
 * Evaluates odometer and distance according to the 4 strict enterprise cases.
 * Never silently clamp or fabricate absolute readings.
 */
export function evaluateOdometerAndDistance(input: OdometerEvaluationInput): OdometerEvaluationResult {
  const { startingReading, endingReading, reportedDistance, previousVehicleOdometer } = input;

  const hasStart = typeof startingReading === 'number' && !isNaN(startingReading);
  const hasEnd = typeof endingReading === 'number' && !isNaN(endingReading);
  const hasReported = typeof reportedDistance === 'number' && !isNaN(reportedDistance) && reportedDistance > 0;

  // Case 4 Check: Sequence inconsistency
  if (hasStart && hasEnd && endingReading < startingReading) {
    return {
      odometerCase: 'case_4_inconsistent_sequence',
      measuredDistance: endingReading - startingReading,
      reportedDistance: reportedDistance,
      acceptedDistance: hasReported ? reportedDistance : Math.max(0, endingReading - startingReading),
      discrepancyFlag: true,
      discrepancyReason: `Ending odometer (${endingReading} km) is less than starting odometer (${startingReading} km). Negative delta detected.`,
      validationStatus: 'discrepancy_held',
      tyreAttributionEligible: false,
      tyreAttributionStatus: 'on_hold',
      tyreAttributionHoldReason: 'Tyre attribution suspended due to backward odometer sequence discrepancy.'
    };
  }

  // Check against vehicle's previous known odometer (backward jump check)
  if (hasStart && typeof previousVehicleOdometer === 'number' && startingReading < previousVehicleOdometer) {
    const delta = previousVehicleOdometer - startingReading;
    if (delta > 5) {
      return {
        odometerCase: 'case_4_inconsistent_sequence',
        measuredDistance: hasEnd ? endingReading - startingReading : undefined,
        reportedDistance: reportedDistance,
        acceptedDistance: hasEnd ? (endingReading - startingReading) : (reportedDistance || 0),
        discrepancyFlag: true,
        discrepancyReason: `Starting odometer (${startingReading} km) is lower than TLCM Pro master vehicle odometer (${previousVehicleOdometer} km). Possible odometer roll-back.`,
        validationStatus: 'discrepancy_held',
        tyreAttributionEligible: false,
        tyreAttributionStatus: 'on_hold',
        tyreAttributionHoldReason: 'Odometer starting reading jumps backward against vehicle historical master.'
      };
    }
  }

  // Case 1: Both readings available
  if (hasStart && hasEnd) {
    const measured = endingReading - startingReading;
    return {
      odometerCase: 'case_1_both_available',
      measuredDistance: measured,
      reportedDistance: reportedDistance,
      acceptedDistance: measured,
      discrepancyFlag: false,
      validationStatus: 'verified',
      tyreAttributionEligible: true,
      tyreAttributionStatus: 'eligible'
    };
  }

  // Case 2: Starting reading available, ending reading unavailable
  if (hasStart && !hasEnd && hasReported) {
    const derivedEnd = startingReading + reportedDistance;
    return {
      odometerCase: 'case_2_derived_ending',
      derivedDistance: reportedDistance,
      reportedDistance: reportedDistance,
      acceptedDistance: reportedDistance,
      derivedEndingReading: derivedEnd,
      discrepancyFlag: false,
      discrepancyReason: 'Ending odometer derived from driver reported distance. Marked as derived, not measured.',
      validationStatus: 'provisional',
      tyreAttributionEligible: true, // provisionally eligible pending supervisor sign-off
      tyreAttributionStatus: 'eligible'
    };
  }

  // Case 3: Both odometer readings unavailable
  if (!hasStart && !hasEnd && hasReported) {
    return {
      odometerCase: 'case_3_unreported_odometer',
      reportedDistance: reportedDistance,
      acceptedDistance: reportedDistance,
      discrepancyFlag: false,
      discrepancyReason: 'Odometer readings unavailable. Trip accepted for operational analytics only; absolute readings cannot be fabricated.',
      validationStatus: 'unverified',
      tyreAttributionEligible: false,
      tyreAttributionStatus: 'on_hold',
      tyreAttributionHoldReason: 'Tyre attribution on hold: TLCM Pro requires measured odometer readings for tyre lifecycle accumulation.'
    };
  }

  // Fallback default
  return {
    odometerCase: 'case_3_unreported_odometer',
    acceptedDistance: reportedDistance || 0,
    discrepancyFlag: false,
    validationStatus: 'unverified',
    tyreAttributionEligible: false,
    tyreAttributionStatus: 'on_hold',
    tyreAttributionHoldReason: 'Odometer readings and distance missing.'
  };
}

/**
 * Fuel consumption calculation
 * Fuel Consumed = Opening Fuel + Fuel Added - Closing Fuel
 */
export function calculateFuelConsumption(
  opening?: number,
  added?: number,
  closing?: number,
  manualLitres?: number,
  distance: number = 0
) {
  const hasOpening = typeof opening === 'number' && !isNaN(opening);
  const hasAdded = typeof added === 'number' && !isNaN(added);
  const hasClosing = typeof closing === 'number' && !isNaN(closing);
  const hasManual = typeof manualLitres === 'number' && !isNaN(manualLitres) && manualLitres > 0;

  let calculatedConsumption: number | undefined = undefined;
  if (hasOpening && hasAdded && hasClosing) {
    calculatedConsumption = Math.max(0, Math.round((opening + added - closing) * 100) / 100);
  }

  let acceptedFuelLitres = 0;
  let calculationStatus: 'verified' | 'discrepancy' | 'provisional' = 'provisional';

  if (calculatedConsumption !== undefined && hasManual) {
    acceptedFuelLitres = manualLitres;
    const diff = Math.abs(calculatedConsumption - manualLitres);
    if (diff > 5) {
      calculationStatus = 'discrepancy';
    } else {
      calculationStatus = 'verified';
    }
  } else if (calculatedConsumption !== undefined) {
    acceptedFuelLitres = calculatedConsumption;
    calculationStatus = 'verified';
  } else if (hasManual) {
    acceptedFuelLitres = manualLitres;
    calculationStatus = 'provisional';
  }

  let tripMileageKmPerLitre: number | undefined = undefined;
  let mileageStatus: 'valid' | 'pending_verification' | 'unavailable' = 'unavailable';

  if (distance > 0 && acceptedFuelLitres > 0) {
    tripMileageKmPerLitre = Math.round((distance / acceptedFuelLitres) * 100) / 100;
    mileageStatus = calculationStatus === 'discrepancy' ? 'pending_verification' : 'valid';
  }

  return {
    calculatedConsumption,
    acceptedFuelLitres,
    calculationStatus,
    tripMileageKmPerLitre,
    mileageStatus
  };
}

/**
 * Section G: Fuel Deduction Formula
 * Expected Fuel = Accepted Distance ÷ Benchmark Mileage
 * Allowed Fuel = Expected Fuel × (1 + Tolerance Percentage / 100)
 * Excess Fuel = MAX(0, Accepted Fuel − Allowed Fuel)
 * Potential Deduction = Excess Fuel × Applicable Fuel Price
 */
export function calculateFuelDeduction(
  distanceKm: number,
  acceptedFuelLitres: number,
  benchmarkMileage: number,
  tolerancePercent: number,
  fuelPrice: number
) {
  if (distanceKm <= 0 || acceptedFuelLitres <= 0 || benchmarkMileage <= 0) {
    return {
      expectedFuelLitres: 0,
      allowedFuelLitres: 0,
      excessFuelLitres: 0,
      potentialDeductionAmount: 0,
      isExcess: false
    };
  }

  const expectedFuelLitres = Math.round((distanceKm / benchmarkMileage) * 100) / 100;
  const allowedFuelLitres = Math.round((expectedFuelLitres * (1 + tolerancePercent / 100)) * 100) / 100;
  const excessFuelLitres = Math.max(0, Math.round((acceptedFuelLitres - allowedFuelLitres) * 100) / 100);
  const potentialDeductionAmount = Math.round((excessFuelLitres * fuelPrice) * 100) / 100;

  return {
    expectedFuelLitres,
    allowedFuelLitres,
    excessFuelLitres,
    potentialDeductionAmount,
    isExcess: excessFuelLitres > 0
  };
}

/**
 * Advance settlement formula
 * Outstanding Settlement Balance = Total Advances Issued − Total Approved Expenses − Amount Returned − Other Valid Credits
 */
export function calculateSettlementBalance(
  totalAdvancesIssued: number,
  totalApprovedExpenses: number,
  amountReturnedByDriver: number,
  otherValidCredits: number = 0
) {
  const balance = totalAdvancesIssued - totalApprovedExpenses - amountReturnedByDriver - otherValidCredits;
  return Math.round(balance * 100) / 100;
}
