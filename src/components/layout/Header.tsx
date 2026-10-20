import React, { useState } from 'react';
import {
  Bell,
  Search,
  Calendar,
  AlertTriangle,
  Receipt,
  Scale,
  Percent,
  Network,
  RotateCcw,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { PageId } from './Sidebar';
import { useFleetStore } from '../../services/store';

interface HeaderProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  isSidebarCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  isSidebarCollapsed
}) => {
  const { trips, advances, integrationJobs, payrollRuns, resetAllData } = useFleetStore();
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Collect actionable alerts
  const openDiscrepancies = trips.filter(t => t.odometer.discrepancyFlag);
  const pendingExpenses = trips.reduce(
    (acc, t) => acc + t.expenses.filter(e => e.approvalStatus === 'pending').length,
    0
  );
  const pendingFuelDeductions = trips.filter(
    t => t.fuelDeduction.reviewStatus === 'pending_review' && t.fuelDeduction.potentialDeductionAmount > 0
  );
  const pendingSettlements = trips.filter(
    t => t.settlement.outstandingBalance > 0 && t.settlement.status !== 'fully_settled'
  );
  const failedIntegrationJobs = integrationJobs.filter(j => j.status === 'failed');
  const draftPayroll = payrollRuns.find(p => p.status === 'draft');

  const totalAlertsCount =
    openDiscrepancies.length +
    (pendingExpenses > 0 ? 1 : 0) +
    pendingFuelDeductions.length +
    failedIntegrationJobs.length +
    (draftPayroll ? 1 : 0);

  const getPageTitle = (id: PageId): { title: string; subtitle: string } => {
    switch (id) {
      case 'dashboard':
        return { title: 'Fleet Operational Dashboard', subtitle: 'Real-time overview of fleet mileage, trips, fuel metrics, advances and driver payroll' };
      case 'drivers':
        return { title: 'Driver Management', subtitle: 'Maintain driver profiles, driving licenses, vehicle assignments and financial ledger balances' };
      case 'salary-structures':
        return { title: 'Driver Salary Structures', subtitle: 'Define reusable salary packages, basic pay, allowances, and Bata trip rules' };
      case 'advances':
        return { title: 'Driver Advance Management', subtitle: 'Track and issue independent driver advances, operational disbursements, and repayments' };
      case 'vehicles':
        return { title: 'Vehicles (TLCM Pro Master)', subtitle: 'Authoritative vehicle records, telemetry status, and active tyre configurations' };
      case 'fuel-topups':
        return { title: 'Vehicle Fuel Top-Ups', subtitle: 'Bunkering station fuel purchases, litre logs, and fuel expenditure tracking' };
      case 'trips':
        return { title: 'Trip Sheet Management', subtitle: 'Create, monitor, and complete trip sheets with strict odometer, fuel, and expense reconciliation' };
      case 'expenses':
        return { title: 'Trip Expense Approvals', subtitle: 'Review and approve multi-category operational expenses submitted across trip sheets' };
      case 'settlements':
        return { title: 'Advance Settlements', subtitle: 'Reconcile issued advances against approved expenses, returned balances, and payroll recoveries' };
      case 'fuel-deductions':
        return { title: 'Fuel Deduction Management', subtitle: 'Audit and approve fuel deductions against configurable mileage benchmarks and tolerance' };
      case 'benchmarks':
        return { title: 'Mileage Benchmarks', subtitle: 'Manage vehicle and tonnage mileage benchmarks with deterministic matching priority' };
      case 'payroll-dashboard':
        return { title: 'Payroll Dashboard', subtitle: 'Monthly payroll run performance, gross earnings, fuel deductions, and advance recoveries' };
      case 'monthly-payroll':
        return { title: 'Monthly Payroll Processing', subtitle: 'Calculate, verify, and finalize immutable monthly driver payroll runs' };
      case 'payslips':
        return { title: 'Driver Payslips', subtitle: 'Inspect, print, and generate professional PDF payslips for drivers' };
      case 'tlcm-integration':
        return { title: 'TLCM Pro Tyre Integration', subtitle: 'API telemetry sync, odometer pushes, and tyre-lifecycle distance attribution status' };
      case 'integration-logs':
        return { title: 'Integration Audit Logs', subtitle: 'Transaction logs, payload payloads, and retryable API event jobs' };
      case 'users-permissions':
        return { title: 'Users & Permissions', subtitle: 'Role-based access control for fleet managers, auditors, and accountants' };
      case 'audit-logs':
        return { title: 'Audit Trail', subtitle: 'Immutable chronological audit logs for odometer changes, financial postings, and approvals' };
      case 'settings':
        return { title: 'System Settings', subtitle: 'Configure fleet fuel pricing, benchmark tolerance policies, and TLCM Pro endpoints' };
      default:
        return { title: 'Fleet Operations', subtitle: '' };
    }
  };

  const { title, subtitle } = getPageTitle(currentPage);

  return (
    <header
      className={`fixed top-0 right-0 z-20 h-16 bg-white border-b border-gray-200 transition-all duration-200 flex items-center justify-between px-6 ${
        isSidebarCollapsed ? 'left-18' : 'left-64'
      }`}
    >
      {/* Title & Breadcrumb */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
          <span className="hover:text-emerald-700 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            Apex Fleet
          </span>
          <span>/</span>
          <span className="text-gray-900 font-semibold capitalize">{currentPage.replace(/-/g, ' ')}</span>
        </div>
        <h1 className="text-base font-bold text-gray-900 tracking-tight leading-tight mt-0.5 truncate max-w-xl">
          {title}
        </h1>
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-3">
        {/* Payroll Month Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
          <Calendar className="w-3.5 h-3.5 text-emerald-700" />
          <span>Payroll: Oct 2026</span>
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
        </div>

        {/* Operational Alerts Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            title="Operational Alerts"
          >
            <Bell className="w-4 h-4" />
            {totalAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {totalAlertsCount}
              </span>
            )}
          </button>

          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-84 bg-white rounded-xl shadow-xl border border-gray-200 p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Actionable Operational Alerts ({totalAlertsCount})
                </span>
                <span className="text-[10px] text-gray-400">Click to navigate</span>
              </div>

              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {openDiscrepancies.length > 0 && (
                  <div
                    onClick={() => {
                      onNavigate('trips');
                      setIsAlertsOpen(false);
                    }}
                    className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-rose-800">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{openDiscrepancies.length} Odometer Discrepancy Flagged</span>
                    </div>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      {openDiscrepancies[0]?.tripNumber}: {openDiscrepancies[0]?.odometer.discrepancyReason}
                    </p>
                  </div>
                )}

                {pendingFuelDeductions.length > 0 && (
                  <div
                    onClick={() => {
                      onNavigate('fuel-deductions');
                      setIsAlertsOpen(false);
                    }}
                    className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                      <Percent className="w-3.5 h-3.5 shrink-0" />
                      <span>{pendingFuelDeductions.length} Fuel Deductions Pending Approval</span>
                    </div>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Review excess consumption before posting to October payroll.
                    </p>
                  </div>
                )}

                {pendingExpenses > 0 && (
                  <div
                    onClick={() => {
                      onNavigate('expenses');
                      setIsAlertsOpen(false);
                    }}
                    className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-blue-800">
                      <Receipt className="w-3.5 h-3.5 shrink-0" />
                      <span>{pendingExpenses} Trip Expenses Awaiting Review</span>
                    </div>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Only approved expenses reconcile against advances.
                    </p>
                  </div>
                )}

                {failedIntegrationJobs.length > 0 && (
                  <div
                    onClick={() => {
                      onNavigate('tlcm-integration');
                      setIsAlertsOpen(false);
                    }}
                    className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-rose-800">
                      <Network className="w-3.5 h-3.5 shrink-0" />
                      <span>{failedIntegrationJobs.length} TLCM Pro Integration Failures</span>
                    </div>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Tyre attribution jobs queued for retry.
                    </p>
                  </div>
                )}

                {draftPayroll && (
                  <div
                    onClick={() => {
                      onNavigate('monthly-payroll');
                      setIsAlertsOpen(false);
                    }}
                    className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>October Payroll Ready in Draft</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Inspect calculations before finalization and payslip sealing.
                    </p>
                  </div>
                )}

                {totalAlertsCount === 0 && (
                  <div className="p-4 text-center text-xs text-gray-500">
                    All operations and reconciliation workflows are clear!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Demo Data Reset Button */}
        <button
          onClick={() => {
            if (confirm('Reset store back to default demonstration records?')) {
              resetAllData();
            }
          }}
          title="Reset demonstration data"
          className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-gray-200"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shadow-xs">
            FO
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-gray-900 leading-none">Fleet Admin</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Operations & Accounts</div>
          </div>
        </div>
      </div>
    </header>
  );
};
