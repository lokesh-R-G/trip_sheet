import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DriverService } from './driver.service.js';
import { ConflictError, DomainValidationError, NotFoundError } from '../../shared/errors/index.js';

describe('BE-03: Driver Management', () => {
  let mockDriverRepo: any;
  let mockAuditRepo: any;
  let service: DriverService;

  beforeEach(() => {
    mockDriverRepo = {
      findByDriverNumber: vi.fn(),
      findByLicenseNumber: vi.fn(),
      findById: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      countActiveTrips: vi.fn(),
    };
    mockAuditRepo = {
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    };
    service = new DriverService(mockDriverRepo, mockAuditRepo);
  });

  it('rejects duplicate driver number', async () => {
    mockDriverRepo.findByDriverNumber.mockResolvedValue({ id: 'existing-id', driverNumber: 'DRV-001' });

    const payload: any = {
      driverNumber: 'DRV-001',
      fullName: 'Ravi Kumar',
      phone: '9876543210',
      address: 'Chennai',
      licenseNumber: 'TN-01-2020-001',
      licenseExpiry: '2030-12-31',
      joiningDate: '2026-01-01',
      status: 'active',
    };

    await expect(service.createDriver(payload)).rejects.toThrow(ConflictError);
  });

  it('rejects duplicate license number', async () => {
    mockDriverRepo.findByDriverNumber.mockResolvedValue(null);
    mockDriverRepo.findByLicenseNumber.mockResolvedValue({ id: 'existing-id', licenseNumber: 'TN-01-2020-001' });

    const payload: any = {
      driverNumber: 'DRV-002',
      fullName: 'Suresh Kumar',
      phone: '9876543211',
      address: 'Madurai',
      licenseNumber: 'TN-01-2020-001',
      licenseExpiry: '2030-12-31',
      joiningDate: '2026-01-01',
      status: 'active',
    };

    await expect(service.createDriver(payload)).rejects.toThrow(ConflictError);
  });

  it('rejects creation with already expired license', async () => {
    mockDriverRepo.findByDriverNumber.mockResolvedValue(null);
    mockDriverRepo.findByLicenseNumber.mockResolvedValue(null);

    const payload: any = {
      driverNumber: 'DRV-003',
      fullName: 'Karthik',
      phone: '9876543212',
      address: 'Salem',
      licenseNumber: 'TN-01-2020-003',
      licenseExpiry: '2020-01-01', // expired
      joiningDate: '2026-01-01',
      status: 'active',
    };

    await expect(service.createDriver(payload)).rejects.toThrow(DomainValidationError);
  });

  it('prevents suspending driver if they have active trips in progress', async () => {
    mockDriverRepo.findById.mockResolvedValue({
      id: 'drv-1',
      fullName: 'Ravi',
      status: 'active',
      licenseExpiry: new Date('2030-01-01'),
      joiningDate: new Date('2026-01-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockDriverRepo.countActiveTrips.mockResolvedValue(2); // 2 active trips

    await expect(
      service.changeDriverStatus('drv-1', { status: 'suspended', reason: 'Disciplinary review' })
    ).rejects.toThrow(DomainValidationError);
  });

  it('throws NotFoundError for non-existent driver lookup', async () => {
    mockDriverRepo.findById.mockResolvedValue(null);
    await expect(service.getDriverById('non-existent-id')).rejects.toThrow(NotFoundError);
  });
});
