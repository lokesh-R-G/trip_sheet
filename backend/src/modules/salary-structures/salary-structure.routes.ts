import { Router, Request, Response, NextFunction } from 'express';
import { salaryStructureService } from './salary-structure.service.js';
import { validate } from '../../shared/validation/validate.middleware.js';
import { CreateSalaryStructureSchema, AssignSalaryStructureSchema } from './salary-structure.dto.js';
import { z } from 'zod';
import { zUuid } from '../../shared/validation/custom-types.js';

export const salaryStructureRouter = Router();

const idParamSchema = z.object({ id: zUuid });

salaryStructureRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await salaryStructureService.listStructures();
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

salaryStructureRouter.post(
  '/',
  validate({ body: CreateSalaryStructureSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = await salaryStructureService.createStructure(req.body);
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }
);

salaryStructureRouter.post(
  '/assign',
  validate({ body: AssignSalaryStructureSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assigned = await salaryStructureService.assignToDriver(req.body);
      res.status(200).json({ success: true, data: assigned });
    } catch (err) {
      next(err);
    }
  }
);

salaryStructureRouter.get(
  '/:id',
  validate({ params: idParamSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await salaryStructureService.getStructureById(req.params.id);
      if (!item) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Salary structure not found' } });
        return;
      }
      res.status(200).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }
);

