import { Router, Request, Response, NextFunction } from 'express';
import { prisma, handlePrismaError } from '../../shared/database/prisma.js';
import { z } from 'zod';
import { zUuid } from '../../shared/validation/custom-types.js';
import { validate } from '../../shared/validation/validate.middleware.js';

export const integrationJobRouter = Router();

integrationJobRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const jobs = await prisma.integrationJob.findMany({
      include: {
        vehicle: { select: { id: true, registrationNumber: true } },
        trip: { select: { id: true, tripNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
});

integrationJobRouter.post(
  '/:id/retry',
  validate({ params: z.object({ id: zUuid }) }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await prisma.integrationJob.update({
        where: { id: req.params.id },
        data: {
          status: 'retry_queued',
          attemptCount: { increment: 1 },
          nextRetryAt: new Date(Date.now() + 60000),
        },
      });
      res.status(200).json({ success: true, data: job });
    } catch (err) {
      next(err);
    }
  }
);

