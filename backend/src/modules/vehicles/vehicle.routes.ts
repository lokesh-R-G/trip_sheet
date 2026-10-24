import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../shared/database/prisma.js';
import { externalVehicleRepository } from './external-vehicle.repository.js';
import { z } from 'zod';
import { zUuid } from '../../shared/validation/custom-types.js';
import { NotFoundError, AppError } from '../../shared/errors/index.js';

export const vehicleRouter = Router();

const vehicleIdParamSchema = z.object({
  id: zUuid,
});

/**
 * GET /api/v1/vehicles
 * Fetches vehicle list directly from the external authoritative database,
 * synchronizing metadata with the local vehicle reference table.
 */
vehicleRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search } = req.query as any;

    // Fetch authoritative vehicles strictly from external TLCM vehicle database
    const externalVehicles = await externalVehicleRepository.findVehicles({ search, status });

    // Fetch local vehicle reference mapping to include local metadata
    const localVehicles = await prisma.vehicle.findMany();
    const localMapByReg = new Map(localVehicles.map((lv) => [lv.registrationNumber, lv]));
    const localMapByExtId = new Map(localVehicles.map((lv) => [lv.tlcmVehicleId, lv]));

    const responseVehicles = [];

    for (const ev of externalVehicles) {
      let matchedLocal = localMapByExtId.get(ev.id) || localMapByReg.get(ev.vehicleNumber);

      // If local cache record does not exist yet for this authoritative TLCM vehicle,
      // create it so Trip Sheet relationships and foreign keys function cleanly
      if (!matchedLocal) {
        matchedLocal = await prisma.vehicle.create({
          data: {
            tlcmVehicleId: ev.id,
            registrationNumber: ev.vehicleNumber,
            vehicleType: 'Heavy Truck',
            makeModel: ev.model || 'BharatBenz',
            tonnage: 28,
            status: 'active',
            latestOdometer: Math.round(ev.currentOdometer || 0),
            totalTripDistance: 0,
            assignedTyresCount: 10,
            hasStepneyFitted: true,
            syncStatus: 'connected',
            lastSyncTime: ev.updatedAt,
          },
        });
        localMapByExtId.set(ev.id, matchedLocal);
        localMapByReg.set(ev.vehicleNumber, matchedLocal);
      }

      responseVehicles.push({
        id: matchedLocal.id,
        tlcmVehicleId: ev.id,
        registrationNumber: ev.vehicleNumber,
        vehicleType: matchedLocal.vehicleType || 'Heavy Truck',
        makeModel: ev.model || matchedLocal.makeModel || 'BharatBenz',
        tonnage: Number(matchedLocal.tonnage),
        status: matchedLocal.status || 'active',
        latestOdometer: ev.currentOdometer,
        totalTripDistance: matchedLocal.totalTripDistance || 0,
        assignedTyresCount: matchedLocal.assignedTyresCount || 10,
        hasStepneyFitted: matchedLocal.hasStepneyFitted,
        syncStatus: 'connected',
        lastSyncTime: ev.updatedAt.toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      data: responseVehicles,
      meta: {
        total: responseVehicles.length,
        source: 'tlcm_database',
        authoritativeCount: externalVehicles.length,
      },
    });
  } catch (err: any) {
    next(err);
  }
});

/**
 * GET /api/v1/vehicles/:id/latest-odometer
 * Returns the latest valid authoritative odometer reading from the external vehicle database.
 */
vehicleRouter.get('/:id/latest-odometer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = vehicleIdParamSchema.parse(req.params);

    // Find local vehicle to obtain tlcmVehicleId or registrationNumber
    const localVeh = await prisma.vehicle.findUnique({ where: { id } });
    const identifier = localVeh?.tlcmVehicleId || localVeh?.registrationNumber || id;

    const authoritativeOdo = await externalVehicleRepository.getLatestAuthoritativeOdometer(identifier);

    res.status(200).json({
      success: true,
      data: {
        vehicleId: id,
        externalVehicleId: authoritativeOdo.vehicleId,
        registrationNumber: authoritativeOdo.registrationNumber,
        latestAuthoritativeOdometer: authoritativeOdo.latestOdometer,
        effectiveDate: authoritativeOdo.effectiveDate.toISOString(),
        source: authoritativeOdo.source,
        isBaselineAvailable: authoritativeOdo.isBaselineAvailable,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/vehicles/:id
 * Fetches vehicle details by ID with authoritative latest odometer reading.
 */
vehicleRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = vehicleIdParamSchema.parse(req.params);
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        assignedDrivers: {
          select: { id: true, fullName: true, driverNumber: true, status: true },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle', id);
    }

    // Query external DB for latest authoritative odometer
    let authoritativeOdometer = vehicle.latestOdometer;
    try {
      const extOdo = await externalVehicleRepository.getLatestAuthoritativeOdometer(
        vehicle.tlcmVehicleId || vehicle.registrationNumber
      );
      authoritativeOdometer = extOdo.latestOdometer;
    } catch {
      // Fallback to local cached reading if external DB is temporarily unreachable
    }

    res.status(200).json({
      success: true,
      data: {
        id: vehicle.id,
        tlcmVehicleId: vehicle.tlcmVehicleId,
        registrationNumber: vehicle.registrationNumber,
        vehicleType: vehicle.vehicleType,
        makeModel: vehicle.makeModel,
        tonnage: Number(vehicle.tonnage),
        status: vehicle.status,
        latestOdometer: authoritativeOdometer,
        totalTripDistance: vehicle.totalTripDistance,
        assignedTyresCount: vehicle.assignedTyresCount,
        hasStepneyFitted: vehicle.hasStepneyFitted,
        syncStatus: vehicle.syncStatus,
        lastSyncTime: vehicle.lastSyncTime ? vehicle.lastSyncTime.toISOString() : new Date().toISOString(),
        assignedDrivers: vehicle.assignedDrivers,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/vehicles/diagnostics/identity
 * Development diagnostic identifying the connected database runtime identities.
 */
vehicleRouter.get('/diagnostics/identity', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tripDbRes = await prisma.$queryRawUnsafe<any[]>(
      'SELECT current_database(), current_schema(), inet_server_port();'
    );
    const tlcmClient = (await import('./external-vehicle.db.js')).ExternalVehicleDatabase.getClient();
    const tlcmDbRes = await tlcmClient.$queryRawUnsafe<any[]>(
      'SELECT current_database(), current_schema(), inet_server_port();'
    );
    const tlcmCount = await tlcmClient.$queryRawUnsafe<any[]>('SELECT COUNT(*) as count FROM "Vehicle";');
    const localCount = await prisma.vehicle.count();

    res.status(200).json({
      success: true,
      data: {
        primaryDatabase: {
          database: tripDbRes[0].current_database,
          schema: tripDbRes[0].current_schema,
          port: tripDbRes[0].inet_server_port,
          localVehicleCount: localCount,
        },
        externalTlcmDatabase: {
          database: tlcmDbRes[0].current_database,
          schema: tlcmDbRes[0].current_schema,
          port: tlcmDbRes[0].inet_server_port,
          authoritativeVehicleCount: Number(tlcmCount[0].count),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

