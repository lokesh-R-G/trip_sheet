import { odometerSequenceEngine, OdometerSequenceEngine } from '../../odometer/odometer-sequence.engine.js';
import { tripDistanceCalculator, TripDistanceCalculator } from './trip-distance-calculator.js';
import { TripDistanceCalculationInput, TripDistanceCalculationResult } from './distance.types.js';

export class TripDistanceEngine {
  constructor(
    private readonly sequenceEngine: OdometerSequenceEngine = odometerSequenceEngine,
    private readonly calculator: TripDistanceCalculator = tripDistanceCalculator
  ) {}

  public async evaluateDistance(input: TripDistanceCalculationInput): Promise<TripDistanceCalculationResult> {
    const sequenceValidation = await this.sequenceEngine.evaluateSequence({
      vehicleId: input.vehicleId,
      tripId: input.tripId,
      startingReading: input.startingReading,
      startingTimestamp: input.startingTimestamp,
      startingSource: (input.startingSource as any) || 'measured',
      endingReading: input.endingReading,
      endingTimestamp: input.endingTimestamp,
      endingSource: (input.endingSource as any) || 'measured',
      reportedDistance: input.reportedDistance,
      previousVehicleOdometerOverride: input.previousVehicleOdometer ?? undefined,
    });

    return this.calculator.calculate({
      tripId: input.tripId,
      startingReading: input.startingReading,
      endingReading: input.endingReading,
      reportedDistance: input.reportedDistance,
      sequenceValidation,
    });
  }
}

export const tripDistanceEngine = new TripDistanceEngine();
