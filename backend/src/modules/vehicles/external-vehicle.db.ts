import { PrismaClient } from '@prisma/client';

export class ExternalVehicleDatabase {
  private static instance: PrismaClient | null = null;

  public static getClient(): PrismaClient {
    if (!ExternalVehicleDatabase.instance) {
      const url = process.env.TLCM_DATABASE_URL;
      if (!url) {
        throw new Error('TLCM_DATABASE_URL environment variable is not configured');
      }
      ExternalVehicleDatabase.instance = new PrismaClient({
        datasources: {
          db: { url },
        },
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      });
    }
    return ExternalVehicleDatabase.instance;
  }

  public static async disconnect(): Promise<void> {
    if (ExternalVehicleDatabase.instance) {
      await ExternalVehicleDatabase.instance.$disconnect();
      ExternalVehicleDatabase.instance = null;
    }
  }
}
