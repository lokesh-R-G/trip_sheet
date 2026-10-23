import { z } from 'zod';

export const CreateFuelTopUpSchema = z.object({
  vehicleId: z.string().uuid('vehicleId must be a valid UUID'),
  dateTime: z.string().datetime({ message: 'dateTime must be a valid ISO 8601 timestamp' }),
  litres: z.union([z.number(), z.string()]).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, 'litres must be a positive number'),
  dispensedLitres: z.union([z.number(), z.string()]).optional().refine((val) => {
    if (val === undefined || val === null) return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'dispensedLitres must be non-negative'),
  fuelType: z.string().min(1).max(50).default('diesel'),
  pricePerLitre: z.union([z.number(), z.string()]).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'pricePerLitre must be non-negative'),
  totalCost: z.union([z.number(), z.string()]).optional().refine((val) => {
    if (val === undefined || val === null) return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'totalCost must be non-negative'),
  fuelStation: z.string().min(2).max(255),
  pumpMeterStart: z.union([z.number(), z.string()]).optional().refine((val) => {
    if (val === undefined || val === null) return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'pumpMeterStart must be non-negative'),
  pumpMeterEnd: z.union([z.number(), z.string()]).optional().refine((val) => {
    if (val === undefined || val === null) return true;
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'pumpMeterEnd must be non-negative'),
  odometerReading: z.number().int().nonnegative().optional(),
  paymentMethod: z.string().min(2).max(50),
  receiptReference: z.string().min(1).max(100),
  recordedBy: z.string().min(1).max(100),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.pumpMeterStart !== undefined && data.pumpMeterEnd !== undefined) {
    return Number(data.pumpMeterEnd) >= Number(data.pumpMeterStart);
  }
  return true;
}, {
  message: 'pumpMeterEnd must be greater than or equal to pumpMeterStart',
  path: ['pumpMeterEnd'],
});

export type CreateFuelTopUpInput = z.infer<typeof CreateFuelTopUpSchema>;

export const QueryFuelTopUpSchema = z.object({
  vehicleId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type QueryFuelTopUpInput = z.infer<typeof QueryFuelTopUpSchema>;
