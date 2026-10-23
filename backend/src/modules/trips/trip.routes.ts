import { Router } from 'express';
import { tripController } from './trip.controller.js';
import { validate } from '../../shared/validation/validate.middleware.js';
import {
  createTripSchema,
  updateTripSchema,
  tripTransitionSchema,
  exceptionalCorrectionSchema,
  listTripsQuerySchema,
} from './dto/trip.dto.js';
import { routeSegmentRouter } from './routes/route-segment.routes.js';
import { z } from 'zod';
import { zUuid } from '../../shared/validation/custom-types.js';

const router = Router();

const tripIdParamSchema = z.object({
  id: zUuid,
});

router.get(
  '/',
  validate({ query: listTripsQuerySchema }),
  tripController.listTrips
);

router.post(
  '/',
  validate({ body: createTripSchema }),
  tripController.createTrip
);

router.get(
  '/:id',
  validate({ params: tripIdParamSchema }),
  tripController.getTripById
);

router.patch(
  '/:id',
  validate({ params: tripIdParamSchema, body: updateTripSchema }),
  tripController.updateTrip
);

router.post(
  '/:id/transition',
  validate({ params: tripIdParamSchema, body: tripTransitionSchema }),
  tripController.transitionTrip
);

router.post(
  '/:id/exceptional-correction',
  validate({ params: tripIdParamSchema, body: exceptionalCorrectionSchema }),
  tripController.exceptionalCorrection
);

router.get(
  '/:id/validate',
  validate({ params: tripIdParamSchema }),
  tripController.validateTransition
);

// Mount nested route segment routes
router.use('/:tripId/segments', routeSegmentRouter);

export const tripRouter = router;
