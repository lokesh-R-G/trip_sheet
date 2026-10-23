import { Router } from 'express';
import { fuelDeductionController } from './fuel-deduction.controller.js';
import { validate } from '../../../shared/validation/validate.middleware.js';
import { ProposeFuelDeductionSchema, ReviewDeductionActionSchema } from './fuel-deduction.dto.js';
import { z } from 'zod';
import { zUuid } from '../../../shared/validation/custom-types.js';

export const fuelDeductionRouter = Router();

const idParamSchema = z.object({
  id: zUuid,
});

const tripIdParamSchema = z.object({
  tripId: zUuid,
});

fuelDeductionRouter.post(
  '/propose',
  validate({ body: ProposeFuelDeductionSchema }),
  fuelDeductionController.propose
);

fuelDeductionRouter.post(
  '/:id/review',
  validate({ params: idParamSchema, body: ReviewDeductionActionSchema }),
  fuelDeductionController.review
);

fuelDeductionRouter.get(
  '/',
  fuelDeductionController.list
);

fuelDeductionRouter.get(
  '/trip/:tripId',
  validate({ params: tripIdParamSchema }),
  fuelDeductionController.getByTripId
);

fuelDeductionRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  fuelDeductionController.getById
);
