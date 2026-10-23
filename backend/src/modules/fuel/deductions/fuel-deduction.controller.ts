import { Request, Response, NextFunction } from 'express';
import { fuelDeductionService, FuelDeductionService } from './fuel-deduction.service.js';

export class FuelDeductionController {
  constructor(private service: FuelDeductionService = fuelDeductionService) {}

  propose = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req.headers['x-actor-id'] as string) || 'system';
      const result = await this.service.proposeDeduction(req.body, actor);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  review = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = req.headers['x-actor-id'] as string;
      const result = await this.service.reviewProposal(req.params.id, req.body, actor);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  getByTripId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getByTripId(req.params.tripId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reviewStatus, payrollMonth } = req.query as any;
      const result = await this.service.list({ reviewStatus, payrollMonth });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const fuelDeductionController = new FuelDeductionController();
