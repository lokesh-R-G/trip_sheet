import { prisma } from '../../../shared/database/prisma.js';
import { FuelValuationPolicy, Prisma } from '@prisma/client';
import { dec } from '../../../shared/decimal/index.js';
import { NotFoundError } from '../../../shared/errors/index.js';

export interface CreateFuelValuationPolicyInput {
  name: string;
  fuelType?: string;
  pricePerLitre: number | string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status?: string;
  approvedBy?: string;
  notes?: string;
}

export class FuelValuationService {
  async createPolicy(input: CreateFuelValuationPolicyInput): Promise<FuelValuationPolicy> {
    const priceDec = dec(input.pricePerLitre);
    return prisma.fuelValuationPolicy.create({
      data: {
        name: input.name,
        fuelType: input.fuelType || 'diesel',
        pricePerLitre: priceDec.toPrismaDecimal(),
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        status: input.status || 'active',
        approvedBy: input.approvedBy || null,
        notes: input.notes || null,
      },
    });
  }

  async resolvePolicy(fuelType = 'diesel', date: Date | string = new Date()): Promise<FuelValuationPolicy | null> {
    const targetDate = new Date(date);

    const policies = await prisma.fuelValuationPolicy.findMany({
      where: {
        fuelType,
        status: 'active',
        effectiveFrom: { lte: targetDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: targetDate } },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
      take: 1,
    });

    return policies[0] || null;
  }

  async listPolicies(): Promise<FuelValuationPolicy[]> {
    return prisma.fuelValuationPolicy.findMany({
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}

export const fuelValuationService = new FuelValuationService();
