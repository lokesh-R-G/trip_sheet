import { OdometerDiscrepancy } from '../../odometer/types.js';

export type OdometerCase =
  | 'case_1_both_available'
  | 'case_2_derived_ending'
  | 'case_3_unreported_odometer'
  | 'case_4_inconsistent_sequence';

export type OdometerValidationStatus =
  | 'verified'
  | 'provisional'
  | 'discrepancy_held'
  | 'unverified';

export type TyreAttributionStatus = 'eligible' | 'on_hold' | 'attributed';

export type DistanceSource = 'measured' | 'derived' | 'reported' | 'none';

export interface TripDistanceCalculationInput {
  tripId?: string;
  vehicleId: string;
  startingReading?: number | null;
  startingTimestamp?: Date | null;
  startingSource?: string | null;
  endingReading?: number | null;
  endingTimestamp?: Date | null;
  endingSource?: string | null;
  reportedDistance?: number | null;
  previousVehicleOdometer?: number | null;
}

export interface TripDistanceCalculationResult {
  tripId?: string;
  candidateDistance: number;
  measuredDistance?: number;
  derivedDistance?: number;
  reportedDistance?: number;
  acceptedDistance: number;
  derivedEndingReading?: number;
  distanceSource: DistanceSource;
  calculationMethod: string;
  odometerCase: OdometerCase;
  validationStatus: OdometerValidationStatus;
  isAcceptedForAnalytics: boolean;
  isTyreAttributionEligible: boolean;
  tyreAttributionStatus: TyreAttributionStatus;
  tyreAttributionHoldReason?: string;
  discrepancyFlag: boolean;
  discrepancyReason?: string;
  discrepancies: OdometerDiscrepancy[];
  calculatedAt: Date;
}
