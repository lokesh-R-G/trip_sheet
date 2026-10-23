import { z } from 'zod';
import { zUuid, zDateOnlyString } from '../../../shared/validation/custom-types.js';

export const EmploymentStatusEnum = z.enum([
  'active',
  'on_leave',
  'suspended',
  'resigned',
  'terminated',
]);

export type EmploymentStatus = z.infer<typeof EmploymentStatusEnum>;

export const createDriverSchema = z
  .object({
    driverNumber: z
      .string()
      .trim()
      .min(2, { message: 'Driver number must be at least 2 characters' })
      .max(50),
    fullName: z
      .string()
      .trim()
      .min(2, { message: 'Full name must be at least 2 characters' })
      .max(255),
    phone: z
      .string()
      .trim()
      .min(7, { message: 'Phone number must be at least 7 characters' })
      .max(30),
    email: z.string().trim().email({ message: 'Invalid email address' }).optional().nullable(),
    address: z
      .string()
      .trim()
      .min(3, { message: 'Address must be at least 3 characters' }),
    licenseNumber: z
      .string()
      .trim()
      .min(3, { message: 'License number must be at least 3 characters' })
      .max(100),
    licenseExpiry: zDateOnlyString,
    joiningDate: zDateOnlyString,
    status: EmploymentStatusEnum.default('active'),
    currentVehicleId: zUuid.optional().nullable(),
    notes: z.string().trim().optional().nullable(),
  })
  .strict();

export type CreateDriverDTO = z.infer<typeof createDriverSchema>;

export const updateDriverSchema = z
  .object({
    fullName: z.string().trim().min(2).max(255).optional(),
    phone: z.string().trim().min(7).max(30).optional(),
    email: z.string().trim().email().optional().nullable(),
    address: z.string().trim().min(3).optional(),
    licenseExpiry: zDateOnlyString.optional(),
    currentVehicleId: zUuid.optional().nullable(),
    notes: z.string().trim().optional().nullable(),
  })
  .strict();

export type UpdateDriverDTO = z.infer<typeof updateDriverSchema>;

export const changeDriverStatusSchema = z
  .object({
    status: EmploymentStatusEnum,
    reason: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (['suspended', 'terminated'].includes(data.status)) {
        return Boolean(data.reason && data.reason.trim().length >= 5);
      }
      return true;
    },
    {
      message: 'A reason of at least 5 characters is mandatory when suspending or terminating a driver',
      path: ['reason'],
    }
  );

export type ChangeDriverStatusDTO = z.infer<typeof changeDriverStatusSchema>;

export const driverIdParamSchema = z.object({
  id: zUuid,
});

export const listDriversQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((v) => Math.max(1, parseInt(v, 10) || 1)),
  limit: z
    .string()
    .optional()
    .default('25')
    .transform((v) => Math.min(100, Math.max(1, parseInt(v, 10) || 25))),
  search: z.string().trim().optional(),
  status: EmploymentStatusEnum.optional(),
});

export type ListDriversQuery = z.infer<typeof listDriversQuerySchema>;

export interface DriverResponseDTO {
  id: string;
  driverNumber: string;
  fullName: string;
  phone: string;
  email: string | null;
  address: string;
  licenseNumber: string;
  licenseExpiry: string;
  joiningDate: string;
  status: string;
  currentVehicleId: string | null;
  currentVehicleReg?: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
