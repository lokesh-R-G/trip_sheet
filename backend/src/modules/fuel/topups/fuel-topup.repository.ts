import { prisma } from '../../../shared/database/prisma.js';
import { Prisma, FuelTopUp } from '@prisma/client';

export class FuelTopUpRepository {
  async create(data: Prisma.FuelTopUpCreateInput): Promise<FuelTopUp> {
    return prisma.fuelTopUp.create({
      data,
      include: {
        vehicle: {
          select: {
            id: true,
            registrationNumber: true,
            vehicleType: true,
            latestOdometer: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<FuelTopUp | null> {
    return prisma.fuelTopUp.findUnique({
      where: { id },
      include: {
        vehicle: true,
        tripFuelAdditions: true,
      },
    });
  }

  async list(filters: {
    vehicleId?: string;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
  }): Promise<{ items: FuelTopUp[]; total: number }> {
    const where: Prisma.FuelTopUpWhereInput = {};

    if (filters.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    if (filters.startDate || filters.endDate) {
      where.dateTime = {};
      if (filters.startDate) where.dateTime.gte = filters.startDate;
      if (filters.endDate) where.dateTime.lte = filters.endDate;
    }

    const [items, total] = await Promise.all([
      prisma.fuelTopUp.findMany({
        where,
        orderBy: { dateTime: 'desc' },
        skip: filters.skip,
        take: filters.take,
        include: {
          vehicle: {
            select: {
              id: true,
              registrationNumber: true,
              vehicleType: true,
            },
          },
        },
      }),
      prisma.fuelTopUp.count({ where }),
    ]);

    return { items, total };
  }
}

export const fuelTopUpRepository = new FuelTopUpRepository();
