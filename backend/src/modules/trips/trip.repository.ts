import { prisma, PrismaTransactionClient, handlePrismaError } from '../../shared/database/prisma.js';
import { Trip, TripOdometerRecord, Prisma } from '@prisma/client';
import { ConcurrencyConflictError } from '../../shared/errors/index.js';

export interface TripQueryFilters {
  status?: string;
  driverId?: string;
  vehicleId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export type TripWithRelations = Trip & {
  driver: { fullName: string; driverNumber: string };
  vehicle: { registrationNumber: string; latestOdometer: number };
  odometerRecord: TripOdometerRecord | null;
  routeSegments: any[];
};

export class TripRepository {
  public async generateNextTripNumber(tx?: PrismaTransactionClient): Promise<string> {
    const client = tx || prisma;
    const year = new Date().getFullYear();
    const count = await client.trip.count({
      where: {
        tripNumber: { startsWith: `TRIP-${year}-` },
      },
    });
    const seq = (count + 1).toString().padStart(4, '0');
    return `TRIP-${year}-${seq}`;
  }

  public async findById(id: string, tx?: PrismaTransactionClient): Promise<TripWithRelations | null> {
    const client = tx || prisma;
    try {
      return await client.trip.findUnique({
        where: { id },
        include: {
          driver: { select: { fullName: true, driverNumber: true } },
          vehicle: { select: { registrationNumber: true, latestOdometer: true } },
          odometerRecord: true,
          routeSegments: { orderBy: { sequence: 'asc' } },
        },
      });
    } catch (err) {
      return handlePrismaError(err, 'Trip');
    }
  }

  public async findMany(filters: TripQueryFilters): Promise<{ trips: TripWithRelations[]; total: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.TripWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.search) {
      const q = filters.search;
      where.OR = [
        { tripNumber: { contains: q, mode: 'insensitive' } },
        { startingLocation: { contains: q, mode: 'insensitive' } },
        { finalDestination: { contains: q, mode: 'insensitive' } },
        { purpose: { contains: q, mode: 'insensitive' } },
      ];
    }

    try {
      const [trips, total] = await Promise.all([
        prisma.trip.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            driver: { select: { fullName: true, driverNumber: true } },
            vehicle: { select: { registrationNumber: true, latestOdometer: true } },
            odometerRecord: true,
            routeSegments: { orderBy: { sequence: 'asc' } },
          },
        }),
        prisma.trip.count({ where }),
      ]);

      return { trips, total };
    } catch (err) {
      return handlePrismaError(err, 'Trip');
    }
  }

  public async create(
    data: Prisma.TripCreateInput,
    tx?: PrismaTransactionClient
  ): Promise<Trip> {
    const client = tx || prisma;
    try {
      return await client.trip.create({ data });
    } catch (err) {
      return handlePrismaError(err, 'Trip');
    }
  }

  /**
   * Updates a trip with optimistic concurrency locking on version column.
   * Throws ConcurrencyConflictError if expectedVersion does not match.
   */
  public async updateWithOptimisticLock(
    id: string,
    expectedVersion: number,
    data: Prisma.TripUpdateInput,
    tx: PrismaTransactionClient
  ): Promise<Trip> {
    try {
      // Find current version
      const current = await tx.trip.findUnique({
        where: { id },
        select: { version: true },
      });

      if (!current) {
        throw new Error('Trip not found');
      }

      if (current.version !== expectedVersion) {
        throw new ConcurrencyConflictError(
          `Trip was updated by another request. Current version is ${current.version}, expected ${expectedVersion}.`
        );
      }

      return await tx.trip.update({
        where: { id },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
    } catch (err) {
      return handlePrismaError(err, 'Trip');
    }
  }

  public async createOdometerRecord(
    data: Prisma.TripOdometerRecordCreateInput,
    tx?: PrismaTransactionClient
  ): Promise<TripOdometerRecord> {
    const client = tx || prisma;
    try {
      return await client.tripOdometerRecord.create({ data });
    } catch (err) {
      return handlePrismaError(err, 'TripOdometerRecord');
    }
  }

  public async updateOdometerRecord(
    tripId: string,
    data: Prisma.TripOdometerRecordUpdateInput,
    tx?: PrismaTransactionClient
  ): Promise<TripOdometerRecord> {
    const client = tx || prisma;
    try {
      return await client.tripOdometerRecord.update({
        where: { tripId },
        data,
      });
    } catch (err) {
      return handlePrismaError(err, 'TripOdometerRecord');
    }
  }
}

export const tripRepository = new TripRepository();
