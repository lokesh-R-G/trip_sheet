import { routeSegmentRepository, RouteSegmentRepository } from './route-segment.repository.js';
import { auditRepository, AuditRepository } from '../../audit/audit.repository.js';
import { AuditEventBuilder } from '../../audit/audit-event.builder.js';
import { runInTransaction, prisma } from '../../../shared/database/prisma.js';
import {
  CreateRouteSegmentDTO,
  UpdateRouteSegmentDTO,
  ReorderSegmentsDTO,
  RouteSegmentResponseDTO,
} from './dto/route-segment.dto.js';
import {
  NotFoundError,
  DomainValidationError,
  ConflictError,
} from '../../../shared/errors/index.js';
import { TripRouteSegment } from '@prisma/client';

export class RouteSegmentService {
  constructor(
    private readonly repo: RouteSegmentRepository = routeSegmentRepository,
    private readonly auditRepo: AuditRepository = auditRepository
  ) {}

  public async getSegmentsByTripId(tripId: string): Promise<RouteSegmentResponseDTO[]> {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundError('Trip', tripId);
    }

    const segments = await this.repo.findByTripId(tripId);
    return segments.map(this.mapToResponse);
  }

  public async addSegment(
    tripId: string,
    data: CreateRouteSegmentDTO,
    actor = 'system',
    ipAddress?: string
  ): Promise<RouteSegmentResponseDTO> {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundError('Trip', tripId);
    }

    if (['completed', 'cancelled'].includes(trip.status)) {
      throw new DomainValidationError(
        `Cannot add route segments to trip with terminal status "${trip.status}".`,
        [{ field: 'tripId', message: 'Trip is closed or cancelled' }]
      );
    }

    // Check for sequence conflict
    const existingSegments = await this.repo.findByTripId(tripId);
    if (existingSegments.some((s) => s.sequence === data.sequence)) {
      throw new ConflictError(
        `A route segment with sequence ${data.sequence} already exists on trip ${trip.tripNumber}.`,
        [{ field: 'sequence', message: 'Sequence must be unique for this trip' }]
      );
    }

    const segment = await runInTransaction(async (tx) => {
      const created = await this.repo.create(tripId, data, tx);

      const auditEvent = new AuditEventBuilder()
        .setEntity('TripRouteSegment', created.id, `${trip.tripNumber}-SEG-${created.sequence}`)
        .setAction('ROUTE_SEGMENT_ADDED')
        .setNewValue({
          tripId,
          sequence: created.sequence,
          fromLocation: created.fromLocation,
          toLocation: created.toLocation,
          distanceKm: created.distanceKm.toString(),
        })
        .setActor(actor, ipAddress)
        .build();

      await this.auditRepo.create(auditEvent, tx);
      return created;
    });

    return this.mapToResponse(segment);
  }

  public async updateSegment(
    tripId: string,
    segmentId: string,
    data: UpdateRouteSegmentDTO,
    actor = 'system',
    ipAddress?: string
  ): Promise<RouteSegmentResponseDTO> {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundError('Trip', tripId);
    }

    if (['completed', 'cancelled'].includes(trip.status)) {
      throw new DomainValidationError(
        `Cannot update route segments for trip with terminal status "${trip.status}".`,
        [{ field: 'tripId', message: 'Trip is closed or cancelled' }]
      );
    }

    const existing = await this.repo.findById(segmentId);
    if (!existing || existing.tripId !== tripId) {
      throw new NotFoundError('TripRouteSegment', segmentId);
    }

    const updated = await runInTransaction(async (tx) => {
      const result = await this.repo.update(segmentId, data, tx);

      const auditEvent = new AuditEventBuilder()
        .setEntity('TripRouteSegment', result.id, `${trip.tripNumber}-SEG-${result.sequence}`)
        .setAction('ROUTE_SEGMENT_UPDATED')
        .setPreviousValue({
          fromLocation: existing.fromLocation,
          toLocation: existing.toLocation,
          distanceKm: existing.distanceKm.toString(),
        })
        .setNewValue(data)
        .setActor(actor, ipAddress)
        .build();

      await this.auditRepo.create(auditEvent, tx);
      return result;
    });

    return this.mapToResponse(updated);
  }

  public async deleteSegment(
    tripId: string,
    segmentId: string,
    actor = 'system',
    ipAddress?: string
  ): Promise<void> {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundError('Trip', tripId);
    }

    if (['completed', 'cancelled'].includes(trip.status)) {
      throw new DomainValidationError(
        `Cannot delete route segments for trip with terminal status "${trip.status}".`,
        [{ field: 'tripId', message: 'Trip is closed or cancelled' }]
      );
    }

    const existing = await this.repo.findById(segmentId);
    if (!existing || existing.tripId !== tripId) {
      throw new NotFoundError('TripRouteSegment', segmentId);
    }

    await runInTransaction(async (tx) => {
      await this.repo.delete(segmentId, tx);

      const auditEvent = new AuditEventBuilder()
        .setEntity('TripRouteSegment', segmentId, `${trip.tripNumber}-SEG-${existing.sequence}`)
        .setAction('ROUTE_SEGMENT_DELETED')
        .setPreviousValue({
          sequence: existing.sequence,
          fromLocation: existing.fromLocation,
          toLocation: existing.toLocation,
        })
        .setActor(actor, ipAddress)
        .build();

      await this.auditRepo.create(auditEvent, tx);
    });
  }

  public async reorderSegments(
    tripId: string,
    dto: ReorderSegmentsDTO,
    actor = 'system',
    ipAddress?: string
  ): Promise<RouteSegmentResponseDTO[]> {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw new NotFoundError('Trip', tripId);
    }

    if (['completed', 'cancelled'].includes(trip.status)) {
      throw new DomainValidationError(
        `Cannot reorder route segments for trip with terminal status "${trip.status}".`,
        [{ field: 'tripId', message: 'Trip is closed or cancelled' }]
      );
    }

    const existing = await this.repo.findByTripId(tripId);
    const existingIds = new Set(existing.map((s) => s.id));

    // Verify all requested segment IDs belong to this trip
    for (const item of dto.segments) {
      if (!existingIds.has(item.segmentId)) {
        throw new DomainValidationError(
          `Segment ID "${item.segmentId}" does not belong to trip ${trip.tripNumber}.`,
          [{ field: 'segments', message: 'Foreign segment ID' }]
        );
      }
    }

    const updated = await runInTransaction(async (tx) => {
      const result = await this.repo.reorder(tripId, dto.segments, tx);

      const auditEvent = new AuditEventBuilder()
        .setEntity('TripRouteSegment', tripId, `${trip.tripNumber}-SEGMENTS`)
        .setAction('ROUTE_SEGMENTS_REORDERED')
        .setNewValue({ order: dto.segments })
        .setActor(actor, ipAddress)
        .build();

      await this.auditRepo.create(auditEvent, tx);
      return result;
    });

    return updated.map(this.mapToResponse);
  }

  private mapToResponse(seg: TripRouteSegment): RouteSegmentResponseDTO {
    return {
      id: seg.id,
      tripId: seg.tripId,
      sequence: seg.sequence,
      fromLocation: seg.fromLocation,
      toLocation: seg.toLocation,
      departureTime: seg.departureTime ? seg.departureTime.toISOString() : null,
      arrivalTime: seg.arrivalTime ? seg.arrivalTime.toISOString() : null,
      distanceKm: seg.distanceKm.toString(),
      tonnage: seg.tonnage ? seg.tonnage.toString() : null,
      cargoDescription: seg.cargoDescription,
      notes: seg.notes,
    };
  }
}

export const routeSegmentService = new RouteSegmentService();
