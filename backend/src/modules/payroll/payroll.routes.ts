import { Router, Request, Response, NextFunction } from 'express';
import { payrollService } from './payroll.service.js';
import { z } from 'zod';
import { zUuid } from '../../shared/validation/custom-types.js';
import { validate } from '../../shared/validation/validate.middleware.js';

export const payrollRouter = Router();

const generateSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, { message: 'Month must be in YYYY-MM format' }),
});

const finalizeParamsSchema = z.object({
  id: zUuid,
});

payrollRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await payrollService.listRuns();
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

payrollRouter.get('/month/:month', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const run = await payrollService.getRunByMonth(req.params.month);
    res.status(200).json({ success: true, data: run });
  } catch (err) {
    next(err);
  }
});

payrollRouter.post(
  '/generate',
  validate({ body: generateSchema }),
  async (_req: Request, res: Response) => {
    res.status(403).json({
      success: false,
      error: {
        code: 'PAYROLL_POLICY_UNAPPROVED',
        message: 'Automated payroll generation is disabled pending authoritative corporate salary, attendance deduction, and statutory recovery policy approval.',
      },
    });
  }
);

payrollRouter.post(
  '/:id/finalize',
  validate({ params: finalizeParamsSchema }),
  async (_req: Request, res: Response) => {
    res.status(403).json({
      success: false,
      error: {
        code: 'PAYROLL_FINALIZATION_UNAPPROVED',
        message: 'Payroll finalization and financial sealing are disabled pending verified corporate policy sign-off.',
      },
    });
  }
);

