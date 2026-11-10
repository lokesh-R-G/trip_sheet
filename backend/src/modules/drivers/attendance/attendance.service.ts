import { attendanceRepository, AttendanceRepository, AttendanceFilters, AttendanceWithDriver } from './attendance.repository.js';
import { auditRepository, AuditRepository } from '../../audit/audit.repository.js';
import { AuditEventBuilder } from '../../audit/audit-event.builder.js';
import { runInTransaction, prisma } from '../../../shared/database/prisma.js';
import {
  MarkAttendanceDTO,
  BulkMarkAttendanceDTO,
  UpdateAttendanceDTO,
  AttendanceResponseDTO,
  MonthlyAttendanceSummaryDTO,
} from './dto/attendance.dto.js';
import {
  ConflictError,
  NotFoundError,
  DomainValidationError,
} from '../../../shared/errors/index.js';

export class AttendanceService {
  constructor(
    private readonly repo: AttendanceRepository = attendanceRepository,
    private readonly auditRepo: AuditRepository = auditRepository
  ) {}

  public async markAttendance(
    data: MarkAttendanceDTO,
    actor = 'system',
    ipAddress?: string
  ): Promise<AttendanceResponseDTO> {
    // 1. Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: data.driverId },
      select: { id: true, fullName: true, driverNumber: true },
    });
    if (!driver) {
      throw new NotFoundError('Driver', data.driverId);
    }

    const attendanceDate = new Date(data.attendanceDate);

    // 2. Duplicate attendance prevention
    const existing = await this.repo.findByDriverAndDate(data.driverId, attendanceDate);
    if (existing) {
      throw new ConflictError(
        `Attendance for driver ${driver.fullName} (${driver.driverNumber}) on ${data.attendanceDate} is already recorded. Use the correction API to update.`,
        [{ field: 'attendanceDate', message: 'Attendance already exists for driver on this date' }]
      );
    }

    // 3. Time validation if both provided
    if (data.checkInTime && data.checkOutTime) {
      if (new Date(data.checkOutTime) < new Date(data.checkInTime)) {
        throw new DomainValidationError('Check-out time cannot be earlier than check-in time.', [
          { field: 'checkOutTime', message: 'Check-out must be after check-in' },
        ]);
      }
    }

    // 4. Persistence with transaction & audit log
    const created = await runInTransaction(async (tx) => {
      const record = await this.repo.create(
        {
          driver: { connect: { id: data.driverId } },
          attendanceDate,
          status: data.status,
          checkInTime: data.checkInTime ? new Date(data.checkInTime) : null,
          checkOutTime: data.checkOutTime ? new Date(data.checkOutTime) : null,
          source: data.source || 'MANUAL',
          remarks: data.remarks || null,
          markedBy: actor,
          approvedBy: data.approvedBy || null,
        },
        tx
      );

      const auditEvent = new AuditEventBuilder()
        .setEntity('DriverAttendance', record.id, `${driver.fullName} - ${data.attendanceDate}`)
        .setAction('ATTENDANCE_RECORDED')
        .setNewValue({
          driverId: record.driverId,
          attendanceDate: data.attendanceDate,
          status: record.status,
          source: record.source,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          markedBy: record.markedBy,
        })
        .setActor(actor, ipAddress)
        .build();

      await this.auditRepo.create(auditEvent, tx);
      return record;
    });

    return this.mapToResponse(created);
  }

  public async bulkMarkAttendance(
    data: BulkMarkAttendanceDTO,
    actor = 'system',
    ipAddress?: string
  ): Promise<{ recorded: AttendanceResponseDTO[]; skipped: { driverId: string; reason: string }[] }> {
    const attendanceDate = new Date(data.attendanceDate);
    const recorded: AttendanceResponseDTO[] = [];
    const skipped: { driverId: string; reason: string }[] = [];

    // Verify drivers
    const driverIds = data.records.map((r) => r.driverId);
    const existingDrivers = await prisma.driver.findMany({
      where: { id: { in: driverIds } },
      select: { id: true, fullName: true, driverNumber: true },
    });
    const driverMap = new Map(existingDrivers.map((d) => [d.id, d]));

    // Check existing attendance on this date
    const existingAttendances = await prisma.driverAttendance.findMany({
      where: {
        driverId: { in: driverIds },
        attendanceDate,
      },
      select: { driverId: true },
    });
    const existingDriverSet = new Set(existingAttendances.map((a) => a.driverId));

    for (const item of data.records) {
      const driver = driverMap.get(item.driverId);
      if (!driver) {
        skipped.push({ driverId: item.driverId, reason: 'Driver not found' });
        continue;
      }

      if (existingDriverSet.has(item.driverId)) {
        skipped.push({
          driverId: item.driverId,
          reason: `Attendance already recorded on ${data.attendanceDate}`,
        });
        continue;
      }

      try {
        const res = await this.markAttendance(
          {
            driverId: item.driverId,
            attendanceDate: data.attendanceDate,
            status: item.status,
            checkInTime: item.checkInTime,
            checkOutTime: item.checkOutTime,
            source: item.source || 'MANUAL',
            remarks: item.remarks,
            approvedBy: item.approvedBy,
          },
          actor,
          ipAddress
        );
        recorded.push(res);
      } catch (err: any) {
        skipped.push({ driverId: item.driverId, reason: err.message || 'Failed to record' });
      }
    }

    return { recorded, skipped };
  }

  public async getAttendanceById(id: string): Promise<AttendanceResponseDTO> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new NotFoundError('DriverAttendance', id);
    }
    return this.mapToResponse(record);
  }

  public async listAttendance(
    filters: AttendanceFilters
  ): Promise<{ attendances: AttendanceResponseDTO[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const { attendances, total } = await this.repo.findMany({ ...filters, page, limit });

    return {
      attendances: attendances.map((a) => this.mapToResponse(a)),
      total,
      page,
      limit,
    };
  }

  public async updateAttendance(
    id: string,
    data: UpdateAttendanceDTO,
    actor = 'system',
    ipAddress?: string
  ): Promise<AttendanceResponseDTO> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('DriverAttendance', id);
    }

    // Time validation
    const nextCheckIn = data.checkInTime !== undefined ? (data.checkInTime ? new Date(data.checkInTime) : null) : existing.checkInTime;
    const nextCheckOut = data.checkOutTime !== undefined ? (data.checkOutTime ? new Date(data.checkOutTime) : null) : existing.checkOutTime;

    if (nextCheckIn && nextCheckOut && nextCheckOut < nextCheckIn) {
      throw new DomainValidationError('Check-out time cannot be earlier than check-in time.', [
        { field: 'checkOutTime', message: 'Check-out must be after check-in' },
      ]);
    }

    const updated = await runInTransaction(async (tx) => {
      const updatePayload: any = {};
      if (data.status !== undefined) updatePayload.status = data.status;
      if (data.checkInTime !== undefined) updatePayload.checkInTime = data.checkInTime ? new Date(data.checkInTime) : null;
      if (data.checkOutTime !== undefined) updatePayload.checkOutTime = data.checkOutTime ? new Date(data.checkOutTime) : null;
      if (data.remarks !== undefined) updatePayload.remarks = data.remarks;
      if (data.approvedBy !== undefined) updatePayload.approvedBy = data.approvedBy;

      const record = await this.repo.update(id, updatePayload, tx);

      const auditEvent = new AuditEventBuilder()
        .setEntity('DriverAttendance', record.id, `${record.driver.fullName} - ${record.attendanceDate.toISOString().split('T')[0]}`)
        .setAction('ATTENDANCE_CORRECTED')
        .setPreviousValue({
          status: existing.status,
          checkInTime: existing.checkInTime,
          checkOutTime: existing.checkOutTime,
          remarks: existing.remarks,
          approvedBy: existing.approvedBy,
        })
        .setNewValue({
          status: record.status,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          remarks: record.remarks,
          approvedBy: record.approvedBy,
        })
        .setReason(data.reason)
        .setActor(actor, ipAddress)
        .build();

      await this.auditRepo.create(auditEvent, tx);
      return record;
    });

    return this.mapToResponse(updated);
  }

  public async getMonthlySummary(
    month: string,
    driverId?: string
  ): Promise<MonthlyAttendanceSummaryDTO> {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);

    const startDate = new Date(Date.UTC(year, m - 1, 1));
    const endDate = new Date(Date.UTC(year, m, 0)); // last day of month
    const totalDays = endDate.getUTCDate();

    // Query active drivers or specific driver
    const driverWhere: any = {};
    if (driverId) {
      driverWhere.id = driverId;
    }
    const drivers = await prisma.driver.findMany({
      where: driverWhere,
      select: { id: true, driverNumber: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });

    const attendances = await this.repo.findForMonth(startDate, endDate, driverId);

    // Group attendance by driver
    const attendanceByDriver = new Map<string, AttendanceWithDriver[]>();
    for (const att of attendances) {
      const list = attendanceByDriver.get(att.driverId) || [];
      list.push(att);
      attendanceByDriver.set(att.driverId, list);
    }

    const driverSummaries = drivers.map((d) => {
      const records = attendanceByDriver.get(d.id) || [];
      let presentDays = 0;
      let absentDays = 0;
      let halfDays = 0;
      let leaveDays = 0;
      let restDays = 0;

      for (const r of records) {
        switch (r.status) {
          case 'present':
            presentDays++;
            break;
          case 'absent':
            absentDays++;
            break;
          case 'half_day':
            halfDays++;
            break;
          case 'on_leave':
            leaveDays++;
            break;
          case 'rest_day':
            restDays++;
            break;
        }
      }

      const totalMarkedDays = records.length;
      const unrecordedDays = Math.max(0, totalDays - totalMarkedDays);

      return {
        driverId: d.id,
        driverNumber: d.driverNumber,
        driverName: d.fullName,
        presentDays,
        absentDays,
        halfDays,
        leaveDays,
        restDays,
        unrecordedDays,
        totalMarkedDays,
      };
    });

    return {
      month,
      totalDays,
      driverSummaries,
    };
  }

  public async getAuditHistory(attendanceId: string): Promise<any[]> {
    return prisma.auditLog.findMany({
      where: {
        entityType: 'DriverAttendance',
        entityId: attendanceId,
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  private mapToResponse(record: AttendanceWithDriver): AttendanceResponseDTO {
    return {
      id: record.id,
      driverId: record.driverId,
      driverNumber: record.driver.driverNumber,
      driverName: record.driver.fullName,
      attendanceDate: record.attendanceDate.toISOString().split('T')[0],
      status: record.status as any,
      checkInTime: record.checkInTime ? record.checkInTime.toISOString() : null,
      checkOutTime: record.checkOutTime ? record.checkOutTime.toISOString() : null,
      source: record.source as any,
      remarks: record.remarks,
      markedBy: record.markedBy,
      approvedBy: record.approvedBy,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}

export const attendanceService = new AttendanceService();

