import { Router } from 'express';
import { advanceController } from './advance.controller.js';
import { validate } from '../../shared/validation/validate.middleware.js';
import { CreateAdvanceTransactionSchema, QueryAdvanceSchema } from './advance.dto.js';
import { z } from 'zod';
import { zUuid } from '../../shared/validation/custom-types.js';

export const advanceRouter = Router();

const idParamSchema = z.object({ id: zUuid });
const driverIdParamSchema = z.object({ driverId: zUuid });
const tripIdParamSchema = z.object({ tripId: zUuid });

const AllocateAdvanceSchema = z.object({
  amount: z.union([z.number(), z.string()]).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, 'amount must be a positive number'),
});

const ReleaseAllocationSchema = z.object({
  reason: z.string().min(2, 'reason is required to release an advance allocation'),
});

advanceRouter.post(
  '/',
  validate({ body: CreateAdvanceTransactionSchema }),
  advanceController.create
);

advanceRouter.get(
  '/',
  validate({ query: QueryAdvanceSchema }),
  advanceController.list
);

advanceRouter.get(
  '/driver/:driverId/summary',
  validate({ params: driverIdParamSchema }),
  advanceController.getDriverSummary
);

advanceRouter.post(
  '/trips/:tripId/allocate',
  validate({ params: tripIdParamSchema, body: AllocateAdvanceSchema }),
  advanceController.allocateToTrip
);

advanceRouter.post(
  '/allocations/:id/release',
  validate({ params: idParamSchema, body: ReleaseAllocationSchema }),
  advanceController.releaseAllocation
);

advanceRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  advanceController.getById
);
