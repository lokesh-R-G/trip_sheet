import { prisma } from '../../../shared/database/prisma.js';
import { MileageBenchmark } from '@prisma/client';
import { CreateMileageBenchmarkInput } from './benchmark.dto.js';
import { dec } from '../../../shared/decimal/index.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { benchmarkResolutionEngine, BenchmarkResolutionResult } from './benchmark-resolution.engine.js';

export class BenchmarkService {
  async createBenchmark(input: CreateMileageBenchmarkInput): Promise<MileageBenchmark> {
    const expectedDec = dec(input.expectedMileageKmPerLitre);
    const tolDec = input.permittedTolerancePercent !== undefined ? dec(input.permittedTolerancePercent) : dec(0);

    return prisma.mileageBenchmark.create({
      data: {
        name: input.name,
        vehicleId: input.vehicleId || null,
        vehicleType: input.vehicleType || null,
        minTonnage: input.minTonnage ? dec(input.minTonnage).toPrismaDecimal() : null,
        maxTonnage: input.maxTonnage ? dec(input.maxTonnage).toPrismaDecimal() : null,
        terrain: input.terrain || null,
        routeCategory: input.routeCategory || null,
        expectedMileageKmPerLitre: expectedDec.toPrismaDecimal(),
        permittedTolerancePercent: tolDec.toPrismaDecimal(),
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        status: input.status || 'active',
        priority: input.priority || 1,
        notes: input.notes || null,
      },
    });
  }

  async listBenchmarks(filters?: { status?: string; vehicleId?: string }): Promise<MileageBenchmark[]> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.vehicleId) where.vehicleId = filters.vehicleId;

    return prisma.mileageBenchmark.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { effectiveFrom: 'desc' }],
    });
  }

  async resolveForTrip(tripId: string): Promise<BenchmarkResolutionResult> {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: true,
        routeSegments: true,
      },
    });

    if (!trip) {
      throw new NotFoundError('Trip', tripId);
    }

    // Determine tonnage from route segments or vehicle default
    let avgTonnage = trip.vehicle.tonnage ? Number(trip.vehicle.tonnage) : null;
    if (trip.routeSegments.length > 0) {
      const segWithTonnage = trip.routeSegments.filter((s) => s.tonnage !== null);
      if (segWithTonnage.length > 0) {
        const sum = segWithTonnage.reduce((acc, s) => acc + Number(s.tonnage), 0);
        avgTonnage = sum / segWithTonnage.length;
      }
    }

    const allBenchmarks = await prisma.mileageBenchmark.findMany({
      where: { status: 'active' },
    });

    return benchmarkResolutionEngine.resolve(allBenchmarks, {
      tripDate: trip.startDate,
      vehicleId: trip.vehicleId,
      vehicleType: trip.vehicle.vehicleType,
      tonnage: avgTonnage,
    });
  }
}

export const benchmarkService = new BenchmarkService();
