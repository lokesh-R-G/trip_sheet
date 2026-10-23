import { driverRepository, DriverRepository, DriverFilters } from './driver.repository.js';
import { auditRepository, AuditRepository } from '../audit/audit.repository.js';
import { AuditEventBuilder } from '../audit/audit-event.builder.js';
import { runInTransaction, prisma } from '../../shared/database/prisma.js';
import {
  CreateDriverDTO,
  UpdateDriverDTO,
  ChangeDriverStatusDTO,
  DriverResponseDTO,
} from './dto/driver.dto.js';
import {
  ConflictError,
  NotFoundError,
  DomainValidationError,
} from '../../shared/errors/index.js';
import { Driver } from '@prisma/client';

export class DriverService {
  constructor(
    private readonly repo: DriverRepository = driverRepository,
    private readonly auditRepo: AuditRepository = auditRepository
  ) {}

  public async createDriver(data: CreateDriverDTO, actor = 'system', ipAddress?: string): Promise<DriverResponseDTO> {
    // 1. Uniqueness checks
    const [existingNumber, existingLicense] = await Promise.all([
      this.repo.findByDriverNumber(data.driverNumber),
      this.repo.findByLicenseNumber(data.licenseNumber),
    ]);

    if (existingNumber) {
      throw new ConflictError(`Driver number "${data.driverNumber}" already exists.`, [
        { field: 'driverNumber', message: 'Driver number must be unique' },
      ]);
    }

    if (existingLicense) {
      throw new ConflictError(`License number "${data.licenseNumber}" is already registered.`, [
        { field: 'licenseNumber', message: 'License number must be unique' },
      ]);
    }

    // 2. Business validation: License expiry must not be in the past
    const expiryDate = new Date(data.licenseExpiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiryDate < today) {
      throw new DomainValidationError(`Driver license is expired (${data.licenseExpiry}).`, [
        { field: 'licenseExpiry', message: 'License expiry date must be in the future for new drivers' },
      ]);
    }

    // 3. Optional vehicle reference check
    if (data.currentVehicleId) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: data.currentVehicleId } });
      if (!vehicle) {
        throw new DomainValidationError(`Referenced vehicle ID "${data.currentVehicleId}" not found.`, [
          { field: 'currentVehicleId', message: 'Vehicle does not exist' },
        ]);
      }
    }

    // 4. Transactional persistence: Driver creation + Audit Log
    const driver = await runInTransaction(async (tx) => {
      const created = await this.repo.create(data, tx);

      const auditEvent = new AuditEventBuilder()
        .setEntity('Driver', created.id, created.fullName)
        .setAction('DRIVER_CREATED')
        .setNewValue({
          driverNumber: created.driverNumber,
          fullName: created.fullName,
          status: created.status,
          licenseNumber: created.licenseNumber,
          licenseExpiry: created.licenseExpiry,
        })
        .setActor(actor, ipAddress)
        .build();

      await this.auditRepo.create(auditEvent, tx);
      return created;
    });

    return this.mapToResponse(driver);
  }

  public async getDriverById(id: string): Promise<DriverResponseDTO> {
    const driver = await this.repo.findById(id);
    if (!driver) {
      throw new NotFoundError('Driver', id);
    }
    return this.mapToResponse(driver, driver.currentVehicle?.registrationNumber);
  }

  public async listDrivers(filters: DriverFilters): Promise<{ drivers: DriverResponseDTO[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const { drivers, total } = await this.repo.findMany({ ...filters, page, limit });

    return {
      drivers: drivers.map((d) => this.mapToResponse(d, d.currentVehicle?.registrationNumber)),
      total,
      page,
      limit,
    };
  }

  public async updateDriver(id: string, updates: UpdateDriverDTO, actor = 'system', ipAddress?: string): Promise<DriverResponseDTO> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Driver', id);
    }

    if (updates.licenseExpiry) {
      const expiryDate = new Date(updates.licenseExpiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today && existing.status === 'active') {
        throw new DomainValidationError('Cannot set expired license date on an active driver.', [
          { field: 'licenseExpiry', message: 'License expiry date cannot be in the past for active drivers' },
        ]);
      }
    }

    if (updates.currentVehicleId) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: updates.currentVehicleId } });
      if (!vehicle) {
        throw new DomainValidationError(`Referenced vehicle ID "${updates.currentVehicleId}" not found.`, [
          { field: 'currentVehicleId', message: 'Vehicle does not exist' },
        ]);
      }
    }

    const updated = await runInTransaction(async (tx) => {
      const result = await this.repo.update(id, updates, tx);

      const auditEvent = new AuditEventBuilder()
        .setEntity('Driver', result.id, result.fullName)
        .setAction('DRIVER_UPDATED')
        .setPreviousValue({
          fullName: existing.fullName,
          phone: existing.phone,
          email: existing.email,
          address: existing.address,
          currentVehicleId: existing.currentVehicleId,
        })
        .setNewValue(updates)
        .setActor(actor, ipAddress)
        .build();

      await this.auditRepo.create(auditEvent, tx);
      return result;
    });

    return this.mapToResponse(updated);
  }

  public async changeDriverStatus(id: string, data: ChangeDriverStatusDTO, actor = 'system', ipAddress?: string): Promise<DriverResponseDTO> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Driver', id);
    }

    if (existing.status === data.status) {
      return this.mapToResponse(existing);
    }

    // Domain rule: If driver has active in_progress trips, they cannot be suspended, resigned, or terminated
    if (['suspended', 'resigned', 'terminated'].includes(data.status)) {
      const activeTripsCount = await this.repo.countActiveTrips(id);
      if (activeTripsCount > 0) {
        throw new DomainValidationError(
          `Cannot change driver status to "${data.status}" because driver has ${activeTripsCount} active or in-progress trip(s).`,
          [{ field: 'status', message: 'Driver has active trips that must be completed or cancelled first' }]
        );
      }
    }

    const updated = await runInTransaction(async (tx) => {
      const result = await this.repo.update(id, { status: data.status }, tx);

      const auditEvent = new AuditEventBuilder()
        .setEntity('Driver', result.id, result.fullName)
        .setAction('DRIVER_STATUS_CHANGED')
        .setPreviousValue({ status: existing.status })
        .setNewValue({ status: data.status })
        .setReason(data.reason)
        .setActor(actor, ipAddress)
        .build();

      await this.auditRepo.create(auditEvent, tx);
      return result;
    });

    return this.mapToResponse(updated);
  }

  private mapToResponse(driver: Driver, currentVehicleReg?: string | null): DriverResponseDTO {
    return {
      id: driver.id,
      driverNumber: driver.driverNumber,
      fullName: driver.fullName,
      phone: driver.phone,
      email: driver.email,
      address: driver.address,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry.toISOString().split('T')[0],
      joiningDate: driver.joiningDate.toISOString().split('T')[0],
      status: driver.status,
      currentVehicleId: driver.currentVehicleId,
      currentVehicleReg: currentVehicleReg ?? null,
      notes: driver.notes,
      createdAt: driver.createdAt.toISOString(),
      updatedAt: driver.updatedAt.toISOString(),
    };
  }
}

export const driverService = new DriverService();
