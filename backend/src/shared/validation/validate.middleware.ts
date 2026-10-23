import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError, ErrorDetail } from '../errors/index.js';

export interface ValidationTargets {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function formatZodError(error: ZodError): ErrorDetail[] {
  const issues = error?.issues || (error as any)?.errors || [];
  return issues.map((err: any) => ({
    field: Array.isArray(err.path) ? err.path.join('.') : String(err.path || ''),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Express middleware generator that validates body, params, and/or query with Zod.
 * Replaces req.body, req.query, or req.params with parsed and stripped/normalized values.
 */
export function validate(schemas: ValidationTargets) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const errorDetails: ErrorDetail[] = [];

    if (schemas.params) {
      const result = await schemas.params.safeParseAsync(req.params);
      if (!result.success) {
        errorDetails.push(...formatZodError(result.error).map((d) => ({ ...d, field: `params.${d.field}` })));
      } else {
        req.params = result.data as any;
      }
    }

    if (schemas.query) {
      const result = await schemas.query.safeParseAsync(req.query);
      if (!result.success) {
        errorDetails.push(...formatZodError(result.error).map((d) => ({ ...d, field: `query.${d.field}` })));
      } else {
        req.query = result.data as any;
      }
    }

    if (schemas.body) {
      const result = await schemas.body.safeParseAsync(req.body);
      if (!result.success) {
        errorDetails.push(...formatZodError(result.error).map((d) => ({ ...d, field: d.field })));
      } else {
        req.body = result.data;
      }
    }

    if (errorDetails.length > 0) {
      next(new ValidationError('Request validation failed', errorDetails));
      return;
    }

    next();
  };
}
