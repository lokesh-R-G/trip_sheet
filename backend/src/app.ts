import express, { Request, Response, NextFunction } from 'express';
import { driverRouter } from './modules/drivers/driver.routes.js';
import { tripRouter } from './modules/trips/trip.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { fuelTopUpRouter } from './modules/fuel/topups/fuel-topup.routes.js';
import { benchmarkRouter } from './modules/fuel/benchmarks/benchmark.routes.js';
import { fuelValuationRouter } from './modules/fuel/valuation/fuel-valuation.routes.js';
import { fuelDeductionRouter } from './modules/fuel/deductions/fuel-deduction.routes.js';
import { AppError } from './shared/errors/index.js';
import { prisma } from './shared/database/prisma.js';

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request correlation ID and basic logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const reqId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  res.setHeader('x-request-id', reqId as string);
  next();
});

// Health check endpoint
app.get('/api/v1/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        database: 'disconnected',
        error: (err as Error).message,
      },
    });
  }
});

// Mount domain routes
app.use('/api/v1/drivers', driverRouter);
app.use('/api/v1/trips', tripRouter);
app.use('/api/v1/audit-logs', auditRouter);
app.use('/api/v1/fuel-topups', fuelTopUpRouter);
app.use('/api/v1/benchmarks', benchmarkRouter);
app.use('/api/v1/fuel-policies', fuelValuationRouter);
app.use('/api/v1/fuel-deductions', fuelDeductionRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`,
    },
  });
});

// Global error handling middleware
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details && err.details.length > 0 ? err.details : undefined,
      },
    });
    return;
  }

  // Safe fallback for unhandled 500 errors (avoid leaking DB credentials or stack traces)
  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred. Please try again later.',
    },
  });
});
