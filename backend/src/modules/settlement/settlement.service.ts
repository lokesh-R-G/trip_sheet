import { prisma, runInTransaction } from '../../shared/database/prisma.js';
import { TripSettlementRecord } from '@prisma/client';
import { settlementRepository, SettlementRepository } from './settlement.repository.js';
import { settlementEngine, SettlementCalculationResult } from './settlement.engine.js';
import { FinalizeSettlementInput, ReopenSettlementInput, RecordTripCashReturnInput } from './settlement.dto.js';
import { dec } from '../../shared/decimal/index.js';
import {
  NotFoundError,
  DomainValidationError,
  ConcurrencyConflictError,
  UnauthorizedError,
} from '../../shared/errors/index.js';
import { auditService } from '../audit/index.js';
import { advanceService } from '../advances/advance.service.js';

export class SettlementService {
  constructor(private repo: SettlementRepository = settlementRepository) {}

  async calculateLiveSettlement(tripId: string): Promise<{
    tripId: string;
    totalAdvancesAllocated: string;
    totalApprovedExpenses: string;
    totalCashReturns: string;
    netBalance: string;
    reimbursementDue: string;
    driverRecoveryDue: string;
    calculation: SettlementCalculationResult;
    record: TripSettlementRecord | null;
  }> {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: true,
        advanceAllocations: {
          where: { status: 'active' },
        },
        expenses: {
          where: {
            approvalStatus: 'approved',
            isSettlementEligible: true,
          },
        },
        advanceTransactions: {
          where: {
            transactionType: 'cash_return',
            status: 'active',
          },
        },
        settlementRecord: true,
      },
    });

    if (!trip) {
      throw new NotFoundError('Trip', tripId);
    }

    const calc = settlementEngine.calculate({
      allocatedAdvances: trip.advanceAllocations.map((a) => ({ id: a.id, amount: dec(a.allocatedAmount) })),
      approvedExpenses: trip.expenses.map((e) => ({ id: e.id, amount: dec(e.approvedAmount || e.amount) })),
      cashReturns: trip.advanceTransactions.map((r) => ({ id: r.id, amount: dec(r.creditAmount) })),
    });

    return {
      tripId,
      totalAdvancesAllocated: calc.totalAdvancesAllocated.toString(),
      totalApprovedExpenses: calc.totalApprovedExpenses.toString(),
      totalCashReturns: calc.totalCashReturns.toString(),
      netBalance: calc.netBalance.toString(),
      reimbursementDue: calc.reimbursementDue.toString(),
      driverRecoveryDue: calc.driverRecoveryDue.toString(),
      calculation: calc,
      record: trip.settlementRecord,
    };
  }

  async finalizeSettlement(
    tripId: string,
    input: FinalizeSettlementInput,
    actor: string
  ): Promise<TripSettlementRecord> {
    if (!actor || actor === 'anonymous') {
      throw new UnauthorizedError('Authorized reviewer is required to finalize trip settlement.');
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: true,
        advanceAllocations: {
          where: { status: 'active' },
          include: { advanceTransaction: true },
        },
        expenses: true,
        advanceTransactions: {
          where: {
            transactionType: 'cash_return',
            status: 'active',
          },
        },
        settlementRecord: true,
      },
    });

    if (!trip) {
      throw new NotFoundError('Trip', tripId);
    }

    // 1. Pre-condition: Check for incomplete reviews
    const unreviewedExpenses = trip.expenses.filter(
      (e) => e.approvalStatus === 'pending' || e.approvalStatus === 'returned_for_correction'
    );
    if (unreviewedExpenses.length > 0) {
      throw new DomainValidationError(
        `Cannot finalize settlement: trip has ${unreviewedExpenses.length} unreviewed or uncorrected expense claim(s). All expenses must be approved or rejected first.`
      );
    }

    // 2. Idempotency Check: if already finalized and no concurrent version mismatch, return existing snapshot
    if (trip.settlementRecord && trip.settlementRecord.isFinalized) {
      if (input.expectedVersion === undefined || input.expectedVersion === trip.settlementRecord.calculationVersion) {
        return trip.settlementRecord;
      }
    }

    // 3. Optimistic Concurrency Control
    const currentVersion = trip.settlementRecord ? trip.settlementRecord.calculationVersion : 1;
    if (input.expectedVersion !== undefined && input.expectedVersion !== currentVersion) {
      throw new ConcurrencyConflictError(
        `Settlement record was modified by another operation. Expected version ${input.expectedVersion}, found ${currentVersion}.`
      );
    }

    // 4. Calculate final values
    const approvedEligibleExpenses = trip.expenses.filter(
      (e) => e.approvalStatus === 'approved' && e.isSettlementEligible
    );

    const calc = settlementEngine.calculate({
      allocatedAdvances: trip.advanceAllocations.map((a) => ({ id: a.id, amount: dec(a.allocatedAmount) })),
      approvedExpenses: approvedEligibleExpenses.map((e) => ({ id: e.id, amount: dec(e.approvedAmount || e.amount) })),
      cashReturns: trip.advanceTransactions.map((r) => ({ id: r.id, amount: dec(r.creditAmount) })),
    });

    // 5. Freeze Immutable Snapshot
    const frozenSnapshot = {
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      driver: {
        id: trip.driver.id,
        fullName: trip.driver.fullName,
        driverNumber: trip.driver.driverNumber,
      },
      finalizedAt: new Date().toISOString(),
      finalizedBy: actor,
      totalAdvancesAllocated: calc.totalAdvancesAllocated.toString(),
      totalApprovedExpenses: calc.totalApprovedExpenses.toString(),
      totalReturnedAmount: calc.totalReturnedAmount.toString(),
      netBalance: calc.netBalance.toString(),
      reimbursementDue: calc.reimbursementDue.toString(),
      driverRecoveryDue: calc.driverRecoveryDue.toString(),
      totals: {
        totalAdvancesAllocated: calc.totalAdvancesAllocated.toString(),
        totalApprovedExpenses: calc.totalApprovedExpenses.toString(),
        totalReturnedAmount: calc.totalReturnedAmount.toString(),
        netBalance: calc.netBalance.toString(),
        reimbursementDue: calc.reimbursementDue.toString(),
        driverRecoveryDue: calc.driverRecoveryDue.toString(),
      },
      status: calc.status,
      allocations: trip.advanceAllocations.map((a) => ({
        id: a.id,
        advanceRef: a.advanceTransaction.referenceNumber,
        allocatedAmount: a.allocatedAmount.toString(),
      })),
      advanceAllocations: trip.advanceAllocations.map((a) => ({
        id: a.id,
        advanceRef: a.advanceTransaction.referenceNumber,
        allocatedAmount: a.allocatedAmount.toString(),
      })),
      approvedExpenses: approvedEligibleExpenses.map((e) => ({
        id: e.id,
        category: e.category,
        description: e.description,
        approvedAmount: (e.approvedAmount || e.amount).toString(),
      })),
      cashReturns: trip.advanceTransactions.map((r) => ({
        id: r.id,
        referenceNumber: r.referenceNumber,
        creditAmount: r.creditAmount.toString(),
      })),
    };

    const nextVersion = currentVersion;
    const finalStatus = calc.netBalance.isZero() ? 'fully_settled' : 'requires_review';

    return runInTransaction(async (tx) => {
      const record = await tx.tripSettlementRecord.upsert({
        where: { tripId },
        create: {
          tripId,
          totalAdvancesAllocated: calc.totalAdvancesAllocated.toPrismaDecimal(),
          totalApprovedExpenses: calc.totalApprovedExpenses.toPrismaDecimal(),
          totalReturnedAmount: calc.totalReturnedAmount.toPrismaDecimal(),
          outstandingBalance: calc.netBalance.toPrismaDecimal(),
          netBalance: calc.netBalance.toPrismaDecimal(),
          reimbursementDue: calc.reimbursementDue.toPrismaDecimal(),
          driverRecoveryDue: calc.driverRecoveryDue.toPrismaDecimal(),
          calculationVersion: nextVersion,
          status: finalStatus,
          isFinalized: true,
          finalizedAt: new Date(),
          finalizedBy: actor,
          settledDate: input.settledDate ? new Date(input.settledDate) : new Date(),
          snapshot: frozenSnapshot as any,
        },
        update: {
          totalAdvancesAllocated: calc.totalAdvancesAllocated.toPrismaDecimal(),
          totalApprovedExpenses: calc.totalApprovedExpenses.toPrismaDecimal(),
          totalReturnedAmount: calc.totalReturnedAmount.toPrismaDecimal(),
          outstandingBalance: calc.netBalance.toPrismaDecimal(),
          netBalance: calc.netBalance.toPrismaDecimal(),
          reimbursementDue: calc.reimbursementDue.toPrismaDecimal(),
          driverRecoveryDue: calc.driverRecoveryDue.toPrismaDecimal(),
          calculationVersion: nextVersion,
          status: finalStatus,
          isFinalized: true,
          finalizedAt: new Date(),
          finalizedBy: actor,
          settledDate: input.settledDate ? new Date(input.settledDate) : new Date(),
          snapshot: frozenSnapshot as any,
        },
      });

      await auditService.log(
        {
          entityType: 'TripSettlementRecord',
          entityId: record.id,
          entityLabel: `Finalized Settlement for Trip ${trip.tripNumber}`,
          action: 'FINALIZE_SETTLEMENT',
          newValue: {
            tripId,
            netBalance: calc.netBalance.toString(),
            reimbursementDue: calc.reimbursementDue.toString(),
            driverRecoveryDue: calc.driverRecoveryDue.toString(),
            isFinalized: true,
            version: nextVersion,
          },
          changedBy: actor,
        },
        tx
      );

      return record;
    });
  }

  async reopenSettlement(
    tripId: string,
    input: ReopenSettlementInput,
    actor: string
  ): Promise<TripSettlementRecord> {
    if (!actor || actor === 'anonymous') {
      throw new UnauthorizedError('Authorized supervisor is required to reopen trip settlement.');
    }

    const settlement = await prisma.tripSettlementRecord.findUnique({
      where: { tripId },
      include: { trip: true },
    });

    if (!settlement) {
      throw new NotFoundError('TripSettlementRecord', tripId);
    }

    if (!settlement.isFinalized) {
      throw new DomainValidationError('Settlement is not currently finalized.');
    }

    if (settlement.postingStatus === 'posted') {
      throw new DomainValidationError(
        'Cannot reopen settlement: financial records are already posted to external accounting.'
      );
    }

    return runInTransaction(async (tx) => {
      const updated = await tx.tripSettlementRecord.update({
        where: { tripId },
        data: {
          isFinalized: false,
          reopenedAt: new Date(),
          reopenedBy: actor,
          reopenReason: input.reason,
          calculationVersion: settlement.calculationVersion + 1,
          status: 'pending',
        },
      });

      await auditService.log(
        {
          entityType: 'TripSettlementRecord',
          entityId: updated.id,
          entityLabel: `Reopened Settlement for Trip ${settlement.trip.tripNumber}`,
          action: 'REOPEN_SETTLEMENT',
          reason: input.reason,
          changedBy: actor,
        },
        tx
      );

      return updated;
    });
  }

  async recordCashReturn(
    tripId: string,
    input: RecordTripCashReturnInput,
    actor: string
  ) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });
    if (!trip) {
      throw new NotFoundError('Trip', tripId);
    }

    const returnTx = await advanceService.createTransaction(
      {
        driverId: trip.driverId,
        tripId,
        referenceNumber: input.referenceNumber,
        transactionDate: input.transactionDate,
        transactionType: 'cash_return',
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        createdBy: actor,
      },
      actor
    );

    // Update settlement record returned amount
    const settlement = await prisma.tripSettlementRecord.findUnique({
      where: { tripId },
    });
    if (settlement) {
      const currentReturned = dec(settlement.totalReturnedAmount);
      const newReturned = currentReturned.plus(dec(input.amount));
      const allocated = dec(settlement.totalAdvancesAllocated);
      const approved = dec(settlement.totalApprovedExpenses);
      const net = allocated.minus(approved).minus(newReturned);

      await prisma.tripSettlementRecord.update({
        where: { tripId },
        data: {
          totalReturnedAmount: newReturned.toPrismaDecimal(),
          netBalance: net.toPrismaDecimal(),
          driverRecoveryDue: net.greaterThan(dec(0)) ? net.toPrismaDecimal() : dec(0).toPrismaDecimal(),
          reimbursementDue: net.lessThan(dec(0)) ? net.abs().toPrismaDecimal() : dec(0).toPrismaDecimal(),
        },
      });
    }

    return returnTx;
  }
}

export const settlementService = new SettlementService();
