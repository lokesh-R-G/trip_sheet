import { z } from 'zod';

const allowedCategories = [
  'tolls',
  'permits',
  'loading & unloading',
  'loading_unloading',
  'parking',
  'repairs',
  'refreshments',
  'rto charges',
  'rto_charges',
  'other operational',
  'other_operational',
  'fuel',
];

export const ExpenseCategorySchema = z.string().refine((val) => {
  return allowedCategories.includes(val.trim().toLowerCase());
}, {
  message: 'Category must be one of: tolls, permits, loading/unloading, parking, repairs, refreshments, rto charges, other operational, fuel',
});

export const SubmitTripExpenseSchema = z.object({
  tripId: z.string().uuid('tripId must be a valid UUID'),
  driverId: z.string().uuid('driverId must be a valid UUID').optional().nullable(),
  category: ExpenseCategorySchema,
  description: z.string().min(2).max(500),
  amount: z.union([z.number(), z.string()]).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, 'amount must be a positive number'),
  expenseDate: z.string(),
  paymentMethod: z.string().min(2).max(50).default('cash'),
  vendorName: z.string().max(150).optional().nullable(),
  receiptReference: z.string().max(100).optional().nullable(),
  fuelTopUpId: z.string().uuid().optional().nullable(),
  isSettlementEligible: z.boolean().default(true).optional(),
  submittedBy: z.string().min(1).max(100).optional(),
});

export type SubmitTripExpenseInput = z.infer<typeof SubmitTripExpenseSchema>;

export const ReviewTripExpenseSchema = z.object({
  action: z.enum(['approve', 'reject', 'adjust', 'return_for_correction']),
  approvedAmount: z.union([z.number(), z.string()]).optional().refine((val) => {
    if (val === undefined || val === null) return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'approvedAmount must be non-negative'),
  adjustedAmount: z.union([z.number(), z.string()]).optional().refine((val) => {
    if (val === undefined || val === null) return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'adjustedAmount must be non-negative'),
  notes: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
}).refine((data) => {
  if ((data.action === 'reject' || data.action === 'return_for_correction') && !data.rejectionReason) {
    return false;
  }
  return true;
}, {
  message: 'rejectionReason is required when rejecting or returning for correction',
  path: ['rejectionReason'],
});

export type ReviewTripExpenseInput = z.infer<typeof ReviewTripExpenseSchema>;

export const QueryExpenseSchema = z.object({
  tripId: z.string().uuid().optional(),
  category: z.string().optional(),
  approvalStatus: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryExpenseInput = z.infer<typeof QueryExpenseSchema>;
