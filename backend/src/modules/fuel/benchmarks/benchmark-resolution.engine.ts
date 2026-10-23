import { MileageBenchmark } from '@prisma/client';
import { BenchmarkAmbiguityError } from '../../../shared/errors/index.js';
import { dec } from '../../../shared/decimal/index.js';

export interface TripBenchmarkContext {
  tripDate: Date | string;
  vehicleId: string;
  vehicleType?: string | null;
  tonnage?: number | string | null;
  terrain?: string | null;
  routeCategory?: string | null;
}

export interface BenchmarkResolutionResult {
  benchmark: MileageBenchmark | null;
  status: 'resolved' | 'no_benchmark';
  reason?: string;
  matchScore?: number;
}

export class BenchmarkResolutionEngine {
  /**
   * Resolves the most specific and highest priority benchmark for a trip.
   * Throws BenchmarkAmbiguityError if multiple equally applicable benchmarks conflict.
   * Returns explicit 'no_benchmark' status if none match.
   */
  resolve(benchmarks: MileageBenchmark[], context: TripBenchmarkContext): BenchmarkResolutionResult {
    const targetDate = new Date(context.tripDate);

    // 1. Filter active benchmarks effective on targetDate
    const eligible = benchmarks.filter((b) => {
      if (b.status !== 'active') return false;

      const from = new Date(b.effectiveFrom);
      if (targetDate < from) return false;

      if (b.effectiveTo) {
        const to = new Date(b.effectiveTo);
        if (targetDate > to) return false;
      }

      return true;
    });

    if (eligible.length === 0) {
      return {
        benchmark: null,
        status: 'no_benchmark',
        reason: 'No active benchmark matches the effective date.',
      };
    }

    // 2. Score each candidate by specificity and priority
    interface ScoredCandidate {
      benchmark: MileageBenchmark;
      score: number;
      specificityLevel: number;
    }

    const scored: ScoredCandidate[] = [];

    for (const b of eligible) {
      let specificity = 0;
      let matches = false;

      // Dimension 1: Specific vehicle match (highest precedence)
      if (b.vehicleId && b.vehicleId === context.vehicleId) {
        specificity += 1000;
        matches = true;
      } else if (!b.vehicleId) {
        // Vehicle type dimension
        if (b.vehicleType && context.vehicleType && b.vehicleType.toLowerCase() === context.vehicleType.toLowerCase()) {
          specificity += 200;
          matches = true;

          // Tonnage dimension
          if (context.tonnage !== undefined && context.tonnage !== null) {
            const tripTonnage = dec(context.tonnage);
            let tonnageMatches = true;

            if (b.minTonnage !== null && b.minTonnage !== undefined) {
              if (tripTonnage.lessThan(dec(b.minTonnage))) {
                tonnageMatches = false;
              }
            }
            if (b.maxTonnage !== null && b.maxTonnage !== undefined) {
              if (tripTonnage.greaterThan(dec(b.maxTonnage))) {
                tonnageMatches = false;
              }
            }

            const hasTonnageCriteria =
              (b.minTonnage !== null && b.minTonnage !== undefined) ||
              (b.maxTonnage !== null && b.maxTonnage !== undefined);

            if (tonnageMatches && hasTonnageCriteria) {
              specificity += 300; // specific tonnage match
            } else if (!tonnageMatches) {
              matches = false;
            }
          }
        }
      }

      if (!matches) continue;

      // Terrain dimension
      if (b.terrain && context.terrain) {
        if (b.terrain.toLowerCase() === context.terrain.toLowerCase()) {
          specificity += 50;
        } else {
          // Terrain mismatch
          continue;
        }
      }

      // Route category dimension
      if (b.routeCategory && context.routeCategory) {
        if (b.routeCategory.toLowerCase() === context.routeCategory.toLowerCase()) {
          specificity += 50;
        } else {
          continue;
        }
      }

      const totalScore = specificity + (b.priority || 1);
      scored.push({
        benchmark: b,
        score: totalScore,
        specificityLevel: specificity,
      });
    }

    if (scored.length === 0) {
      return {
        benchmark: null,
        status: 'no_benchmark',
        reason: 'No benchmark matches vehicle, tonnage, or route dimensions.',
      };
    }

    // 3. Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const top = scored[0];

    // 4. Ambiguity / conflict detection:
    // Check if there are other candidates with the EXACT SAME score but DIFFERENT expected mileage
    const conflicts = scored.filter(
      (c) =>
        c.score === top.score &&
        !dec(c.benchmark.expectedMileageKmPerLitre).equals(dec(top.benchmark.expectedMileageKmPerLitre))
    );

    if (conflicts.length > 0) {
      throw new BenchmarkAmbiguityError(
        `Ambiguous benchmark resolution: ${conflicts.length + 1} benchmarks match with equal specificity and priority (${top.score}) but have conflicting mileage targets.`
      );
    }

    return {
      benchmark: top.benchmark,
      status: 'resolved',
      matchScore: top.score,
    };
  }
}

export const benchmarkResolutionEngine = new BenchmarkResolutionEngine();
