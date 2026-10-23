import { Request, Response, NextFunction } from 'express';
import { settlementService, SettlementService } from './settlement.service.js';

export class SettlementController {
  constructor(private service: SettlementService = settlementService) {}

  getCalculation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.calculateLiveSettlement(req.params.tripId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  finalize = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = req.headers['x-actor-id'] as string;
      const result = await this.service.finalizeSettlement(req.params.tripId, req.body, actor);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  reopen = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = req.headers['x-actor-id'] as string;
      const result = await this.service.reopenSettlement(req.params.tripId, req.body, actor);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  recordCashReturn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req.headers['x-actor-id'] as string) || 'system';
      const result = await this.service.recordCashReturn(req.params.tripId, req.body, actor);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const settlementController = new SettlementController();
