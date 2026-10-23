import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TripLifecycleEngine } from './trip-lifecycle.engine.js';
import { TripLifecycleService } from './trip-lifecycle.service.js';
import { ConcurrencyConflictError, DomainValidationError } from '../../../shared/errors/index.js';
import { prisma } from '../../../shared/database/prisma.js';

describe('BE-04: Trip Lifecycle State Machine', () => {
  const engine = new TripLifecycleEngine();

  describe('Pure State Machine Rules', () => {
    it('allows valid transitions', () => {
      expect(engine.canTransition('draft', 'in_progress')).toBe(true);
      expect(engine.canTransition('draft', 'cancelled')).toBe(true);
      expect(engine.canTransition('in_progress', 'completed')).toBe(true);
      expect(engine.canTransition('in_progress', 'cancelled')).toBe(true);
    });

    it('rejects invalid or illegal transitions', () => {
      // Cannot jump from draft to completed without in_progress
      expect(engine.canTransition('draft', 'completed')).toBe(false);
      // Cannot reopen completed trip
      expect(engine.canTransition('completed', 'in_progress')).toBe(false);
      expect(engine.canTransition('completed', 'draft')).toBe(false);
      expect(engine.canTransition('completed', 'cancelled')).toBe(false);
      // Cannot reopen cancelled trip
      expect(engine.canTransition('cancelled', 'in_progress')).toBe(false);
      expect(engine.canTransition('cancelled', 'draft')).toBe(false);
      expect(engine.canTransition('cancelled', 'completed')).toBe(false);
    });

    it('identifies terminal states correctly', () => {
      expect(engine.isTerminal('completed')).toBe(true);
      expect(engine.isTerminal('cancelled')).toBe(true);
      expect(engine.isTerminal('in_progress')).toBe(false);
      expect(engine.isTerminal('draft')).toBe(false);
    });
  });

  describe('Lifecycle Service & Concurrency Control', () => {
    let mockTripRepo: any;
    let mockAuditRepo: any;
    let mockValidationEngine: any;
    let mockDistanceEngine: any;
    let service: TripLifecycleService;

    beforeEach(() => {
      mockTripRepo = {
        findById: vi.fn(),
        updateWithOptimisticLock: vi.fn(),
        create: vi.fn(),
        generateNextTripNumber: vi.fn().mockResolvedValue('TRIP-2026-0001'),
        createOdometerRecord: vi.fn(),
      };
      mockAuditRepo = {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      };
      mockValidationEngine = {
        validateForCreation: vi.fn(),
        validateForDispatch: vi.fn().mockReturnValue({ canProceed: true, blockingErrors: [] }),
        validateForCompletion: vi.fn().mockReturnValue({ canProceed: true, blockingErrors: [] }),
        validateForCancellation: vi.fn().mockReturnValue({ canProceed: true, blockingErrors: [] }),
      };
      mockDistanceEngine = {
        evaluateDistance: vi.fn(),
      };

      service = new TripLifecycleService(
        mockTripRepo,
        engine,
        mockValidationEngine,
        mockDistanceEngine,
        mockAuditRepo
      );
    });

    it('rejects illegal transition in service with DomainValidationError', async () => {
      mockTripRepo.findById.mockResolvedValue({
        id: 'trip-1',
        status: 'completed', // already completed
        version: 1,
      });

      await expect(
        service.transitionTrip('trip-1', {
          targetStatus: 'in_progress',
          expectedVersion: 1,
        })
      ).rejects.toThrow(DomainValidationError);
    });

    it('rejects ordinary update on completed trip', async () => {
      mockTripRepo.findById.mockResolvedValue({
        id: 'trip-1',
        status: 'completed',
        version: 2,
      });

      await expect(
        service.updateTrip('trip-1', { startingLocation: 'New Location', expectedVersion: 2 })
      ).rejects.toThrow(DomainValidationError);
    });

    it('detects concurrent conflicting transition when version does not match', async () => {
      const validDriverUuid = '11111111-1111-1111-1111-111111111111';
      const validVehicleUuid = '22222222-2222-2222-2222-222222222222';

      mockTripRepo.findById.mockResolvedValue({
        id: 'trip-1',
        tripNumber: 'TRIP-2026-0001',
        status: 'draft',
        version: 2, // version in database is 2
        driverId: validDriverUuid,
        vehicleId: validVehicleUuid,
      });

      vi.spyOn(prisma.driver, 'findUnique').mockResolvedValue({
        id: validDriverUuid,
        status: 'active',
        licenseExpiry: new Date('2030-01-01'),
      } as any);

      vi.spyOn(prisma.vehicle, 'findUnique').mockResolvedValue({
        id: validVehicleUuid,
        status: 'active',
      } as any);

      // Simulation: Expected version passed by client is 1 (stale)
      mockTripRepo.updateWithOptimisticLock.mockRejectedValue(
        new ConcurrencyConflictError('Trip was updated by another request.')
      );

      await expect(
        service.transitionTrip('trip-1', {
          targetStatus: 'in_progress',
          expectedVersion: 1, // Stale version!
        })
      ).rejects.toThrow(ConcurrencyConflictError);
    });
  });
});
