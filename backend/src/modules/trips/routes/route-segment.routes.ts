import { Router } from 'express';
import { routeSegmentController } from './route-segment.controller.js';
import { validate } from '../../../shared/validation/validate.middleware.js';
import {
  createRouteSegmentSchema,
  updateRouteSegmentSchema,
  reorderSegmentsSchema,
} from './dto/route-segment.dto.js';
import { z } from 'zod';
import { zUuid } from '../../../shared/validation/custom-types.js';

const router = Router({ mergeParams: true });

const tripIdParamSchema = z.object({
  tripId: zUuid,
});

const segmentIdParamSchema = z.object({
  tripId: zUuid,
  segmentId: zUuid,
});

router.get(
  '/',
  validate({ params: tripIdParamSchema }),
  routeSegmentController.getSegments
);

router.post(
  '/',
  validate({ params: tripIdParamSchema, body: createRouteSegmentSchema }),
  routeSegmentController.addSegment
);

router.put(
  '/reorder',
  validate({ params: tripIdParamSchema, body: reorderSegmentsSchema }),
  routeSegmentController.reorderSegments
);

router.patch(
  '/:segmentId',
  validate({ params: segmentIdParamSchema, body: updateRouteSegmentSchema }),
  routeSegmentController.updateSegment
);

router.delete(
  '/:segmentId',
  validate({ params: segmentIdParamSchema }),
  routeSegmentController.deleteSegment
);

export const routeSegmentRouter = router;
