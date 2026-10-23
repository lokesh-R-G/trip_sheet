export interface BataPolicyStatus {
  status: 'deferred' | 'policy_pending';
  componentId: 'BE-22';
  message: string;
  reason: string;
  policyQuestionnaire: string;
  missingPolicyDecisions: string[];
  inspectedComponents: string[];
  inspectedAttributes: {
    tripStartDate: boolean;
    tripEndDate: boolean;
    routeSegmentTimestamps: boolean;
    driverDesignation: boolean;
    vehicleTonnage: boolean;
  };
}

export class BataPolicyService {
  /**
   * Evaluates the current state of Bata business policy.
   * As required by BE-22, production calculation formula or default rate
   * must NOT be implemented until confirmed by the business.
   */
  getPolicyStatus(): BataPolicyStatus {
    return {
      status: 'deferred',
      componentId: 'BE-22',
      message: 'Bata calculation is deferred pending formal business confirmation of eligibility rules and rates.',
      reason: 'Bata rates and calculation formulas are pending stakeholder policy confirmation.',
      policyQuestionnaire: 'backend/src/modules/bata/bata-policy.questionnaire.md',
      inspectedComponents: [
        'Trip departure and arrival timestamps',
        'Route segment stopovers',
        'Driver master profile',
        'Vehicle tonnage',
      ],
      missingPolicyDecisions: [
        '1. Daily vs. Trip-based eligibility: Is Bata earned per calendar day, per 24-hour block, or per designated trip leg?',
        '2. Night-halt rules: What constitutes a night-halt (e.g. stopover between 23:00 and 05:00 outside home depot)? What is the required proof of night halt?',
        '3. Standard rates and effective dates: What are the base daily rates, local vs. outstation rates, and seasonal/effective date schedules?',
        '4. Partial-day rules: If a trip starts at 18:00 or finishes at 08:00, is it full Bata, half Bata, or hourly pro-rata?',
        '5. Trips spanning midnight: How are shifts that begin at 20:00 on Day 1 and end at 04:00 on Day 2 counted?',
        '6. Duplicate daily claims prevention: If a driver executes two short trips on the same calendar day, is Bata capped at 1 day maximum?',
        '7. Exceptions and approvals: Under what conditions can a supervisor grant exceptional or extra Bata?',
        '8. Treatment of cancelled or incomplete trips: Is Bata payable if a trip is aborted due to vehicle breakdown or customer cancellation?',
        '9. Payroll component mapping: Is Bata settled as non-taxable operational allowance, taxable wages, or reimbursable expense?',
      ],
      inspectedAttributes: {
        tripStartDate: true,
        tripEndDate: true,
        routeSegmentTimestamps: true,
        driverDesignation: true,
        vehicleTonnage: true,
      },
    };
  }
}

export const bataPolicyService = new BataPolicyService();
