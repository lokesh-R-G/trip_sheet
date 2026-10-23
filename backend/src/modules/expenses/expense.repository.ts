import { prisma } from '../../shared/database/prisma.js';
import { TripExpense, Prisma } from '@prisma/client';

export class ExpenseRepository {
  async create(data: Prisma.TripExpenseCreateInput): Promise<TripExpense> {
    return prisma.tripExpense.create({
      data,
      include: {
        trip: {
          select: {
            id: true,
            tripNumber: true,
            driverId: true,
            vehicleId: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<TripExpense | null> {
    return prisma.tripExpense.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            driver: true,
            vehicle: true,
          },
        },
        fuelTopUp: true,
      },
    });
  }

  async update(id: string, data: Prisma.TripExpenseUpdateInput): Promise<TripExpense> {
    return prisma.tripExpense.update({
      where: { id },
      data,
      include: {
        trip: true,
      },
    });
  }

  async list(filters: {
    tripId?: string;
    category?: string;
    approvalStatus?: string;
    skip?: number;
    take?: number;
  }): Promise<{ items: TripExpense[]; total: number }> {
    const where: Prisma.TripExpenseWhereInput = {};
    if (filters.tripId) where.tripId = filters.tripId;
    if (filters.category) where.category = filters.category;
    if (filters.approvalStatus) where.approvalStatus = filters.approvalStatus;

    const [items, total] = await Promise.all([
      prisma.tripExpense.findMany({
        where,
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
        skip: filters.skip,
        take: filters.take,
        include: {
          trip: {
            select: {
              tripNumber: true,
              driver: { select: { fullName: true } },
            },
          },
        },
      }),
      prisma.tripExpense.count({ where }),
    ]);

    return { items, total };
  }

  async findApprovedEligibleByTripId(tripId: string): Promise<TripExpense[]> {
    return prisma.tripExpense.findMany({
      where: {
        tripId,
        approvalStatus: 'approved',
        isSettlementEligible: true,
      },
      orderBy: { expenseDate: 'asc' },
    });
  }
}

export const expenseRepository = new ExpenseRepository();
