import { tripRepository, TripRepository, TripQueryFilters, TripWithRelations } from '../trip.repository.js';
import { tripLifecycleEngine, TripLifecycleEngine, TripStatus } from './trip-lifecycle.engine.js';
import { tripValidationEngine, TripValidationEngine, TripValidationResult } from '../validation/trip-validation.engine.js';
import { tripDistanceEngine, TripDistanceEngine } from '../distance/trip-distance.engine.js';
import { auditRepository, AuditRepository } from '../../audit/audit.repository.js';
import { AuditEventBuilder } from '../../audit/audit-event.builder.js';
import { runInTransaction, prisma } from '../../../shared/database/prisma.js';
import {
  CreateTripDTO,
  UpdateTripDTO,
  TripTransitionDTO,
  ExceptionalCorrectionDTO,
  TripResponseDTO,
} from '../dto/trip.dto.js';
import {
  NotFoundError,
  DomainValidationError,
} from '../../../shared/errors/index.js';
import { dec } from '../../../shared/decimal/index.js';

export class TripLifecycleService {
  constructor(
    private readonly repo: TripRepository = tripRepository,
    private readonly lifecycleEngine: TripLifecycleEngine = tripLifecycleEngine,
    private readonly validationEngine: TripValidationEngine = tripValidationEngine,
    private readonly distanceEngine: TripDistanceEngine = tripDistanceEngine,
    private readonly auditRepo: AuditRepository = auditRepository
  ) {}

  public async createTrip(data: CreateTripDTO, actor = 'system', ipAddress?: string): Promise<TripResponseDTO> {
    // 1. Fetch referenced entities
    const [driver, vehicle] = await Promise.all([
      prisma.driver.findUnique({ where: { id: data.driverId } }),
      prisma.vehicle.findUnique({ where: { id: data.vehicleId } }),
    ]);

    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : null;

    // 2. Domain validation
    const validation = this.validationEngine.validateForCreation({
      driver,
      vehicle,
      startDate,
      endDate,
      startingLocation: data.startingLocation,
      finalDestination: data.finalDestination,
      isDraft: data.isDraft,
    });

    if (!validation.canProceed) {
      throw new DomainValidationError(
        `Trip creation rejected: ${validation.blockingErrors.join(' ')}`,
        validation.blockingErrors.map((msg) => ({ message: msg }))
      );
    }

    // 3. Authoritative Distance and Odometer Evaluation
    const distanceEval = await this.distanceEngine.evaluateDistance({
      vehicleId: data.vehicleId,
      startingReading: data.odometer?.startingReading,
      startingTimestamp: data.odometer?.startingTimestamp ? new Date(data.odometer.startingTimestamp) : startDate,
      startingSource: data.odometer?.startingSource,
      endingReading: data.odometer?.endingReading,
      endingTimestamp: data.odometer?.endingTimestamp ? new Date(data.odometer.endingTimestamp) : (endDate || new Date(startDate.getTime() + 1000)),
      endingSource: data.odometer?.endingSource,
      reportedDistance: data.odometer?.reportedDistance,
      previousVehicleOdometer: vehicle!.latestOdometer,
    });

    const initialStatus: TripStatus = data.isDraft ? 'draft' : 'in_progress';

    // 4. Transactional persistence: Trip + Odometer + Segments + Audit
    const trip = await runInTransaction(async (tx) => {
      const tripNumber = await this.repo.generateNextTripNumber(tx);

      const createdTrip = await this.repo.create(
        {
          tripNumber,
          driver: { connect: { id: data.driverId } },
          vehicle: { connect: { id: data.vehicleId } },
          startDate,
          endDate,
          startingLocation: data.startingLocation,
          finalDestination: data.finalDestination,
          purpose: data.purpose,
          status: initialStatus,
          notes: data.notes ?? null,
          version: 1,
        },
        tx
      );

      // Create TripOdometerRecord
      await this.repo.createOdometerRecord(
        {
          trip: { connect: { id: createdTrip.id } },
          startingReading: data.odometer?.startingReading ?? null,
          startingTimestamp: data.odometer?.startingTimestamp ? new Date(data.odometer.startingTimestamp) : startDate,
          startingSource: data.odometer?.startingSource ?? 'measured',
          endingReading: data.odometer?.endingReading ?? null,
          endingTimestamp: data.odometer?.endingTimestamp ? new Date(data.odometer.endingTimestamp) : endDate,
          endingSource: data.odometer?.endingSource ?? 'measured',
          odometerCase: distanceEval.odometerCase,
          measuredDistance: distanceEval.measuredDistance ?? null,
          derivedDistance: distanceEval.derivedDistance ?? null,
          reportedDistance: distanceEval.reportedDistance ?? null,
          acceptedDistance: distanceEval.acceptedDistance,
          derivedEndingReading: distanceEval.derivedEndingReading ?? null,
          discrepancyFlag: distanceEval.discrepancyFlag,
          discrepancyReason: distanceEval.discrepancyReason ?? null,
          validationStatus: distanceEval.validationStatus,
          tyreAttributionEligible: distanceEval.isTyreAttributionEligible,
          tyreAttributionStatus: distanceEval.tyreAttributionStatus,
          tyreAttributionHoldReason: distanceEval.tyreAttributionHoldReason ?? null,
        },
        tx
      );

      // Create Route Segments if provided
      if (data.routeSegments && data.routeSegments.length > 0) {
        for (const seg of data.routeSegments) {
          await tx.tripRouteSegment.create({
            data: {
              tripId: createdTrip.id,
              sequence: seg.sequence,
              fromLocation: seg.fromLocation,
              toLocation: seg.toLocation,
              departureTime: seg.departureTime ? new Date(seg.departureTime) : null,
              arrivalTime: seg.arrivalTime ? new Date(seg.arrivalTime) : null,
              distanceKm: dec(seg.distanceKm).toFixed(2),
              tonnage: seg.tonnage ? dec(seg.tonnage).toFixed(2) : null,
              cargoDescription: seg.cargoDescription ?? null,
              notes: seg.notes ?? null,
            },
          });
        }
      }

      // If verified ending reading > vehicle.latestOdometer, update vehicle master odometer
      if (
        distanceEval.validationStatus === 'verified' &&
        data.odometer?.endingReading &&
        data.odometer.endingReading > vehicle!.latestOdometer
      ) {
        await tx.vehicle.update({
          where: { id: vehicle!.id },
          data: {
            latestOdometer: data.odometer.endingReading,
            totalTripDistance: { increment: distanceEval.acceptedDistance },
          },
        });
      }

      // Audit Log
      const auditEvent = new AuditEventBuilder()
        .setEntity('Trip', createdTrip.id, createdTrip.tripNumber)
        .setAction('TRIP_CREATED')
        .setNewValue({
          tripNumber: createdTrip.tripNumber,
          driverId: data.driverId,
          vehicleId: data.vehicleId,
          status: createdTrip.status,
          acceptedDistance: distanceEval.acceptedDistance,
          validationStatus: distanceEval.validationStatus,
        })
        .setActor(actor, ipAddress)
        .build();

      await this.auditRepo.create(auditEvent, tx);
      return createdTrip;
    });

    const fullTrip = await this.repo.findById(trip.id);
    return this.mapToResponse(fullTrip!);
  }

  public async transitionTrip(
    id: string,
    dto: TripTransitionDTO,
    actor = 'system',
    ipAddress?: string
  ): Promise<TripResponseDTO> {
    const trip = await this.repo.findById(id);
    if (!trip) {
      throw new NotFoundError('Trip', id);
    }

    const currentStatus = trip.status as TripStatus;
    const targetStatus = dto.targetStatus as TripStatus;

    if (currentStatus === targetStatus) {
      return this.mapToResponse(trip);
    }

    // 1. State machine check
    if (!this.lifecycleEngine.canTransition(currentStatus, targetStatus)) {
      throw new DomainValidationError(
        `Invalid lifecycle transition from "${currentStatus}" to "${targetStatus}". Permitted next statuses: ${this.lifecycleEngine.getPermittedNextStatuses(currentStatus).join(', ') || 'none (terminal)'}.`,
        [{ field: 'targetStatus', message: 'Illegal status transition' }]
      );
    }

    // 2. Domain validations per target status
    if (targetStatus === 'in_progress') {
      const driver = await prisma.driver.findUnique({ where: { id: trip.driverId } });
      const vehicle = await prisma.vehicle.findUnique({ where: { id: trip.vehicleId } });
      const validation = this.validationEngine.validateForDispatch({
        trip,
        driver: driver!,
        vehicle: vehicle!,
        odometerRecord: trip.odometerRecord,
      });

      if (!validation.canProceed) {
        throw new DomainValidationError(
          `Dispatch validation failed: ${validation.blockingErrors.join(' ')}`,
          validation.blockingErrors.map((m) => ({ message: m }))
        );
      }
    } else if (targetStatus === 'completed') {
      const validation = this.validationEngine.validateForCompletion({
        trip,
        odometerRecord: trip.odometerRecord,
        routeSegments: trip.routeSegments,
      });

      if (!validation.canProceed) {
        throw new DomainValidationError(
          `Completion validation failed: ${validation.blockingErrors.join(' ')}`,
          validation.blockingErrors.map((m) => ({ message: m }))
        );
      }
    } else if (targetStatus === 'cancelled') {
      const validation = this.validationEngine.validateForCancellation(trip, dto.reason);
      if (!validation.canProceed) {
        throw new DomainValidationError(
          `Cancellation rejected: ${validation.blockingErrors.join(' ')}`,
          validation.blockingErrors.map((m) => ({ message: m }))
        );
      }
    }

    // 3. Execute transition in atomic transaction with optimistic lock check
    await runInTransaction(async (tx) => {
      const updateData: any = {
        status: targetStatus,
      };

      if (targetStatus === 'completed' && !trip.endDate) {
        updateData.endDate = new Date();
      }

      await this.repo.updateWithOptimisticLock(id, dto.expectedVersion, updateData, tx);

      const auditEvent = new AuditEventBuilder()
        .setEntity('Trip', trip.id, trip.tripNumber)
        .setAction(`TRIP_STATUS_${targetStatus.toUpperCase()}`)
        .setPreviousValue({ status: currentStatus })
        .setNewValue({ status: targetStatus })
        .setReason(dto.reason)
        .setActor(actor, ipAddress)
        .build();

      await this.auditRepo.create(auditEvent, tx);
    });

    const updated = await this.repo.findById(id);
    return this.mapToResponse(updated!);
  }

  public async updateTrip(
    id: string,
    updates: UpdateTripDTO,
    actor = 'system',
    ipAddress?: string
  ): Promise<TripResponseDTO> {
    const trip = await this.repo.findById(id);
    if (!trip) {
      throw new NotFoundError('Trip', id);
    }

    if (this.lifecycleEngine.isTerminal(trip.status as TripStatus)) {
      throw new DomainValidationError(
        `Cannot modify trip in terminal status "${trip.status}". Use the authorized correction workflow for exceptional changes.`,
        [{ field: 'status', message: 'Terminal record locked' }]
      );
    }

    const expectedVersion = updates.expectedVersion ?? trip.version;

    await runInTransaction(async (tx) => {
      const updateData: any = {};
      if (updates.startingLocation !== undefined) updateData.startingLocation = updates.startingLocation;
      if (updates.finalDestination !== undefined) updateData.finalDestination = updates.finalDestination;
      if (updates.purpose !== undefined) updateData.purpose = updates.purpose;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.endDate !== undefined) updateData.endDate = updates.endDate ? new Date(updates.endDate) : null;

      await this.repo.updateWithOptimisticLock(id, expectedVersion, updateData, tx);

      const auditEvent = new AuditEventBuilder()
        .setEntity('Trip', trip.id, trip.tripNumber)
        .setAction('TRIP_UPDATED')
        .setPreviousValue({
          startingLocation: trip.startingLocation,
          finalDestination: trip.finalDestination,
          purpose: trip.purpose,
        })
        .setNewValue(updates)
        .setActor(actor, ipAddress)
        .build();

      await this.auditRepo.create(auditEvent, tx);
    });

    const updated = await this.repo.findById(id);
    return this.mapToResponse(updated!);
  }

  public async applyExceptionalCorrection(
    id: string,
    dto: ExceptionalCorrectionDTO,
    actor = 'supervisor-user',
    ipAddress?: string
  ): Promise<TripResponseDTO> {
    const trip = await this.repo.findById(id);
    if (!trip) {
      throw new NotFoundError('Trip', id);
    }

    await runInTransaction(async (tx) => {
      const updateData: any = {};
      if (dto.notes !== undefined) {
        updateData.notes = dto.notes;
      }

      await this.repo.updateWithOptimisticLock(id, dto.expectedVersion, updateData, tx);

      const auditEvent = new AuditEventBuilder()
        .setEntity('Trip', trip.id, trip.tripNumber)
        .setAction('TRIP_EXCEPTIONAL_CORRECTION')
        .setReason(dto.reason)
        .setNewValue({ correctionNotes: dto.notes })
        .setActor(actor, ipAddress)
        .build();

      await this.auditRepo.create(auditEvent, tx);
    });

    const updated = await this.repo.findById(id);
    return this.mapToResponse(updated!);
  }

  public async getTripById(id: string): Promise<TripResponseDTO> {
    const trip = await this.repo.findById(id);
    if (!trip) {
      throw new NotFoundError('Trip', id);
    }
    return this.mapToResponse(trip);
  }

  public async listTrips(
    filters: TripQueryFilters
  ): Promise<{ trips: TripResponseDTO[]; total: number; page: number; limit: number }> {
    const { trips, total } = await this.repo.findMany(filters);
    return {
      trips: trips.map((t) => this.mapToResponse(t)),
      total,
      page: Math.max(1, filters.page || 1),
      limit: Math.min(100, Math.max(1, filters.limit || 25)),
    };
  }

  public async dryRunValidation(id: string, targetStatus: TripStatus): Promise<TripValidationResult> {
    const trip = await this.repo.findById(id);
    if (!trip) {
      throw new NotFoundError('Trip', id);
    }

    if (targetStatus === 'in_progress') {
      const driver = await prisma.driver.findUnique({ where: { id: trip.driverId } });
      const vehicle = await prisma.vehicle.findUnique({ where: { id: trip.vehicleId } });
      return this.validationEngine.validateForDispatch({
        trip,
        driver: driver!,
        vehicle: vehicle!,
        odometerRecord: trip.odometerRecord,
      });
    }

    if (targetStatus === 'completed') {
      return this.validationEngine.validateForCompletion({
        trip,
        odometerRecord: trip.odometerRecord,
        routeSegments: trip.routeSegments,
      });
    }

    if (targetStatus === 'cancelled') {
      return this.validationEngine.validateForCancellation(trip);
    }

    return {
      canProceed: true,
      blockingErrors: [],
      warnings: [],
      pendingVerification: [],
      discrepancies: [],
    };
  }

  private mapToResponse(trip: TripWithRelations): TripResponseDTO {
    return {
      id: trip.id,
      tripNumber: trip.tripNumber,
      driverId: trip.driverId,
      driverName: trip.driver?.fullName,
      driverNumber: trip.driver?.driverNumber,
      vehicleId: trip.vehicleId,
      vehicleReg: trip.vehicle?.registrationNumber,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate ? trip.endDate.toISOString() : null,
      startingLocation: trip.startingLocation,
      finalDestination: trip.finalDestination,
      purpose: trip.purpose,
      status: trip.status,
      notes: trip.notes,
      version: trip.version,
      odometer: trip.odometerRecord
        ? {
            startingReading: trip.odometerRecord.startingReading,
            startingTimestamp: trip.odometerRecord.startingTimestamp?.toISOString() ?? null,
            startingSource: trip.odometerRecord.startingSource,
            endingReading: trip.odometerRecord.endingReading,
            endingTimestamp: trip.odometerRecord.endingTimestamp?.toISOString() ?? null,
            endingSource: trip.odometerRecord.endingSource,
            odometerCase: trip.odometerRecord.odometerCase,
            measuredDistance: trip.odometerRecord.measuredDistance,
            derivedDistance: trip.odometerRecord.derivedDistance,
            reportedDistance: trip.odometerRecord.reportedDistance,
            acceptedDistance: trip.odometerRecord.acceptedDistance,
            derivedEndingReading: trip.odometerRecord.derivedEndingReading,
            discrepancyFlag: trip.odometerRecord.discrepancyFlag,
            discrepancyReason: trip.odometerRecord.discrepancyReason,
            validationStatus: trip.odometerRecord.validationStatus,
            tyreAttributionEligible: trip.odometerRecord.tyreAttributionEligible,
            tyreAttributionStatus: trip.odometerRecord.tyreAttributionStatus,
            tyreAttributionHoldReason: trip.odometerRecord.tyreAttributionHoldReason,
          }
        : null,
      routeSegments: trip.routeSegments?.map((s) => ({
        id: s.id,
        tripId: s.tripId,
        sequence: s.sequence,
        fromLocation: s.fromLocation,
        toLocation: s.toLocation,
        departureTime: s.departureTime ? s.departureTime.toISOString() : null,
        arrivalTime: s.arrivalTime ? s.arrivalTime.toISOString() : null,
        distanceKm: s.distanceKm.toString(),
        tonnage: s.tonnage ? s.tonnage.toString() : null,
        cargoDescription: s.cargoDescription,
        notes: s.notes,
      })),
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
    };
  }
}

export const tripLifecycleService = new TripLifecycleService();
