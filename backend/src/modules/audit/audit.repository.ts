import { prisma, PrismaTransactionClient, handlePrismaError } from '../../shared/database/prisma.js';
import { AuditLog, Prisma } from '@prisma/client';

export interface CreateAuditLogData {
  entityType: string;
  entityId: string;
  entityLabel: string;
  action: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string | null;
  changedBy: string;
  ipAddress?: string | null;
  timestamp?: Date;
}

export interface AuditLogFilters {
  entityType?: string;
  entityId?: string;
  changedBy?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export class AuditRepository {
  public async create(data: CreateAuditLogData, tx?: PrismaTransactionClient): Promise<AuditLog> {
    const client = tx || prisma;
    try {
      return await client.auditLog.create({
        data: {
          entityType: data.entityType,
          entityId: data.entityId,
          entityLabel: data.entityLabel,
          action: data.action,
          previousValue: (data.previousValue as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          newValue: (data.newValue as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          reason: data.reason ?? null,
          changedBy: data.changedBy,
          ipAddress: data.ipAddress ?? null,
          timestamp: data.timestamp || new Date(),
        },
      });
    } catch (err) {
      return handlePrismaError(err, 'AuditLog');
    }
  }

  public async findMany(filters: AuditLogFilters): Promise<{ logs: AuditLog[]; total: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.changedBy) where.changedBy = { contains: filters.changedBy, mode: 'insensitive' };
    if (filters.fromDate || filters.toDate) {
      where.timestamp = {};
      if (filters.fromDate) where.timestamp.gte = filters.fromDate;
      if (filters.toDate) where.timestamp.lte = filters.toDate;
    }

    try {
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { timestamp: 'desc' },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return { logs, total };
    } catch (err) {
      return handlePrismaError(err, 'AuditLog');
    }
  }

  public async findById(id: string): Promise<AuditLog | null> {
    try {
      return await prisma.auditLog.findUnique({ where: { id } });
    } catch (err) {
      return handlePrismaError(err, 'AuditLog');
    }
  }
}

export const auditRepository = new AuditRepository();
