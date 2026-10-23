export type OdometerReadingSource = 'measured' | 'manual' | 'derived';

export interface OdometerObservation {
  id?: string;
  vehicleId: string;
  tripId?: string;
  reading: number;
  timestamp: Date;
  source: OdometerReadingSource;
  isStarting: boolean;
  context: 'trip_start' | 'trip_end' | 'fuel_topup' | 'vehicle_master';
}

export type OdometerDiscrepancyCode =
  | 'NEGATIVE_DELTA'
  | 'HISTORICAL_ROLLBACK'
  | 'REPORTED_DELTA_MISMATCH'
  | 'MISSING_READING'
  | 'SEQUENCE_OVERLAP';

export interface OdometerDiscrepancy {
  code: OdometerDiscrepancyCode;
  message: string;
  severity: 'blocking' | 'warning' | 'informational';
  evidence: {
    previousReading?: number;
    currentReading?: number;
    delta?: number;
    reportedDistance?: number;
    measuredDistance?: number;
    vehicleId?: string;
    tripId?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

export interface OdometerSequenceValidationResult {
  isValid: boolean;
  hasBlockingDiscrepancy: boolean;
  discrepancies: OdometerDiscrepancy[];
  observations: OdometerObservation[];
  baselineOdometer?: number;
}
