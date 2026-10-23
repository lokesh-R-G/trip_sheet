import { prisma } from '../../shared/database/prisma.js';
import { TripSettlementRecord, Prisma } from '@prisma/client';

export class SettlementRepository {
  async findByTripId(tripId: string): Promise<TripSettlementRecord | null> {
    return prisma.tripSettlementRecord.findUnique({
      where: { tripId },
      include: {
        trip: {
          include: {
            driver: true,
            vehicle: true,
            advanceAllocations: {
              where: { status: 'active' },
              include: { advanceTransaction: true },
            },
            expenses: true,
          },
        },
      },
    });
  }

  async upsert(
    tripId: string,
    createData: Prisma.TripSettlementRecordCreateInput,
    updateData: Prisma.TripSettlementRecordUpdateInput
  ): Promise<TripSettlementRecord> {
    return prisma.tripSettlementRecord.upsert({
      where: { tripId },
      create: createData,
      update: updateData,
    });
  }
}

export const settlementRepository = new SettlementRepository();
