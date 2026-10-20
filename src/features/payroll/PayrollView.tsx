import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { PayrollRun, PayrollRecord } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { formatCurrency } from '../../utils/formatters';
import {
  WalletCards,
  Calendar,
  CheckCircle2,
  Lock,
  AlertTriangle,
  FileCheck2,
  Eye,
  RefreshCw,
  Printer,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { PageId } from '../../components/layout/Sidebar';

interface PayrollViewProps {
  onNavigate: (page: PageId) => void;
}

export const PayrollView: React.FC<PayrollViewProps> = ({ onNavigate }) => {
  const { payrollRuns, generatePayrollForMonth, finalizePayrollRun } = useFleetStore();

  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFinalizeConfirmOpen, setIsFinalizeConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Active run for the selected month
  const activeRun = payrollRuns.find(r => r.month === selectedMonth) || payrollRuns[0];

  const handleRegenerate = () => {
    if (activeRun?.status === 'finalized') {
      alert('Rule 19: Finalized payroll is locked and sealed. It cannot be automatically regenerated.');
      return;
    }
    generatePayrollForMonth(selectedMonth);
    setFeedback(`Regenerated draft payroll for ${selectedMonth} with latest approved items.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleConfirmFinalize = () => {
    if (!activeRun) return;
    finalizePayrollRun(activeRun.id);
    setIsFinalizeConfirmOpen(false);
    setFeedback(`Payroll for ${selectedMonth} has been finalized and sealed. Payslips are now ready.`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const columns: Column<PayrollRecord>[] = [
    {
      key: 'driverNumber',
      header: 'Driver #',
      sortable: true,
      render: r => <span className="font-mono font-bold text-emerald-800 text-xs">{r.driverNumber}</span>
    },
    {
      key: 'driverName',
      header: 'Pilot Name',
      sortable: true,
      render: r => (
        <div>
          <span className="font-semibold text-gray-900 block">{r.driverName}</span>
          <span className="text-[10px] text-gray-400 font-sans">{r.salaryStructureName}</span>
        </div>
      )
    },
    {
      key: 'basicSalary',
      header: 'Basic Salary',
      sortable: true,
      align: 'right',
      render: r => <span className="font-mono text-gray-800">{formatCurrency(r.basicSalary)}</span>
    },
    {
      key: 'allowances',
      header: 'Allowances & Bata',
      sortable: true,
      align: 'right',
      render: r => (
        <span className="font-mono text-gray-800">
          {formatCurrency(r.hra + r.otherAllowances + r.tripBata)}
        </span>
      )
    },
    {
      key: 'grossEarnings',
      header: 'Gross Earnings',
      sortable: true,
      align: 'right',
      render: r => (
        <span className="font-mono font-bold text-emerald-800">
          {formatCurrency(r.grossEarnings)}
        </span>
      )
    },
    {
      key: 'fuelDeductions',
      header: 'Fuel Deduction',
      sortable: true,
      align: 'right',
      render: r => (
        <span className={`font-mono ${r.fuelDeductions > 0 ? 'text-rose-700 font-bold' : 'text-gray-400'}`}>
          {formatCurrency(r.fuelDeductions)}
        </span>
      )
    },
    {
      key: 'advanceRecoveries',
      header: 'Advance Recovery',
      sortable: true,
      align: 'right',
      render: r => (
        <span className={`font-mono ${r.advanceRecoveries > 0 ? 'text-purple-700 font-bold' : 'text-gray-400'}`}>
          {formatCurrency(r.advanceRecoveries)}
        </span>
      )
    },
    {
      key: 'totalDeductions',
      header: 'Total Deductions',
      sortable: true,
      align: 'right',
      render: r => (
        <span className="font-mono font-bold text-rose-700">
          {formatCurrency(r.totalDeductions)}
        </span>
      )
    },
    {
      key: 'netPayable',
      header: 'Net Payable',
      sortable: true,
      align: 'right',
      render: r => (
        <span className="font-mono font-bold text-gray-900 text-sm">
          {formatCurrency(r.netPayable)}
        </span>
      )
    },
    {
      key: 'warnings',
      header: 'Audit Review',
      render: r => (
        <div>
          {r.warnings && r.warnings.length > 0 ? (
            <span
              className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 cursor-pointer"
              title={r.warnings.join(' ')}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> {r.warnings.length} warning{r.warnings.length > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
            </span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: r => (
        <div className="flex items-center justify-end" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => {
              setSelectedRecord(r);
              setIsDetailModalOpen(true);
            }}
            title="Inspect line items breakdown"
            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Top Banner and Month Selector */}
      <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Payroll Processing Cycle: {selectedMonth === '2026-10' ? 'October 2026 (Active)' : 'September 2026 (Sealed)'}
            </h3>
            <p className="text-xs text-gray-500">
              Status: <span className="font-bold uppercase text-emerald-800">{activeRun?.status || 'Draft'}</span> • {activeRun?.records.length || 0} drivers enrolled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 font-semibold bg-gray-50 text-gray-800"
          >
            <option value="2026-10">October 2026 (Current Draft)</option>
            <option value="2026-09">September 2026 (Finalized Archive)</option>
          </select>

          {activeRun?.status !== 'finalized' && (
            <>
              <button
                onClick={handleRegenerate}
                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                <span>Recalculate Draft</span>
              </button>

              <button
                onClick={() => setIsFinalizeConfirmOpen(true)}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Finalize & Seal Payroll</span>
              </button>
            </>
          )}

          {activeRun?.status === 'finalized' && (
            <button
              onClick={() => onNavigate('payslips')}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>View Payslips</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>{feedback}</span>
        </div>
      )}

      {/* KPI Cards for the active payroll run */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Gross Remuneration</span>
          <div className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(activeRun?.totalGrossEarnings || 0)}
          </div>
          <span className="text-xs text-gray-400">Basic, HRA, Allowances & Bata</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Approved Fuel Deductions</span>
          <div className="text-xl font-bold text-rose-700 mt-1">
            {formatCurrency(activeRun?.totalFuelDeductions || 0)}
          </div>
          <span className="text-xs text-gray-400">Rule 15 Audit Approved</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Authorized Advance Recoveries</span>
          <div className="text-xl font-bold text-purple-700 mt-1">
            {formatCurrency(activeRun?.totalAdvanceRecoveries || 0)}
          </div>
          <span className="text-xs text-gray-400">Rule 14 Explicit Recovery</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-300 bg-emerald-50/20 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Total Net Payable</span>
          <div className="text-xl font-bold text-emerald-800 mt-1">
            {formatCurrency(activeRun?.totalNetPayable || 0)}
          </div>
          <span className="text-xs text-emerald-600">Disbursement liability</span>
        </div>
      </div>

      {/* Driver Payroll Table */}
      <DataTable
        data={activeRun?.records || []}
        columns={columns}
        searchPlaceholder="Search by driver pilot name or driver #..."
        searchFilter={(r, q) =>
          r.driverName.toLowerCase().includes(q) ||
          r.driverNumber.toLowerCase().includes(q) ||
          r.salaryStructureName.toLowerCase().includes(q)
        }
        onRowClick={r => {
          setSelectedRecord(r);
          setIsDetailModalOpen(true);
        }}
      />

      {/* Driver Line Items Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Payroll Breakdown: ${selectedRecord?.driverName} (${selectedRecord?.driverNumber})`}
        subtitle={`Salary Structure: ${selectedRecord?.salaryStructureName} • Month: ${selectedMonth}`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Warnings */}
          {selectedRecord?.warnings && selectedRecord.warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                Audit Alerts:
              </span>
              {selectedRecord.warnings.map((w, idx) => (
                <p key={idx} className="text-[11px] ml-5">• {w}</p>
              ))}
            </div>
          )}

          {/* Line items list */}
          <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="p-2.5 bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex justify-between">
              <span>Remuneration Component</span>
              <span>Amount</span>
            </div>
            {selectedRecord?.lineItems.map(item => (
              <div key={item.id} className="p-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-800">{item.name}</span>
                  <span className="text-[10px] text-gray-400 block capitalize">Category: {item.category.replace(/_/g, ' ')}</span>
                </div>
                <span
                  className={`font-mono font-bold ${
                    item.type === 'earning' ? 'text-emerald-800' : 'text-rose-700'
                  }`}
                >
                  {item.type === 'earning' ? '+' : '−'} {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
            <div className="flex justify-between font-semibold text-gray-700">
              <span>Gross Earnings:</span>
              <span className="font-mono text-emerald-800">{formatCurrency(selectedRecord?.grossEarnings || 0)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-700">
              <span>Total Deductions:</span>
              <span className="font-mono text-rose-700">− {formatCurrency(selectedRecord?.totalDeductions || 0)}</span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm text-gray-900">
              <span>Net Salary Payable:</span>
              <span className="font-mono text-emerald-800">{formatCurrency(selectedRecord?.netPayable || 0)}</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirm Finalize Dialog (Rule 19) */}
      <ConfirmDialog
        isOpen={isFinalizeConfirmOpen}
        onClose={() => setIsFinalizeConfirmOpen(false)}
        onConfirm={handleConfirmFinalize}
        title="Finalize & Seal Monthly Payroll?"
        message="Compliance Rule 19: Once payroll is finalized, an immutable snapshot of all salary components, approved fuel deductions, and advance recoveries will be permanently sealed. Subsequent changes to trips or benchmarks will not alter this payroll."
        confirmLabel="Finalize & Seal Payroll"
        type="primary"
      />
    </div>
  );
};
