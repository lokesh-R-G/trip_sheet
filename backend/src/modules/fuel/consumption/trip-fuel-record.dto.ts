import { z } from 'zod';

export const SaveTripFuelRecordSchema = z.object({
  openingFuelQuantity: z.union([z.number(), z.string()]).optional().nullable().refine((val) => {
    if (val === undefined || val === null) return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'openingFuelQuantity must be non-negative'),
  closingFuelQuantity: z.union([z.number(), z.string()]).optional().nullable().refine((val) => {
    if (val === undefined || val === null) return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'closingFuelQuantity must be non-negative'),
  manuallyReportedLitres: z.union([z.number(), z.string()]).optional().nullable().refine((val) => {
    if (val === undefined || val === null) return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'manuallyReportedLitres must be non-negative'),
  measurementMethod: z.enum(['calculated_balance', 'manual_slip', 'fuel_sensor']).optional(),
  recordedBy: z.string().min(1).max(100).optional(),
});

export type SaveTripFuelRecordInput = z.infer<typeof SaveTripFuelRecordSchema>;

export const AddTripFuelAdditionSchema = z.object({
  fuelTopUpId: z.string().uuid().optional().nullable(),
  litres: z.union([z.number(), z.string()]).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, 'litres must be a positive number'),
  source: z.string().min(2).max(50).default('fuel_station'),
  receiptReference: z.string().max(100).optional().nullable(),
  additionDateTime: z.string().datetime({ message: 'additionDateTime must be a valid ISO 8601 timestamp' }),
  verified: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

export type AddTripFuelAdditionInput = z.infer<typeof AddTripFuelAdditionSchema>;
