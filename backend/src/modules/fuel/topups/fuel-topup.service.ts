import { FuelTopUp } from '@prisma/client';
import { fuelTopUpRepository, FuelTopUpRepository } from './fuel-topup.repository.js';
import { CreateFuelTopUpInput } from './fuel-topup.dto.js';
import { prisma, runInTransaction } from '../../../shared/database/prisma.js';
import { dec } from '../../../shared/decimal/index.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { auditService } from '../../audit/index.js';

export class FuelTopUpService {
  constructor(private repo: FuelTopUpRepository = fuelTopUpRepository) {}

  async createTopUp(input: CreateFuelTopUpInput, actor: string = 'system'): Promise<FuelTopUp> {
    // 1. Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: input.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundError('Vehicle', input.vehicleId);
    }

    // 2. Compute total cost using DecimalValue if not provided
    const litresDec = dec(input.litres);
    const priceDec = dec(input.pricePerLitre);
    const totalCostDec = input.totalCost ? dec(input.totalCost) : litresDec.times(priceDec);

    // 3. Atomically create top-up and schedule durable integration job
    const topUp = await runInTransaction(async (tx) => {
      const created = await tx.fuelTopUp.create({
        data: {
          vehicleId: input.vehicleId,
          dateTime: new Date(input.dateTime),
          litres: litresDec.toPrismaDecimal(),
          dispensedLitres: input.dispensedLitres ? dec(input.dispensedLitres).toPrismaDecimal() : null,
          fuelType: input.fuelType || 'diesel',
          pricePerLitre: priceDec.toPrismaDecimal(),
          totalCost: totalCostDec.toPrismaDecimal(),
          fuelStation: input.fuelStation,
          pumpMeterStart: input.pumpMeterStart ? dec(input.pumpMeterStart).toPrismaDecimal() : null,
          pumpMeterEnd: input.pumpMeterEnd ? dec(input.pumpMeterEnd).toPrismaDecimal() : null,
          odometerReading: input.odometerReading ?? null,
          odometerObservationStatus: 'observation',
          paymentMethod: input.paymentMethod,
          receiptReference: input.receiptReference,
          recordedBy: input.recordedBy,
          notes: input.notes ?? null,
        },
      });

      // If odometer reading is present, create an IntegrationJob for TLCM observation sync
      if (input.odometerReading !== undefined && input.odometerReading !== null) {
        await tx.integrationJob.create({
          data: {
            jobType: 'odometer_observation_sync',
            idempotencyKey: `tlcm-odo-obs-${created.id}`,
            vehicleId: input.vehicleId,
            status: 'pending',
            payload: {
              topUpId: created.id,
              vehicleId: input.vehicleId,
              registrationNumber: vehicle.registrationNumber,
              observedOdometer: input.odometerReading,
              observedAt: input.dateTime,
              fuelStation: input.fuelStation,
            },
          },
        });
      }

      return created;
    });

    // 4. Audit logging
    await auditService.log({
      entityType: 'FuelTopUp',
      entityId: topUp.id,
      entityLabel: `Fuel Top-Up ${topUp.receiptReference} for ${vehicle.registrationNumber}`,
      action: 'CREATE',
      newValue: {
        vehicleId: topUp.vehicleId,
        litres: topUp.litres.toString(),
        totalCost: topUp.totalCost.toString(),
        fuelStation: topUp.fuelStation,
        odometerReading: topUp.odometerReading,
      },
      changedBy: actor,
    });

    return topUp;
  }

  async getTopUpById(id: string): Promise<FuelTopUp> {
    const topUp = await this.repo.findById(id);
    if (!topUp) {
      throw new NotFoundError('FuelTopUp', id);
    }
    return topUp;
  }

  async listTopUps(filters: {
    vehicleId?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const skip = (filters.page - 1) * filters.limit;
    const start = filters.startDate ? new Date(filters.startDate) : undefined;
    const end = filters.endDate ? new Date(filters.endDate) : undefined;

    const { items, total } = await this.repo.list({
      vehicleId: filters.vehicleId,
      startDate: start,
      endDate: end,
      skip,
      take: filters.limit,
    });

    return {
      items,
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }
}

export const fuelTopUpService = new FuelTopUpService();
