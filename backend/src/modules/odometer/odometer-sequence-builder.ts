import { prisma } from '../../shared/database/prisma.js';
import { OdometerObservation, OdometerReadingSource } from './types.js';

export interface TripOdometerInput {
  vehicleId: string;
  tripId?: string;
  startingReading?: number | null;
  startingTimestamp?: Date | null;
  startingSource?: OdometerReadingSource | null;
  endingReading?: number | null;
  endingTimestamp?: Date | null;
  endingSource?: OdometerReadingSource | null;
}

export class OdometerSequenceBuilder {
  /**
   * Constructs the collection of chronological odometer observations for a trip and relevant fuel top-ups.
   */
  public async buildTripObservations(input: TripOdometerInput): Promise<OdometerObservation[]> {
    const observations: OdometerObservation[] = [];
    const startTimestamp = input.startingTimestamp || new Date();

    if (typeof input.startingReading === 'number' && !isNaN(input.startingReading)) {
      observations.push({
        vehicleId: input.vehicleId,
        tripId: input.tripId,
        reading: input.startingReading,
        timestamp: startTimestamp,
        source: input.startingSource || 'measured',
        isStarting: true,
        context: 'trip_start',
      });
    }

    // Query any fuel top-up odometer readings recorded between starting and ending times
    if (input.startingTimestamp && input.endingTimestamp) {
      try {
        const topUps = await prisma.fuelTopUp.findMany({
          where: {
            vehicleId: input.vehicleId,
            dateTime: {
              gte: input.startingTimestamp,
              lte: input.endingTimestamp,
            },
            odometerReading: { not: null },
          },
          select: { id: true, odometerReading: true, dateTime: true },
        });

        for (const tu of topUps) {
          if (tu.odometerReading !== null) {
            observations.push({
              id: tu.id,
              vehicleId: input.vehicleId,
              reading: tu.odometerReading,
              timestamp: tu.dateTime,
              source: 'manual',
              isStarting: false,
              context: 'fuel_topup',
            });
          }
        }
      } catch {
        // Safe fallback if database query is not in scope
      }
    }

    if (typeof input.endingReading === 'number' && !isNaN(input.endingReading)) {
      const endTimestamp = input.endingTimestamp
        ? input.endingTimestamp
        : new Date(Math.max(Date.now(), startTimestamp.getTime() + 1000));

      observations.push({
        vehicleId: input.vehicleId,
        tripId: input.tripId,
        reading: input.endingReading,
        timestamp: endTimestamp,
        source: input.endingSource || 'measured',
        isStarting: false,
        context: 'trip_end',
      });
    }

    return observations;
  }
}

export const odometerSequenceBuilder = new OdometerSequenceBuilder();
