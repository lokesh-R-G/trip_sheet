import { CreateAuditLogData } from './audit.repository.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshtoken',
  'jwt',
  'secret',
  'authorization',
  'apikey',
  'credential',
]);

export function sanitizePayload(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(payload as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      result[key] = '[REDACTED]';
    } else if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      result[key] = sanitizePayload(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

export class AuditEventBuilder {
  private entityType = '';
  private entityId = '';
  private entityLabel = '';
  private action = '';
  private previousValue: Record<string, unknown> | null = null;
  private newValue: Record<string, unknown> | null = null;
  private reason?: string;
  private changedBy = 'system';
  private ipAddress?: string;

  public setEntity(type: string, id: string, label: string): this {
    this.entityType = type;
    this.entityId = id;
    this.entityLabel = label;
    return this;
  }

  public setAction(action: string): this {
    this.action = action;
    return this;
  }

  public setPreviousValue(prev: unknown): this {
    this.previousValue = sanitizePayload(prev);
    return this;
  }

  public setNewValue(next: unknown): this {
    this.newValue = sanitizePayload(next);
    return this;
  }

  public setReason(reason?: string): this {
    this.reason = reason;
    return this;
  }

  public setActor(actor: string, ipAddress?: string): this {
    this.changedBy = actor;
    this.ipAddress = ipAddress;
    return this;
  }

  public build(): CreateAuditLogData {
    if (!this.entityType || !this.entityId || !this.action) {
      throw new Error('AuditEventBuilder: entityType, entityId, and action are required.');
    }

    return {
      entityType: this.entityType,
      entityId: this.entityId,
      entityLabel: this.entityLabel || this.entityId,
      action: this.action,
      previousValue: this.previousValue,
      newValue: this.newValue,
      reason: this.reason,
      changedBy: this.changedBy,
      ipAddress: this.ipAddress,
    };
  }
}
