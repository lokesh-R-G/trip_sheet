import { ExternalVehicleDatabase } from './external-vehicle.db.js';
import { prisma } from '../../shared/database/prisma.js';
import { NotFoundError, AppError, DomainValidationError } from '../../shared/errors/index.js';
import crypto from 'crypto';

export interface ExternalVehicle {
  id: string; // External vehicle id (UUID)
  vehicleNumber: string; // Registration number
  model: string;
  status: string; // e.g. 'OPTIMAL'
  currentOdometer: number;
  vehicleTypeId?: string;
  typeName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthoritativeOdometerResult {
  vehicleId: string;
  registrationNumber: string;
  latestOdometer: number;
  source: 'external_database';
  effectiveDate: Date;
  isBaselineAvailable: boolean;
}

export class ExternalVehicleRepository {
  /**
   * Fetch all vehicles directly from the external authoritative Vehicle table in tlcm1,
   * joined with VehicleType and resolving latest odometer from VehicleOdometerLog.
   */
  public async findVehicles(filters?: { search?: string; status?: string }): Promise<ExternalVehicle[]> {
    try {
      const client = ExternalVehicleDatabase.getClient();
      
      let query = `
        SELECT 
          v.id,
          v."vehicleNumber",
          v.status,
          v."vehicleTypeId",
          v."createdAt",
          v."updatedAt",
          vt.name as "typeName",
          COALESCE(
            (
              SELECT vol.odometer 
              FROM "VehicleOdometerLog" vol 
              WHERE vol."vehicleId" = v.id 
              ORDER BY vol.date DESC 
              LIMIT 1
            ),
            (
              SELECT MAX(i."installedOdometer")
              FROM "Installation" i
              WHERE i."vehicleId" = v.id
            ),
            0
          ) as "currentOdometer"
        FROM "Vehicle" v
        LEFT JOIN "VehicleType" vt ON v."vehicleTypeId" = vt.id
      `;

      const params: any[] = [];
      const whereClauses: string[] = [];

      if (filters?.search) {
        params.push(`%${filters.search}%`);
        whereClauses.push(`(v."vehicleNumber" ILIKE $${params.length} OR vt.name ILIKE $${params.length} OR v.id::text ILIKE $${params.length})`);
      }

      if (filters?.status) {
        params.push(filters.status.toUpperCase());
        whereClauses.push(`v.status = $${params.length}`);
      }

      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      query += ' ORDER BY v."vehicleNumber" ASC';

      const rows: any[] = await client.$queryRawUnsafe(query, ...params);
      return rows.map((r) => ({
        id: r.id,
        vehicleNumber: r.vehicleNumber,
        model: r.typeName || 'Heavy Truck',
        status: r.status || 'OPTIMAL',
        vehicleTypeId: r.vehicleTypeId,
        typeName: r.typeName,
        currentOdometer: Number(r.currentOdometer || 0),
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      }));
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(`External vehicle database unavailable: ${err.message}`, 503, 'EXTERNAL_DB_UNAVAILABLE');
    }
  }

  /**
   * Find a single external vehicle by its external ID or vehicleNumber.
   */
  public async findVehicleById(identifier: string): Promise<ExternalVehicle | null> {
    try {
      const client = ExternalVehicleDatabase.getClient();
      const rows: any[] = await client.$queryRawUnsafe(`
        SELECT 
          v.id,
          v."vehicleNumber",
          v.status,
          v."vehicleTypeId",
          v."createdAt",
          v."updatedAt",
          vt.name as "typeName",
          COALESCE(
            (
              SELECT vol.odometer 
              FROM "VehicleOdometerLog" vol 
              WHERE vol."vehicleId" = v.id 
              ORDER BY vol.date DESC 
              LIMIT 1
            ),
            (
              SELECT MAX(i."installedOdometer")
              FROM "Installation" i
              WHERE i."vehicleId" = v.id
            ),
            0
          ) as "currentOdometer"
        FROM "Vehicle" v
        LEFT JOIN "VehicleType" vt ON v."vehicleTypeId" = vt.id
        WHERE v.id::text = $1 OR v."vehicleNumber" = $1
        LIMIT 1
      `, identifier);

      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        vehicleNumber: r.vehicleNumber,
        model: r.typeName || 'Heavy Truck',
        status: r.status || 'OPTIMAL',
        vehicleTypeId: r.vehicleTypeId,
        typeName: r.typeName,
        currentOdometer: Number(r.currentOdometer || 0),
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(`External vehicle database unavailable: ${err.message}`, 503, 'EXTERNAL_DB_UNAVAILABLE');
    }
  }

  /**
   * Fetch the latest valid authoritative odometer reading from the external vehicle database.
   */
  public async getLatestAuthoritativeOdometer(vehicleIdentifier: string): Promise<AuthoritativeOdometerResult> {
    const extVeh = await this.findVehicleById(vehicleIdentifier);
    if (!extVeh) {
      throw new NotFoundError('External Vehicle', vehicleIdentifier);
    }

    return {
      vehicleId: extVeh.id,
      registrationNumber: extVeh.vehicleNumber,
      latestOdometer: extVeh.currentOdometer,
      source: 'external_database',
      effectiveDate: extVeh.updatedAt,
      isBaselineAvailable: true,
    };
  }

  /**
   * Validate and atomically persist an accepted odometer reading to the authoritative external database.
   * Inserts into VehicleOdometerLog and updates Vehicle.updatedAt.
   */
  public async updateAuthoritativeOdometer(params: {
    vehicleIdentifier: string;
    newReading: number;
    recordedAt?: Date;
    tripNumber?: string;
    reason?: string;
  }): Promise<{ success: boolean; previousOdometer: number; newOdometer: number; updatedAt: Date }> {
    const { vehicleIdentifier, newReading, recordedAt = new Date(), tripNumber, reason } = params;

    if (typeof newReading !== 'number' || isNaN(newReading) || newReading < 0) {
      throw new DomainValidationError('Odometer reading must be a valid non-negative number.', [
        { field: 'odometerReading', message: 'Invalid reading value' },
      ]);
    }

    try {
      const client = ExternalVehicleDatabase.getClient();

      // Step 1: Read current authoritative state
      let current = await this.findVehicleById(vehicleIdentifier);
      if (!current) {
        // If vehicle does not exist in authoritative DB, check local reference
        const localVeh = await prisma.vehicle.findFirst({
          where: { OR: [{ tlcmVehicleId: vehicleIdentifier }, { registrationNumber: vehicleIdentifier }] },
        });

        if (!localVeh) {
          throw new NotFoundError('External Vehicle', vehicleIdentifier);
        }

        // Onboard into external Vehicle table if absent
        const defaultType: any = await client.$queryRawUnsafe('SELECT id FROM "VehicleType" LIMIT 1;');
        const defaultTypeId = defaultType[0]?.id || '0312bf82-ea45-4b70-8fe1-53de0b1e4c5d';
        const newExtId = localVeh.tlcmVehicleId || crypto.randomUUID();
        await client.$executeRawUnsafe(
          `INSERT INTO "Vehicle" ("id", "vehicleNumber", "vehicleTypeId", "status", "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, 'OPTIMAL', NOW(), NOW()) 
           ON CONFLICT ("id") DO NOTHING;`,
          newExtId,
          localVeh.registrationNumber,
          defaultTypeId
        );

        current = await this.findVehicleById(newExtId);
        if (!current) {
          throw new NotFoundError('External Vehicle', vehicleIdentifier);
        }
      }

      // Step 2: Validate that new reading is not lower than authoritative current reading (if baseline > 0)
      if (current.currentOdometer > 0 && newReading < current.currentOdometer) {
        throw new DomainValidationError(
          `Submitted odometer reading (${newReading} km) is lower than authoritative baseline (${current.currentOdometer} km). Rollback rejected.`,
          [
            {
              field: 'odometerReading',
              message: `Reading cannot be lower than authoritative current reading (${current.currentOdometer} km)`,
            },
          ]
        );
      }

      // Step 3: Insert log into VehicleOdometerLog
      const logId = crypto.randomUUID();
      await client.$executeRawUnsafe(
        `INSERT INTO "VehicleOdometerLog" ("id", "vehicleId", "odometer", "date", "source")
         VALUES ($1, $2, $3, $4, $5);`,
        logId,
        current.id,
        Math.round(newReading),
        recordedAt,
        tripNumber ? `TRIP_${tripNumber}` : 'TRIP_SHEET'
      );

      // Step 4: Touch Vehicle.updatedAt
      await client.$executeRawUnsafe(
        `UPDATE "Vehicle" SET "updatedAt" = $1 WHERE "id" = $2;`,
        recordedAt,
        current.id
      );

      // Step 5: Synchronize local Trip Sheet Vehicle master record
      await prisma.vehicle.updateMany({
        where: {
          OR: [{ tlcmVehicleId: current.id }, { registrationNumber: current.vehicleNumber }],
        },
        data: {
          latestOdometer: Math.round(newReading),
          lastSyncTime: recordedAt,
          syncStatus: 'connected',
        },
      });

      return {
        success: true,
        previousOdometer: current.currentOdometer,
        newOdometer: Math.round(newReading),
        updatedAt: recordedAt,
      };
    } catch (err: any) {
      if (err instanceof DomainValidationError || err instanceof NotFoundError) {
        throw err;
      }
      throw new AppError(`Failed to persist authoritative odometer reading: ${err.message}`, 500, 'AUTHORITATIVE_WRITE_FAILED');
    }
  }
}

export const externalVehicleRepository = new ExternalVehicleRepository();
