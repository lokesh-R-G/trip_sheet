export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: ErrorDetail[];

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details: ErrorDetail[] = []) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details: ErrorDetail[] = []) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class DomainValidationError extends AppError {
  constructor(message: string, details: ErrorDetail[] = []) {
    super(message, 422, 'DOMAIN_RULE_VIOLATION', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const msg = identifier ? `${resource} with identifier "${identifier}" not found.` : `${resource} not found.`;
    super(msg, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details: ErrorDetail[] = []) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

export class ConcurrencyConflictError extends AppError {
  constructor(message = 'Resource was modified by another operation. Please reload and retry.') {
    super(message, 409, 'CONCURRENCY_CONFLICT');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden.') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class BenchmarkAmbiguityError extends AppError {
  constructor(message = 'Ambiguous benchmark resolution: multiple equally applicable benchmarks match.', details: ErrorDetail[] = []) {
    super(message, 422, 'BENCHMARK_AMBIGUOUS', details);
  }
}
