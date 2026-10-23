import { Request, Response, NextFunction } from 'express';
import { fuelValuationService, FuelValuationService } from './fuel-valuation.service.js';

export class FuelValuationController {
  constructor(private service: FuelValuationService = fuelValuationService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.createPolicy(req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listPolicies();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const fuelValuationController = new FuelValuationController();
