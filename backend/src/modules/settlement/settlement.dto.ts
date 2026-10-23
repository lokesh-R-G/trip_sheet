import { z } from 'zod';

export const FinalizeSettlementSchema = z.object({
  expectedVersion: z.number().int().optional(),
  settledDate: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export type FinalizeSettlementInput = z.infer<typeof FinalizeSettlementSchema>;

export const ReopenSettlementSchema = z.object({
  reason: z.string().min(5, 'A clear documented reason of at least 5 characters is required to reopen settlement'),
});

export type ReopenSettlementInput = z.infer<typeof ReopenSettlementSchema>;

export const RecordTripCashReturnSchema = z.object({
  amount: z.union([z.number(), z.string()]).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, 'amount must be a positive number'),
  referenceNumber: z.string().min(2).max(100),
  transactionDate: z.string(),
  paymentMethod: z.string().min(2).max(50).default('cash'),
  notes: z.string().optional().nullable(),
});

export type RecordTripCashReturnInput = z.infer<typeof RecordTripCashReturnSchema>;
