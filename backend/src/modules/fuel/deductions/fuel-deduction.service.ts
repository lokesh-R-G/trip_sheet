import { prisma, runInTransaction } from '../../../shared/database/prisma.js';
import { TripFuelDeduction } from '@prisma/client';
import { fuelDeductionRepository, FuelDeductionRepository } from './fuel-deduction.repository.js';
import { ProposeFuelDeductionInput, ReviewDeductionActionInput } from './fuel-deduction.dto.js';
import { benchmarkService } from '../benchmarks/benchmark.service.js';
import { fuelVarianceEngine } from '../variance/fuel-variance.engine.js';
import { fuelValuationService } from '../valuation/fuel-valuation.service.js';
import { dec } from '../../../shared/decimal/index.js';
import {
  NotFoundError,
  DomainValidationError,
  ConcurrencyConflictError,
  UnauthorizedError,
} from '../../../shared/errors/index.js';
import { auditService } from '../../audit/index.js';

export class FuelDeductionService {
  constructor(private repo: FuelDeductionRepository = fuelDeductionRepository) {}

  async proposeDeduction(input: ProposeFuelDeductionInput, actor: string = 'system'): Promise<TripFuelDeduction> {
    // 1. Idempotency check: if proposal already exists for this trip, return it without duplicate creation
    const existing = await this.repo.findByTripId(input.tripId);
    if (existing) {
      return existing;
    }

    // 2. Fetch trip with odometer and fuel records
    const trip = await prisma.trip.findUnique({
      where: { id: input.tripId },
      include: {
        odometerRecord: true,
        fuelRecord: true,
        vehicle: true,
        driver: true,
      },
    });

    if (!trip) {
      throw new NotFoundError('Trip', input.tripId);
    }

    if (!trip.odometerRecord || trip.odometerRecord.acceptedDistance === null || trip.odometerRecord.acceptedDistance <= 0) {
      throw new DomainValidationError('Cannot propose fuel deduction: trip must have a valid accepted distance.');
    }

    if (!trip.fuelRecord || dec(trip.fuelRecord.acceptedFuelLitres).isZero()) {
      throw new DomainValidationError('Cannot propose fuel deduction: trip must have accepted fuel consumption.');
    }

    // 3. Resolve mileage benchmark
    const benchmarkResult = await benchmarkService.resolveForTrip(trip.id);
    if (benchmarkResult.status === 'no_benchmark' || !benchmarkResult.benchmark) {
      throw new DomainValidationError('Cannot propose fuel deduction: no active benchmark matches trip criteria.');
    }

    const benchmark = benchmarkResult.benchmark;

    // 4. Calculate fuel variance and excess litres
    const varianceResult = fuelVarianceEngine.calculate({
      acceptedDistanceKm: trip.odometerRecord.acceptedDistance,
      actualAcceptedFuelLitres: trip.fuelRecord.acceptedFuelLitres.toString(),
      benchmarkMileageKmPerLitre: benchmark.expectedMileageKmPerLitre.toString(),
      tolerancePercent: benchmark.permittedTolerancePercent ? benchmark.permittedTolerancePercent.toString() : 0,
    });

    // 5. Valuation Policy Check: Require approved fuel-price policy before calculating monetary amount
    let applicableFuelPrice = null;
    let potentialDeductionAmount = null;
    let reviewStatus: 'pending_review' | 'pending_valuation' = 'pending_review';

    if (input.overrideFuelPrice) {
      const priceDec = dec(input.overrideFuelPrice);
      applicableFuelPrice = priceDec.toPrismaDecimal();
      potentialDeductionAmount = varianceResult.excessFuelLitres.times(priceDec).round(2).toPrismaDecimal();
    } else {
      const valuationPolicy = await fuelValuationService.resolvePolicy('diesel', trip.startDate);
      if (valuationPolicy) {
        const priceDec = dec(valuationPolicy.pricePerLitre);
        applicableFuelPrice = priceDec.toPrismaDecimal();
        potentialDeductionAmount = varianceResult.excessFuelLitres.times(priceDec).round(2).toPrismaDecimal();
      } else {
        // Valuation policy unavailable -> preserve eligible operational excess litres with pending_valuation status
        applicableFuelPrice = null;
        potentialDeductionAmount = null;
        reviewStatus = 'pending_valuation';
      }
    }

    // 6. Atomically persist deduction proposal
    const proposal = await runInTransaction(async (tx) => {
      return tx.tripFuelDeduction.create({
        data: {
          tripId: trip.id,
          benchmarkId: benchmark.id,
          benchmarkMileage: benchmark.expectedMileageKmPerLitre,
          tolerancePercent: varianceResult.tolerancePercent.toPrismaDecimal(),
          expectedFuelLitres: varianceResult.expectedFuelLitres.toPrismaDecimal(),
          allowedFuelLitres: varianceResult.allowedFuelLitres.toPrismaDecimal(),
          excessFuelLitres: varianceResult.excessFuelLitres.toPrismaDecimal(),
          applicableFuelPrice,
          potentialDeductionAmount,
          approvedDeductionAmount: dec(0).toPrismaDecimal(),
          reviewStatus,
          version: 1,
        },
        include: {
          benchmark: true,
        },
      });
    });

    // 7. Audit log
    await auditService.log({
      entityType: 'TripFuelDeduction',
      entityId: proposal.id,
      entityLabel: `Fuel Deduction Proposal for Trip ${trip.tripNumber}`,
      action: 'CREATE_PROPOSAL',
      newValue: {
        tripId: trip.id,
        excessFuelLitres: proposal.excessFuelLitres.toString(),
        potentialDeductionAmount: proposal.potentialDeductionAmount ? proposal.potentialDeductionAmount.toString() : null,
        reviewStatus: proposal.reviewStatus,
      },
      changedBy: actor,
    });

    return proposal;
  }

  async reviewProposal(
    id: string,
    actionInput: ReviewDeductionActionInput,
    actor: string
  ): Promise<TripFuelDeduction> {
    if (!actor || actor === 'anonymous') {
      throw new UnauthorizedError('Authorized reviewer is required to review fuel deductions.');
    }

    const deduction = await this.repo.findById(id);
    if (!deduction) {
      throw new NotFoundError('TripFuelDeduction', id);
    }

    // Guard against financial post modifications
    if (
      deduction.reviewStatus === 'posted_to_payroll' ||
      deduction.reviewStatus === 'recovered_through_payroll'
    ) {
      throw new DomainValidationError(
        `Cannot modify deduction: proposal is already finalized with status "${deduction.reviewStatus}".`
      );
    }

    // Optimistic Concurrency Control
    if (actionInput.expectedVersion !== undefined && actionInput.expectedVersion !== deduction.version) {
      throw new ConcurrencyConflictError(
        `Deduction record was modified by another operation. Expected version ${actionInput.expectedVersion}, found ${deduction.version}.`
      );
    }

    let newStatus = deduction.reviewStatus;
    let newApprovedAmount = deduction.approvedDeductionAmount;
    let adjustmentReason = deduction.adjustmentReason;

    switch (actionInput.action) {
      case 'approve':
        if (deduction.reviewStatus === 'pending_valuation' || deduction.potentialDeductionAmount === null) {
          throw new DomainValidationError(
            'Cannot approve deduction proposal pending fuel-price valuation. An approved valuation policy must be resolved first.'
          );
        }
        newStatus = 'approved';
        newApprovedAmount = deduction.potentialDeductionAmount;
        break;

      case 'reject':
        newStatus = 'rejected';
        newApprovedAmount = dec(0).toPrismaDecimal();
        adjustmentReason = actionInput.reason || 'Rejected by reviewer';
        break;

      case 'adjust':
        newStatus = 'adjusted';
        newApprovedAmount = dec(actionInput.adjustedAmount!).round(2).toPrismaDecimal();
        adjustmentReason = actionInput.reason || 'Adjusted by reviewer';
        break;

      case 'return_for_correction':
        newStatus = 'returned_for_correction';
        adjustmentReason = actionInput.reason || 'Returned for operational correction';
        break;
    }

    const updated = await runInTransaction(async (tx) => {
      return tx.tripFuelDeduction.update({
        where: { id },
        data: {
          reviewStatus: newStatus,
          approvedDeductionAmount: newApprovedAmount,
          adjustmentReason,
          adjustedBy: actionInput.action === 'adjust' ? actor : deduction.adjustedBy,
          reviewedBy: actor,
          reviewedAt: new Date(),
          payrollMonth: actionInput.payrollMonth || deduction.payrollMonth,
          version: deduction.version + 1,
        },
        include: {
          benchmark: true,
          trip: true,
        },
      });
    });

    // Audit log
    await auditService.log({
      entityType: 'TripFuelDeduction',
      entityId: updated.id,
      entityLabel: `Fuel Deduction ${actionInput.action.toUpperCase()} for Trip ${updated.trip.tripNumber}`,
      action: `REVIEW_${actionInput.action.toUpperCase()}`,
      previousValue: {
        reviewStatus: deduction.reviewStatus,
        approvedDeductionAmount: deduction.approvedDeductionAmount.toString(),
      },
      newValue: {
        reviewStatus: updated.reviewStatus,
        approvedDeductionAmount: updated.approvedDeductionAmount.toString(),
        reason: adjustmentReason,
      },
      reason: actionInput.reason,
      changedBy: actor,
    });

    return updated;
  }

  async getById(id: string): Promise<TripFuelDeduction> {
    const deduction = await this.repo.findById(id);
    if (!deduction) {
      throw new NotFoundError('TripFuelDeduction', id);
    }
    return deduction;
  }

  async getByTripId(tripId: string): Promise<TripFuelDeduction | null> {
    return this.repo.findByTripId(tripId);
  }

  async list(filters?: { reviewStatus?: string; payrollMonth?: string }): Promise<TripFuelDeduction[]> {
    return this.repo.list(filters);
  }
}

export const fuelDeductionService = new FuelDeductionService();
