import { z } from 'zod';

export const AdvanceTransactionTypeEnum = z.enum([
  'advance_issued',
  'additional_advance',
  'driver_disbursement',
  'cash_return',
  'reversal',
  'correction',
  'expense_settlement_credit',
  'payroll_recovery_credit',
  'write_off',
]);

export const AdvanceTypeEnum = z.enum([
  'trip_advance',
  'operational_advance',
  'fuel_advance',
  'fuel_card_advance',
  'toll_advance',
  'other_approved',
]);

export const CreateAdvanceTransactionSchema = z.object({
  driverId: z.string().uuid('driverId must be a valid UUID'),
  tripId: z.string().uuid('tripId must be a valid UUID').optional().nullable(),
  referenceNumber: z.string().min(2).max(100),
  transactionDate: z.string(),
  transactionType: AdvanceTransactionTypeEnum,
  advanceType: AdvanceTypeEnum.optional(),
  amount: z.union([z.number(), z.string()]).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, 'amount must be a positive number'),
  currency: z.string().min(1).max(10).optional(),
  paymentMethod: z.string().min(2).max(50).default('cash'),
  reversalOfId: z.string().uuid('reversalOfId must be a valid UUID').optional().nullable(),
  notes: z.string().optional().nullable(),
  createdBy: z.string().min(1).max(100).optional(),
});

export type CreateAdvanceTransactionInput = z.infer<typeof CreateAdvanceTransactionSchema>;

export const QueryAdvanceSchema = z.object({
  driverId: z.string().uuid().optional(),
  tripId: z.string().uuid().optional(),
  transactionType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryAdvanceInput = z.infer<typeof QueryAdvanceSchema>;
