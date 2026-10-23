import { Request, Response, NextFunction } from 'express';
import { fuelTopUpService, FuelTopUpService } from './fuel-topup.service.js';

export class FuelTopUpController {
  constructor(private service: FuelTopUpService = fuelTopUpService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req.headers['x-actor-id'] as string) || req.body.recordedBy || 'system';
      const result = await this.service.createTopUp(req.body, actor);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getTopUpById(req.params.id);
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
      const { vehicleId, startDate, endDate, page, limit } = req.query as any;
      const result = await this.service.listTopUps({
        vehicleId,
        startDate,
        endDate,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const fuelTopUpController = new FuelTopUpController();
