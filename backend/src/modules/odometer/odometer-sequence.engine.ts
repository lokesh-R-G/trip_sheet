import { odometerBaselineResolver, OdometerBaselineResolver } from './odometer-baseline.resolver.js';
import { odometerSequenceBuilder, OdometerSequenceBuilder, TripOdometerInput } from './odometer-sequence-builder.js';
import { odometerValidator, OdometerValidator } from './odometer-validator.js';
import { OdometerSequenceValidationResult } from './types.js';

export interface EvaluateTripSequenceParams extends TripOdometerInput {
  reportedDistance?: number | null;
  previousVehicleOdometerOverride?: number;
}

export class OdometerSequenceEngine {
  constructor(
    private readonly baselineResolver: OdometerBaselineResolver = odometerBaselineResolver,
    private readonly sequenceBuilder: OdometerSequenceBuilder = odometerSequenceBuilder,
    private readonly validator: OdometerValidator = odometerValidator
  ) {}

  public async evaluateSequence(params: EvaluateTripSequenceParams): Promise<OdometerSequenceValidationResult> {
    let baselineOdometer = params.previousVehicleOdometerOverride;

    if (baselineOdometer === undefined && params.vehicleId) {
      const baselineInfo = await this.baselineResolver.resolveBaseline(
        params.vehicleId,
        params.startingTimestamp ? new Date(params.startingTimestamp) : undefined,
        params.tripId
      );
      baselineOdometer = baselineInfo?.effectiveBaselineOdometer;
    }

    const observations = await this.sequenceBuilder.buildTripObservations(params);

    return this.validator.validateSequence({
      observations,
      baselineOdometer,
      reportedDistance: params.reportedDistance ?? undefined,
    });
  }
}

export const odometerSequenceEngine = new OdometerSequenceEngine();
