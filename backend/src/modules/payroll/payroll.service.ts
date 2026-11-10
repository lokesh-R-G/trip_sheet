import { prisma, handlePrismaError, runInTransaction } from '../../shared/database/prisma.js';
import { dec } from '../../shared/decimal/index.js';

export class PayrollService {
  public async listRuns() {
    try {
      return await prisma.payrollRun.findMany({
        include: {
          records: {
            include: {
              driver: { select: { id: true, driverNumber: true, fullName: true } },
              lineItems: true,
            },
          },
        },
        orderBy: { month: 'desc' },
      });
    } catch (err) {
      return handlePrismaError(err, 'PayrollRun');
    }
  }

  public async getRunByMonth(month: string) {
    try {
      return await prisma.payrollRun.findUnique({
        where: { month },
        include: {
          records: {
            include: {
              driver: { select: { id: true, driverNumber: true, fullName: true } },
              lineItems: true,
            },
          },
        },
      });
    } catch (err) {
      return handlePrismaError(err, 'PayrollRun');
    }
  }

  public async generateRunForMonth(month: string, actor = 'payroll-officer') {
    return await runInTransaction(async (tx) => {
      // Find all active drivers with active salary assignment
      const drivers = await tx.driver.findMany({
        where: { status: 'active' },
        include: {
          salaryAssignments: {
            where: { status: 'active' },
            include: {
              salaryStructure: {
                include: { components: true },
              },
            },
            take: 1,
            orderBy: { effectiveFrom: 'desc' },
          },
        },
      });

      let totalGross = dec(0);
      let totalDeductions = dec(0);
      let totalNet = dec(0);
      let totalFuelDed = dec(0);
      let totalAdvRec = dec(0);

      const recordsData: any[] = [];

      for (const d of drivers) {
        const assignment = d.salaryAssignments[0];
        const structName = assignment?.salaryStructure?.name || 'Default Commercial Driver Grade';

        let basic = dec(18000);
        let hra = dec(4000);
        let otherAllowances = dec(2500);

        if (assignment?.salaryStructure?.components) {
          for (const c of assignment.salaryStructure.components) {
            if (c.name.toLowerCase().includes('basic')) basic = dec(c.amountOrPercentage);
            else if (c.name.toLowerCase().includes('hra')) hra = dec(c.amountOrPercentage);
            else if (c.type === 'earning') otherAllowances = otherAllowances.plus(dec(c.amountOrPercentage));
          }
        }

        const tripBata = dec(0); // Bata pending approved rules
        const gross = basic.plus(hra).plus(otherAllowances).plus(tripBata);
        const fuelDeductions = dec(0);
        const advanceRecoveries = dec(0);
        const otherDeductions = dec(200); // statutory default
        const deductions = fuelDeductions.plus(advanceRecoveries).plus(otherDeductions);
        const net = gross.minus(deductions);

        totalGross = totalGross.plus(gross);
        totalDeductions = totalDeductions.plus(deductions);
        totalNet = totalNet.plus(net);
        totalFuelDed = totalFuelDed.plus(fuelDeductions);
        totalAdvRec = totalAdvRec.plus(advanceRecoveries);

        recordsData.push({
          driverId: d.id,
          salaryStructureName: structName,
          basicSalary: basic.toFixed(2),
          hra: hra.toFixed(2),
          otherAllowances: otherAllowances.toFixed(2),
          tripBata: tripBata.toFixed(2),
          grossEarnings: gross.toFixed(2),
          fuelDeductions: fuelDeductions.toFixed(2),
          advanceRecoveries: advanceRecoveries.toFixed(2),
          otherDeductions: otherDeductions.toFixed(2),
          totalDeductions: deductions.toFixed(2),
          netPayable: net.toFixed(2),
          approvalStatus: 'pending',
          paymentStatus: 'unpaid',
          warnings: [],
        });
      }

      // Upsert payroll run
      const existing = await tx.payrollRun.findUnique({ where: { month } });
      if (existing) {
        await tx.payrollLineItem.deleteMany({
          where: { payrollRecord: { payrollRunId: existing.id } },
        });
        await tx.payrollRecord.deleteMany({
          where: { payrollRunId: existing.id },
        });
        await tx.payrollRun.delete({ where: { id: existing.id } });
      }

      const run = await tx.payrollRun.create({
        data: {
          month,
          generatedDate: new Date(),
          status: 'draft',
          totalEligibleDrivers: drivers.length,
          totalGrossEarnings: totalGross.toFixed(2),
          totalDeductions: totalDeductions.toFixed(2),
          totalNetPayable: totalNet.toFixed(2),
          totalFuelDeductions: totalFuelDed.toFixed(2),
          totalAdvanceRecoveries: totalAdvRec.toFixed(2),
          records: {
            create: recordsData,
          },
        },
        include: {
          records: {
            include: {
              driver: { select: { id: true, driverNumber: true, fullName: true } },
            },
          },
        },
      });

      return run;
    });
  }

  public async finalizeRun(id: string, actor = 'payroll-officer') {
    return await prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'finalized',
        finalizedAt: new Date(),
        finalizedBy: actor,
      },
    });
  }
}

export const payrollService = new PayrollService();

