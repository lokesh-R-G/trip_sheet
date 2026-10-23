import { DecimalValue, dec } from '../../../shared/decimal/index.js';
import { DomainValidationError } from '../../../shared/errors/index.js';

export interface AdvanceWithAllocations {
  id: string;
  driverId: string;
  referenceNumber: string;
  transactionDate: Date;
  createdAt?: Date;
  debitAmount: number | string | DecimalValue | { toString(): string };
  creditAmount: number | string | DecimalValue | { toString(): string };
  status: string;
  settlementAllocations?: Array<{
    id: string;
    allocatedAmount: number | string | DecimalValue | { toString(): string };
    status: string;
  }>;
}

export interface PlannedAllocation {
  advanceTransactionId: string;
  referenceNumber: string;
  allocatedAmount: DecimalValue;
  previousAllocated: DecimalValue;
  remainingUnallocated: DecimalValue;
}

export interface FIFOAllocationResult {
  totalRequested: DecimalValue;
  totalAllocated: DecimalValue;
  allocations: PlannedAllocation[];
}

export class AdvanceAllocationEngine {
  /**
   * Calculates the currently unallocated available balance of an advance transaction.
   * Unallocated = debitAmount - sum(active allocated amounts).
   */
  calculateUnallocatedBalance(advance: AdvanceWithAllocations): DecimalValue {
    if (advance.status !== 'active') {
      return dec(0);
    }

    const debitDec = dec(advance.debitAmount);
    if (debitDec.lessThanOrEqualTo(dec(0))) {
      return dec(0);
    }

    let activeAllocated = dec(0);
    if (advance.settlementAllocations && advance.settlementAllocations.length > 0) {
      for (const alloc of advance.settlementAllocations) {
        if (alloc.status === 'active') {
          activeAllocated = activeAllocated.plus(dec(alloc.allocatedAmount));
        }
      }
    }

    const unallocated = debitDec.minus(activeAllocated);
    return unallocated.greaterThan(dec(0)) ? unallocated : dec(0);
  }

  /**
   * Plans FIFO allocation across eligible driver advances.
   * Policy: Oldest active advances (by transactionDate ASC, then ID) are allocated first.
   * Prevents allocations beyond available advance balance.
   */
  planFIFOAllocation(
    advances: AdvanceWithAllocations[],
    requestedAmount: number | string | DecimalValue
  ): FIFOAllocationResult {
    const requestedDec = dec(requestedAmount);
    if (requestedDec.lessThanOrEqualTo(dec(0))) {
      throw new DomainValidationError('Allocation amount must be greater than zero.');
    }

    // 1. Calculate available unallocated balance per advance
    interface EligibleAdvance {
      advance: AdvanceWithAllocations;
      unallocated: DecimalValue;
      alreadyAllocated: DecimalValue;
    }

    const eligibleList: EligibleAdvance[] = [];
    let totalAvailable = dec(0);

    // Sort by transactionDate ASC, then createdAt ASC, then id ASC
    const sorted = [...advances].sort((a, b) => {
      const dateDiff = new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      const createdDiff = (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      if (createdDiff !== 0) return createdDiff;
      return a.id.localeCompare(b.id);
    });

    for (const adv of sorted) {
      const unallocated = this.calculateUnallocatedBalance(adv);
      if (unallocated.greaterThan(dec(0))) {
        let activeAllocated = dec(0);
        if (adv.settlementAllocations) {
          for (const al of adv.settlementAllocations) {
            if (al.status === 'active') activeAllocated = activeAllocated.plus(dec(al.allocatedAmount));
          }
        }
        eligibleList.push({
          advance: adv,
          unallocated,
          alreadyAllocated: activeAllocated,
        });
        totalAvailable = totalAvailable.plus(unallocated);
      }
    }

    // 2. Validate total available against requested
    if (totalAvailable.lessThan(requestedDec)) {
      throw new DomainValidationError(
        `Insufficient unallocated advance balance. Requested: ₹${requestedDec.toString()}, Available: ₹${totalAvailable.toString()}.`,
        [
          {
            field: 'amount',
            message: `Available unallocated balance is ₹${totalAvailable.toString()}`,
          },
        ]
      );
    }

    // 3. Perform FIFO allocation distribution
    let remainingToAllocate = requestedDec;
    const allocations: PlannedAllocation[] = [];

    for (const item of eligibleList) {
      if (remainingToAllocate.isZero()) break;

      const takeAmount = item.unallocated.lessThanOrEqualTo(remainingToAllocate)
        ? item.unallocated
        : remainingToAllocate;

      allocations.push({
        advanceTransactionId: item.advance.id,
        referenceNumber: item.advance.referenceNumber,
        allocatedAmount: takeAmount,
        previousAllocated: item.alreadyAllocated,
        remainingUnallocated: item.unallocated.minus(takeAmount),
      });

      remainingToAllocate = remainingToAllocate.minus(takeAmount);
    }

    return {
      totalRequested: requestedDec,
      totalAllocated: requestedDec,
      allocations,
    };
  }
}

export const advanceAllocationEngine = new AdvanceAllocationEngine();
