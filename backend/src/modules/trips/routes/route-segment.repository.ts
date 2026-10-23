import { prisma, PrismaTransactionClient, handlePrismaError } from '../../../shared/database/prisma.js';
import { TripRouteSegment, Prisma } from '@prisma/client';
import { CreateRouteSegmentDTO, UpdateRouteSegmentDTO } from './dto/route-segment.dto.js';
import { dec } from '../../../shared/decimal/index.js';

export class RouteSegmentRepository {
  public async findByTripId(tripId: string, tx?: PrismaTransactionClient): Promise<TripRouteSegment[]> {
    const client = tx || prisma;
    try {
      return await client.tripRouteSegment.findMany({
        where: { tripId },
        orderBy: { sequence: 'asc' },
      });
    } catch (err) {
      return handlePrismaError(err, 'TripRouteSegment');
    }
  }

  public async findById(id: string, tx?: PrismaTransactionClient): Promise<TripRouteSegment | null> {
    const client = tx || prisma;
    try {
      return await client.tripRouteSegment.findUnique({
        where: { id },
      });
    } catch (err) {
      return handlePrismaError(err, 'TripRouteSegment');
    }
  }

  public async create(tripId: string, data: CreateRouteSegmentDTO, tx?: PrismaTransactionClient): Promise<TripRouteSegment> {
    const client = tx || prisma;
    try {
      return await client.tripRouteSegment.create({
        data: {
          tripId,
          sequence: data.sequence,
          fromLocation: data.fromLocation,
          toLocation: data.toLocation,
          departureTime: data.departureTime ? new Date(data.departureTime) : null,
          arrivalTime: data.arrivalTime ? new Date(data.arrivalTime) : null,
          distanceKm: new Prisma.Decimal(dec(data.distanceKm).toFixed(2)),
          tonnage: data.tonnage ? new Prisma.Decimal(dec(data.tonnage).toFixed(2)) : null,
          cargoDescription: data.cargoDescription ?? null,
          notes: data.notes ?? null,
        },
      });
    } catch (err) {
      return handlePrismaError(err, 'TripRouteSegment');
    }
  }

  public async update(id: string, data: UpdateRouteSegmentDTO, tx?: PrismaTransactionClient): Promise<TripRouteSegment> {
    const client = tx || prisma;
    const updatePayload: Prisma.TripRouteSegmentUpdateInput = {};

    if (data.fromLocation !== undefined) updatePayload.fromLocation = data.fromLocation;
    if (data.toLocation !== undefined) updatePayload.toLocation = data.toLocation;
    if (data.departureTime !== undefined) updatePayload.departureTime = data.departureTime ? new Date(data.departureTime) : null;
    if (data.arrivalTime !== undefined) updatePayload.arrivalTime = data.arrivalTime ? new Date(data.arrivalTime) : null;
    if (data.distanceKm !== undefined) updatePayload.distanceKm = new Prisma.Decimal(dec(data.distanceKm).toFixed(2));
    if (data.tonnage !== undefined) updatePayload.tonnage = data.tonnage ? new Prisma.Decimal(dec(data.tonnage).toFixed(2)) : null;
    if (data.cargoDescription !== undefined) updatePayload.cargoDescription = data.cargoDescription;
    if (data.notes !== undefined) updatePayload.notes = data.notes;

    try {
      return await client.tripRouteSegment.update({
        where: { id },
        data: updatePayload,
      });
    } catch (err) {
      return handlePrismaError(err, 'TripRouteSegment');
    }
  }

  public async delete(id: string, tx?: PrismaTransactionClient): Promise<void> {
    const client = tx || prisma;
    try {
      await client.tripRouteSegment.delete({ where: { id } });
    } catch (err) {
      return handlePrismaError(err, 'TripRouteSegment');
    }
  }

  /**
   * Reorders segments transactionally without violating unique constraint @@unique([tripId, sequence]).
   */
  public async reorder(
    tripId: string,
    reorderList: Array<{ segmentId: string; sequence: number }>,
    tx: PrismaTransactionClient
  ): Promise<TripRouteSegment[]> {
    try {
      // Step 1: Shift existing sequences to temporary offset (10000 + i) to avoid collision
      for (let i = 0; i < reorderList.length; i++) {
        const item = reorderList[i];
        await tx.tripRouteSegment.update({
          where: { id: item.segmentId },
          data: { sequence: 10000 + i + 1 },
        });
      }

      // Step 2: Assign target clean sequences (1, 2, 3...)
      for (const item of reorderList) {
        await tx.tripRouteSegment.update({
          where: { id: item.segmentId },
          data: { sequence: item.sequence },
        });
      }

      return await tx.tripRouteSegment.findMany({
        where: { tripId },
        orderBy: { sequence: 'asc' },
      });
    } catch (err) {
      return handlePrismaError(err, 'TripRouteSegment');
    }
  }
}

export const routeSegmentRepository = new RouteSegmentRepository();
