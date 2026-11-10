import { prisma, handlePrismaError, runInTransaction } from '../../shared/database/prisma.js';
import { dec } from '../../shared/decimal/index.js';

export class SalaryStructureService {
  public async listStructures() {
    try {
      return await prisma.salaryStructure.findMany({
        include: {
          components: true,
          assignments: {
            include: {
              driver: {
                select: { id: true, driverNumber: true, fullName: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      return handlePrismaError(err, 'SalaryStructure');
    }
  }

  public async getStructureById(id: string) {
    try {
      return await prisma.salaryStructure.findUnique({
        where: { id },
        include: {
          components: true,
          assignments: {
            include: {
              driver: {
                select: { id: true, driverNumber: true, fullName: true },
              },
            },
          },
        },
      });
    } catch (err) {
      return handlePrismaError(err, 'SalaryStructure');
    }
  }

  public async createStructure(data: any) {
    try {
      return await runInTransaction(async (tx) => {
        const structure = await tx.salaryStructure.create({
          data: {
            name: data.name,
            code: data.code,
            description: data.description || null,
            effectiveDate: new Date(data.effectiveDate),
            isActive: data.isActive !== undefined ? data.isActive : true,
            components: {
              create: (data.components || []).map((c: any) => ({
                name: c.name,
                category: c.category || 'allowance',
                type: c.type,
                calculationType: c.calculationType,
                amountOrPercentage: dec(c.amountOrPercentage).toFixed(2),
                applicabilityRules: c.applicabilityRules || null,
                isActive: c.isActive !== undefined ? c.isActive : true,
              })),
            },
          },
          include: {
            components: true,
          },
        });
        return structure;
      });
    } catch (err) {
      return handlePrismaError(err, 'SalaryStructure');
    }
  }

  public async assignToDriver(data: any) {
    try {
      return await prisma.driverSalaryAssignment.create({
        data: {
          driverId: data.driverId,
          salaryStructureId: data.salaryStructureId,
          effectiveFrom: new Date(data.effectiveFrom),
          effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
          status: 'active',
        },
        include: {
          driver: { select: { id: true, driverNumber: true, fullName: true } },
          salaryStructure: { select: { id: true, name: true, code: true } },
        },
      });
    } catch (err) {
      return handlePrismaError(err, 'DriverSalaryAssignment');
    }
  }
}

export const salaryStructureService = new SalaryStructureService();

