import { z } from 'zod';
import { dec, DecimalValue, InvalidDecimalError } from '../decimal/index.js';

export const zUuid = z.string().uuid({ message: 'Must be a valid UUID' });

export const zDecimalString = z
  .union([z.string(), z.number()])
  .transform((val, ctx) => {
    try {
      const d = dec(val);
      return d.toString();
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must be a valid decimal number representation',
      });
      return z.NEVER;
    }
  });

export const zNonNegativeDecimalString = z
  .union([z.string(), z.number()])
  .transform((val, ctx) => {
    try {
      const d = dec(val);
      if (d.isNegative()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Decimal value cannot be negative',
        });
        return z.NEVER;
      }
      return d.toString();
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must be a valid non-negative decimal representation',
      });
      return z.NEVER;
    }
  });

export const zPositiveDecimalString = z
  .union([z.string(), z.number()])
  .transform((val, ctx) => {
    try {
      const d = dec(val);
      if (!d.isPositive()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Decimal value must be greater than zero',
        });
        return z.NEVER;
      }
      return d.toString();
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Must be a valid positive decimal representation',
      });
      return z.NEVER;
    }
  });

export const zDateOnlyString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Date must be in YYYY-MM-DD format',
});

export const zIsoDateTimeString = z.string().datetime({
  message: 'Timestamp must be a valid ISO 8601 string',
});

export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z
    .string()
    .optional()
    .default('25')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 25))),
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
});
