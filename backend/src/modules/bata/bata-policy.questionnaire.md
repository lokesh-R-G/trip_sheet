
# Driver Bata Policy Questionnaire (BE-22)

> **Status:** Deferred / Awaiting Business Decision  
> **Compliance Note:** In accordance with BE-22 specifications, no default rates or arbitrary formulas have been implemented in production code until business confirmation is formally recorded.

---

## Required Business Policy Decisions

| # | Question / Policy Area | Business Considerations | Current System Readiness |
|---|------------------------|-------------------------|--------------------------|
| **1** | **Daily vs. Trip-based Eligibility** | Is Bata earned on a calendar day basis (00:00 to 23:59), per completed trip, or per 24-hour block from departure? | Trip `startDate` and `endDate` timestamps available |
| **2** | **Night-Halt Allowance Rules** | What qualifies as a night-halt? (e.g. vehicle stationary outside home location between 23:00 and 05:00). Is GPS or odometer proof mandatory? | Route segment `departureTime` / `arrivalTime` available |
| **3** | **Standard Rates & Effective Dates** | What are the approved fixed rates by vehicle tonnage category (e.g., LCV vs MCV vs HCV)? Are there outstation vs local multipliers? | Vehicle `vehicleType` and `tonnage` available |
| **4** | **Partial-Day Pro-Rata Rules** | If a trip starts at 17:00 or ends at 09:00, is it paid as 0.5x Bata, 1.0x Bata, or pro-rata hours? | Segment start/end timestamps available |
| **5** | **Trips Spanning Midnight** | Does a trip from 21:00 on Day 1 to 03:00 on Day 2 count as 1 Bata day or 2 separate days? | Date calculations supported via UTC/local timezone |
| **6** | **Duplicate Daily Claims Prevention** | If a driver operates two separate short trips within the same calendar day, is Bata capped at 1 day maximum? | Unique constraints on `(driverId, date)` ready |
| **7** | **Exceptions & Special Approvals** | Can fleet managers authorize exceptional Bata (e.g. port loading delays > 12 hours)? Who approves? | `AuditLog` infrastructure ready for override tracking |
| **8** | **Cancelled / Incomplete Trips** | If a trip is aborted due to vehicle breakdown or customer cancellation, is partial Bata disbursed? | Trip status lifecycle (`cancelled`) available |
| **9** | **Payroll Component Mapping** | How does Bata map into monthly payroll? (Operational allowance, taxable earnings, or expense settlement)? | `PayrollLineItem` model ready with `trip_bata` category |

---

*Once management confirms these policy decisions, the `BataCalculationEngine` will be implemented with exact approved matrices.*
