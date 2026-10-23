import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RouteSegmentService } from './route-segment.service.js';
import { ConflictError, DomainValidationError, NotFoundError } from '../../../shared/errors/index.js';
import { prisma } from '../../../shared/database/prisma.js';

describe('BE-05: Route Segments Management', () => {
  let mockRepo: any;
  let mockAuditRepo: any;
  let service: RouteSegmentService;

  beforeEach(() => {
    mockRepo = {
      findByTripId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      reorder: vi.fn(),
    };
    mockAuditRepo = {
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    };
    service = new RouteSegmentService(mockRepo, mockAuditRepo);
  });

  it('rejects adding segment if trip is in completed status', async () => {
    vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue({
      id: 'trip-1',
      tripNumber: 'TRIP-2026-0001',
      status: 'completed',
    } as any);

    await expect(
      service.addSegment('trip-1', {
        sequence: 1,
        fromLocation: 'Chennai',
        toLocation: 'Vellore',
        distanceKm: '140',
      })
    ).rejects.toThrow(DomainValidationError);
  });

  it('rejects duplicate sequence position on the same trip', async () => {
    vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue({
      id: 'trip-2',
      tripNumber: 'TRIP-2026-0002',
      status: 'in_progress',
    } as any);

    mockRepo.findByTripId.mockResolvedValue([
      { id: 'seg-1', tripId: 'trip-2', sequence: 1, fromLocation: 'Hub A', toLocation: 'Hub B' },
    ]);

    await expect(
      service.addSegment('trip-2', {
        sequence: 1, // duplicate sequence!
        fromLocation: 'Hub B',
        toLocation: 'Hub C',
        distanceKm: '50',
      })
    ).rejects.toThrow(ConflictError);
  });

  it('throws NotFoundError for invalid trip ID', async () => {
    vi.spyOn(prisma.trip, 'findUnique').mockResolvedValue(null);

    await expect(
      service.getSegmentsByTripId('non-existent-trip')
    ).rejects.toThrow(NotFoundError);
  });
});
