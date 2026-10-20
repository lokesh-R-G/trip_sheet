import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { PayrollRecord, PayrollRun } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { FileText, Printer, Download, Eye, Truck, Building2, CheckCircle2 } from 'lucide-react';

export const PayslipView: React.FC = () => {
  const { payrollRuns, settings } = useFleetStore();

  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);

  const activeRun = payrollRuns.find(r => r.month === selectedMonth) || payrollRuns[0];

  const handleOpenPayslip = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setIsPayslipModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
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
      key: 'grossEarnings',
      header: 'Gross Earnings',
      sortable: true,
      align: 'right',
      render: r => <span className="font-mono text-gray-800">{formatCurrency(r.grossEarnings)}</span>
    },
    {
      key: 'totalDeductions',
      header: 'Deductions & Recoveries',
      sortable: true,
      align: 'right',
      render: r => <span className="font-mono text-rose-700 font-bold">− {formatCurrency(r.totalDeductions)}</span>
    },
    {
      key: 'netPayable',
      header: 'Net Payable',
      sortable: true,
      align: 'right',
      render: r => (
        <span className="font-mono font-bold text-emerald-800 text-sm">
          {formatCurrency(r.netPayable)}
        </span>
      )
    },
    {
      key: 'paymentStatus',
      header: 'Disbursement Status',
      sortable: true,
      render: r => <Badge status={r.paymentStatus} />
    },
    {
      key: 'actions',
      header: 'Official Payslip',
      align: 'right',
      render: r => (
        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handleOpenPayslip(r)}
            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Inspect / Print</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Month Selector Bar */}
      <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Driver Payslip Generation</h2>
          <p className="text-xs text-gray-500">
            Official printable salary slips compliant with emerald brand identity and full deductions audit trail
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 font-semibold bg-gray-50 text-gray-800"
          >
            <option value="2026-10">October 2026</option>
            <option value="2026-09">September 2026</option>
          </select>
        </div>
      </div>

      <DataTable
        data={activeRun?.records || []}
        columns={columns}
        searchPlaceholder="Search by pilot name or driver #..."
        searchFilter={(r, q) =>
          r.driverName.toLowerCase().includes(q) ||
          r.driverNumber.toLowerCase().includes(q)
        }
        onRowClick={r => handleOpenPayslip(r)}
      />

      {/* Official Printable Payslip Modal */}
      <Modal
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
        title="Official Commercial Driver Payslip"
        subtitle={`Period: ${selectedMonth} • Ref: PAYSLIP-${selectedMonth}-${selectedRecord?.driverNumber}`}
        maxWidth="2xl"
        actions={
          <>
            <button
              onClick={() => setIsPayslipModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Payslip (PDF)</span>
            </button>
          </>
        }
      >
        {selectedRecord && (
          <div className="p-6 bg-white border border-gray-200 rounded-xl space-y-6 text-xs print:p-0 print:border-none">
            {/* Header Identity */}
            <div className="flex items-start justify-between pb-4 border-b-2 border-emerald-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 tracking-tight">{settings.companyName}</h3>
                  <p className="text-[11px] text-gray-500">{settings.companyAddress}</p>
                  <p className="text-[11px] text-gray-500">Phone: {settings.companyPhone}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 block mb-1">
                  OFFICIAL PAYSLIP
                </span>
                <span className="text-gray-500 font-medium">Payroll Month: {selectedMonth}</span>
              </div>
            </div>

            {/* Pilot Bio Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Driver Pilot</span>
                <span className="font-bold text-gray-900">{selectedRecord.driverName}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Driver #</span>
                <span className="font-mono font-bold text-emerald-800">{selectedRecord.driverNumber}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Remuneration Package</span>
                <span className="font-semibold text-gray-800">{selectedRecord.salaryStructureName}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Payment Status</span>
                <Badge status={selectedRecord.paymentStatus} />
              </div>
            </div>

            {/* Two-column Earnings vs Deductions Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left Column: Earnings */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-2 bg-emerald-50 border-b border-emerald-100 font-bold text-emerald-900 uppercase text-[10px] tracking-wider">
                  Earnings Breakdown
                </div>
                <div className="p-3 divide-y divide-gray-100 space-y-2">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Basic Salary</span>
                    <span className="font-mono font-bold text-gray-900">{formatCurrency(selectedRecord.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">House Rent Allowance (HRA)</span>
                    <span className="font-mono font-bold text-gray-900">{formatCurrency(selectedRecord.hra)}</span>
                  </div>
                  {selectedRecord.otherAllowances > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Interstate / Route Allowance</span>
                      <span className="font-mono font-bold text-gray-900">{formatCurrency(selectedRecord.otherAllowances)}</span>
                    </div>
                  )}
                  {selectedRecord.tripBata > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Trip Bata Allowance</span>
                      <span className="font-mono font-bold text-gray-900">{formatCurrency(selectedRecord.tripBata)}</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5 bg-gray-50 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                  <span>Gross Earnings:</span>
                  <span className="font-mono text-emerald-800">{formatCurrency(selectedRecord.grossEarnings)}</span>
                </div>
              </div>

              {/* Right Column: Deductions */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-2 bg-rose-50 border-b border-rose-100 font-bold text-rose-900 uppercase text-[10px] tracking-wider">
                  Deductions & Recoveries
                </div>
                <div className="p-3 divide-y divide-gray-100 space-y-2">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Fuel Consumption Deductions</span>
                    <span className="font-mono font-bold text-rose-700">
                      {selectedRecord.fuelDeductions > 0 ? `− ${formatCurrency(selectedRecord.fuelDeductions)}` : '₹0'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Advance Recovery Installment</span>
                    <span className="font-mono font-bold text-purple-700">
                      {selectedRecord.advanceRecoveries > 0 ? `− ${formatCurrency(selectedRecord.advanceRecoveries)}` : '₹0'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Welfare & Voluntary Deductions</span>
                    <span className="font-mono font-bold text-rose-700">
                      {selectedRecord.otherDeductions > 0 ? `− ${formatCurrency(selectedRecord.otherDeductions)}` : '₹0'}
                    </span>
                  </div>
                </div>
                <div className="p-2.5 bg-gray-50 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                  <span>Total Deductions:</span>
                  <span className="font-mono text-rose-700">− {formatCurrency(selectedRecord.totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* Net Salary Payable Callout Banner */}
            <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-600 flex items-center justify-between">
              <div>
                <span className="text-emerald-900 text-xs font-bold uppercase tracking-wider block">
                  Net Salary Payable to Driver
                </span>
                <span className="text-[11px] text-emerald-700">
                  Transferred via Bank NEFT / Corporate Fleet Payroll Account
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-900 font-mono">
                {formatCurrency(selectedRecord.netPayable)}
              </div>
            </div>

            {/* Footer Legal & Audit Note */}
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-400">
              <span>Apex Translogistics Fleet & Supply Chain Ltd. • System Generated Electronic Payslip</span>
              <span className="font-mono">Ref: {selectedRecord.id}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
