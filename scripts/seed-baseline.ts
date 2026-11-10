import { prisma } from '../backend/src/shared/database/prisma.js';

async function seed() {
  console.log('Seeding initial baseline data if tables are empty...');

  // 1. Check salary structure
  const structCount = await prisma.salaryStructure.count();
  if (structCount === 0) {
    console.log('Creating standard commercial driver salary structure...');
    await prisma.salaryStructure.create({
      data: {
        name: 'Standard Commercial Heavy Vehicle Grade A',
        code: 'SCHV-GRA',
        description: 'Standard salary structure for heavy commercial transport pilots',
        effectiveDate: new Date('2024-01-01'),
        isActive: true,
        components: {
          create: [
            {
              name: 'Basic Pay',
              category: 'basic',
              type: 'earning',
              calculationType: 'fixed',
              amountOrPercentage: 18000,
              applicabilityRules: 'Monthly baseline earnings',
            },
            {
              name: 'House Rent Allowance (HRA)',
              category: 'allowance',
              type: 'earning',
              calculationType: 'fixed',
              amountOrPercentage: 4000,
              applicabilityRules: 'Fixed monthly housing allowance',
            },
            {
              name: 'Conveyance & Medical Allowance',
              category: 'allowance',
              type: 'earning',
              calculationType: 'fixed',
              amountOrPercentage: 3000,
              applicabilityRules: 'Standard transit welfare',
            },
            {
              name: 'Statutory Provident Fund / Insurance',
              category: 'statutory_deduction',
              type: 'deduction',
              calculationType: 'fixed',
              amountOrPercentage: 1200,
              applicabilityRules: 'Mandatory standard statutory deduction',
            },
          ],
        },
      },
    });
  }

  // 2. Check benchmarks
  const bmCount = await prisma.mileageBenchmark.count();
  if (bmCount === 0) {
    console.log('Creating standard mileage benchmarks...');
    await prisma.mileageBenchmark.createMany({
      data: [
        {
          name: 'Heavy 10-Wheeler Multi-Axle Plain Highway Benchmark',
          vehicleType: 'Heavy Truck',
          minTonnage: 16.0,
          maxTonnage: 28.0,
          terrain: 'plain',
          routeCategory: 'highway',
          expectedMileageKmPerLitre: 4.8,
          permittedTolerancePercent: 5.0,
          effectiveFrom: new Date('2024-01-01'),
          status: 'active',
          priority: 10,
        },
        {
          name: 'Heavy 12-Wheeler / 16-Wheeler Hauler Benchmark',
          vehicleType: 'Heavy Truck',
          minTonnage: 28.0,
          maxTonnage: 49.0,
          terrain: 'plain',
          routeCategory: 'highway',
          expectedMileageKmPerLitre: 3.6,
          permittedTolerancePercent: 6.0,
          effectiveFrom: new Date('2024-01-01'),
          status: 'active',
          priority: 10,
        },
        {
          name: 'Medium Commercial Vehicle (MCV) Regional Benchmark',
          vehicleType: 'Medium Commercial',
          minTonnage: 7.5,
          maxTonnage: 16.0,
          terrain: 'mixed',
          routeCategory: 'mixed',
          expectedMileageKmPerLitre: 6.2,
          permittedTolerancePercent: 4.0,
          effectiveFrom: new Date('2024-01-01'),
          status: 'active',
          priority: 5,
        },
      ],
    });
  }

  // 3. Check valuation policy
  const policyCount = await prisma.fuelValuationPolicy.count();
  if (policyCount === 0) {
    console.log('Creating baseline fuel valuation policy...');
    await prisma.fuelValuationPolicy.create({
      data: {
        name: 'National Diesel Average Standard Valuation',
        fuelType: 'diesel',
        pricePerLitre: 94.5,
        effectiveFrom: new Date('2024-01-01'),
        status: 'active',
        approvedBy: 'Fleet Commercial Controller',
        notes: 'Statutory fleet diesel standard recovery valuation benchmark',
      },
    });
  }

  console.log('Baseline seeding verified.');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

