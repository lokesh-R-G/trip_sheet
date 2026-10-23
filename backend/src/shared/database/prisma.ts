import { PrismaClient, Prisma } from '@prisma/client';
import { AppError, ConflictError, NotFoundError, DomainValidationError } from '../errors/index.js';

export type PrismaTransactionClient = Prisma.TransactionClient;

class DatabaseManager {
  private static instance: PrismaClient | null = null;

  public static getClient(): PrismaClient {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      });
    }
    return DatabaseManager.instance;
  }

  public static async disconnect(): Promise<void> {
    if (DatabaseManager.instance) {
      await DatabaseManager.instance.$disconnect();
      DatabaseManager.instance = null;
    }
  }
}

export const prisma = DatabaseManager.getClient();

/**
 * Maps known Prisma errors to standardized application errors.
 */
export function handlePrismaError(error: unknown, resourceName = 'Resource'): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const target = (error.meta?.target as string[])?.join(', ') || 'field';
        throw new ConflictError(`A ${resourceName} with this ${target} already exists.`, [
          { field: target, message: `Unique constraint violated on ${target}` },
        ]);
      }
      case 'P2025': {
        throw new NotFoundError(resourceName);
      }
      case 'P2003': {
        const field = (error.meta?.field_name as string) || 'foreign_key';
        throw new DomainValidationError(`Referenced record does not exist or relation constraint violated (${field}).`, [
          { field, message: 'Foreign key constraint failed' },
        ]);
      }
      default:
        throw new AppError(`Database error [${error.code}]: ${error.message}`, 500, 'DATABASE_ERROR');
    }
  }

  if (error instanceof AppError) {
    throw error;
  }

  throw new AppError(error instanceof Error ? error.message : 'Unknown database error', 500);
}

/**
 * Runs the given callback inside a Prisma interactive transaction.
 */
export async function runInTransaction<T>(
  callback: (tx: PrismaTransactionClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel }
): Promise<T> {
  try {
    return await prisma.$transaction(callback, options);
  } catch (error) {
    return handlePrismaError(error);
  }
}
