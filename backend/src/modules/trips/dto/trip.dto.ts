import { z } from 'zod';
import { zUuid, zIsoDateTimeString } from '../../../shared/validation/custom-types.js';
import { createRouteSegmentSchema, RouteSegmentResponseDTO } from '../routes/dto/route-segment.dto.js';

export const TripStatusEnum = z.enum(['draft', 'in_progress', 'completed', 'cancelled']);

export const tripOdometerInputSchema = z
  .object({
    startingReading: z.number().int().min(0).optional().nullable(),
    startingTimestamp: zIsoDateTimeString.optional().nullable(),
    startingSource: z.enum(['measured', 'manual']).optional().nullable(),
    endingReading: z.number().int().min(0).optional().nullable(),
    endingTimestamp: zIsoDateTimeString.optional().nullable(),
    endingSource: z.enum(['measured', 'manual']).optional().nullable(),
    reportedDistance: z.number().int().min(0).optional().nullable(),
  })
  .strict();

export const createTripSchema = z
  .object({
    driverId: zUuid,
    vehicleId: zUuid,
    startDate: zIsoDateTimeString,
    endDate: zIsoDateTimeString.optional().nullable(),
    startingLocation: z.string().trim().min(1, { message: 'Starting location is required' }).max(255),
    finalDestination: z.string().trim().min(1, { message: 'Final destination is required' }).max(255),
    purpose: z.string().trim().min(1, { message: 'Purpose is required' }).max(255),
    isDraft: z.boolean().default(false),
    notes: z.string().trim().optional().nullable(),
    odometer: tripOdometerInputSchema.optional().nullable(),
    routeSegments: z.array(createRouteSegmentSchema).optional().nullable(),
  })
  .strict();

export type CreateTripDTO = z.infer<typeof createTripSchema>;

export const updateTripSchema = z
  .object({
    startingLocation: z.string().trim().min(1).max(255).optional(),
    finalDestination: z.string().trim().min(1).max(255).optional(),
    purpose: z.string().trim().min(1).max(255).optional(),
    notes: z.string().trim().optional().nullable(),
    endDate: zIsoDateTimeString.optional().nullable(),
    expectedVersion: z.number().int().min(1).optional(),
  })
  .strict();

export type UpdateTripDTO = z.infer<typeof updateTripSchema>;

export const tripTransitionSchema = z
  .object({
    targetStatus: TripStatusEnum,
    reason: z.string().trim().max(500).optional(),
    expectedVersion: z.number().int().min(1, { message: 'Expected trip version is required for concurrency safety' }),
  })
  .strict()
  .refine(
    (data) => {
      if (data.targetStatus === 'cancelled') {
        return Boolean(data.reason && data.reason.trim().length >= 5);
      }
      return true;
    },
    {
      message: 'A reason of at least 5 characters is mandatory when cancelling a trip',
      path: ['reason'],
    }
  );

export type TripTransitionDTO = z.infer<typeof tripTransitionSchema>;

export const exceptionalCorrectionSchema = z
  .object({
    reason: z.string().trim().min(10, { message: 'Correction reason must be at least 10 characters' }).max(500),
    notes: z.string().trim().optional().nullable(),
    expectedVersion: z.number().int().min(1, { message: 'Expected trip version is required' }),
  })
  .strict();

export type ExceptionalCorrectionDTO = z.infer<typeof exceptionalCorrectionSchema>;

export const listTripsQuerySchema = z.object({
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
  status: TripStatusEnum.optional(),
  driverId: zUuid.optional(),
  vehicleId: zUuid.optional(),
});

export type ListTripsQuery = z.infer<typeof listTripsQuerySchema>;

export interface TripOdometerResponseDTO {
  startingReading: number | null;
  startingTimestamp: string | null;
  startingSource: string | null;
  endingReading: number | null;
  endingTimestamp: string | null;
  endingSource: string | null;
  odometerCase: string;
  measuredDistance: number | null;
  derivedDistance: number | null;
  reportedDistance: number | null;
  acceptedDistance: number;
  derivedEndingReading: number | null;
  discrepancyFlag: boolean;
  discrepancyReason: string | null;
  validationStatus: string;
  tyreAttributionEligible: boolean;
  tyreAttributionStatus: string;
  tyreAttributionHoldReason: string | null;
}

export interface TripResponseDTO {
  id: string;
  tripNumber: string;
  driverId: string;
  driverName?: string;
  driverNumber?: string;
  vehicleId: string;
  vehicleReg?: string;
  startDate: string;
  endDate: string | null;
  startingLocation: string;
  finalDestination: string;
  purpose: string;
  status: string;
  notes: string | null;
  version: number;
  odometer?: TripOdometerResponseDTO | null;
  routeSegments?: RouteSegmentResponseDTO[];
  createdAt: string;
  updatedAt: string;
}
