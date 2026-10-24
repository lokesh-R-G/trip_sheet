import { prisma } from '../../shared/database/prisma.js';

export interface VehicleBaselineInfo {
  vehicleId: string;
  registrationNumber: string;
  masterLatestOdometer: number;
  lastTripEndingOdometer?: number | null;
  effectiveBaselineOdometer: number;
}

import { externalVehicleRepository } from '../vehicles/external-vehicle.repository.js';

export class OdometerBaselineResolver {
  public async resolveBaseline(vehicleId: string, beforeTimestamp?: Date, excludeTripId?: string): Promise<VehicleBaselineInfo | null> {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, tlcmVehicleId: true, registrationNumber: true, latestOdometer: true },
    });

    if (!vehicle) {
      return null;
    }

    // Attempt to query the external vehicle system for the authoritative baseline
    let authoritativeMasterOdometer = vehicle.latestOdometer;
    try {
      const extOdo = await externalVehicleRepository.getLatestAuthoritativeOdometer(vehicle.tlcmVehicleId || vehicle.registrationNumber);
      if (extOdo && extOdo.latestOdometer > 0) {
        authoritativeMasterOdometer = extOdo.latestOdometer;
      }
    } catch {
      // If external DB is temporarily unreachable during baseline resolve, fall back to local cached latestOdometer
    }

    // Find the latest completed or verified trip odometer record before this trip
    const whereClause: any = {
      trip: {
        vehicleId,
        ...(excludeTripId ? { id: { not: excludeTripId } } : {}),
      },
      endingReading: { not: null },
    };

    if (beforeTimestamp) {
      whereClause.endingTimestamp = { lte: beforeTimestamp };
    }

    const lastTripRecord = await prisma.tripOdometerRecord.findFirst({
      where: whereClause,
      orderBy: { endingTimestamp: 'desc' },
      select: { endingReading: true, endingTimestamp: true },
    });

    const lastTripEnding = lastTripRecord?.endingReading ?? null;
    const effectiveBaseline = Math.max(authoritativeMasterOdometer, lastTripEnding || 0);

    return {
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      masterLatestOdometer: authoritativeMasterOdometer,
      lastTripEndingOdometer: lastTripEnding,
      effectiveBaselineOdometer: effectiveBaseline,
    };
  }
}

export const odometerBaselineResolver = new OdometerBaselineResolver();
