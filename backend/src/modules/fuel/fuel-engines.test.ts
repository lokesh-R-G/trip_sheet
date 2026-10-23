import { describe, it, expect } from 'vitest';
import { fuelConsumptionEngine } from './consumption/fuel-consumption.engine.js';
import { mileageCalculationEngine } from './mileage/mileage-calculation.engine.js';
import { benchmarkResolutionEngine } from './benchmarks/benchmark-resolution.engine.js';
import { fuelVarianceEngine } from './variance/fuel-variance.engine.js';
import { DomainValidationError, BenchmarkAmbiguityError } from '../../shared/errors/index.js';
import { dec } from '../../shared/decimal/index.js';

describe('Phase 2: Fuel & Mileage Domain Engines (BE-13 to BE-16)', () => {
  // ========================================================
  // BE-13: Fuel Consumption Calculation Engine
  // ========================================================
  describe('BE-13: Fuel Consumption Engine', () => {
    it('1. calculates consumption with multiple additions (opening + additions - closing)', () => {
      // Opening: 100L, Additions: 50L + 75L, Closing: 85L -> Consumed = 100 + 125 - 85 = 140L
      const result = fuelConsumptionEngine.calculate({
        openingFuelQuantity: 100,
        closingFuelQuantity: 85,
        additions: [
          { litres: 50, verified: true, source: 'fuel_station' },
          { litres: 75, verified: true, source: 'bunkering' },
        ],
      });

      expect(result.calculationStatus).toBe('verified');
      expect(result.totalVerifiedAdditions.toString()).toBe('125');
      expect(result.calculatedConsumption?.toString()).toBe('140');
      expect(result.acceptedFuelLitres.toString()).toBe('140');
      expect(result.discrepancyFlag).toBe(false);
    });

    it('2. handles unverified additions separately without including in verified consumed balance', () => {
      const result = fuelConsumptionEngine.calculate({
        openingFuelQuantity: 100,
        closingFuelQuantity: 80,
        additions: [
          { litres: 40, verified: true },
          { litres: 20, verified: false }, // unverified
        ],
      });

      // Total verified additions = 40. Consumption = 100 + 40 - 80 = 60
      expect(result.totalVerifiedAdditions.toString()).toBe('40');
      expect(result.totalUnverifiedAdditions.toString()).toBe('20');
      expect(result.calculatedConsumption?.toString()).toBe('60');
      expect(result.acceptedFuelLitres.toString()).toBe('60');
    });

    it('3. handles missing opening or closing levels with provisional manual slip', () => {
      // Missing opening level, but manually reported 55L
      const result = fuelConsumptionEngine.calculate({
        openingFuelQuantity: null,
        closingFuelQuantity: 40,
        manuallyReportedLitres: 55,
      });

      expect(result.calculationStatus).toBe('provisional');
      expect(result.calculatedConsumption).toBeNull();
      expect(result.manuallyReportedLitres?.toString()).toBe('55');
      expect(result.acceptedFuelLitres.toString()).toBe('55');
      expect(result.measurementMethod).toBe('manual_slip');
    });

    it('4. handles missing measurements without manual slip as missing_inputs', () => {
      const result = fuelConsumptionEngine.calculate({
        openingFuelQuantity: null,
        closingFuelQuantity: null,
      });

      expect(result.calculationStatus).toBe('missing_inputs');
      expect(result.calculatedConsumption).toBeNull();
      expect(result.acceptedFuelLitres.isZero()).toBe(true);
    });

    it('5. rejects negative fuel additions and negative tank levels', () => {
      expect(() => {
        fuelConsumptionEngine.calculate({
          openingFuelQuantity: -10,
          closingFuelQuantity: 50,
        });
      }).toThrow(DomainValidationError);

      expect(() => {
        fuelConsumptionEngine.calculate({
          openingFuelQuantity: 100,
          closingFuelQuantity: -5,
        });
      }).toThrow(DomainValidationError);

      expect(() => {
        fuelConsumptionEngine.calculate({
          openingFuelQuantity: 100,
          closingFuelQuantity: 50,
          additions: [{ litres: -20, verified: true }],
        });
      }).toThrow(DomainValidationError);
    });

    it('6. rejects physically invalid fuel levels where closing exceeds total available fuel', () => {
      // Opening 50L + additions 20L = 70L available. Closing is 90L (impossible without other additions)
      expect(() => {
        fuelConsumptionEngine.calculate({
          openingFuelQuantity: 50,
          closingFuelQuantity: 90,
          additions: [{ litres: 20, verified: true }],
        });
      }).toThrow(DomainValidationError);
    });

    it('7. flags discrepancy between reported and calculated consumption without overwriting either', () => {
      // Opening: 100L, Closing: 60L -> Calculated = 40L. Driver manually reported: 48L
      const result = fuelConsumptionEngine.calculate({
        openingFuelQuantity: 100,
        closingFuelQuantity: 60,
        manuallyReportedLitres: 48,
      });

      expect(result.calculationStatus).toBe('discrepancy');
      expect(result.discrepancyFlag).toBe(true);
      expect(result.calculatedConsumption?.toString()).toBe('40');
      expect(result.manuallyReportedLitres?.toString()).toBe('48');
      expect(result.discrepancyDetails).toContain('differs from manually reported');
      expect(result.acceptedFuelLitres.toString()).toBe('40');
    });
  });

  // ========================================================
  // BE-14: Mileage Calculation Engine
  // ========================================================
  describe('BE-14: Mileage Calculation Engine', () => {
    it('8. calculates trip mileage correctly with valid inputs (acceptedDistance / acceptedFuel)', () => {
      // Distance: 450 km, Fuel: 100 L -> 4.50 km/L
      const result = mileageCalculationEngine.calculate({
        acceptedDistanceKm: 450,
        acceptedFuelLitres: 100,
        fuelCalculationStatus: 'verified',
        odometerValidationStatus: 'verified',
      });

      expect(result.mileageKmPerLitre?.toString()).toBe('4.5');
      expect(result.mileageStatus).toBe('valid');
      expect(result.tyreAttributionEligible).toBe(true);
    });

    it('9. prevents division by zero when fuel is zero or missing', () => {
      const result = mileageCalculationEngine.calculate({
        acceptedDistanceKm: 300,
        acceptedFuelLitres: 0,
      });

      expect(result.mileageKmPerLitre).toBeNull();
      expect(result.mileageStatus).toBe('unavailable');
      expect(result.statusReason).toContain('divide by zero');
    });

    it('10. handles missing distance guard', () => {
      const result = mileageCalculationEngine.calculate({
        acceptedDistanceKm: null,
        acceptedFuelLitres: 50,
      });

      expect(result.mileageKmPerLitre).toBeNull();
      expect(result.mileageStatus).toBe('unavailable');
    });

    it('11. marks status as pending_verification for provisional or discrepancy inputs', () => {
      const resultProvisional = mileageCalculationEngine.calculate({
        acceptedDistanceKm: 200,
        acceptedFuelLitres: 50,
        fuelCalculationStatus: 'provisional',
      });
      expect(resultProvisional.mileageStatus).toBe('pending_verification');

      const resultDiscrepancy = mileageCalculationEngine.calculate({
        acceptedDistanceKm: 200,
        acceptedFuelLitres: 50,
        fuelCalculationStatus: 'discrepancy',
      });
      expect(resultDiscrepancy.mileageStatus).toBe('pending_verification');
    });

    it('12. gates tyre attribution: derived closing odometer (Case 2) is blocked from tyre attribution', () => {
      const result = mileageCalculationEngine.calculate({
        acceptedDistanceKm: 350,
        acceptedFuelLitres: 70,
        fuelCalculationStatus: 'verified',
        odometerValidationStatus: 'verified',
        odometerCase: 'case_2_derived_ending',
        hasDerivedEndingReading: true,
      });

      expect(result.mileageKmPerLitre?.toString()).toBe('5');
      // Must NOT be eligible for tyre attribution by itself!
      expect(result.tyreAttributionEligible).toBe(false);
    });
  });

  // ========================================================
  // BE-15: Mileage Benchmark Resolution Engine
  // ========================================================
  describe('BE-15: Benchmark Resolution Engine', () => {
    const mockBenchmarks: any[] = [
      {
        id: 'bm-vehicle-spec',
        name: 'Specific Vehicle Benchmark',
        vehicleId: 'veh-001',
        vehicleType: 'Heavy Commercial',
        expectedMileageKmPerLitre: dec(4.8),
        permittedTolerancePercent: dec(5),
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: new Date('2026-12-31'),
        status: 'active',
        priority: 1,
      },
      {
        id: 'bm-type-tonnage',
        name: 'Type + Tonnage 16T to 25T Benchmark',
        vehicleId: null,
        vehicleType: 'Heavy Commercial',
        minTonnage: dec(16),
        maxTonnage: dec(25),
        expectedMileageKmPerLitre: dec(4.2),
        permittedTolerancePercent: dec(5),
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
        status: 'active',
        priority: 1,
      },
      {
        id: 'bm-general-type',
        name: 'General Heavy Commercial Benchmark',
        vehicleId: null,
        vehicleType: 'Heavy Commercial',
        expectedMileageKmPerLitre: dec(4.0),
        permittedTolerancePercent: dec(5),
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
        status: 'active',
        priority: 1,
      },
    ];

    it('13. prioritizes vehicle-specific benchmark over type and tonnage benchmarks', () => {
      const result = benchmarkResolutionEngine.resolve(mockBenchmarks, {
        tripDate: new Date('2026-06-15'),
        vehicleId: 'veh-001',
        vehicleType: 'Heavy Commercial',
        tonnage: 20,
      });

      expect(result.status).toBe('resolved');
      expect(result.benchmark?.id).toBe('bm-vehicle-spec');
      expect(result.benchmark?.expectedMileageKmPerLitre.toString()).toBe('4.8');
    });

    it('14. resolves type + tonnage benchmark when no specific vehicle benchmark exists', () => {
      const result = benchmarkResolutionEngine.resolve(mockBenchmarks, {
        tripDate: new Date('2026-06-15'),
        vehicleId: 'veh-999', // No specific vehicle benchmark
        vehicleType: 'Heavy Commercial',
        tonnage: 22,
      });

      expect(result.status).toBe('resolved');
      expect(result.benchmark?.id).toBe('bm-type-tonnage');
      expect(result.benchmark?.expectedMileageKmPerLitre.toString()).toBe('4.2');
    });

    it('15. respects effective dates and returns no_benchmark when outside valid date window', () => {
      const result = benchmarkResolutionEngine.resolve(mockBenchmarks, {
        tripDate: new Date('2025-05-01'), // Before effectiveFrom 2026-01-01
        vehicleId: 'veh-001',
        vehicleType: 'Heavy Commercial',
      });

      expect(result.status).toBe('no_benchmark');
      expect(result.benchmark).toBeNull();
    });

    it('16. throws BenchmarkAmbiguityError when multiple conflicting benchmarks have equal precedence', () => {
      const conflictingBenchmarks: any[] = [
        {
          id: 'conf-1',
          name: 'Conflict Policy Alpha',
          vehicleId: null,
          vehicleType: 'Trailer',
          expectedMileageKmPerLitre: dec(3.5),
          permittedTolerancePercent: dec(0),
          effectiveFrom: new Date('2026-01-01'),
          status: 'active',
          priority: 5,
        },
        {
          id: 'conf-2',
          name: 'Conflict Policy Beta',
          vehicleId: null,
          vehicleType: 'Trailer',
          expectedMileageKmPerLitre: dec(3.8), // Different target!
          permittedTolerancePercent: dec(0),
          effectiveFrom: new Date('2026-01-01'),
          status: 'active',
          priority: 5, // Identical priority and specificity
        },
      ];

      expect(() => {
        benchmarkResolutionEngine.resolve(conflictingBenchmarks, {
          tripDate: new Date('2026-05-01'),
          vehicleId: 'veh-trailer-01',
          vehicleType: 'Trailer',
        });
      }).toThrow(BenchmarkAmbiguityError);
    });
  });

  // ========================================================
  // BE-16: Fuel Variance Calculation Engine
  // ========================================================
  describe('BE-16: Fuel Variance Engine', () => {
    it('17. calculates positive variance (excess consumption) and negative variance (savings)', () => {
      // Distance: 400 km, Benchmark: 4.00 km/L -> Expected: 100 L
      // Actual: 110 L -> Variance = +10 L (excess)
      const excessResult = fuelVarianceEngine.calculate({
        acceptedDistanceKm: 400,
        actualAcceptedFuelLitres: 110,
        benchmarkMileageKmPerLitre: 4.0,
      });

      expect(excessResult.expectedFuelLitres.toString()).toBe('100');
      expect(excessResult.fuelVarianceLitres.toString()).toBe('10');
      expect(excessResult.isExcess).toBe(true);
      expect(excessResult.isSaving).toBe(false);

      // Actual: 92 L -> Variance = -8 L (savings)
      const savingsResult = fuelVarianceEngine.calculate({
        acceptedDistanceKm: 400,
        actualAcceptedFuelLitres: 92,
        benchmarkMileageKmPerLitre: 4.0,
      });

      expect(savingsResult.fuelVarianceLitres.toString()).toBe('-8');
      expect(savingsResult.isExcess).toBe(false);
      expect(savingsResult.isSaving).toBe(true);
      expect(savingsResult.excessFuelLitres.toString()).toBe('0');
    });

    it('18. applies approved tolerance percentage: allowed = expected * (1 + tol/100), excess = max(0, actual - allowed)', () => {
      // Distance: 400 km, Benchmark: 4.0 km/L -> Expected: 100 L
      // Tolerance: 5% -> Allowed: 105 L
      // Actual: 110 L -> Excess = 110 - 105 = 5 L
      const result = fuelVarianceEngine.calculate({
        acceptedDistanceKm: 400,
        actualAcceptedFuelLitres: 110,
        benchmarkMileageKmPerLitre: 4.0,
        tolerancePercent: 5,
      });

      expect(result.expectedFuelLitres.toString()).toBe('100');
      expect(result.allowedFuelLitres.toString()).toBe('105');
      expect(result.fuelVarianceLitres.toString()).toBe('10');
      expect(result.excessFuelLitres.toString()).toBe('5');
    });

    it('19. returns zero excess fuel when actual is within approved tolerance', () => {
      // Distance: 400 km, Expected: 100 L, Tolerance: 5% -> Allowed: 105 L
      // Actual: 103 L (variance is +3, but within 105 L allowed)
      const result = fuelVarianceEngine.calculate({
        acceptedDistanceKm: 400,
        actualAcceptedFuelLitres: 103,
        benchmarkMileageKmPerLitre: 4.0,
        tolerancePercent: 5,
      });

      expect(result.allowedFuelLitres.toString()).toBe('105');
      expect(result.fuelVarianceLitres.toString()).toBe('3');
      expect(result.excessFuelLitres.toString()).toBe('0');
    });
  });
});
