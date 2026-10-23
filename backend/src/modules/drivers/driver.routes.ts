import { Router } from 'express';
import { driverController } from './driver.controller.js';
import { validate } from '../../shared/validation/validate.middleware.js';
import {
  createDriverSchema,
  updateDriverSchema,
  changeDriverStatusSchema,
  driverIdParamSchema,
  listDriversQuerySchema,
} from './dto/driver.dto.js';

const router = Router();

router.get(
  '/',
  validate({ query: listDriversQuerySchema }),
  driverController.listDrivers
);

router.post(
  '/',
  validate({ body: createDriverSchema }),
  driverController.createDriver
);

router.get(
  '/:id',
  validate({ params: driverIdParamSchema }),
  driverController.getDriverById
);

router.patch(
  '/:id',
  validate({ params: driverIdParamSchema, body: updateDriverSchema }),
  driverController.updateDriver
);

router.patch(
  '/:id/status',
  validate({ params: driverIdParamSchema, body: changeDriverStatusSchema }),
  driverController.changeDriverStatus
);

export const driverRouter = router;
