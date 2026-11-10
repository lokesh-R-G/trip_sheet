import { z } from 'zod';
import { zUuid, zDateOnlyString, zIsoDateTimeString } from '../../../../shared/validation/custom-types.js';

export const AttendanceStatusEnum = z.enum([
  'present',
  'absent',
  'half_day',
  'on_leave',
  'rest_day',
]);

export const AttendanceSourceEnum = z.enum([
  'MANUAL',
  'TRIP_DERIVED',
  'IMPORT',
]);

export type AttendanceStatus = z.infer<typeof AttendanceStatusEnum>;
export type AttendanceSource = z.infer<typeof AttendanceSourceEnum>;

export const markAttendanceSchema = z.object({
  driverId: zUuid,
  attendanceDate: zDateOnlyString,
  status: AttendanceStatusEnum,
  checkInTime: zIsoDateTimeString.optional().nullable(),
  checkOutTime: zIsoDateTimeString.optional().nullable(),
  source: AttendanceSourceEnum.optional().default('MANUAL'),
  remarks: z.string().max(1000).optional().nullable(),
  approvedBy: z.string().max(100).optional().nullable(),
});

export const bulkMarkAttendanceItemSchema = z.object({
  driverId: zUuid,
  status: AttendanceStatusEnum,
  checkInTime: zIsoDateTimeString.optional().nullable(),
  checkOutTime: zIsoDateTimeString.optional().nullable(),
  source: AttendanceSourceEnum.optional().default('MANUAL'),
  remarks: z.string().max(1000).optional().nullable(),
  approvedBy: z.string().max(100).optional().nullable(),
});

export const bulkMarkAttendanceSchema = z.object({
  attendanceDate: zDateOnlyString,
  records: z.array(bulkMarkAttendanceItemSchema).min(1, 'At least one driver record is required'),
});

export const updateAttendanceSchema = z.object({
  status: AttendanceStatusEnum.optional(),
  checkInTime: zIsoDateTimeString.optional().nullable(),
  checkOutTime: zIsoDateTimeString.optional().nullable(),
  remarks: z.string().max(1000).optional().nullable(),
  approvedBy: z.string().max(100).optional().nullable(),
  reason: z.string().min(3, 'Audit correction reason must be provided (minimum 3 characters)'),
});

export const attendanceIdParamSchema = z.object({
  id: zUuid,
});

export const listAttendanceQuerySchema = z.object({
  driverId: zUuid.optional(),
  date: zDateOnlyString.optional(),
  startDate: zDateOnlyString.optional(),
  endDate: zDateOnlyString.optional(),
  status: AttendanceStatusEnum.optional(),
  source: AttendanceSourceEnum.optional(),
  page: z.string().optional().default('1').transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z.string().optional().default('25').transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 25))),
});

export const monthlySummaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, { message: 'Month must be in YYYY-MM format' }),
  driverId: zUuid.optional(),
});

export type MarkAttendanceDTO = z.infer<typeof markAttendanceSchema>;
export type BulkMarkAttendanceDTO = z.infer<typeof bulkMarkAttendanceSchema>;
export type UpdateAttendanceDTO = z.infer<typeof updateAttendanceSchema>;
export type ListAttendanceQueryDTO = z.infer<typeof listAttendanceQuerySchema>;
export type MonthlySummaryQueryDTO = z.infer<typeof monthlySummaryQuerySchema>;

export interface AttendanceResponseDTO {
  id: string;
  driverId: string;
  driverNumber: string;
  driverName: string;
  attendanceDate: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  source: AttendanceSource;
  remarks: string | null;
  markedBy: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyAttendanceSummaryDTO {
  month: string;
  totalDays: number;
  driverSummaries: {
    driverId: string;
    driverNumber: string;
    driverName: string;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    leaveDays: number;
    restDays: number;
    unrecordedDays: number;
    totalMarkedDays: number;
  }[];
}
