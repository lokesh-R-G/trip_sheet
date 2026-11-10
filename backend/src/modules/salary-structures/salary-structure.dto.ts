import { z } from 'zod';
import { zUuid, zPositiveDecimalString, zDateOnlyString } from '../../shared/validation/custom-types.js';

export const SalaryComponentCategoryEnum = z.enum([
  'basic',
  'allowance',
  'bata',
  'statutory_deduction',
  'other',
]);

export const SalaryComponentTypeEnum = z.enum(['earning', 'deduction']);
export const CalculationTypeEnum = z.enum(['fixed', 'percentage']);

export const CreateSalaryComponentSchema = z.object({
  name: z.string().min(1).max(100),
  category: SalaryComponentCategoryEnum.default('allowance'),
  type: SalaryComponentTypeEnum,
  calculationType: CalculationTypeEnum,
  amountOrPercentage: zPositiveDecimalString,
  applicabilityRules: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const CreateSalaryStructureSchema = z.object({
  name: z.string().min(1).max(150),
  code: z.string().min(1).max(50),
  description: z.string().optional().nullable(),
  effectiveDate: zDateOnlyString,
  isActive: z.boolean().default(true),
  components: z.array(CreateSalaryComponentSchema).default([]),
});

export const AssignSalaryStructureSchema = z.object({
  driverId: zUuid,
  salaryStructureId: zUuid,
  effectiveFrom: zDateOnlyString,
  effectiveTo: zDateOnlyString.optional().nullable(),
});

