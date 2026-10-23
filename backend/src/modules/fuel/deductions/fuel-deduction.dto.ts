import { z } from 'zod';

export const ProposeFuelDeductionSchema = z.object({
  tripId: z.string().uuid('tripId must be a valid UUID'),
  overrideFuelPrice: z.union([z.number(), z.string()]).optional().refine((val) => {
    if (val === undefined || val === null) return true;
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, 'overrideFuelPrice must be positive'),
});

export type ProposeFuelDeductionInput = z.infer<typeof ProposeFuelDeductionSchema>;

export const ReviewDeductionActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'adjust', 'return_for_correction']),
  adjustedAmount: z.union([z.number(), z.string()]).optional().refine((val) => {
    if (val === undefined || val === null) return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'adjustedAmount must be non-negative'),
  reason: z.string().optional(),
  payrollMonth: z.string().regex(/^\d{4}-\d{2}$/, 'payrollMonth must be in YYYY-MM format').optional(),
  expectedVersion: z.number().int().optional(),
}).refine((data) => {
  if (data.action === 'adjust' && (data.adjustedAmount === undefined || data.adjustedAmount === null)) {
    return false;
  }
  return true;
}, {
  message: 'adjustedAmount is required when action is "adjust"',
  path: ['adjustedAmount'],
}).refine((data) => {
  if ((data.action === 'reject' || data.action === 'adjust' || data.action === 'return_for_correction') && !data.reason) {
    return false;
  }
  return true;
}, {
  message: 'reason is required for reject, adjust, or return_for_correction',
  path: ['reason'],
});

export type ReviewDeductionActionInput = z.infer<typeof ReviewDeductionActionSchema>;
