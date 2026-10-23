import { Router } from 'express';
import { expenseController } from './expense.controller.js';
import { validate } from '../../shared/validation/validate.middleware.js';
import { SubmitTripExpenseSchema, ReviewTripExpenseSchema, QueryExpenseSchema } from './expense.dto.js';
import { z } from 'zod';
import { zUuid } from '../../shared/validation/custom-types.js';

export const expenseRouter = Router();

const idParamSchema = z.object({ id: zUuid });

expenseRouter.post(
  '/',
  validate({ body: SubmitTripExpenseSchema }),
  expenseController.submit
);

expenseRouter.post(
  '/:id/review',
  validate({ params: idParamSchema, body: ReviewTripExpenseSchema }),
  expenseController.review
);

expenseRouter.get(
  '/',
  validate({ query: QueryExpenseSchema }),
  expenseController.list
);

expenseRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  expenseController.getById
);
