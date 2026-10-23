import { DecimalValue, dec } from '../../../shared/decimal/index.js';
import { DomainValidationError } from '../../../shared/errors/index.js';

export interface FuelVarianceCalculationInput {
  acceptedDistanceKm: number | string | DecimalValue;
  actualAcceptedFuelLitres: number | string | DecimalValue;
  benchmarkMileageKmPerLitre: number | string | DecimalValue;
  tolerancePercent?: number | string | DecimalValue | null;
}

export interface FuelVarianceCalculationResult {
  acceptedDistanceKm: DecimalValue;
  actualAcceptedFuelLitres: DecimalValue;
  benchmarkMileageKmPerLitre: DecimalValue;
  tolerancePercent: DecimalValue;
  expectedFuelLitres: DecimalValue;
  allowedFuelLitres: DecimalValue;
  fuelVarianceLitres: DecimalValue;
  excessFuelLitres: DecimalValue;
  isExcess: boolean;
  isSaving: boolean;
}

export class FuelVarianceEngine {
  /**
   * Calculates expected fuel, approved tolerance allowance, variance, and excess fuel.
   * Expected fuel = distance / benchmark_mileage.
   * Variance = actual - expected.
   * Allowed = expected * (1 + tolerance/100).
   * Excess = max(0, actual - allowed).
   */
  calculate(input: FuelVarianceCalculationInput): FuelVarianceCalculationResult {
    const distanceDec = dec(input.acceptedDistanceKm);
    const actualFuelDec = dec(input.actualAcceptedFuelLitres);
    const benchmarkDec = dec(input.benchmarkMileageKmPerLitre);

    if (distanceDec.isNegative()) {
      throw new DomainValidationError('Accepted distance cannot be negative', [
        { field: 'acceptedDistanceKm', message: 'Distance cannot be negative' },
      ]);
    }

    if (actualFuelDec.isNegative()) {
      throw new DomainValidationError('Actual fuel cannot be negative', [
        { field: 'actualAcceptedFuelLitres', message: 'Fuel cannot be negative' },
      ]);
    }

    if (benchmarkDec.lessThanOrEqualTo(dec(0))) {
      throw new DomainValidationError('Benchmark mileage must be positive', [
        { field: 'benchmarkMileageKmPerLitre', message: 'Benchmark must be > 0' },
      ]);
    }

    // 1. Calculate Expected Fuel: distance / benchmark
    const expectedFuelLitres = distanceDec.div(benchmarkDec).round(2);

    // 2. Calculate Fuel Variance: actual - expected
    const fuelVarianceLitres = actualFuelDec.minus(expectedFuelLitres).round(2);

    // 3. Apply tolerance if specified
    const tolerancePercent = input.tolerancePercent ? dec(input.tolerancePercent) : dec(0);
    if (tolerancePercent.isNegative()) {
      throw new DomainValidationError('Tolerance percent cannot be negative', [
        { field: 'tolerancePercent', message: 'Tolerance cannot be negative' },
      ]);
    }

    let allowedFuelLitres: DecimalValue;
    if (tolerancePercent.greaterThan(dec(0))) {
      // allowed = expected * (1 + tolerance / 100)
      const toleranceMultiplier = dec(1).plus(tolerancePercent.div(dec(100)));
      allowedFuelLitres = expectedFuelLitres.times(toleranceMultiplier).round(2);
    } else {
      allowedFuelLitres = expectedFuelLitres;
    }

    // 4. Excess Fuel: max(0, actual - allowed)
    let excessFuelLitres = dec(0);
    if (actualFuelDec.greaterThan(allowedFuelLitres)) {
      excessFuelLitres = actualFuelDec.minus(allowedFuelLitres).round(2);
    }

    return {
      acceptedDistanceKm: distanceDec,
      actualAcceptedFuelLitres: actualFuelDec,
      benchmarkMileageKmPerLitre: benchmarkDec,
      tolerancePercent,
      expectedFuelLitres,
      allowedFuelLitres,
      fuelVarianceLitres,
      excessFuelLitres,
      isExcess: fuelVarianceLitres.greaterThan(dec(0)),
      isSaving: fuelVarianceLitres.lessThan(dec(0)),
    };
  }
}

export const fuelVarianceEngine = new FuelVarianceEngine();
