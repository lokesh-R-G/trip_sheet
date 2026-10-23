import { z } from 'zod';
import { zUuid, zNonNegativeDecimalString, zIsoDateTimeString } from '../../../../shared/validation/custom-types.js';

export const createRouteSegmentSchema = z
  .object({
    sequence: z.number().int().min(1, { message: 'Sequence must be a positive integer starting from 1' }),
    fromLocation: z.string().trim().min(1, { message: 'Origin location is required' }).max(255),
    toLocation: z.string().trim().min(1, { message: 'Destination location is required' }).max(255),
    departureTime: zIsoDateTimeString.optional().nullable(),
    arrivalTime: zIsoDateTimeString.optional().nullable(),
    distanceKm: zNonNegativeDecimalString,
    tonnage: zNonNegativeDecimalString.optional().nullable(),
    cargoDescription: z.string().trim().max(255).optional().nullable(),
    notes: z.string().trim().optional().nullable(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.departureTime && data.arrivalTime) {
        return new Date(data.departureTime) <= new Date(data.arrivalTime);
      }
      return true;
    },
    {
      message: 'Departure time cannot be after arrival time',
      path: ['arrivalTime'],
    }
  );

export type CreateRouteSegmentDTO = z.infer<typeof createRouteSegmentSchema>;

export const updateRouteSegmentSchema = z
  .object({
    fromLocation: z.string().trim().min(1).max(255).optional(),
    toLocation: z.string().trim().min(1).max(255).optional(),
    departureTime: zIsoDateTimeString.optional().nullable(),
    arrivalTime: zIsoDateTimeString.optional().nullable(),
    distanceKm: zNonNegativeDecimalString.optional(),
    tonnage: zNonNegativeDecimalString.optional().nullable(),
    cargoDescription: z.string().trim().max(255).optional().nullable(),
    notes: z.string().trim().optional().nullable(),
  })
  .strict();

export type UpdateRouteSegmentDTO = z.infer<typeof updateRouteSegmentSchema>;

export const reorderSegmentsSchema = z
  .object({
    segments: z
      .array(
        z.object({
          segmentId: zUuid,
          sequence: z.number().int().min(1),
        })
      )
      .min(1, { message: 'At least one segment must be provided for reordering' }),
  })
  .strict()
  .refine(
    (data) => {
      const sequences = data.segments.map((s) => s.sequence);
      return new Set(sequences).size === sequences.length;
    },
    {
      message: 'Sequence positions must be unique without duplicates',
      path: ['segments'],
    }
  );

export type ReorderSegmentsDTO = z.infer<typeof reorderSegmentsSchema>;

export interface RouteSegmentResponseDTO {
  id: string;
  tripId: string;
  sequence: number;
  fromLocation: string;
  toLocation: string;
  departureTime: string | null;
  arrivalTime: string | null;
  distanceKm: string;
  tonnage: string | null;
  cargoDescription: string | null;
  notes: string | null;
}
