import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { validate, zUuid, zDecimalString, zDateOnlyString } from './index.js';
import { ValidationError } from '../errors/index.js';

describe('BE-02: DTO Validation Infrastructure', () => {
  it('validates and accepts valid body payloads', async () => {
    const schema = z.object({
      name: z.string().min(2),
      amount: zDecimalString,
      date: zDateOnlyString,
    });

    const middleware = validate({ body: schema });
    const req: any = {
      body: {
        name: 'Test Name',
        amount: '1250.75',
        date: '2026-10-23',
      },
    };
    const res: any = {};
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body.name).toBe('Test Name');
    expect(req.body.amount).toBe('1250.75');
  });

  it('rejects malformed dates and invalid decimals with structured errors', async () => {
    const schema = z.object({
      amount: zDecimalString,
      date: zDateOnlyString,
    });

    const middleware = validate({ body: schema });
    const req: any = {
      body: {
        amount: 'not-a-number',
        date: 'invalid-date',
      },
    };
    const res: any = {};
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details.length).toBe(2);
    expect(error.details.some((d: any) => d.field === 'amount')).toBe(true);
    expect(error.details.some((d: any) => d.field === 'date')).toBe(true);
  });

  it('validates UUID route parameters', async () => {
    const paramsSchema = z.object({
      id: zUuid,
    });

    const middleware = validate({ params: paramsSchema });
    const req: any = { params: { id: 'invalid-uuid-format' } };
    const res: any = {};
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.details[0].field).toBe('params.id');
  });

  it('distinguishes omitted fields from explicit null in updates', async () => {
    const updateSchema = z.object({
      phone: z.string().optional(),
      notes: z.string().nullable().optional(),
    });

    const parsedOmitted = updateSchema.parse({ phone: '9876543210' });
    expect(parsedOmitted.notes).toBeUndefined();

    const parsedNull = updateSchema.parse({ phone: '9876543210', notes: null });
    expect(parsedNull.notes).toBeNull();
  });
});
