import { prisma } from '../../../shared/database/prisma.js';
import { TripFuelRecord, TripFuelAddition, Prisma } from '@prisma/client';

export class TripFuelRecordRepository {
  async findByTripId(tripId: string): Promise<(TripFuelRecord & { additions: TripFuelAddition[] }) | null> {
    return prisma.tripFuelRecord.findUnique({
      where: { tripId },
      include: {
        additions: {
          orderBy: { additionDateTime: 'asc' },
        },
      },
    });
  }

  async upsert(
    tripId: string,
    data: Prisma.TripFuelRecordCreateInput,
    updateData: Prisma.TripFuelRecordUpdateInput
  ): Promise<TripFuelRecord> {
    return prisma.tripFuelRecord.upsert({
      where: { tripId },
      create: data,
      update: updateData,
      include: {
        additions: true,
      },
    });
  }

  async addAddition(data: Prisma.TripFuelAdditionCreateInput): Promise<TripFuelAddition> {
    return prisma.tripFuelAddition.create({
      data,
    });
  }

  async getAdditions(tripFuelRecordId: string): Promise<TripFuelAddition[]> {
    return prisma.tripFuelAddition.findMany({
      where: { tripFuelRecordId },
      orderBy: { additionDateTime: 'asc' },
    });
  }
}

export const tripFuelRecordRepository = new TripFuelRecordRepository();
