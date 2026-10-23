import { auditRepository, AuditRepository, CreateAuditLogData, AuditLogFilters } from './audit.repository.js';
import { PrismaTransactionClient } from '../../shared/database/prisma.js';
import { AuditLog } from '@prisma/client';

export class AuditService {
  constructor(private readonly repo: AuditRepository = auditRepository) {}

  public async logEvent(data: CreateAuditLogData, tx?: PrismaTransactionClient): Promise<AuditLog> {
    return this.repo.create(data, tx);
  }

  public async getAuditLogs(filters: AuditLogFilters): Promise<{ logs: AuditLog[]; total: number }> {
    return this.repo.findMany(filters);
  }

  public async getAuditLogById(id: string): Promise<AuditLog | null> {
    return this.repo.findById(id);
  }
}

export const auditService = new AuditService();
