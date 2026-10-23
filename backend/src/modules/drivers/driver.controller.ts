import { Request, Response, NextFunction } from 'express';
import { driverService, DriverService } from './driver.service.js';

export class DriverController {
  constructor(private readonly service: DriverService = driverService) {}

  public createDriver = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req as any).user?.username || 'operations-user';
      const ip = req.ip || req.socket.remoteAddress;
      const driver = await this.service.createDriver(req.body, actor, ip);
      res.status(201).json({
        success: true,
        data: driver,
      });
    } catch (err) {
      next(err);
    }
  };

  public getDriverById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driver = await this.service.getDriverById(req.params.id);
      res.status(200).json({
        success: true,
        data: driver,
      });
    } catch (err) {
      next(err);
    }
  };

  public listDrivers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as any;
      const result = await this.service.listDrivers({
        status: query.status,
        search: query.search,
        page: query.page,
        limit: query.limit,
      });

      res.status(200).json({
        success: true,
        data: result.drivers,
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

  public updateDriver = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req as any).user?.username || 'operations-user';
      const ip = req.ip || req.socket.remoteAddress;
      const driver = await this.service.updateDriver(req.params.id, req.body, actor, ip);
      res.status(200).json({
        success: true,
        data: driver,
      });
    } catch (err) {
      next(err);
    }
  };

  public changeDriverStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req as any).user?.username || 'operations-user';
      const ip = req.ip || req.socket.remoteAddress;
      const driver = await this.service.changeDriverStatus(req.params.id, req.body, actor, ip);
      res.status(200).json({
        success: true,
        data: driver,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const driverController = new DriverController();
