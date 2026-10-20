import React from 'react';
import {
  LayoutDashboard,
  Users,
  BadgeDollarSign,
  HandCoins,
  Truck,
  Fuel,
  FileSpreadsheet,
  Receipt,
  Scale,
  Percent,
  Gauge,
  WalletCards,
  FileCheck2,
  FileText,
  Network,
  History,
  ShieldCheck,
  ClipboardList,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';
import { useFleetStore } from '../../services/store';

export type PageId =
  | 'dashboard'
  | 'drivers'
  | 'salary-structures'
  | 'advances'
  | 'vehicles'
  | 'fuel-topups'
  | 'trips'
  | 'expenses'
  | 'settlements'
  | 'fuel-deductions'
  | 'benchmarks'
  | 'payroll-dashboard'
  | 'monthly-payroll'
  | 'payslips'
  | 'tlcm-integration'
  | 'integration-logs'
  | 'users-permissions'
  | 'audit-logs'
  | 'settings';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isCollapsed,
  onToggleCollapse
}) => {
  const { trips, advances, integrationJobs, payrollRuns } = useFleetStore();

  const pendingDeductionsCount = trips.filter(
    t => t.fuelDeduction.reviewStatus === 'pending_review' && t.fuelDeduction.potentialDeductionAmount > 0
  ).length;

  const pendingExpensesCount = trips.reduce(
    (count, t) => count + t.expenses.filter(e => e.approvalStatus === 'pending').length,
    0
  );

  const pendingSettlementsCount = trips.filter(
    t => t.settlement.outstandingBalance > 0 && t.settlement.status !== 'fully_settled'
  ).length;

  const failedIntegrationCount = integrationJobs.filter(j => j.status === 'failed').length;

  const navGroups = [
    {
      group: 'Overview',
      items: [
        { id: 'dashboard' as PageId, label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      group: 'Operations',
      items: [
        { id: 'drivers' as PageId, label: 'Drivers', icon: Users },
        { id: 'salary-structures' as PageId, label: 'Salary Structures', icon: BadgeDollarSign },
        { id: 'advances' as PageId, label: 'Driver Advances', icon: HandCoins },
        { id: 'vehicles' as PageId, label: 'Vehicles (TLCM Master)', icon: Truck },
        { id: 'fuel-topups' as PageId, label: 'Fuel Top-Ups', icon: Fuel },
        {
          id: 'trips' as PageId,
          label: 'Trip Sheets',
          icon: FileSpreadsheet,
          badge: trips.filter(t => t.odometer.discrepancyFlag).length > 0 ? 'Discrepancy' : undefined,
          badgeColor: 'bg-rose-100 text-rose-700'
        }
      ]
    },
    {
      group: 'Financial Management',
      items: [
        {
          id: 'expenses' as PageId,
          label: 'Trip Expenses',
          icon: Receipt,
          badge: pendingExpensesCount > 0 ? String(pendingExpensesCount) : undefined,
          badgeColor: 'bg-amber-100 text-amber-800'
        },
        {
          id: 'settlements' as PageId,
          label: 'Advance Settlements',
          icon: Scale,
          badge: pendingSettlementsCount > 0 ? String(pendingSettlementsCount) : undefined,
          badgeColor: 'bg-blue-100 text-blue-800'
        },
        {
          id: 'fuel-deductions' as PageId,
          label: 'Fuel Deductions',
          icon: Percent,
          badge: pendingDeductionsCount > 0 ? String(pendingDeductionsCount) : undefined,
          badgeColor: 'bg-amber-100 text-amber-800'
        },
        { id: 'benchmarks' as PageId, label: 'Mileage Benchmarks', icon: Gauge }
      ]
    },
    {
      group: 'Payroll',
      items: [
        { id: 'payroll-dashboard' as PageId, label: 'Payroll Dashboard', icon: WalletCards },
        { id: 'monthly-payroll' as PageId, label: 'Monthly Payroll', icon: FileCheck2 },
        { id: 'payslips' as PageId, label: 'Payslips', icon: FileText }
      ]
    },
    {
      group: 'Integration',
      items: [
        {
          id: 'tlcm-integration' as PageId,
          label: 'TLCM Pro Integration',
          icon: Network,
          badge: failedIntegrationCount > 0 ? 'Alert' : 'API OK',
          badgeColor: failedIntegrationCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
        },
        { id: 'integration-logs' as PageId, label: 'Integration Logs', icon: History }
      ]
    },
    {
      group: 'Administration',
      items: [
        { id: 'users-permissions' as PageId, label: 'Users & Permissions', icon: ShieldCheck },
        { id: 'audit-logs' as PageId, label: 'Audit Logs', icon: ClipboardList },
        { id: 'settings' as PageId, label: 'System Settings', icon: Sliders }
      ]
    }
  ];

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col bg-white border-r border-gray-200 transition-all duration-200 ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 shrink-0 bg-white">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold shrink-0 shadow-xs">
              <Truck className="w-5 h-5 text-emerald-50" />
            </div>
            <div className="truncate">
              <div className="text-sm font-bold text-gray-900 tracking-tight leading-none truncate">
                APEX FLEET
              </div>
              <div className="text-[11px] font-medium text-emerald-700 tracking-tight mt-1 truncate">
                Trip Sheet & Payroll
              </div>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="mx-auto w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold shadow-xs">
            <Truck className="w-5 h-5 text-emerald-50" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ${
            isCollapsed ? 'hidden' : 'block'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-6">
        {navGroups.map(group => (
          <div key={group.group}>
            {!isCollapsed && (
              <div className="px-2.5 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {group.group}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-emerald-700' : 'text-gray-500'
                      }`}
                    />

                    {!isCollapsed && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                          item.badgeColor || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Collapsed Toggle & Status */}
      <div className="p-3 border-t border-gray-200 bg-gray-50/50 shrink-0">
        {isCollapsed ? (
          <button
            onClick={onToggleCollapse}
            title="Expand Sidebar"
            className="w-full flex justify-center py-1.5 rounded-md hover:bg-gray-200/60 text-gray-500"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-medium text-gray-600">TLCM API Online</span>
            </div>
            <span className="text-[10px] text-gray-400">v2.4 Pro</span>
          </div>
        )}
      </div>
    </aside>
  );
};
