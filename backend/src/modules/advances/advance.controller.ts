import { Request, Response, NextFunction } from 'express';
import { advanceService, AdvanceService } from './advance.service.js';

export class AdvanceController {
  constructor(private service: AdvanceService = advanceService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req.headers['x-actor-id'] as string) || req.body.createdBy || 'system';
      const result = await this.service.createTransaction(req.body, actor);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { driverId, tripId, transactionType, startDate, endDate, page, limit } = req.query as any;
      const result = await this.service.listTransactions({
        driverId,
        tripId,
        transactionType,
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

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getTransactionById(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  getDriverSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getDriverSummary(req.params.driverId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  allocateToTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req.headers['x-actor-id'] as string) || 'system';
      const { amount } = req.body;
      const result = await this.service.allocateAdvancesToTrip(req.params.tripId, amount, actor);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  releaseAllocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req.headers['x-actor-id'] as string) || 'system';
      const { reason } = req.body;
      const result = await this.service.releaseAllocation(req.params.id, reason, actor);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const advanceController = new AdvanceController();
