import { Router } from 'express';
import { fuelTopUpController } from './fuel-topup.controller.js';
import { validate } from '../../../shared/validation/validate.middleware.js';
import { CreateFuelTopUpSchema, QueryFuelTopUpSchema } from './fuel-topup.dto.js';

export const fuelTopUpRouter = Router();

fuelTopUpRouter.post(
  '/',
  validate({ body: CreateFuelTopUpSchema }),
  fuelTopUpController.create
);

fuelTopUpRouter.get(
  '/',
  validate({ query: QueryFuelTopUpSchema }),
  fuelTopUpController.list
);

fuelTopUpRouter.get(
  '/:id',
  fuelTopUpController.getById
);
