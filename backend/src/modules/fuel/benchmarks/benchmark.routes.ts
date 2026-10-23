import { Router } from 'express';
import { benchmarkController } from './benchmark.controller.js';
import { validate } from '../../../shared/validation/validate.middleware.js';
import { CreateMileageBenchmarkSchema } from './benchmark.dto.js';

export const benchmarkRouter = Router();

benchmarkRouter.post(
  '/',
  validate({ body: CreateMileageBenchmarkSchema }),
  benchmarkController.create
);

benchmarkRouter.get(
  '/',
  benchmarkController.list
);

benchmarkRouter.get(
  '/resolve/:tripId',
  benchmarkController.resolveForTrip
);
