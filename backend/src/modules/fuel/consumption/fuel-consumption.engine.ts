import { DecimalValue, dec } from '../../../shared/decimal/index.js';
import { DomainValidationError } from '../../../shared/errors/index.js';

export interface FuelAdditionItem {
  id?: string;
  litres: string | number | DecimalValue;
  verified: boolean;
  source?: string;
  receiptReference?: string | null;
}

export interface FuelConsumptionCalculationInput {
  openingFuelQuantity?: string | number | DecimalValue | null;
  closingFuelQuantity?: string | number | DecimalValue | null;
  additions?: FuelAdditionItem[];
  manuallyReportedLitres?: string | number | DecimalValue | null;
  measurementMethod?: 'calculated_balance' | 'manual_slip' | 'fuel_sensor';
}

export interface FuelConsumptionCalculationResult {
  openingFuelQuantity: DecimalValue | null;
  closingFuelQuantity: DecimalValue | null;
  totalVerifiedAdditions: DecimalValue;
  totalUnverifiedAdditions: DecimalValue;
  calculatedConsumption: DecimalValue | null;
  manuallyReportedLitres: DecimalValue | null;
  acceptedFuelLitres: DecimalValue;
  measurementMethod: 'calculated_balance' | 'manual_slip' | 'fuel_sensor';
  calculationStatus: 'verified' | 'discrepancy' | 'provisional' | 'missing_inputs';
  discrepancyFlag: boolean;
  discrepancyDetails: string | null;
}

export class FuelConsumptionEngine {
  /**
   * Calculates fuel consumed using: opening + verified_additions - closing.
   * Handles multiple additions, flags invalid quantities, distinguishes
   * calculated vs manually reported values, and detects discrepancies without overwriting.
   */
  calculate(input: FuelConsumptionCalculationInput): FuelConsumptionCalculationResult {
    // 1. Process additions
    let verifiedSum = dec(0);
    let unverifiedSum = dec(0);

    if (input.additions && input.additions.length > 0) {
      for (const addition of input.additions) {
        const litresDec = dec(addition.litres);
        if (litresDec.isNegative()) {
          throw new DomainValidationError('Fuel addition quantity cannot be negative', [
            { field: 'litres', message: `Negative addition not allowed: ${addition.litres}` },
          ]);
        }
        if (addition.verified) {
          verifiedSum = verifiedSum.plus(litresDec);
        } else {
          unverifiedSum = unverifiedSum.plus(litresDec);
        }
      }
    }

    // 2. Parse opening & closing
    let openingDec: DecimalValue | null = null;
    if (input.openingFuelQuantity !== undefined && input.openingFuelQuantity !== null) {
      openingDec = dec(input.openingFuelQuantity);
      if (openingDec.isNegative()) {
        throw new DomainValidationError('Opening fuel quantity cannot be negative', [
          { field: 'openingFuelQuantity', message: `Negative opening fuel: ${input.openingFuelQuantity}` },
        ]);
      }
    }

    let closingDec: DecimalValue | null = null;
    if (input.closingFuelQuantity !== undefined && input.closingFuelQuantity !== null) {
      closingDec = dec(input.closingFuelQuantity);
      if (closingDec.isNegative()) {
        throw new DomainValidationError('Closing fuel quantity cannot be negative', [
          { field: 'closingFuelQuantity', message: `Negative closing fuel: ${input.closingFuelQuantity}` },
        ]);
      }
    }

    // 3. Parse manually reported litres
    let manualDec: DecimalValue | null = null;
    if (input.manuallyReportedLitres !== undefined && input.manuallyReportedLitres !== null) {
      manualDec = dec(input.manuallyReportedLitres);
      if (manualDec.isNegative()) {
        throw new DomainValidationError('Manually reported fuel consumption cannot be negative', [
          { field: 'manuallyReportedLitres', message: `Negative manually reported fuel: ${input.manuallyReportedLitres}` },
        ]);
      }
    }

    const defaultMethod = input.measurementMethod || (openingDec && closingDec ? 'calculated_balance' : 'manual_slip');

    // 4. Case: Missing opening or closing measurements
    if (openingDec === null || closingDec === null) {
      if (manualDec !== null) {
        return {
          openingFuelQuantity: openingDec,
          closingFuelQuantity: closingDec,
          totalVerifiedAdditions: verifiedSum,
          totalUnverifiedAdditions: unverifiedSum,
          calculatedConsumption: null,
          manuallyReportedLitres: manualDec,
          acceptedFuelLitres: manualDec,
          measurementMethod: 'manual_slip',
          calculationStatus: 'provisional',
          discrepancyFlag: false,
          discrepancyDetails: 'Consumption based on provisional manually reported slips due to missing tank levels.',
        };
      }

      return {
        openingFuelQuantity: openingDec,
        closingFuelQuantity: closingDec,
        totalVerifiedAdditions: verifiedSum,
        totalUnverifiedAdditions: unverifiedSum,
        calculatedConsumption: null,
        manuallyReportedLitres: null,
        acceptedFuelLitres: dec(0),
        measurementMethod: defaultMethod,
        calculationStatus: 'missing_inputs',
        discrepancyFlag: false,
        discrepancyDetails: 'Missing required fuel tank readings (opening or closing level not provided).',
      };
    }

    // 5. Calculate consumption: opening + additions - closing
    const totalAvailableFuel = openingDec.plus(verifiedSum);
    if (closingDec.greaterThan(totalAvailableFuel)) {
      // Physical anomaly: Tank has more fuel than was present + added
      const anomalyDiff = closingDec.minus(totalAvailableFuel);
      throw new DomainValidationError(
        `Physically invalid fuel levels: closing fuel (${closingDec.toString()} L) exceeds opening + additions (${totalAvailableFuel.toString()} L) by ${anomalyDiff.toString()} L.`,
        [{ field: 'closingFuelQuantity', message: 'Closing fuel exceeds total available fuel' }]
      );
    }

    const calculatedConsumption = totalAvailableFuel.minus(closingDec);

    // 6. Check for discrepancy with manually reported consumption
    let discrepancyFlag = false;
    let discrepancyDetails: string | null = null;
    let calculationStatus: 'verified' | 'discrepancy' | 'provisional' = 'verified';

    if (manualDec !== null) {
      if (!calculatedConsumption.equals(manualDec)) {
        discrepancyFlag = true;
        const diff = calculatedConsumption.minus(manualDec).abs();
        discrepancyDetails = `Calculated consumption (${calculatedConsumption.toString()} L) differs from manually reported (${manualDec.toString()} L) by ${diff.toString()} L.`;
        calculationStatus = 'discrepancy';
      }
    }

    return {
      openingFuelQuantity: openingDec,
      closingFuelQuantity: closingDec,
      totalVerifiedAdditions: verifiedSum,
      totalUnverifiedAdditions: unverifiedSum,
      calculatedConsumption,
      manuallyReportedLitres: manualDec,
      acceptedFuelLitres: calculatedConsumption,
      measurementMethod: 'calculated_balance',
      calculationStatus,
      discrepancyFlag,
      discrepancyDetails,
    };
  }
}

export const fuelConsumptionEngine = new FuelConsumptionEngine();
