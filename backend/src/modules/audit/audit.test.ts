import { describe, it, expect, vi } from 'vitest';
import { AuditEventBuilder, sanitizePayload } from './audit-event.builder.js';
import { AuditService } from './audit.service.js';

describe('BE-09: Audit Logging Infrastructure', () => {
  it('sanitizes sensitive keys in audit payloads', () => {
    const raw = {
      username: 'johndoe',
      password: 'super-secret-password',
      token: 'jwt.token.here',
      nested: {
        apiKey: 'secret-12345',
        notes: 'safe text',
      },
    };

    const sanitized = sanitizePayload(raw);
    expect(sanitized).toEqual({
      username: 'johndoe',
      password: '[REDACTED]',
      token: '[REDACTED]',
      nested: {
        apiKey: '[REDACTED]',
        notes: 'safe text',
      },
    });
  });

  it('builds a valid audit event using AuditEventBuilder', () => {
    const builder = new AuditEventBuilder();
    const event = builder
      .setEntity('Driver', 'drv-uuid-1', 'DRV-2026-001')
      .setAction('DRIVER_STATUS_CHANGED')
      .setPreviousValue({ status: 'active' })
      .setNewValue({ status: 'on_leave' })
      .setReason('Medical leave approved')
      .setActor('operator-admin', '192.168.1.100')
      .build();

    expect(event.entityType).toBe('Driver');
    expect(event.entityId).toBe('drv-uuid-1');
    expect(event.entityLabel).toBe('DRV-2026-001');
    expect(event.action).toBe('DRIVER_STATUS_CHANGED');
    expect(event.previousValue).toEqual({ status: 'active' });
    expect(event.newValue).toEqual({ status: 'on_leave' });
    expect(event.reason).toBe('Medical leave approved');
    expect(event.changedBy).toBe('operator-admin');
    expect(event.ipAddress).toBe('192.168.1.100');
  });

  it('delegates logEvent to repository in AuditService', async () => {
    const mockRepo: any = {
      create: vi.fn().mockResolvedValue({ id: 'audit-uuid-1' }),
      findMany: vi.fn(),
      findById: vi.fn(),
    };

    const service = new AuditService(mockRepo);
    const eventData: any = {
      entityType: 'Trip',
      entityId: 'trip-1',
      action: 'TRIP_CREATED',
      changedBy: 'user-1',
    };

    const result = await service.logEvent(eventData);
    expect(mockRepo.create).toHaveBeenCalledWith(eventData, undefined);
    expect(result).toEqual({ id: 'audit-uuid-1' });
  });
});
