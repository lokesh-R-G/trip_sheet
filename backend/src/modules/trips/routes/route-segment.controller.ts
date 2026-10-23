import { Request, Response, NextFunction } from 'express';
import { routeSegmentService, RouteSegmentService } from './route-segment.service.js';

export class RouteSegmentController {
  constructor(private readonly service: RouteSegmentService = routeSegmentService) {}

  public getSegments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const segments = await this.service.getSegmentsByTripId(req.params.tripId);
      res.status(200).json({
        success: true,
        data: segments,
      });
    } catch (err) {
      next(err);
    }
  };

  public addSegment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req as any).user?.username || 'operations-user';
      const ip = req.ip || req.socket.remoteAddress;
      const segment = await this.service.addSegment(req.params.tripId, req.body, actor, ip);
      res.status(201).json({
        success: true,
        data: segment,
      });
    } catch (err) {
      next(err);
    }
  };

  public updateSegment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req as any).user?.username || 'operations-user';
      const ip = req.ip || req.socket.remoteAddress;
      const segment = await this.service.updateSegment(
        req.params.tripId,
        req.params.segmentId,
        req.body,
        actor,
        ip
      );
      res.status(200).json({
        success: true,
        data: segment,
      });
    } catch (err) {
      next(err);
    }
  };

  public deleteSegment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req as any).user?.username || 'operations-user';
      const ip = req.ip || req.socket.remoteAddress;
      await this.service.deleteSegment(req.params.tripId, req.params.segmentId, actor, ip);
      res.status(200).json({
        success: true,
        message: 'Route segment removed successfully.',
      });
    } catch (err) {
      next(err);
    }
  };

  public reorderSegments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req as any).user?.username || 'operations-user';
      const ip = req.ip || req.socket.remoteAddress;
      const updated = await this.service.reorderSegments(req.params.tripId, req.body, actor, ip);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const routeSegmentController = new RouteSegmentController();
