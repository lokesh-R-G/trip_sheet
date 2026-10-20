import React, { useState } from 'react';
import { FleetStoreProvider } from './services/store';
import { Sidebar, PageId } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './features/dashboard/DashboardView';
import { DriverListView } from './features/drivers/DriverListView';
import { SalaryStructureView } from './features/salary-structures/SalaryStructureView';
import { AdvanceListView } from './features/advances/AdvanceListView';
import { VehicleReferenceView } from './features/vehicles/VehicleReferenceView';
import { FuelTopUpListView } from './features/fuel-topups/FuelTopUpListView';
import { TripListView } from './features/trips/TripListView';
import { TripExpenseApprovalView } from './features/expenses/TripExpenseApprovalView';
import { SettlementListView } from './features/settlements/SettlementListView';
import { FuelDeductionsView } from './features/fuel-deductions/FuelDeductionsView';
import { BenchmarkListView } from './features/mileage-benchmarks/BenchmarkListView';
import { PayrollView } from './features/payroll/PayrollView';
import { PayslipView } from './features/payslips/PayslipView';
import { TLCMIntegrationView } from './features/integrations/TLCMIntegrationView';
import { IntegrationLogsView } from './features/integrations/IntegrationLogsView';
import { UsersPermissionsView } from './features/settings/UsersPermissionsView';
import { AuditLogView } from './features/audit/AuditLogView';
import { SettingsView } from './features/settings/SettingsView';

function FleetAppContent() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardView onNavigate={setCurrentPage} />;
      case 'drivers':
        return <DriverListView />;
      case 'salary-structures':
        return <SalaryStructureView />;
      case 'advances':
        return <AdvanceListView />;
      case 'vehicles':
        return <VehicleReferenceView />;
      case 'fuel-topups':
        return <FuelTopUpListView />;
      case 'trips':
        return <TripListView />;
      case 'expenses':
        return <TripExpenseApprovalView />;
      case 'settlements':
        return <SettlementListView />;
      case 'fuel-deductions':
        return <FuelDeductionsView />;
      case 'benchmarks':
        return <BenchmarkListView />;
      case 'payroll-dashboard':
      case 'monthly-payroll':
        return <PayrollView onNavigate={setCurrentPage} />;
      case 'payslips':
        return <PayslipView />;
      case 'tlcm-integration':
        return <TLCMIntegrationView />;
      case 'integration-logs':
        return <IntegrationLogsView />;
      case 'users-permissions':
        return <UsersPermissionsView />;
      case 'audit-logs':
        return <AuditLogView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1F2937] flex flex-col font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Top Header */}
      <Header
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 transition-all duration-200 mt-16 p-6 ${
          isSidebarCollapsed ? 'ml-18' : 'ml-64'
        }`}
      >
        <div className="max-w-[1600px] mx-auto pb-12">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <FleetStoreProvider>
      <FleetAppContent />
    </FleetStoreProvider>
  );
}
