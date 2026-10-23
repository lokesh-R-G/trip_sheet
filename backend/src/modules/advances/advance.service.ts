import { prisma, runInTransaction } from '../../shared/database/prisma.js';
import { DriverAdvanceTransaction, AdvanceSettlementAllocation } from '@prisma/client';
import { advanceRepository, AdvanceRepository } from './advance.repository.js';
import { CreateAdvanceTransactionInput } from './advance.dto.js';
import { advanceAllocationEngine } from './allocation/advance-allocation.engine.js';
import { dec, DecimalValue } from '../../shared/decimal/index.js';
import { NotFoundError, ConflictError, DomainValidationError } from '../../shared/errors/index.js';
import { auditService } from '../audit/index.js';

export interface DriverAdvanceSummary {
  driverId: string;
  totalDebits: string;
  totalCredits: string;
  netOutstandingBalance: string;
  totalAllocatedToTrips: string;
  availableUnallocatedBalance: string;
}

export class AdvanceService {
  constructor(private repo: AdvanceRepository = advanceRepository) {}

  async createTransaction(
    input: CreateAdvanceTransactionInput,
    actor: string = 'system'
  ): Promise<DriverAdvanceTransaction> {
    // 1. Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: input.driverId },
    });
    if (!driver) {
      throw new NotFoundError('Driver', input.driverId);
    }

    // 2. If tripId provided, verify trip exists
    if (input.tripId) {
      const trip = await prisma.trip.findUnique({
        where: { id: input.tripId },
      });
      if (!trip) {
        throw new NotFoundError('Trip', input.tripId);
      }
    }

    // 3. Ensure referenceNumber is unique
    const existingRef = await this.repo.findByReferenceNumber(input.referenceNumber);
    if (existingRef) {
      throw new ConflictError(`Advance transaction with reference "${input.referenceNumber}" already exists.`);
    }

    // 4. Handle Reversal / Correction logic
    let targetReversal: DriverAdvanceTransaction | null = null;
    if (input.transactionType === 'reversal' || input.transactionType === 'correction') {
      if (!input.reversalOfId) {
        throw new DomainValidationError('reversalOfId is required for reversal or correction transactions.');
      }
      targetReversal = await this.repo.findById(input.reversalOfId);
      if (!targetReversal) {
        throw new NotFoundError('Target Advance Transaction for Reversal', input.reversalOfId);
      }
      if (targetReversal.status === 'reversed') {
        throw new DomainValidationError(`Transaction "${targetReversal.referenceNumber}" is already reversed.`);
      }
    }

    // 5. Determine debit vs credit
    const amountDec = dec(input.amount);
    let debitAmount = dec(0);
    let creditAmount = dec(0);

    const isDebitType = [
      'advance_issued',
      'additional_advance',
      'driver_disbursement',
    ].includes(input.transactionType);

    if (isDebitType) {
      debitAmount = amountDec;
    } else {
      // cash_return, reversal, correction, expense_settlement_credit, payroll_recovery_credit, write_off
      creditAmount = amountDec;
    }

    // 6. Execute atomic transaction
    const created = await runInTransaction(async (tx) => {
      if (targetReversal && (input.transactionType === 'reversal' || input.transactionType === 'correction')) {
        await tx.driverAdvanceTransaction.update({
          where: { id: targetReversal.id },
          data: { status: 'reversed' },
        });
      }

      return tx.driverAdvanceTransaction.create({
        data: {
          driverId: input.driverId,
          tripId: input.tripId || null,
          referenceNumber: input.referenceNumber,
          transactionDate: new Date(input.transactionDate),
          transactionType: input.transactionType,
          advanceType: input.advanceType || 'trip_advance',
          debitAmount: debitAmount.toPrismaDecimal(),
          creditAmount: creditAmount.toPrismaDecimal(),
          currency: input.currency || 'INR',
          status: 'active',
          paymentMethod: input.paymentMethod,
          reversalOfId: input.reversalOfId || null,
          notes: input.notes || null,
          createdBy: actor,
        },
        include: {
          driver: {
            select: { id: true, fullName: true, driverNumber: true },
          },
          trip: {
            select: { id: true, tripNumber: true },
          },
        },
      });
    });

    // 7. Audit log
    await auditService.log({
      entityType: 'DriverAdvanceTransaction',
      entityId: created.id,
      entityLabel: `Advance Transaction ${created.referenceNumber} (${created.transactionType}) for Driver ${driver.driverNumber}`,
      action: created.transactionType.toUpperCase(),
      newValue: {
        driverId: created.driverId,
        tripId: created.tripId,
        referenceNumber: created.referenceNumber,
        debitAmount: created.debitAmount.toString(),
        creditAmount: created.creditAmount.toString(),
        paymentMethod: created.paymentMethod,
        transactionType: created.transactionType,
      },
      changedBy: actor,
    });

    return created;
  }

  async getDriverSummary(driverId: string): Promise<DriverAdvanceSummary> {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });
    if (!driver) {
      throw new NotFoundError('Driver', driverId);
    }

    const transactions = await prisma.driverAdvanceTransaction.findMany({
      where: {
        driverId,
        status: { not: 'cancelled' },
      },
      include: {
        settlementAllocations: {
          where: { status: 'active' },
        },
      },
      orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
    });

    let totalDebits = dec(0);
    let totalCredits = dec(0);
    let totalAllocated = dec(0);

    for (const tx of transactions) {
      totalDebits = totalDebits.plus(dec(tx.debitAmount));
      totalCredits = totalCredits.plus(dec(tx.creditAmount));

      if (tx.status === 'active' && tx.settlementAllocations) {
        for (const alloc of tx.settlementAllocations) {
          if (alloc.status === 'active') {
            totalAllocated = totalAllocated.plus(dec(alloc.allocatedAmount));
          }
        }
      }
    }

    const netOutstanding = totalDebits.minus(totalCredits);
    // Unallocated available advance = total debits - total credits - total active allocated
    const availableUnallocated = netOutstanding.minus(totalAllocated);

    return {
      driverId,
      totalDebits: totalDebits.toString(),
      totalCredits: totalCredits.toString(),
      netOutstandingBalance: netOutstanding.toString(),
      totalAllocatedToTrips: totalAllocated.toString(),
      availableUnallocatedBalance: availableUnallocated.greaterThan(dec(0))
        ? availableUnallocated.toString()
        : '0',
    };
  }

  /**
   * Allocates driver advances to a trip using the explicit FIFO policy.
   * Atomic concurrency protection prevents simultaneous over-allocation.
   */
  async allocateAdvancesToTrip(
    tripId: string,
    requestedAmount: number | string,
    actor: string = 'system'
  ): Promise<AdvanceSettlementAllocation[]> {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { driver: true },
    });
    if (!trip) {
      throw new NotFoundError('Trip', tripId);
    }

    const requestedDec = dec(requestedAmount);
    if (requestedDec.lessThanOrEqualTo(dec(0))) {
      throw new DomainValidationError('Allocation amount must be greater than zero.');
    }

    return runInTransaction(async (tx) => {
      // 1. Fetch active driver transactions with lock/isolation
      const activeTransactions = await tx.driverAdvanceTransaction.findMany({
        where: {
          driverId: trip.driverId,
          status: 'active',
        },
        include: {
          settlementAllocations: {
            where: { status: 'active' },
          },
        },
        orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
      });

      // 2. Plan FIFO allocation
      const plan = advanceAllocationEngine.planFIFOAllocation(
        activeTransactions as any,
        requestedDec
      );

      // 3. Create allocation records
      const createdAllocations: AdvanceSettlementAllocation[] = [];
      for (const item of plan.allocations) {
        const created = await tx.advanceSettlementAllocation.create({
          data: {
            advanceTransactionId: item.advanceTransactionId,
            tripId,
            allocatedAmount: item.allocatedAmount.toPrismaDecimal(),
            status: 'active',
          },
        });
        createdAllocations.push(created);
      }

      // 4. Update or create TripSettlementRecord with new allocated advances
      const existingSettlement = await tx.tripSettlementRecord.findUnique({
        where: { tripId },
      });

      const currentAllocated = existingSettlement ? dec(existingSettlement.totalAdvancesAllocated) : dec(0);
      const newTotalAllocated = currentAllocated.plus(requestedDec);

      await tx.tripSettlementRecord.upsert({
        where: { tripId },
        create: {
          tripId,
          totalAdvancesAllocated: newTotalAllocated.toPrismaDecimal(),
          totalApprovedExpenses: dec(0).toPrismaDecimal(),
          totalReturnedAmount: dec(0).toPrismaDecimal(),
          outstandingBalance: newTotalAllocated.toPrismaDecimal(),
          netBalance: newTotalAllocated.toPrismaDecimal(),
          driverRecoveryDue: newTotalAllocated.toPrismaDecimal(),
          reimbursementDue: dec(0).toPrismaDecimal(),
          status: 'pending',
        },
        update: {
          totalAdvancesAllocated: newTotalAllocated.toPrismaDecimal(),
          netBalance: newTotalAllocated
            .minus(existingSettlement?.totalApprovedExpenses ? dec(existingSettlement.totalApprovedExpenses) : dec(0))
            .minus(existingSettlement?.totalReturnedAmount ? dec(existingSettlement.totalReturnedAmount) : dec(0))
            .toPrismaDecimal(),
        },
      });

      // 5. Audit log
      await auditService.log(
        {
          entityType: 'AdvanceSettlementAllocation',
          entityId: tripId,
          entityLabel: `FIFO Advance Allocation of ₹${requestedDec.toString()} to Trip ${trip.tripNumber}`,
          action: 'ALLOCATE',
          newValue: {
            tripId,
            driverId: trip.driverId,
            allocatedAmount: requestedDec.toString(),
            allocationsCount: createdAllocations.length,
          },
          changedBy: actor,
        },
        tx
      );

      return createdAllocations;
    });
  }

  async releaseAllocation(
    allocationId: string,
    reason: string,
    actor: string
  ): Promise<AdvanceSettlementAllocation> {
    const allocation = await prisma.advanceSettlementAllocation.findUnique({
      where: { id: allocationId },
      include: { trip: true },
    });
    if (!allocation) {
      throw new NotFoundError('AdvanceSettlementAllocation', allocationId);
    }
    if (allocation.status !== 'active') {
      throw new DomainValidationError(`Allocation is already in "${allocation.status}" status.`);
    }

    return runInTransaction(async (tx) => {
      const updated = await tx.advanceSettlementAllocation.update({
        where: { id: allocationId },
        data: {
          status: 'released',
          releaseReason: reason,
          releasedBy: actor,
          releasedAt: new Date(),
        },
      });

      // Adjust TripSettlementRecord
      const settlement = await tx.tripSettlementRecord.findUnique({
        where: { tripId: allocation.tripId },
      });
      if (settlement) {
        const releasedDec = dec(allocation.allocatedAmount);
        const newAllocated = dec(settlement.totalAdvancesAllocated).minus(releasedDec);
        await tx.tripSettlementRecord.update({
          where: { tripId: allocation.tripId },
          data: {
            totalAdvancesAllocated: newAllocated.greaterThan(dec(0)) ? newAllocated.toPrismaDecimal() : dec(0).toPrismaDecimal(),
          },
        });
      }

      await auditService.log(
        {
          entityType: 'AdvanceSettlementAllocation',
          entityId: allocation.id,
          entityLabel: `Released Advance Allocation from Trip ${allocation.trip.tripNumber}`,
          action: 'RELEASE',
          reason,
          changedBy: actor,
        },
        tx
      );

      return updated;
    });
  }

  async listTransactions(filters: {
    driverId?: string;
    tripId?: string;
    transactionType?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const skip = (filters.page - 1) * filters.limit;
    const start = filters.startDate ? new Date(filters.startDate) : undefined;
    const end = filters.endDate ? new Date(filters.endDate) : undefined;

    const { items, total } = await this.repo.list({
      driverId: filters.driverId,
      tripId: filters.tripId,
      transactionType: filters.transactionType,
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

  async getTransactionById(id: string): Promise<DriverAdvanceTransaction> {
    const tx = await this.repo.findById(id);
    if (!tx) {
      throw new NotFoundError('DriverAdvanceTransaction', id);
    }
    return tx;
  }
}

export const advanceService = new AdvanceService();
