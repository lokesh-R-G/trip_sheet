import { prisma, PrismaTransactionClient, handlePrismaError } from '../../../shared/database/prisma.js';
import { DriverAttendance, Prisma } from '@prisma/client';

export type AttendanceWithDriver = DriverAttendance & {
  driver: {
    id: string;
    driverNumber: string;
    fullName: string;
  };
};

export interface AttendanceFilters {
  driverId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  source?: string;
  page?: number;
  limit?: number;
}

export class AttendanceRepository {
  public async findById(id: string, tx?: PrismaTransactionClient): Promise<AttendanceWithDriver | null> {
    const client = tx || prisma;
    try {
      return await client.driverAttendance.findUnique({
        where: { id },
        include: {
          driver: {
            select: { id: true, driverNumber: true, fullName: true },
          },
        },
      });
    } catch (err) {
      return handlePrismaError(err, 'DriverAttendance');
    }
  }

  public async findByDriverAndDate(
    driverId: string,
    attendanceDate: Date,
    tx?: PrismaTransactionClient
  ): Promise<AttendanceWithDriver | null> {
    const client = tx || prisma;
    try {
      return await client.driverAttendance.findUnique({
        where: {
          driverId_attendanceDate: {
            driverId,
            attendanceDate,
          },
        },
        include: {
          driver: {
            select: { id: true, driverNumber: true, fullName: true },
          },
        },
      });
    } catch (err) {
      return handlePrismaError(err, 'DriverAttendance');
    }
  }

  public async findMany(filters: AttendanceFilters): Promise<{ attendances: AttendanceWithDriver[]; total: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.DriverAttendanceWhereInput = {};

    if (filters.driverId) {
      where.driverId = filters.driverId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.source) {
      where.source = filters.source;
    }

    if (filters.date) {
      const d = new Date(filters.date);
      where.attendanceDate = d;
    } else if (filters.startDate || filters.endDate) {
      where.attendanceDate = {};
      if (filters.startDate) {
        where.attendanceDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.attendanceDate.lte = new Date(filters.endDate);
      }
    }

    try {
      const [attendances, total] = await Promise.all([
        prisma.driverAttendance.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ attendanceDate: 'desc' }, { createdAt: 'desc' }],
          include: {
            driver: {
              select: { id: true, driverNumber: true, fullName: true },
            },
          },
        }),
        prisma.driverAttendance.count({ where }),
      ]);

      return { attendances, total };
    } catch (err) {
      return handlePrismaError(err, 'DriverAttendance');
    }
  }

  public async create(
    data: Prisma.DriverAttendanceCreateInput,
    tx?: PrismaTransactionClient
  ): Promise<AttendanceWithDriver> {
    const client = tx || prisma;
    try {
      return await client.driverAttendance.create({
        data,
        include: {
          driver: {
            select: { id: true, driverNumber: true, fullName: true },
          },
        },
      });
    } catch (err) {
      return handlePrismaError(err, 'DriverAttendance');
    }
  }

  public async update(
    id: string,
    data: Prisma.DriverAttendanceUpdateInput,
    tx?: PrismaTransactionClient
  ): Promise<AttendanceWithDriver> {
    const client = tx || prisma;
    try {
      return await client.driverAttendance.update({
        where: { id },
        data,
        include: {
          driver: {
            select: { id: true, driverNumber: true, fullName: true },
          },
        },
      });
    } catch (err) {
      return handlePrismaError(err, 'DriverAttendance');
    }
  }

  public async findForMonth(
    startDate: Date,
    endDate: Date,
    driverId?: string,
    tx?: PrismaTransactionClient
  ): Promise<AttendanceWithDriver[]> {
    const client = tx || prisma;
    const where: Prisma.DriverAttendanceWhereInput = {
      attendanceDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (driverId) {
      where.driverId = driverId;
    }

    try {
      return await client.driverAttendance.findMany({
        where,
        orderBy: [{ attendanceDate: 'asc' }],
        include: {
          driver: {
            select: { id: true, driverNumber: true, fullName: true },
          },
        },
      });
    } catch (err) {
      return handlePrismaError(err, 'DriverAttendance');
    }
  }
}

export const attendanceRepository = new AttendanceRepository();

