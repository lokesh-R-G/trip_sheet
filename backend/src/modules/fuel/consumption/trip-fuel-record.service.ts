import { prisma, runInTransaction } from '../../../shared/database/prisma.js';
import { TripFuelRecord, TripFuelAddition } from '@prisma/client';
import { tripFuelRecordRepository, TripFuelRecordRepository } from './trip-fuel-record.repository.js';
import { SaveTripFuelRecordInput, AddTripFuelAdditionInput } from './trip-fuel-record.dto.js';
import { fuelConsumptionEngine, FuelAdditionItem } from './fuel-consumption.engine.js';
import { mileageCalculationEngine } from '../mileage/mileage-calculation.engine.js';
import { dec } from '../../../shared/decimal/index.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { auditService } from '../../audit/index.js';

export class TripFuelRecordService {
  constructor(private repo: TripFuelRecordRepository = tripFuelRecordRepository) {}

  async saveFuelRecord(
    tripId: string,
    input: SaveTripFuelRecordInput,
    actor: string = 'system'
  ): Promise<TripFuelRecord & { additions: TripFuelAddition[] }> {
    // 1. Verify trip exists and retrieve odometer info
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        odometerRecord: true,
        fuelRecord: {
          include: { additions: true },
        },
      },
    });

    if (!trip) {
      throw new NotFoundError('Trip', tripId);
    }

    // 2. Collect existing additions
    const currentAdditions: FuelAdditionItem[] =
      trip.fuelRecord?.additions.map((a) => ({
        id: a.id,
        litres: dec(a.litres),
        verified: a.verified,
        source: a.source,
        receiptReference: a.receiptReference,
      })) || [];

    // 3. Determine opening & closing quantities
    const opening = input.openingFuelQuantity !== undefined ? input.openingFuelQuantity : trip.fuelRecord?.openingFuelQuantity;
    const closing = input.closingFuelQuantity !== undefined ? input.closingFuelQuantity : trip.fuelRecord?.closingFuelQuantity;
    const manual = input.manuallyReportedLitres !== undefined ? input.manuallyReportedLitres : trip.fuelRecord?.manuallyReportedLitres;
    const method = input.measurementMethod || (trip.fuelRecord?.measurementMethod as any) || 'calculated_balance';

    // 4. Calculate consumption
    const consumptionResult = fuelConsumptionEngine.calculate({
      openingFuelQuantity: opening,
      closingFuelQuantity: closing,
      additions: currentAdditions,
      manuallyReportedLitres: manual,
      measurementMethod: method,
    });

    // 5. Calculate mileage if distance is available
    let mileageKmPerLitre = trip.fuelRecord?.tripMileageKmPerLitre || null;
    let mileageStatus = trip.fuelRecord?.mileageStatus || 'unavailable';

    if (trip.odometerRecord && trip.odometerRecord.acceptedDistance !== null) {
      const mileageResult = mileageCalculationEngine.calculate({
        acceptedDistanceKm: trip.odometerRecord.acceptedDistance,
        acceptedFuelLitres: consumptionResult.acceptedFuelLitres,
        fuelCalculationStatus: consumptionResult.calculationStatus,
        odometerValidationStatus: trip.odometerRecord.validationStatus as any,
        odometerCase: trip.odometerRecord.odometerCase,
        hasDerivedEndingReading: trip.odometerRecord.derivedEndingReading !== null,
      });

      mileageKmPerLitre = mileageResult.mileageKmPerLitre ? mileageResult.mileageKmPerLitre.toPrismaDecimal() : null;
      mileageStatus = mileageResult.mileageStatus;
    }

    const nextVersion = (trip.fuelRecord?.calculationVersion || 0) + 1;

    // 6. Upsert trip fuel record atomically
    const saved = await runInTransaction(async (tx) => {
      const record = await tx.tripFuelRecord.upsert({
        where: { tripId },
        create: {
          tripId,
          openingFuelQuantity: consumptionResult.openingFuelQuantity ? consumptionResult.openingFuelQuantity.toPrismaDecimal() : null,
          closingFuelQuantity: consumptionResult.closingFuelQuantity ? consumptionResult.closingFuelQuantity.toPrismaDecimal() : null,
          fuelAddedDuringTrip: consumptionResult.totalVerifiedAdditions.toPrismaDecimal(),
          calculatedConsumption: consumptionResult.calculatedConsumption ? consumptionResult.calculatedConsumption.toPrismaDecimal() : null,
          manuallyReportedLitres: consumptionResult.manuallyReportedLitres ? consumptionResult.manuallyReportedLitres.toPrismaDecimal() : null,
          acceptedFuelLitres: consumptionResult.acceptedFuelLitres.toPrismaDecimal(),
          measurementMethod: consumptionResult.measurementMethod,
          calculationStatus: consumptionResult.calculationStatus,
          calculationVersion: nextVersion,
          discrepancyFlag: consumptionResult.discrepancyFlag,
          discrepancyDetails: consumptionResult.discrepancyDetails,
          tripMileageKmPerLitre: mileageKmPerLitre,
          mileageStatus,
        },
        update: {
          openingFuelQuantity: consumptionResult.openingFuelQuantity ? consumptionResult.openingFuelQuantity.toPrismaDecimal() : null,
          closingFuelQuantity: consumptionResult.closingFuelQuantity ? consumptionResult.closingFuelQuantity.toPrismaDecimal() : null,
          fuelAddedDuringTrip: consumptionResult.totalVerifiedAdditions.toPrismaDecimal(),
          calculatedConsumption: consumptionResult.calculatedConsumption ? consumptionResult.calculatedConsumption.toPrismaDecimal() : null,
          manuallyReportedLitres: consumptionResult.manuallyReportedLitres ? consumptionResult.manuallyReportedLitres.toPrismaDecimal() : null,
          acceptedFuelLitres: consumptionResult.acceptedFuelLitres.toPrismaDecimal(),
          measurementMethod: consumptionResult.measurementMethod,
          calculationStatus: consumptionResult.calculationStatus,
          calculationVersion: nextVersion,
          discrepancyFlag: consumptionResult.discrepancyFlag,
          discrepancyDetails: consumptionResult.discrepancyDetails,
          tripMileageKmPerLitre: mileageKmPerLitre,
          mileageStatus,
        },
        include: {
          additions: {
            orderBy: { additionDateTime: 'asc' },
          },
        },
      });

      return record;
    });

    // 7. Audit log
    await auditService.log({
      entityType: 'TripFuelRecord',
      entityId: saved.id,
      entityLabel: `Fuel Record for Trip ${trip.tripNumber}`,
      action: trip.fuelRecord ? 'UPDATE' : 'CREATE',
      newValue: {
        tripId,
        acceptedFuelLitres: saved.acceptedFuelLitres.toString(),
        calculationStatus: saved.calculationStatus,
        mileageKmPerLitre: saved.tripMileageKmPerLitre?.toString() || null,
        version: saved.calculationVersion,
      },
      changedBy: actor,
    });

    return saved;
  }

  async addAddition(
    tripId: string,
    input: AddTripFuelAdditionInput,
    actor: string = 'system'
  ): Promise<TripFuelAddition> {
    // 1. Ensure fuel record exists for trip (create default if absent)
    let fuelRecord = await prisma.tripFuelRecord.findUnique({
      where: { tripId },
    });

    if (!fuelRecord) {
      fuelRecord = await prisma.tripFuelRecord.create({
        data: {
          tripId,
          acceptedFuelLitres: dec(0).toPrismaDecimal(),
          measurementMethod: 'calculated_balance',
          calculationStatus: 'missing_inputs',
          mileageStatus: 'unavailable',
        },
      });
    }

    // 2. If fuelTopUpId provided, verify it exists
    if (input.fuelTopUpId) {
      const topUp = await prisma.fuelTopUp.findUnique({
        where: { id: input.fuelTopUpId },
      });
      if (!topUp) {
        throw new NotFoundError('FuelTopUp', input.fuelTopUpId);
      }
    }

    // 3. Create addition
    const addition = await prisma.tripFuelAddition.create({
      data: {
        tripFuelRecordId: fuelRecord.id,
        fuelTopUpId: input.fuelTopUpId || null,
        litres: dec(input.litres).toPrismaDecimal(),
        source: input.source,
        receiptReference: input.receiptReference || null,
        additionDateTime: new Date(input.additionDateTime),
        verified: input.verified,
        notes: input.notes || null,
      },
    });

    // 4. Recalculate fuel consumption & mileage for the trip
    await this.saveFuelRecord(tripId, {}, actor);

    return addition;
  }

  async getFuelRecord(tripId: string): Promise<(TripFuelRecord & { additions: TripFuelAddition[] }) | null> {
    return this.repo.findByTripId(tripId);
  }
}

export const tripFuelRecordService = new TripFuelRecordService();
