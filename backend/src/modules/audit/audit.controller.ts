import { Request, Response, NextFunction } from 'express';
import { auditService, AuditService } from './audit.service.js';

export class AuditController {
  constructor(private readonly service: AuditService = auditService) {}

  public listAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entityType, entityId, changedBy, fromDate, toDate, page, limit } = req.query as any;

      const result = await this.service.getAuditLogs({
        entityType,
        entityId,
        changedBy,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 25,
      });

      res.status(200).json({
        success: true,
        data: result.logs,
        meta: {
          total: result.total,
          page: page ? parseInt(page, 10) : 1,
          limit: limit ? parseInt(limit, 10) : 25,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  public getAuditLogById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const log = await this.service.getAuditLogById(req.params.id);
      if (!log) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Audit log with ID "${req.params.id}" not found.`,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: log,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const auditController = new AuditController();
