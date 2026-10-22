# Security, Authorization, and Audit Design

## 1. Authentication Strategy

* **Token Architecture**: Stateless JSON Web Tokens (JWT) signed with `RS256` or `HS256`.
* **Access Tokens**: Short-lived (15 minutes expiration).
* **Refresh Tokens**: Long-lived (7 days), stored in HTTP-only, `Secure`, `SameSite=Strict` cookies and hashed in the database (`refresh_tokens` table) to support instantaneous session revocation.
* **Password Security**: Passwords hashed using `bcryptjs` with a work factor of 12.

---

## 2. Role-Based Access Control (RBAC) Matrix

To enforce separation of duties across logistics, accounting, and internal audit:

| Role Name | Description | Key Permissions |
| :--- | :--- | :--- |
| **Super Admin** | Full system control and configuration | `*` (All permissions) |
| **Fleet Operations Manager** | Creates trips, manages drivers, assigns vehicles | `trips:create`, `trips:update`, `drivers:manage`, `odometer:override` |
| **Trip Dispatcher / Yard Supervisor** | Logs daily trip sheets, bunkering top-ups, odometer | `trips:create`, `fuel:create`, `odometer:read` |
| **Fleet Cashier / Accountant** | Issues advances, records cash returns, submits expenses | `advances:issue`, `advances:return`, `expenses:submit` |
| **Expense Reviewer / Auditor** | Audits and approves trip expenses | `expenses:approve`, `expenses:reject` |
| **Fuel Auditor** | Audits fuel consumption, approves/adjusts fuel deductions | `fuel_deductions:review`, `fuel_deductions:adjust` |
| **Payroll Manager** | Generates monthly draft payroll, reviews line items | `payroll:generate`, `payroll:review` |
| **Chief Financial Officer (CFO)** | Finalizes and permanently seals payroll runs | `payroll:finalize`, `advances:authorize_recovery` |
| **Read-Only Auditor** | Inspects immutable audit logs and historical reports | `audit:read`, `reports:read`, `payslips:read` |

---

## 3. High-Security Sensitive Operations

The following financial operations require explicit authorization checks and cannot be performed anonymously:

1. **Adjusting Fuel Deduction Amounts**:
   * *Requirement*: Operator must have `fuel_deductions:adjust` permission.
   * *Constraint*: Request must include a mandatory text `reason` (minimum 10 characters).
   * *Audit*: Emits `FUEL_DEDUCTION_ADJUSTED` recording previous amount, new amount, and reason.
2. **Authorizing Advance Recovery Through Payroll**:
   * *Requirement*: Operator must have `advances:authorize_recovery` permission.
   * *Constraint*: Recovery amount cannot exceed the trip's outstanding settlement balance.
3. **Finalizing Monthly Payroll**:
   * *Requirement*: Operator must have `payroll:finalize` permission (CFO / Superadmin).
   * *Constraint*: Cannot finalize a run that is already finalized; seals all records and marks fuel deductions as posted.
4. **Overriding Odometer Sequence Discrepancies**:
   * *Requirement*: Fleet Operations Manager or Superadmin.
   * *Constraint*: Discrepancy clearance requires recorded justification.

---

## 4. Immutable Audit Trail Design

The system implements an append-only audit trail modeled after `src/features/audit/AuditLogView.tsx`:

* **Storage**: PostgreSQL `audit_logs` table.
* **Immutability Guarantee**:
  * PostgreSQL `REVOKE UPDATE, DELETE ON audit_logs FROM app_user;`
  * No API endpoint exists to update or delete audit logs.
* **Captured Audit Fields**:
  ```typescript
  interface AuditEntry {
    id: string;
    entityType: 'Trip' | 'Driver' | 'Advance' | 'Expense' | 'FuelDeduction' | 'SalaryStructure' | 'Payroll' | 'Odometer';
    entityId: string;
    entityLabel: string;
    action: string;
    previousValue?: Record<string, any>;
    newValue?: Record<string, any>;
    reason?: string;
    changedBy: string;
    ipAddress?: string;
    timestamp: string;
  }
  ```
* **Automatic Triggers**: All mutating service actions call `auditService.log(...)` inside the same database transaction.
