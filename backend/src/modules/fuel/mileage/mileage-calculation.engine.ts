import { DecimalValue, dec } from '../../../shared/decimal/index.js';
import { DomainValidationError } from '../../../shared/errors/index.js';

export interface MileageCalculationInput {
  acceptedDistanceKm: number | DecimalValue | null;
  acceptedFuelLitres: string | number | DecimalValue | null;
  fuelCalculationStatus?: 'verified' | 'discrepancy' | 'provisional' | 'missing_inputs';
  odometerValidationStatus?: 'verified' | 'provisional' | 'discrepancy_held' | 'unverified';
  odometerCase?: string;
  hasDerivedEndingReading?: boolean;
}

export interface MileageCalculationResult {
  mileageKmPerLitre: DecimalValue | null;
  mileageStatus: 'valid' | 'pending_verification' | 'unavailable' | 'disputed';
  tyreAttributionEligible: boolean;
  statusReason: string | null;
}

export class MileageCalculationEngine {
  /**
   * Calculates trip mileage: acceptedDistance (km) / acceptedFuelConsumed (L).
   * Validates zero fuel guards, measurement validity vs verification status,
   * and blocks tyre-distance attribution for derived odometers.
   */
  calculate(input: MileageCalculationInput): MileageCalculationResult {
    // 1. Guard against null or invalid distance
    if (input.acceptedDistanceKm === null || input.acceptedDistanceKm === undefined) {
      return {
        mileageKmPerLitre: null,
        mileageStatus: 'unavailable',
        tyreAttributionEligible: false,
        statusReason: 'Accepted distance is missing or not yet calculated.',
      };
    }

    const distanceDec = dec(input.acceptedDistanceKm);
    if (distanceDec.isNegative()) {
      return {
        mileageKmPerLitre: null,
        mileageStatus: 'disputed',
        tyreAttributionEligible: false,
        statusReason: 'Accepted distance cannot be negative.',
      };
    }

    if (distanceDec.isZero()) {
      return {
        mileageKmPerLitre: null,
        mileageStatus: 'unavailable',
        tyreAttributionEligible: false,
        statusReason: 'Distance is 0 km; cannot compute mileage.',
      };
    }

    // 2. Guard against null or zero fuel
    if (input.acceptedFuelLitres === null || input.acceptedFuelLitres === undefined) {
      return {
        mileageKmPerLitre: null,
        mileageStatus: 'unavailable',
        tyreAttributionEligible: false,
        statusReason: 'Accepted fuel consumption is missing.',
      };
    }

    const fuelDec = dec(input.acceptedFuelLitres);
    if (fuelDec.isNegative()) {
      return {
        mileageKmPerLitre: null,
        mileageStatus: 'disputed',
        tyreAttributionEligible: false,
        statusReason: 'Fuel consumption cannot be negative.',
      };
    }

    if (fuelDec.isZero()) {
      // Zero fuel guard: prevent division by zero
      return {
        mileageKmPerLitre: null,
        mileageStatus: 'unavailable',
        tyreAttributionEligible: false,
        statusReason: 'Fuel consumption is 0 L; cannot divide by zero.',
      };
    }

    // 3. Compute mileage (rounded to 2 decimal places)
    const mileageKmPerLitre = distanceDec.div(fuelDec).round(2);

    // 4. Determine mileage verification status
    let mileageStatus: 'valid' | 'pending_verification' | 'unavailable' | 'disputed' = 'valid';
    let statusReason: string | null = null;

    const fuelStatus = input.fuelCalculationStatus || 'verified';
    const odoStatus = input.odometerValidationStatus || 'verified';

    if (fuelStatus === 'discrepancy') {
      mileageStatus = 'pending_verification';
      statusReason = 'Fuel consumption has an active discrepancy with manual slip.';
    } else if (fuelStatus === 'provisional' || odoStatus === 'provisional') {
      mileageStatus = 'pending_verification';
      statusReason = 'Fuel consumption or odometer reading is provisional.';
    } else if (odoStatus === 'discrepancy_held' || odoStatus === 'unverified') {
      mileageStatus = 'disputed';
      statusReason = 'Odometer reading has held discrepancy or is unverified.';
    } else if (fuelStatus === 'missing_inputs') {
      mileageStatus = 'unavailable';
      statusReason = 'Fuel inputs are missing.';
    }

    // 5. Tyre attribution gating:
    // A derived closing odometer (Case 2) or inconsistent sequence CANNOT be eligible for tyre attribution by itself.
    let tyreAttributionEligible = true;
    if (
      input.hasDerivedEndingReading === true ||
      input.odometerCase === 'case_2_derived_ending' ||
      input.odometerCase === 'case_4_inconsistent_sequence' ||
      odoStatus !== 'verified'
    ) {
      tyreAttributionEligible = false;
    }

    return {
      mileageKmPerLitre,
      mileageStatus,
      tyreAttributionEligible,
      statusReason,
    };
  }
}

export const mileageCalculationEngine = new MileageCalculationEngine();
