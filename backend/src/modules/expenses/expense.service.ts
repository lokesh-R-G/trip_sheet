import { prisma, runInTransaction } from '../../shared/database/prisma.js';
import { TripExpense } from '@prisma/client';
import { expenseRepository, ExpenseRepository } from './expense.repository.js';
import { SubmitTripExpenseInput, ReviewTripExpenseInput } from './expense.dto.js';
import { dec, DecimalValue } from '../../shared/decimal/index.js';
import {
  NotFoundError,
  DomainValidationError,
  UnauthorizedError,
  ConflictError,
} from '../../shared/errors/index.js';
import { auditService } from '../audit/index.js';

export class ExpenseService {
  constructor(private repo: ExpenseRepository = expenseRepository) {}

  async submitExpense(input: SubmitTripExpenseInput, actor: string = 'system'): Promise<TripExpense> {
    // 1. Verify trip exists
    const trip = await prisma.trip.findUnique({
      where: { id: input.tripId },
    });
    if (!trip) {
      throw new NotFoundError('Trip', input.tripId);
    }

    const driverId = input.driverId || trip.driverId;

    // 2. Prevent double-counting: Check if linked fuel top-up is already claimed in another expense
    if (input.fuelTopUpId) {
      const existingLinked = await prisma.tripExpense.findFirst({
        where: {
          fuelTopUpId: input.fuelTopUpId,
          approvalStatus: { not: 'rejected' },
        },
      });
      if (existingLinked) {
        throw new ConflictError(
          `Fuel top-up ${input.fuelTopUpId} is already linked to expense ${existingLinked.id}. Duplicate expense claims are prevented.`
        );
      }
    }

    // 3. Double-counting check for receipt reference within the same trip
    if (input.receiptReference) {
      const duplicateReceipt = await prisma.tripExpense.findFirst({
        where: {
          tripId: input.tripId,
          receiptReference: input.receiptReference,
          approvalStatus: { not: 'rejected' },
        },
      });
      if (duplicateReceipt) {
        throw new ConflictError(
          `An active expense with receipt reference "${input.receiptReference}" already exists for this trip.`
        );
      }
    }

    const amountDec = dec(input.amount);

    // 4. Create expense in pending approval status
    const created = await prisma.tripExpense.create({
      data: {
        tripId: input.tripId,
        driverId,
        category: input.category,
        description: input.description,
        amount: amountDec.toPrismaDecimal(),
        expenseDate: new Date(input.expenseDate),
        paymentMethod: input.paymentMethod,
        vendorName: input.vendorName || null,
        receiptReference: input.receiptReference || null,
        fuelTopUpId: input.fuelTopUpId || null,
        isSettlementEligible: input.isSettlementEligible,
        submittedBy: actor,
        approvalStatus: 'pending',
      },
      include: {
        trip: {
          select: { id: true, tripNumber: true },
        },
      },
    });

    // 5. Audit log
    await auditService.log({
      entityType: 'TripExpense',
      entityId: created.id,
      entityLabel: `Expense ${created.category} (₹${amountDec.toString()}) for Trip ${created.trip.tripNumber}`,
      action: 'SUBMIT_EXPENSE',
      newValue: {
        tripId: created.tripId,
        category: created.category,
        amount: created.amount.toString(),
        paymentMethod: created.paymentMethod,
        receiptReference: created.receiptReference,
      },
      changedBy: actor,
    });

    return created;
  }

  async reviewExpense(
    id: string,
    input: ReviewTripExpenseInput,
    actor: string
  ): Promise<TripExpense> {
    if (!actor || actor === 'anonymous') {
      throw new UnauthorizedError('Authorized reviewer is required to review trip expenses.');
    }

    const expense = await this.repo.findById(id);
    if (!expense) {
      throw new NotFoundError('TripExpense', id);
    }

    // Guard: Prevent modification if settlement is finalized
    const settlement = await prisma.tripSettlementRecord.findUnique({
      where: { tripId: expense.tripId },
    });
    if (settlement && settlement.isFinalized) {
      throw new DomainValidationError(
        'Cannot modify expense: the trip settlement is finalized and locked against direct mutations.'
      );
    }

    let newStatus = expense.approvalStatus;
    let approvedAmount: DecimalValue | null = null;
    let rejectionReason = expense.rejectionReason;

    switch (input.action) {
      case 'approve':
        newStatus = 'approved';
        approvedAmount = input.approvedAmount !== undefined ? dec(input.approvedAmount) : dec(expense.amount);
        rejectionReason = null;
        break;

      case 'adjust':
        newStatus = 'approved';
        approvedAmount = input.adjustedAmount !== undefined
          ? dec(input.adjustedAmount)
          : (input.approvedAmount !== undefined ? dec(input.approvedAmount) : dec(expense.amount));
        rejectionReason = null;
        break;

      case 'reject':
        newStatus = 'rejected';
        approvedAmount = dec(0);
        rejectionReason = input.rejectionReason || 'Rejected by reviewer';
        break;

      case 'return_for_correction':
        newStatus = 'returned_for_correction';
        approvedAmount = null;
        rejectionReason = input.rejectionReason || 'Returned for operational correction';
        break;
    }

    return runInTransaction(async (tx) => {
      const updated = await tx.tripExpense.update({
        where: { id },
        data: {
          approvalStatus: newStatus,
          approvedAmount: approvedAmount ? approvedAmount.toPrismaDecimal() : null,
          amount: input.action === 'adjust' && approvedAmount ? approvedAmount.toPrismaDecimal() : undefined,
          reviewer: actor,
          reviewedAt: new Date(),
          reviewNotes: input.comments || input.notes || null,
          rejectionReason,
        },
        include: {
          trip: { select: { id: true, tripNumber: true } },
        },
      });

      // Recalculate and synchronize totalApprovedExpenses on TripSettlementRecord
      const approvedExpenses = await tx.tripExpense.findMany({
        where: {
          tripId: expense.tripId,
          approvalStatus: 'approved',
          isSettlementEligible: true,
        },
      });

      let sumApproved = dec(0);
      for (const exp of approvedExpenses) {
        if (exp.approvedAmount) {
          sumApproved = sumApproved.plus(dec(exp.approvedAmount));
        }
      }

      const existingSettlement = await tx.tripSettlementRecord.findUnique({
        where: { tripId: expense.tripId },
      });

      if (existingSettlement) {
        const allocated = dec(existingSettlement.totalAdvancesAllocated);
        const returned = dec(existingSettlement.totalReturnedAmount);
        // Net Balance = Allocated Advances - Approved Expenses - Returned
        const net = allocated.minus(sumApproved).minus(returned);

        await tx.tripSettlementRecord.update({
          where: { tripId: expense.tripId },
          data: {
            totalApprovedExpenses: sumApproved.toPrismaDecimal(),
            netBalance: net.toPrismaDecimal(),
            driverRecoveryDue: net.greaterThan(dec(0)) ? net.toPrismaDecimal() : dec(0).toPrismaDecimal(),
            reimbursementDue: net.lessThan(dec(0)) ? net.abs().toPrismaDecimal() : dec(0).toPrismaDecimal(),
          },
        });
      }

      // Audit log
      await auditService.log(
        {
          entityType: 'TripExpense',
          entityId: updated.id,
          entityLabel: `Expense ${input.action.toUpperCase()} for Trip ${updated.trip.tripNumber}`,
          action: `REVIEW_${input.action.toUpperCase()}`,
          previousValue: {
            approvalStatus: expense.approvalStatus,
            approvedAmount: expense.approvedAmount?.toString() || null,
          },
          newValue: {
            approvalStatus: updated.approvalStatus,
            approvedAmount: updated.approvedAmount?.toString() || null,
          },
          reason: input.rejectionReason || input.notes,
          changedBy: actor,
        },
        tx
      );

      return updated;
    });
  }

  async getExpenseById(id: string): Promise<TripExpense> {
    const expense = await this.repo.findById(id);
    if (!expense) {
      throw new NotFoundError('TripExpense', id);
    }
    return expense;
  }

  async listExpenses(filters: {
    tripId?: string;
    category?: string;
    approvalStatus?: string;
    page: number;
    limit: number;
  }) {
    const skip = (filters.page - 1) * filters.limit;
    const { items, total } = await this.repo.list({
      tripId: filters.tripId,
      category: filters.category,
      approvalStatus: filters.approvalStatus,
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

export const expenseService = new ExpenseService();
