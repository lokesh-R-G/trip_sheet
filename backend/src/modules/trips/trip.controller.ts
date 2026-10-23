import { Request, Response, NextFunction } from 'express';
import { tripLifecycleService, TripLifecycleService } from './lifecycle/trip-lifecycle.service.js';
import { TripStatus } from './lifecycle/trip-lifecycle.engine.js';

export class TripController {
  constructor(private readonly service: TripLifecycleService = tripLifecycleService) {}

  public createTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req as any).user?.username || 'operations-user';
      const ip = req.ip || req.socket.remoteAddress;
      const trip = await this.service.createTrip(req.body, actor, ip);
      res.status(201).json({
        success: true,
        data: trip,
      });
    } catch (err) {
      next(err);
    }
  };

  public getTripById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trip = await this.service.getTripById(req.params.id);
      res.status(200).json({
        success: true,
        data: trip,
      });
    } catch (err) {
      next(err);
    }
  };

  public listTrips = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as any;
      const result = await this.service.listTrips({
        status: query.status,
        driverId: query.driverId,
        vehicleId: query.vehicleId,
        search: query.search,
        page: query.page,
        limit: query.limit,
      });

      res.status(200).json({
        success: true,
        data: result.trips,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public updateTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req as any).user?.username || 'operations-user';
      const ip = req.ip || req.socket.remoteAddress;
      const trip = await this.service.updateTrip(req.params.id, req.body, actor, ip);
      res.status(200).json({
        success: true,
        data: trip,
      });
    } catch (err) {
      next(err);
    }
  };

  public transitionTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req as any).user?.username || 'operations-user';
      const ip = req.ip || req.socket.remoteAddress;
      const trip = await this.service.transitionTrip(req.params.id, req.body, actor, ip);
      res.status(200).json({
        success: true,
        data: trip,
      });
    } catch (err) {
      next(err);
    }
  };

  public exceptionalCorrection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req as any).user?.username || 'supervisor-admin';
      const ip = req.ip || req.socket.remoteAddress;
      const trip = await this.service.applyExceptionalCorrection(req.params.id, req.body, actor, ip);
      res.status(200).json({
        success: true,
        data: trip,
      });
    } catch (err) {
      next(err);
    }
  };

  public validateTransition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetStatus = req.query.targetStatus as TripStatus;
      const validation = await this.service.dryRunValidation(req.params.id, targetStatus);
      res.status(200).json({
        success: true,
        data: validation,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const tripController = new TripController();
