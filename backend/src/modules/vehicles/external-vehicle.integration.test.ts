import { describe, it, expect, afterAll } from 'vitest';
import { externalVehicleRepository } from './external-vehicle.repository';
import { ExternalVehicleDatabase } from './external-vehicle.db';
import { DomainValidationError } from '../../shared/errors/index.js';

describe('Authoritative External Vehicle Database Integration', () => {
  afterAll(async () => {
    await ExternalVehicleDatabase.disconnect();
  });

  it('Phase 3: Fetches vehicle records from authoritative external database', async () => {
    const vehicles = await externalVehicleRepository.findVehicles({});
    expect(vehicles.length).toBeGreaterThan(0);
    const sample = vehicles[0];
    expect(sample.id).toBeDefined();
    expect(sample.vehicleNumber).toBeDefined();
    expect(typeof sample.currentOdometer).toBe('number');
  });

  it('Phase 4: Fetches latest authoritative odometer reading for a vehicle', async () => {
    const vehicles = await externalVehicleRepository.findVehicles({});
    const sample = vehicles[0];
    const latestOdo = await externalVehicleRepository.getLatestAuthoritativeOdometer(sample.id);

    expect(latestOdo).not.toBeNull();
    expect(latestOdo.vehicleId).toBe(sample.id);
    expect(latestOdo.registrationNumber).toBe(sample.vehicleNumber);
    expect(typeof latestOdo.latestOdometer).toBe('number');
    expect(latestOdo.isBaselineAvailable).toBe(true);
  });

  it('Phase 5: Rejects rollback of odometer reading (< currentOdometer)', async () => {
    const vehicles = await externalVehicleRepository.findVehicles({});
    const sample = vehicles[0];
    const invalidLowerReading = (sample.currentOdometer || 0) - 100;

    await expect(
      externalVehicleRepository.updateAuthoritativeOdometer({
        vehicleIdentifier: sample.id,
        newReading: invalidLowerReading,
        reason: 'test_rollback',
      })
    ).rejects.toThrow(DomainValidationError);
  });

  it('Phase 6 & 8: Persists valid reading with atomic conditional update & verifies write', async () => {
    const vehicles = await externalVehicleRepository.findVehicles({});
    const sample = vehicles[0];
    const currentOdo = sample.currentOdometer || 0;
    const incrementedReading = currentOdo + 25;

    const writeResult = await externalVehicleRepository.updateAuthoritativeOdometer({
      vehicleIdentifier: sample.id,
      newReading: incrementedReading,
      reason: 'test_phase6_write',
    });

    expect(writeResult.success).toBe(true);
    expect(writeResult.previousOdometer).toBe(currentOdo);
    expect(writeResult.newOdometer).toBe(incrementedReading);

    // Verify directly by querying authoritative external database
    const verified = await externalVehicleRepository.getLatestAuthoritativeOdometer(sample.id);
    expect(verified.latestOdometer).toBe(incrementedReading);
  });

  it('Phase 8: Duplicate submission with same reading succeeds without rolling back or corrupting', async () => {
    const vehicles = await externalVehicleRepository.findVehicles({});
    const sample = vehicles[0];
    const latest = await externalVehicleRepository.getLatestAuthoritativeOdometer(sample.id);
    expect(latest.isBaselineAvailable).toBe(true);

    // Re-submitting the exact same reading
    const repeatResult = await externalVehicleRepository.updateAuthoritativeOdometer({
      vehicleIdentifier: sample.id,
      newReading: latest.latestOdometer,
      reason: 'test_repeat_write',
    });

    expect(repeatResult.success).toBe(true);
    expect(repeatResult.newOdometer).toBe(latest.latestOdometer);
  });
});
