import { Router } from 'express';
import { attendanceController } from './attendance.controller.js';
import { validate } from '../../../shared/validation/validate.middleware.js';
import {
  markAttendanceSchema,
  bulkMarkAttendanceSchema,
  updateAttendanceSchema,
  attendanceIdParamSchema,
  listAttendanceQuerySchema,
  monthlySummaryQuerySchema,
} from './dto/attendance.dto.js';

const router = Router();

router.get(
  '/',
  validate({ query: listAttendanceQuerySchema }),
  attendanceController.listAttendance
);

router.post(
  '/',
  validate({ body: markAttendanceSchema }),
  attendanceController.markAttendance
);

router.post(
  '/bulk',
  validate({ body: bulkMarkAttendanceSchema }),
  attendanceController.bulkMarkAttendance
);

router.get(
  '/summary/monthly',
  validate({ query: monthlySummaryQuerySchema }),
  attendanceController.getMonthlySummary
);

router.get(
  '/:id',
  validate({ params: attendanceIdParamSchema }),
  attendanceController.getAttendanceById
);

router.patch(
  '/:id',
  validate({ params: attendanceIdParamSchema, body: updateAttendanceSchema }),
  attendanceController.updateAttendance
);

router.get(
  '/:id/audit',
  validate({ params: attendanceIdParamSchema }),
  attendanceController.getAuditHistory
);

export const attendanceRouter = router;

