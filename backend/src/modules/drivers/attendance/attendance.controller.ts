import { Request, Response, NextFunction } from 'express';
import { attendanceService, AttendanceService } from './attendance.service.js';

export class AttendanceController {
  constructor(private readonly service: AttendanceService = attendanceService) {}

  public markAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req as any).user?.username || 'attendance-supervisor';
      const ip = req.ip || req.socket.remoteAddress;
      const attendance = await this.service.markAttendance(req.body, actor, ip);
      res.status(201).json({
        success: true,
        data: attendance,
      });
    } catch (err) {
      next(err);
    }
  };

  public bulkMarkAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req as any).user?.username || 'attendance-supervisor';
      const ip = req.ip || req.socket.remoteAddress;
      const result = await this.service.bulkMarkAttendance(req.body, actor, ip);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  public getAttendanceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attendance = await this.service.getAttendanceById(req.params.id);
      res.status(200).json({
        success: true,
        data: attendance,
      });
    } catch (err) {
      next(err);
    }
  };

  public listAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as any;
      const result = await this.service.listAttendance({
        driverId: query.driverId,
        date: query.date,
        startDate: query.startDate,
        endDate: query.endDate,
        status: query.status,
        source: query.source,
        page: query.page,
        limit: query.limit,
      });

      res.status(200).json({
        success: true,
        data: result.attendances,
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

  public updateAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = (req as any).user?.username || 'attendance-supervisor';
      const ip = req.ip || req.socket.remoteAddress;
      const attendance = await this.service.updateAttendance(req.params.id, req.body, actor, ip);
      res.status(200).json({
        success: true,
        data: attendance,
      });
    } catch (err) {
      next(err);
    }
  };

  public getMonthlySummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as any;
      const summary = await this.service.getMonthlySummary(query.month, query.driverId);
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  };

  public getAuditHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const history = await this.service.getAuditHistory(req.params.id);
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const attendanceController = new AttendanceController();

