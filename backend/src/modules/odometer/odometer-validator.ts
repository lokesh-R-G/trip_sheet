import {
  OdometerObservation,
  OdometerDiscrepancy,
  OdometerSequenceValidationResult,
} from './types.js';

export interface ValidationParams {
  observations: OdometerObservation[];
  baselineOdometer?: number;
  reportedDistance?: number;
}

export class OdometerValidator {
  /**
   * Validates chronological odometer observations against sequence rules.
   * Deterministic, side-effect free, and returns structured discrepancies.
   */
  public validateSequence(params: ValidationParams): OdometerSequenceValidationResult {
    const { observations, baselineOdometer, reportedDistance } = params;
    const discrepancies: OdometerDiscrepancy[] = [];

    // Sort observations deterministically: timestamp ascending, then start before end
    const sorted = [...observations].sort((a, b) => {
      const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
      if (timeDiff !== 0) return timeDiff;
      if (a.isStarting && !b.isStarting) return -1;
      if (!a.isStarting && b.isStarting) return 1;
      return 0;
    });

    const startObs = sorted.find((o) => o.isStarting);
    const endObs = sorted.find((o) => !o.isStarting);

    // Rule 1: Check start reading against vehicle baseline (detect rollback)
    if (startObs && baselineOdometer !== undefined && baselineOdometer > 0) {
      if (startObs.reading < baselineOdometer) {
        discrepancies.push({
          code: 'HISTORICAL_ROLLBACK',
          message: `Starting odometer (${startObs.reading} km) is lower than vehicle historical baseline (${baselineOdometer} km). Possible odometer rollback or unrecorded trip.`,
          severity: 'blocking',
          evidence: {
            currentReading: startObs.reading,
            previousReading: baselineOdometer,
            delta: startObs.reading - baselineOdometer,
            timestamp: startObs.timestamp.toISOString(),
          },
        });
      }
    }

    // Rule 2: Check internal trip sequence (ending < starting)
    if (startObs && endObs) {
      if (endObs.reading < startObs.reading) {
        discrepancies.push({
          code: 'NEGATIVE_DELTA',
          message: `Ending odometer reading (${endObs.reading} km) is lower than starting odometer reading (${startObs.reading} km). Negative delta detected.`,
          severity: 'blocking',
          evidence: {
            currentReading: endObs.reading,
            previousReading: startObs.reading,
            delta: endObs.reading - startObs.reading,
          },
        });
      } else if (reportedDistance !== undefined && reportedDistance > 0) {
        const measured = endObs.reading - startObs.reading;
        if (measured !== reportedDistance) {
          discrepancies.push({
            code: 'REPORTED_DELTA_MISMATCH',
            message: `Reported distance (${reportedDistance} km) disagrees with measured odometer delta (${measured} km).`,
            severity: 'warning',
            evidence: {
              measuredDistance: measured,
              reportedDistance,
              delta: Math.abs(measured - reportedDistance),
            },
          });
        }
      }
    }

    // Rule 3: Check sequential integrity between successive readings in observations
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      if (curr.reading < prev.reading && !discrepancies.some((d) => d.code === 'NEGATIVE_DELTA')) {
        discrepancies.push({
          code: 'NEGATIVE_DELTA',
          message: `Sequence violation: reading at ${curr.timestamp.toISOString()} (${curr.reading} km) is less than preceding reading (${prev.reading} km).`,
          severity: 'blocking',
          evidence: {
            currentReading: curr.reading,
            previousReading: prev.reading,
            delta: curr.reading - prev.reading,
          },
        });
      }
    }

    const hasBlocking = discrepancies.some((d) => d.severity === 'blocking');

    return {
      isValid: !hasBlocking,
      hasBlockingDiscrepancy: hasBlocking,
      discrepancies,
      observations: sorted,
      baselineOdometer,
    };
  }
}

export const odometerValidator = new OdometerValidator();
