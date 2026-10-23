import { Request, Response, NextFunction } from 'express';
import { benchmarkService, BenchmarkService } from './benchmark.service.js';

export class BenchmarkController {
  constructor(private service: BenchmarkService = benchmarkService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.createBenchmark(req.body);
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
      const { status, vehicleId } = req.query as any;
      const result = await this.service.listBenchmarks({ status, vehicleId });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  resolveForTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.resolveForTrip(req.params.tripId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const benchmarkController = new BenchmarkController();
