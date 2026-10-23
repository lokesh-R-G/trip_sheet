import { prisma } from '../../shared/database/prisma.js';
import { DriverAdvanceTransaction, AdvanceSettlementAllocation, Prisma } from '@prisma/client';

export class AdvanceRepository {
  async create(data: Prisma.DriverAdvanceTransactionCreateInput): Promise<DriverAdvanceTransaction> {
    return prisma.driverAdvanceTransaction.create({
      data,
      include: {
        driver: {
          select: {
            id: true,
            fullName: true,
            driverNumber: true,
          },
        },
        trip: {
          select: {
            id: true,
            tripNumber: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<DriverAdvanceTransaction | null> {
    return prisma.driverAdvanceTransaction.findUnique({
      where: { id },
      include: {
        driver: true,
        trip: true,
        settlementAllocations: true,
        reversalOf: true,
        reversals: true,
      },
    });
  }

  async findByReferenceNumber(referenceNumber: string): Promise<DriverAdvanceTransaction | null> {
    return prisma.driverAdvanceTransaction.findUnique({
      where: { referenceNumber },
    });
  }

  async list(filters: {
    driverId?: string;
    tripId?: string;
    transactionType?: string;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
  }): Promise<{ items: DriverAdvanceTransaction[]; total: number }> {
    const where: Prisma.DriverAdvanceTransactionWhereInput = {};

    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.tripId) where.tripId = filters.tripId;
    if (filters.transactionType) where.transactionType = filters.transactionType;

    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate) where.transactionDate.gte = filters.startDate;
      if (filters.endDate) where.transactionDate.lte = filters.endDate;
    }

    const [items, total] = await Promise.all([
      prisma.driverAdvanceTransaction.findMany({
        where,
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        skip: filters.skip,
        take: filters.take,
        include: {
          driver: {
            select: {
              id: true,
              fullName: true,
              driverNumber: true,
            },
          },
          trip: {
            select: {
              id: true,
              tripNumber: true,
            },
          },
        },
      }),
      prisma.driverAdvanceTransaction.count({ where }),
    ]);

    return { items, total };
  }

  async getDriverActiveTransactions(driverId: string): Promise<Array<DriverAdvanceTransaction & { settlementAllocations: AdvanceSettlementAllocation[] }>> {
    return prisma.driverAdvanceTransaction.findMany({
      where: {
        driverId,
        status: 'active',
      },
      include: {
        settlementAllocations: {
          where: { status: 'active' },
        },
      },
      orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
    });
  }
}

export const advanceRepository = new AdvanceRepository();
