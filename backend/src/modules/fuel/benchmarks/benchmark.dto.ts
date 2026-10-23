import { z } from 'zod';

export const CreateMileageBenchmarkSchema = z.object({
  name: z.string().min(2).max(150),
  vehicleId: z.string().uuid().optional().nullable(),
  vehicleType: z.string().min(2).max(50).optional().nullable(),
  minTonnage: z.union([z.number(), z.string()]).optional().nullable(),
  maxTonnage: z.union([z.number(), z.string()]).optional().nullable(),
  terrain: z.string().max(50).optional().nullable(),
  routeCategory: z.string().max(50).optional().nullable(),
  expectedMileageKmPerLitre: z.union([z.number(), z.string()]).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, 'expectedMileageKmPerLitre must be positive'),
  permittedTolerancePercent: z.union([z.number(), z.string()]).optional().default(0).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'permittedTolerancePercent must be non-negative'),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  priority: z.number().int().min(1).default(1),
  notes: z.string().optional().nullable(),
}).refine((data) => {
  if (data.minTonnage !== undefined && data.minTonnage !== null &&
      data.maxTonnage !== undefined && data.maxTonnage !== null) {
    return Number(data.maxTonnage) >= Number(data.minTonnage);
  }
  return true;
}, {
  message: 'maxTonnage must be greater than or equal to minTonnage',
  path: ['maxTonnage'],
});

export type CreateMileageBenchmarkInput = z.infer<typeof CreateMileageBenchmarkSchema>;
