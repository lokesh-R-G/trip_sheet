import { Router } from 'express';
import { settlementController } from './settlement.controller.js';
import { validate } from '../../shared/validation/validate.middleware.js';
import { FinalizeSettlementSchema, ReopenSettlementSchema, RecordTripCashReturnSchema } from './settlement.dto.js';
import { z } from 'zod';
import { zUuid } from '../../shared/validation/custom-types.js';

export const settlementRouter = Router();

const tripIdParamSchema = z.object({ tripId: zUuid });

settlementRouter.get(
  '/trip/:tripId',
  validate({ params: tripIdParamSchema }),
  settlementController.getCalculation
);

settlementRouter.post(
  '/trip/:tripId/finalize',
  validate({ params: tripIdParamSchema, body: FinalizeSettlementSchema }),
  settlementController.finalize
);

settlementRouter.post(
  '/trip/:tripId/reopen',
  validate({ params: tripIdParamSchema, body: ReopenSettlementSchema }),
  settlementController.reopen
);

settlementRouter.post(
  '/trip/:tripId/return',
  validate({ params: tripIdParamSchema, body: RecordTripCashReturnSchema }),
  settlementController.recordCashReturn
);
