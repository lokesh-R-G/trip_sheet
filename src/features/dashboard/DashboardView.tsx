import React from 'react';
import {
  Users,
  Truck,
  CheckCircle2,
  Clock,
  Navigation,
  Fuel,
  Gauge,
  Receipt,
  HandCoins,
  Percent,
  WalletCards,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  BarChart3,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useFleetStore } from '../../services/store';
import { StatCard } from '../../components/common/StatCard';
import { formatCurrency, formatKm, formatLitres, formatMileage } from '../../utils/formatters';
import { PageId } from '../../components/layout/Sidebar';

interface DashboardViewProps {
  onNavigate: (page: PageId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { drivers, vehicles, trips, advances, fuelTopUps, payrollRuns, integrationJobs } = useFleetStore();

  // Metrics
  const activeDrivers = drivers.filter(d => d.status === 'active').length;
  const totalVehiclesCount = vehicles.length;
  const tripsCompleted = trips.filter(t => t.status === 'completed').length;
  const tripsInProgress = trips.filter(t => t.status === 'in_progress').length;

  const totalDistance = trips.reduce((sum, t) => sum + (t.distance.acceptedDistance || 0), 0);
  const totalFuelConsumed = trips.reduce((sum, t) => sum + (t.fuel.acceptedFuelLitres || 0), 0);
  const averageMileage = totalFuelConsumed > 0 ? totalDistance / totalFuelConsumed : 0;

  const totalTripExpenses = trips.reduce(
    (sum, t) => sum + t.expenses.filter(e => e.approvalStatus === 'approved').reduce((s, e) => s + (e.approvedAmount || 0), 0),
    0
  );

  const totalOutstandingAdvances = advances
    .filter(a => a.status === 'active' || a.status === 'partially_settled')
    .reduce((sum, a) => sum + (a.outstandingBalance || 0), 0);

  const pendingFuelDeductions = trips
    .filter(t => t.fuelDeduction.reviewStatus === 'pending_review')
    .reduce((sum, t) => sum + (t.fuelDeduction.potentialDeductionAmount || 0), 0);

  const currentPayroll = payrollRuns.find(r => r.month === '2026-10') || payrollRuns[0];

  // Visualizations Data
  const dailyDistanceData = [
    { day: '14 Oct', distance: 135, fuel: 28 },
    { day: '15 Oct', distance: 315, fuel: 62 },
    { day: '16 Oct', distance: 235, fuel: 70 },
    { day: '17 Oct', distance: 405, fuel: 120 },
    { day: '18 Oct', distance: 500, fuel: 103 },
    { day: '19 Oct', distance: 120, fuel: 35 },
    { day: '20 Oct', distance: 280, fuel: 58 }
  ];

  const mileageComparisonData = [
    { vehicle: 'TN-04-AX-8912', actual: 5.0, benchmark: 6.0, excessLitres: 11.25 },
    { vehicle: 'TN-09-CB-4410', actual: 3.37, benchmark: 3.2, excessLitres: 0 },
    { vehicle: 'KA-01-MJ-9921', actual: 5.59, benchmark: 6.0, excessLitres: 1.5 },
    { vehicle: 'KA-51-EF-1123', actual: 3.43, benchmark: 3.8, excessLitres: 1.84 }
  ];

  const expenseCategoryBreakdown = [
    { name: 'Tolls (FASTag)', value: 3620, color: '#047857' },
    { name: 'Hamali & Loading', value: 500, color: '#065F46' },
    { name: 'Parking & Security', value: 250, color: '#10B981' },
    { name: 'Refreshments & Bata', value: 350, color: '#34D399' }
  ];

  const advanceStatusData = [
    { name: 'Settled', value: 12000, color: '#047857' },
    { name: 'Partially Settled', value: 16000, color: '#D97706' },
    { name: 'Active Outstanding', value: 5000, color: '#DC2626' }
  ];

  // Actionable Alerts
  const odoDiscrepancies = trips.filter(t => t.odometer.discrepancyFlag);
  const pendingExpenseApprovals = trips.reduce(
    (count, t) => count + t.expenses.filter(e => e.approvalStatus === 'pending').length,
    0
  );
  const deductionsAwaitingReview = trips.filter(
    t => t.fuelDeduction.reviewStatus === 'pending_review' && t.fuelDeduction.potentialDeductionAmount > 0
  );
  const failedJobs = integrationJobs.filter(j => j.status === 'failed');

  return (
    <div className="space-y-6">
      {/* Top Notification Banner if Discrepancy Exists */}
      {odoDiscrepancies.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Action Required: {odoDiscrepancies.length} Trip Odometer Discrepancy Flagged
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Trip {odoDiscrepancies[0]?.tripNumber} has backward odometer sequence. Tyre attribution has been placed ON HOLD per Rule 8 & 10.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('trips')}
            className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            Review Trip Sheets <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid (11 summary metrics requested in PRD) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
        <StatCard
          label="Active Drivers"
          value={activeDrivers}
          subtitle={`Total: ${drivers.length} drivers`}
          icon={Users}
          onClick={() => onNavigate('drivers')}
          badge={{ text: 'Payroll Ready', type: 'positive' }}
        />
        <StatCard
          label="Total Vehicles"
          value={totalVehiclesCount}
          subtitle="TLCM Pro Authoritative"
          icon={Truck}
          onClick={() => onNavigate('vehicles')}
          badge={{ text: 'Connected', type: 'positive' }}
        />
        <StatCard
          label="Trips Completed"
          value={tripsCompleted}
          subtitle="This Month (Oct 2026)"
          icon={CheckCircle2}
          onClick={() => onNavigate('trips')}
          accent
        />
        <StatCard
          label="Trips In Progress"
          value={tripsInProgress}
          subtitle="Live on corridor"
          icon={Clock}
          onClick={() => onNavigate('trips')}
          badge={{ text: 'Live', type: 'warning' }}
        />
        <StatCard
          label="Distance Covered"
          value={formatKm(totalDistance)}
          subtitle="Oct 2026 Fleet Run"
          icon={Navigation}
          onClick={() => onNavigate('trips')}
        />
        <StatCard
          label="Fuel Consumed"
          value={formatLitres(totalFuelConsumed)}
          subtitle="Trip Accepted Fuel"
          icon={Fuel}
          onClick={() => onNavigate('fuel-deductions')}
        />
        <StatCard
          label="Average Mileage"
          value={formatMileage(averageMileage)}
          subtitle="Benchmark: ~4.8 km/L"
          icon={Gauge}
          badge={{ text: averageMileage >= 4.5 ? 'On Target' : 'Review', type: 'positive' }}
        />
        <StatCard
          label="Trip Expenses"
          value={formatCurrency(totalTripExpenses)}
          subtitle="Approved Settlements"
          icon={Receipt}
          onClick={() => onNavigate('expenses')}
        />
        <StatCard
          label="Outstanding Advances"
          value={formatCurrency(totalOutstandingAdvances)}
          subtitle="Driver Ledger Balances"
          icon={HandCoins}
          onClick={() => onNavigate('settlements')}
          badge={{ text: 'Recoverable', type: 'warning' }}
        />
        <StatCard
          label="Pending Fuel Deds"
          value={formatCurrency(pendingFuelDeductions)}
          subtitle="Awaiting Audit Approval"
          icon={Percent}
          onClick={() => onNavigate('fuel-deductions')}
          badge={{ text: `${deductionsAwaitingReview.length} Pending`, type: 'warning' }}
        />
        <StatCard
          label="Current Payroll"
          value={currentPayroll ? currentPayroll.status.toUpperCase() : 'OCT DRAFT'}
          subtitle={`Net: ${formatCurrency(currentPayroll?.totalNetPayable || 0)}`}
          icon={WalletCards}
          onClick={() => onNavigate('monthly-payroll')}
          accent
        />
        <StatCard
          label="TLCM Integration"
          value={failedJobs.length > 0 ? `${failedJobs.length} Failed` : '100% Synced'}
          subtitle="Tyre Lifecycle Backend"
          icon={ShieldAlert}
          onClick={() => onNavigate('tlcm-integration')}
          badge={{ text: failedJobs.length > 0 ? 'Action Req' : 'Active', type: failedJobs.length > 0 ? 'negative' : 'positive' }}
        />
      </div>

      {/* Visualizations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Daily Distance & Fuel Consumed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                Daily Fleet Distance & Fuel Consumption
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Kilometres operated vs accepted trip fuel litres</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
                <span className="text-gray-600 font-medium">Distance (km)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-gray-600 font-medium">Fuel (Litres)</span>
              </div>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyDistanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#047857" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#047857" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="distance" stroke="#047857" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDist)" />
                <Area type="monotone" dataKey="fuel" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Trip Expenses Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">Approved Trip Expenses</h3>
            <p className="text-xs text-gray-500 mt-0.5">By category allocated against advances</p>
          </div>

          <div className="h-52 my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseCategoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {expenseCategoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs">
            {expenseCategoryBreakdown.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-800">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2 Visualizations & Operational Action Centre */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mileage Performance vs Benchmark */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                Vehicle Mileage Performance vs Configured Benchmark
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Actual trip mileage against expected threshold (km/L)</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-700" />
                <span className="text-gray-600">Actual (km/L)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-gray-300" />
                <span className="text-gray-600">Benchmark Target</span>
              </div>
            </div>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mileageComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="vehicle" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip
                  formatter={(val: any) => `${val} km/L`}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="actual" fill="#047857" radius={[4, 4, 0, 0]} />
                <Bar dataKey="benchmark" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operational Action Queue / Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">Actionable Operations Queue</h3>
              <p className="text-xs text-gray-500 mt-0.5">Direct workflow drill-down</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Live
            </span>
          </div>

          <div className="mt-3 space-y-2 flex-1 overflow-y-auto">
            {/* Alert 1 */}
            <div
              onClick={() => onNavigate('trips')}
              className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  Odometer Discrepancy (1)
                </span>
                <span className="text-[11px] font-semibold text-amber-800">TRIP-2026-0104</span>
              </div>
              <p className="text-[11px] text-amber-700 mt-1">
                Ending reading 67,800 is less than starting 67,900. Negative delta requires inspection.
              </p>
            </div>

            {/* Alert 2 */}
            <div
              onClick={() => onNavigate('fuel-deductions')}
              className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-emerald-700" />
                  Fuel Deductions Audit ({deductionsAwaitingReview.length})
                </span>
                <span className="text-[11px] font-semibold text-emerald-800">Review</span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1">
                TRIP-2026-0103 evaluated with ₹144 excess consumption pending supervisor approval.
              </p>
            </div>

            {/* Alert 3 */}
            <div
              onClick={() => onNavigate('expenses')}
              className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-blue-700" />
                  Trip Expense Approvals ({pendingExpenseApprovals})
                </span>
                <span className="text-[11px] font-semibold text-blue-800">Pending</span>
              </div>
              <p className="text-[11px] text-blue-700 mt-1">
                Expressway FASTag slips awaiting accounts audit sign-off before advance reconciliation.
              </p>
            </div>

            {/* Alert 4 */}
            <div
              onClick={() => onNavigate('tlcm-integration')}
              className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100/60 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />
                  TLCM Pro Failed Sync (1)
                </span>
                <span className="text-[11px] font-semibold text-rose-800">Job #003</span>
              </div>
              <p className="text-[11px] text-rose-700 mt-1">
                Tyre attribution held on TRIP-2026-0103 due to missing measured odometer telemetry.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
