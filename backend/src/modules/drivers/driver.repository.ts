import { prisma, PrismaTransactionClient, handlePrismaError } from '../../shared/database/prisma.js';
import { Driver, Prisma } from '@prisma/client';
import { CreateDriverDTO, UpdateDriverDTO } from './dto/driver.dto.js';

export interface DriverFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class DriverRepository {
  public async create(data: CreateDriverDTO, tx?: PrismaTransactionClient): Promise<Driver> {
    const client = tx || prisma;
    try {
      return await client.driver.create({
        data: {
          driverNumber: data.driverNumber,
          fullName: data.fullName,
          phone: data.phone,
          email: data.email ?? null,
          address: data.address,
          licenseNumber: data.licenseNumber,
          licenseExpiry: new Date(data.licenseExpiry),
          joiningDate: new Date(data.joiningDate),
          status: data.status,
          currentVehicleId: data.currentVehicleId ?? null,
          notes: data.notes ?? null,
        },
      });
    } catch (err) {
      return handlePrismaError(err, 'Driver');
    }
  }

  public async findById(id: string, tx?: PrismaTransactionClient): Promise<(Driver & { currentVehicle?: { registrationNumber: string } | null }) | null> {
    const client = tx || prisma;
    try {
      return await client.driver.findUnique({
        where: { id },
        include: {
          currentVehicle: {
            select: { registrationNumber: true },
          },
        },
      });
    } catch (err) {
      return handlePrismaError(err, 'Driver');
    }
  }

  public async findByDriverNumber(driverNumber: string, tx?: PrismaTransactionClient): Promise<Driver | null> {
    const client = tx || prisma;
    try {
      return await client.driver.findUnique({
        where: { driverNumber },
      });
    } catch (err) {
      return handlePrismaError(err, 'Driver');
    }
  }

  public async findByLicenseNumber(licenseNumber: string, tx?: PrismaTransactionClient): Promise<Driver | null> {
    const client = tx || prisma;
    try {
      return await client.driver.findUnique({
        where: { licenseNumber },
      });
    } catch (err) {
      return handlePrismaError(err, 'Driver');
    }
  }

  public async findMany(filters: DriverFilters): Promise<{ drivers: (Driver & { currentVehicle?: { registrationNumber: string } | null })[]; total: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.DriverWhereInput = {};
    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      const q = filters.search;
      where.OR = [
        { driverNumber: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { licenseNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    try {
      const [drivers, total] = await Promise.all([
        prisma.driver.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            currentVehicle: {
              select: { registrationNumber: true },
            },
          },
        }),
        prisma.driver.count({ where }),
      ]);

      return { drivers, total };
    } catch (err) {
      return handlePrismaError(err, 'Driver');
    }
  }

  public async update(id: string, data: UpdateDriverDTO & { status?: string }, tx?: PrismaTransactionClient): Promise<Driver> {
    const client = tx || prisma;
    const updatePayload: Prisma.DriverUpdateInput = {};

    if (data.fullName !== undefined) updatePayload.fullName = data.fullName;
    if (data.phone !== undefined) updatePayload.phone = data.phone;
    if (data.email !== undefined) updatePayload.email = data.email;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.licenseExpiry !== undefined) updatePayload.licenseExpiry = new Date(data.licenseExpiry);
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.notes !== undefined) updatePayload.notes = data.notes;

    if (data.currentVehicleId !== undefined) {
      if (data.currentVehicleId === null) {
        updatePayload.currentVehicle = { disconnect: true };
      } else {
        updatePayload.currentVehicle = { connect: { id: data.currentVehicleId } };
      }
    }

    try {
      return await client.driver.update({
        where: { id },
        data: updatePayload,
      });
    } catch (err) {
      return handlePrismaError(err, 'Driver');
    }
  }

  public async countActiveTrips(driverId: string, tx?: PrismaTransactionClient): Promise<number> {
    const client = tx || prisma;
    try {
      return await client.trip.count({
        where: {
          driverId,
          status: { in: ['draft', 'in_progress'] },
        },
      });
    } catch (err) {
      return handlePrismaError(err, 'Trip');
    }
  }
}

export const driverRepository = new DriverRepository();
