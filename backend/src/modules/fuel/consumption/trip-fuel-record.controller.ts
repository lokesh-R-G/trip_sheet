import { Request, Response, NextFunction } from 'express';
import { tripFuelRecordService, TripFuelRecordService } from './trip-fuel-record.service.js';

export class TripFuelRecordController {
  constructor(private service: TripFuelRecordService = tripFuelRecordService) {}

  save = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req.headers['x-actor-id'] as string) || req.body.recordedBy || 'system';
      const result = await this.service.saveFuelRecord(req.params.tripId, req.body, actor);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  addAddition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req.headers['x-actor-id'] as string) || 'system';
      const result = await this.service.addAddition(req.params.tripId, req.body, actor);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  getByTripId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getFuelRecord(req.params.tripId);
      if (!result) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Fuel record for trip "${req.params.tripId}" not found.`,
          },
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const tripFuelRecordController = new TripFuelRecordController();
