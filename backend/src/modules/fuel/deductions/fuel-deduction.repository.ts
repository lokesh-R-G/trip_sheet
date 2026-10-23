import { prisma } from '../../../shared/database/prisma.js';
import { TripFuelDeduction, Prisma } from '@prisma/client';

export class FuelDeductionRepository {
  async findByTripId(tripId: string): Promise<TripFuelDeduction | null> {
    return prisma.tripFuelDeduction.findUnique({
      where: { tripId },
      include: {
        benchmark: true,
        trip: {
          include: {
            driver: true,
            vehicle: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<TripFuelDeduction | null> {
    return prisma.tripFuelDeduction.findUnique({
      where: { id },
      include: {
        benchmark: true,
        trip: {
          include: {
            driver: true,
            vehicle: true,
          },
        },
      },
    });
  }

  async create(data: Prisma.TripFuelDeductionCreateInput): Promise<TripFuelDeduction> {
    return prisma.tripFuelDeduction.create({
      data,
      include: {
        benchmark: true,
      },
    });
  }

  async update(id: string, data: Prisma.TripFuelDeductionUpdateInput): Promise<TripFuelDeduction> {
    return prisma.tripFuelDeduction.update({
      where: { id },
      data,
      include: {
        benchmark: true,
      },
    });
  }

  async list(filters?: { reviewStatus?: string; payrollMonth?: string }): Promise<TripFuelDeduction[]> {
    const where: Prisma.TripFuelDeductionWhereInput = {};
    if (filters?.reviewStatus) where.reviewStatus = filters.reviewStatus;
    if (filters?.payrollMonth) where.payrollMonth = filters.payrollMonth;

    return prisma.tripFuelDeduction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        trip: {
          select: {
            tripNumber: true,
            driver: { select: { fullName: true, employeeCode: true } },
            vehicle: { select: { registrationNumber: true } },
          },
        },
        benchmark: true,
      },
    });
  }
}

export const fuelDeductionRepository = new FuelDeductionRepository();
