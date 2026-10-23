import { DecimalValue, dec } from '../../shared/decimal/index.js';

export interface SettlementCalculationInput {
  allocatedAdvances: Array<{ id: string; amount: number | string | DecimalValue | { toString(): string } }>;
  approvedExpenses: Array<{ id: string; amount: number | string | DecimalValue | { toString(): string } }>;
  cashReturns: Array<{ id: string; amount: number | string | DecimalValue | { toString(): string } }>;
}

export interface SettlementCalculationResult {
  totalAdvancesAllocated: DecimalValue;
  totalApprovedExpenses: DecimalValue;
  totalReturnedAmount: DecimalValue;
  totalCashReturns: DecimalValue;
  netBalance: DecimalValue;
  reimbursementDue: DecimalValue;
  driverRecoveryDue: DecimalValue;
  isBalanced: boolean;
  isNegativeBalance: boolean;
  status: 'fully_settled' | 'partially_settled' | 'pending';
}

export class SettlementEngine {
  /**
   * Calculates trip settlement:
   * Remaining balance = advances allocated to trip - approved settlement expenses - amounts returned.
   * Preserves negative balances (expenses > advances => reimbursement due).
   */
  calculate(input: SettlementCalculationInput): SettlementCalculationResult {
    let totalAdvancesAllocated = dec(0);
    for (const adv of input.allocatedAdvances) {
      totalAdvancesAllocated = totalAdvancesAllocated.plus(dec(adv.amount));
    }

    let totalApprovedExpenses = dec(0);
    for (const exp of input.approvedExpenses) {
      totalApprovedExpenses = totalApprovedExpenses.plus(dec(exp.amount));
    }

    let totalReturnedAmount = dec(0);
    for (const ret of input.cashReturns) {
      totalReturnedAmount = totalReturnedAmount.plus(dec(ret.amount));
    }

    // Remaining Balance = Allocated - Expenses - Returned
    const netBalance = totalAdvancesAllocated.minus(totalApprovedExpenses).minus(totalReturnedAmount).round(2);

    let reimbursementDue = dec(0);
    let driverRecoveryDue = dec(0);

    if (netBalance.lessThan(dec(0))) {
      // Expenses exceed advances -> company owes reimbursement to driver
      reimbursementDue = netBalance.abs();
    } else if (netBalance.greaterThan(dec(0))) {
      // Advances exceed expenses & returns -> driver owes remaining advance funds
      driverRecoveryDue = netBalance;
    }

    let status: 'fully_settled' | 'partially_settled' | 'pending' = 'pending';
    if (netBalance.isZero() && (totalAdvancesAllocated.greaterThan(dec(0)) || totalApprovedExpenses.greaterThan(dec(0)))) {
      status = 'fully_settled';
    } else if (!netBalance.isZero()) {
      status = 'partially_settled';
    }

    return {
      totalAdvancesAllocated,
      totalApprovedExpenses,
      totalReturnedAmount,
      totalCashReturns: totalReturnedAmount,
      netBalance,
      reimbursementDue,
      driverRecoveryDue,
      isBalanced: netBalance.isZero(),
      isNegativeBalance: netBalance.lessThan(dec(0)),
      status,
    };
  }
}

export const settlementEngine = new SettlementEngine();
