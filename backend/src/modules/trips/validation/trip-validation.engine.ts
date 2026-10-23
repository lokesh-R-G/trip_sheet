import { Driver, Vehicle, Trip, TripOdometerRecord, TripRouteSegment } from '@prisma/client';
import { OdometerDiscrepancy } from '../../odometer/types.js';

export interface TripValidationResult {
  canProceed: boolean;
  blockingErrors: string[];
  warnings: string[];
  pendingVerification: string[];
  discrepancies: OdometerDiscrepancy[];
}

export class TripValidationEngine {
  /**
   * Validates trip creation conditions.
   * In draft mode, fewer checks are blocking. In active dispatch mode, operational requirements apply.
   */
  public validateForCreation(params: {
    driver: Driver | null;
    vehicle: Vehicle | null;
    startDate: Date;
    endDate?: Date | null;
    startingLocation: string;
    finalDestination: string;
    isDraft: boolean;
  }): TripValidationResult {
    const blockingErrors: string[] = [];
    const warnings: string[] = [];

    // 1. Driver checks
    if (!params.driver) {
      blockingErrors.push('Driver does not exist or invalid driver ID provided.');
    } else {
      if (params.driver.status !== 'active') {
        if (params.isDraft) {
          warnings.push(`Driver ${params.driver.fullName} is currently "${params.driver.status}". Must be active before dispatch.`);
        } else {
          blockingErrors.push(`Driver ${params.driver.fullName} is "${params.driver.status}". Only active drivers can be dispatched on trips.`);
        }
      }

      if (params.driver.licenseExpiry < params.startDate) {
        if (params.isDraft) {
          warnings.push(`Driver license expired on ${params.driver.licenseExpiry.toISOString().split('T')[0]}. Must be renewed before trip dispatch.`);
        } else {
          blockingErrors.push(`Driver license expired on ${params.driver.licenseExpiry.toISOString().split('T')[0]}. Cannot dispatch trip.`);
        }
      }
    }

    // 2. Vehicle checks
    if (!params.vehicle) {
      blockingErrors.push('Vehicle does not exist or invalid vehicle ID provided.');
    } else {
      if (params.vehicle.status.toLowerCase() === 'decommissioned') {
        blockingErrors.push(`Vehicle ${params.vehicle.registrationNumber} is decommissioned and cannot be assigned to trips.`);
      } else if (params.vehicle.status.toLowerCase() === 'in_maintenance') {
        if (params.isDraft) {
          warnings.push(`Vehicle ${params.vehicle.registrationNumber} is in maintenance.`);
        } else {
          blockingErrors.push(`Vehicle ${params.vehicle.registrationNumber} is in maintenance. Cannot dispatch trip.`);
        }
      }
    }

    // 3. Location & dates
    if (!params.startingLocation.trim()) {
      blockingErrors.push('Starting location is required.');
    }
    if (!params.finalDestination.trim()) {
      blockingErrors.push('Final destination is required.');
    }
    if (params.endDate && params.endDate < params.startDate) {
      blockingErrors.push('Trip end date cannot be earlier than start date.');
    }

    return {
      canProceed: blockingErrors.length === 0,
      blockingErrors,
      warnings,
      pendingVerification: [],
      discrepancies: [],
    };
  }

  /**
   * Validates conditions required to dispatch a trip (draft -> in_progress).
   */
  public validateForDispatch(params: {
    trip: Trip;
    driver: Driver;
    vehicle: Vehicle;
    odometerRecord?: TripOdometerRecord | null;
  }): TripValidationResult {
    const blockingErrors: string[] = [];
    const warnings: string[] = [];

    if (params.trip.status !== 'draft') {
      blockingErrors.push(`Cannot dispatch trip in "${params.trip.status}" status. Only draft trips can be dispatched.`);
    }

    if (params.driver.status !== 'active') {
      blockingErrors.push(`Cannot dispatch: driver status is "${params.driver.status}".`);
    }

    if (params.driver.licenseExpiry < new Date()) {
      blockingErrors.push('Cannot dispatch: driver commercial license has expired.');
    }

    if (params.vehicle.status.toLowerCase() === 'decommissioned') {
      blockingErrors.push('Cannot dispatch: vehicle is decommissioned.');
    }

    return {
      canProceed: blockingErrors.length === 0,
      blockingErrors,
      warnings,
      pendingVerification: [],
      discrepancies: [],
    };
  }

  /**
   * Validates conditions required to close and complete a trip (in_progress -> completed).
   */
  public validateForCompletion(params: {
    trip: Trip;
    odometerRecord?: TripOdometerRecord | null;
    routeSegments?: TripRouteSegment[];
  }): TripValidationResult {
    const blockingErrors: string[] = [];
    const warnings: string[] = [];
    const pendingVerification: string[] = [];
    const discrepancies: OdometerDiscrepancy[] = [];

    if (params.trip.status !== 'in_progress') {
      blockingErrors.push(`Cannot complete trip in "${params.trip.status}" status. Trip must be in_progress.`);
    }

    if (!params.odometerRecord) {
      blockingErrors.push('Trip cannot be completed without an odometer/distance evaluation record.');
    } else {
      // Check odometer discrepancies
      if (params.odometerRecord.discrepancyFlag) {
        warnings.push(`Trip completed with open odometer discrepancy: ${params.odometerRecord.discrepancyReason || 'Discrepancy flagged'}`);
      }

      if (!params.odometerRecord.acceptedDistance || params.odometerRecord.acceptedDistance <= 0) {
        blockingErrors.push('Trip has no accepted distance recorded.');
      }

      if (!params.odometerRecord.tyreAttributionEligible) {
        pendingVerification.push('Tyre attribution is on hold for this trip.');
      }
    }

    return {
      canProceed: blockingErrors.length === 0,
      blockingErrors,
      warnings,
      pendingVerification,
      discrepancies,
    };
  }

  /**
   * Validates cancellation / abort conditions.
   */
  public validateForCancellation(trip: Trip, reason?: string): TripValidationResult {
    const blockingErrors: string[] = [];

    if (['completed', 'cancelled'].includes(trip.status)) {
      blockingErrors.push(`Trip is already in terminal state "${trip.status}" and cannot be cancelled.`);
    }

    if (trip.status === 'in_progress' && (!reason || reason.trim().length < 5)) {
      blockingErrors.push('A cancellation reason of at least 5 characters is mandatory for in-progress trips.');
    }

    return {
      canProceed: blockingErrors.length === 0,
      blockingErrors,
      warnings: [],
      pendingVerification: [],
      discrepancies: [],
    };
  }
}

export const tripValidationEngine = new TripValidationEngine();
