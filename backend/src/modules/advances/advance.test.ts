import { describe, it, expect } from 'vitest';
import { advanceAllocationEngine } from './allocation/advance-allocation.engine.js';
import { settlementEngine } from '../settlement/settlement.engine.js';
import { DomainValidationError } from '../../shared/errors/index.js';
import { dec } from '../../shared/decimal/index.js';

describe('Phase 3 Domain Engines: Advance Allocation & Settlement (BE-19, BE-21)', () => {
  // ========================================================
  // BE-19: Advance Allocation Engine
  // ========================================================
  describe('BE-19: Advance Allocation & FIFO Policy', () => {
    it('calculates unallocated balance correctly when no allocations exist', () => {
      const adv = {
        id: 'adv-001',
        driverId: 'drv-1',
        referenceNumber: 'ADV-001',
        transactionDate: new Date('2026-06-01'),
        debitAmount: 10000,
        creditAmount: 0,
        status: 'active',
        settlementAllocations: [],
      };

      const unallocated = advanceAllocationEngine.calculateUnallocatedBalance(adv);
      expect(unallocated.toString()).toBe('10000');
    });

    it('calculates remaining unallocated balance with partial allocations', () => {
      const adv = {
        id: 'adv-001',
        driverId: 'drv-1',
        referenceNumber: 'ADV-001',
        transactionDate: new Date('2026-06-01'),
        debitAmount: 10000,
        creditAmount: 0,
        status: 'active',
        settlementAllocations: [
          { id: 'al-1', allocatedAmount: 4000, status: 'active' },
          { id: 'al-2', allocatedAmount: 2000, status: 'released' }, // released does not count!
          { id: 'al-3', allocatedAmount: 1500, status: 'active' },
        ],
      };

      // Active allocations: 4000 + 1500 = 5500. Unallocated = 10000 - 5500 = 4500
      const unallocated = advanceAllocationEngine.calculateUnallocatedBalance(adv);
      expect(unallocated.toString()).toBe('4500');
    });

    it('treats reversed or inactive advances as 0 unallocated balance', () => {
      const adv = {
        id: 'adv-rev',
        driverId: 'drv-1',
        referenceNumber: 'ADV-REV',
        transactionDate: new Date('2026-06-01'),
        debitAmount: 5000,
        creditAmount: 0,
        status: 'reversed',
        settlementAllocations: [],
      };

      const unallocated = advanceAllocationEngine.calculateUnallocatedBalance(adv);
      expect(unallocated.isZero()).toBe(true);
    });

    it('plans FIFO allocation across multiple advances: oldest advances allocated first', () => {
      // Advance 1: June 1, 2026 (5000 unallocated)
      // Advance 2: June 5, 2026 (4000 unallocated)
      // Advance 3: June 10, 2026 (6000 unallocated)
      // Requested: 8000 -> Should take 5000 from Adv 1, and 3000 from Adv 2. Adv 3 left untouched.
      const mockAdvances = [
        {
          id: 'adv-3',
          driverId: 'drv-1',
          referenceNumber: 'ADV-003',
          transactionDate: new Date('2026-06-10'),
          debitAmount: 6000,
          creditAmount: 0,
          status: 'active',
          settlementAllocations: [],
        },
        {
          id: 'adv-1',
          driverId: 'drv-1',
          referenceNumber: 'ADV-001',
          transactionDate: new Date('2026-06-01'),
          debitAmount: 5000,
          creditAmount: 0,
          status: 'active',
          settlementAllocations: [],
        },
        {
          id: 'adv-2',
          driverId: 'drv-1',
          referenceNumber: 'ADV-002',
          transactionDate: new Date('2026-06-05'),
          debitAmount: 4000,
          creditAmount: 0,
          status: 'active',
          settlementAllocations: [],
        },
      ];

      const result = advanceAllocationEngine.planFIFOAllocation(mockAdvances, 8000);

      expect(result.totalRequested.toString()).toBe('8000');
      expect(result.totalAllocated.toString()).toBe('8000');
      expect(result.allocations.length).toBe(2);

      // First allocation from oldest (adv-1)
      expect(result.allocations[0].advanceTransactionId).toBe('adv-1');
      expect(result.allocations[0].allocatedAmount.toString()).toBe('5000');
      expect(result.allocations[0].remainingUnallocated.toString()).toBe('0');

      // Second allocation from adv-2 (partial: 3000 of 4000)
      expect(result.allocations[1].advanceTransactionId).toBe('adv-2');
      expect(result.allocations[1].allocatedAmount.toString()).toBe('3000');
      expect(result.allocations[1].remainingUnallocated.toString()).toBe('1000');
    });

    it('throws DomainValidationError when requested allocation exceeds available unallocated balance', () => {
      const mockAdvances = [
        {
          id: 'adv-1',
          driverId: 'drv-1',
          referenceNumber: 'ADV-001',
          transactionDate: new Date('2026-06-01'),
          debitAmount: 3000,
          creditAmount: 0,
          status: 'active',
          settlementAllocations: [],
        },
      ];

      expect(() => {
        advanceAllocationEngine.planFIFOAllocation(mockAdvances, 5000);
      }).toThrow(DomainValidationError);
    });

    it('rejects negative or zero allocation amounts', () => {
      expect(() => {
        advanceAllocationEngine.planFIFOAllocation([], 0);
      }).toThrow(DomainValidationError);

      expect(() => {
        advanceAllocationEngine.planFIFOAllocation([], -100);
      }).toThrow(DomainValidationError);
    });
  });

  // ========================================================
  // BE-21: Settlement Engine
  // ========================================================
  describe('BE-21: Trip Settlement Engine Calculations', () => {
    it('calculates balanced settlement correctly: Remaining Balance = 0', () => {
      // Advances: 10,000, Expenses: 8,500, Cash Return: 1,500
      // Net = 10000 - 8500 - 1500 = 0
      const result = settlementEngine.calculate({
        allocatedAdvances: [{ id: 'al-1', amount: 10000 }],
        approvedExpenses: [
          { id: 'exp-1', amount: 5000 },
          { id: 'exp-2', amount: 3500 },
        ],
        cashReturns: [{ id: 'ret-1', amount: 1500 }],
      });

      expect(result.totalAdvancesAllocated.toString()).toBe('10000');
      expect(result.totalApprovedExpenses.toString()).toBe('8500');
      expect(result.totalReturnedAmount.toString()).toBe('1500');
      expect(result.netBalance.toString()).toBe('0');
      expect(result.isBalanced).toBe(true);
      expect(result.isNegativeBalance).toBe(false);
      expect(result.driverRecoveryDue.toString()).toBe('0');
      expect(result.reimbursementDue.toString()).toBe('0');
      expect(result.status).toBe('fully_settled');
    });

    it('calculates positive remaining balance: Driver owes company remaining advance', () => {
      // Advances: 12,000, Expenses: 8,000, Cash Return: 1,000
      // Net = 12000 - 8000 - 1000 = +3,000
      const result = settlementEngine.calculate({
        allocatedAdvances: [{ id: 'al-1', amount: 12000 }],
        approvedExpenses: [{ id: 'exp-1', amount: 8000 }],
        cashReturns: [{ id: 'ret-1', amount: 1000 }],
      });

      expect(result.netBalance.toString()).toBe('3000');
      expect(result.driverRecoveryDue.toString()).toBe('3000');
      expect(result.reimbursementDue.toString()).toBe('0');
      expect(result.isBalanced).toBe(false);
      expect(result.isNegativeBalance).toBe(false);
      expect(result.status).toBe('partially_settled');
    });

    it('preserves negative balance: Expenses exceed advances -> Company owes driver reimbursement', () => {
      // Advances: 5,000, Expenses: 7,500, Cash Return: 0
      // Net = 5000 - 7500 = -2,500. Preserved as negative without zeroing!
      const result = settlementEngine.calculate({
        allocatedAdvances: [{ id: 'al-1', amount: 5000 }],
        approvedExpenses: [{ id: 'exp-1', amount: 7500 }],
        cashReturns: [],
      });

      expect(result.netBalance.toString()).toBe('-2500');
      expect(result.isNegativeBalance).toBe(true);
      expect(result.isBalanced).toBe(false);
      expect(result.reimbursementDue.toString()).toBe('2500');
      expect(result.driverRecoveryDue.toString()).toBe('0');
      expect(result.status).toBe('partially_settled');
    });
  });
});
