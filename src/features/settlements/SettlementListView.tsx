import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { Trip } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { formatCurrency } from '../../utils/formatters';
import { Scale, CheckCircle2, RotateCcw, DollarSign, ShieldCheck } from 'lucide-react';

export const SettlementListView: React.FC = () => {
  const { trips, recordSettlementReturn, authorizePayrollAdvanceRecovery } = useFleetStore();

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [returnAmount, setReturnAmount] = useState<number>(0);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Trips that have advance settlement transactions
  const settlementTrips = trips.filter(t => t.settlement.totalAdvancesIssued > 0);

  // Summary Metrics
  const totalAdvancesIssued = settlementTrips.reduce((s, t) => s + t.settlement.totalAdvancesIssued, 0);
  const totalApprovedExpenses = settlementTrips.reduce((s, t) => s + t.settlement.totalApprovedExpenses, 0);
  const totalReturned = settlementTrips.reduce((s, t) => s + t.settlement.amountReturnedByDriver, 0);
  const totalOutstanding = settlementTrips.reduce((s, t) => s + t.settlement.outstandingBalance, 0);
  const totalPayrollRecoveries = settlementTrips.reduce((s, t) => s + (t.settlement.authorizedPayrollRecoveryAmount || 0), 0);

  const handleOpenReturn = (trip: Trip) => {
    setSelectedTrip(trip);
    setReturnAmount(trip.settlement.outstandingBalance);
    setIsReturnModalOpen(true);
  };

  const handleConfirmReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || returnAmount <= 0) return;
    recordSettlementReturn(selectedTrip.id, Number(returnAmount));
    setIsReturnModalOpen(false);
    setFeedback(`Recorded return of ₹${returnAmount} from ${selectedTrip.driverName}`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleAuthorizeRecovery = (trip: Trip) => {
    authorizePayrollAdvanceRecovery(trip.id, trip.settlement.outstandingBalance);
    setFeedback(`Authorized recovery of ₹${trip.settlement.outstandingBalance} through October driver payroll.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const columns: Column<Trip>[] = [
    {
      key: 'driverName',
      header: 'Driver Pilot',
      sortable: true,
      render: t => (
        <div>
          <span className="font-semibold text-gray-900">{t.driverName}</span>
          <span className="text-[10px] text-gray-400 font-mono block">{t.driverNumber}</span>
        </div>
      )
    },
    {
      key: 'tripNumber',
      header: 'Trip #',
      sortable: true,
      render: t => (
        <div>
          <span className="font-mono font-bold text-emerald-800 text-xs block">{t.tripNumber}</span>
          <span className="text-[10px] text-gray-400">{t.vehicleReg}</span>
        </div>
      )
    },
    {
      key: 'totalAdvancesIssued',
      header: 'Advances Issued',
      sortable: true,
      align: 'right',
      render: t => (
        <span className="font-mono font-bold text-gray-900">
          {formatCurrency(t.settlement.totalAdvancesIssued)}
        </span>
      )
    },
    {
      key: 'totalApprovedExpenses',
      header: 'Approved Expenses',
      sortable: true,
      align: 'right',
      render: t => (
        <span className="font-mono font-medium text-emerald-700">
          {formatCurrency(t.settlement.totalApprovedExpenses)}
        </span>
      )
    },
    {
      key: 'amountReturnedByDriver',
      header: 'Cash Returned',
      sortable: true,
      align: 'right',
      render: t => (
        <span className="font-mono font-medium text-blue-700">
          {formatCurrency(t.settlement.amountReturnedByDriver)}
        </span>
      )
    },
    {
      key: 'authorizedPayrollRecoveryAmount',
      header: 'Payroll Recovery',
      align: 'right',
      render: t => (
        <span className="font-mono font-medium text-purple-700">
          {formatCurrency(t.settlement.authorizedPayrollRecoveryAmount || 0)}
        </span>
      )
    },
    {
      key: 'outstandingBalance',
      header: 'Outstanding Balance',
      sortable: true,
      align: 'right',
      render: t => (
        <span
          className={`font-mono font-bold text-sm ${
            t.settlement.outstandingBalance > 0 ? 'text-rose-700' : 'text-gray-400'
          }`}
        >
          {formatCurrency(t.settlement.outstandingBalance)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Settlement Status',
      sortable: true,
      render: t => <Badge status={t.settlement.status} />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: t => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          {t.settlement.outstandingBalance > 0 ? (
            <>
              <button
                onClick={() => handleOpenReturn(t)}
                className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-[11px] font-semibold transition-colors"
              >
                Record Return
              </button>
              <button
                onClick={() => handleAuthorizeRecovery(t)}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold transition-colors shadow-xs"
              >
                Authorize Payroll
              </button>
            </>
          ) : (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Settled
            </span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total Advances</span>
          <div className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalAdvancesIssued)}</div>
          <span className="text-xs text-gray-400">{settlementTrips.length} active trips</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Approved Expenses</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(totalApprovedExpenses)}</div>
          <span className="text-xs text-gray-400">Rule 13 Reconciled</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Cash Returned</span>
          <div className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(totalReturned)}</div>
          <span className="text-xs text-gray-400">To depot treasury</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-xs">
          <span className="text-[10px] font-semibold text-purple-800 uppercase tracking-wider">Payroll Authorized</span>
          <div className="text-xl font-bold text-purple-800 mt-1">{formatCurrency(totalPayrollRecoveries)}</div>
          <span className="text-xs text-purple-600">Postable deductions</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider">Outstanding Balance</span>
          <div className="text-xl font-bold text-rose-700 mt-1">{formatCurrency(totalOutstanding)}</div>
          <span className="text-xs text-rose-600">Pending resolution</span>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-gray-900 tracking-tight">Driver Advance Settlements</h2>
        <p className="text-xs text-gray-500">
          Reconcile trip advances against verified expenses, track driver cash returns, and explicitly authorize payroll recovery (Rule 14).
        </p>
      </div>

      <DataTable
        data={settlementTrips}
        columns={columns}
        searchPlaceholder="Search by driver pilot, trip #, or vehicle..."
        searchFilter={(t, q) =>
          t.driverName.toLowerCase().includes(q) ||
          t.tripNumber.toLowerCase().includes(q) ||
          t.vehicleReg.toLowerCase().includes(q)
        }
      />

      {/* Modal: Cash Return */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Record Advance Return"
        subtitle={`Driver ${selectedTrip?.driverName} returning unspent advance balance for ${selectedTrip?.tripNumber}`}
        maxWidth="sm"
      >
        <form onSubmit={handleConfirmReturn} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Outstanding Settlement Balance: {formatCurrency(selectedTrip?.settlement.outstandingBalance || 0)}
            </label>
            <input
              type="number"
              required
              max={selectedTrip?.settlement.outstandingBalance || 0}
              value={returnAmount}
              onChange={e => setReturnAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono font-bold text-sm bg-white"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsReturnModalOpen(false)}
              className="px-3 py-1.5 font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
            >
              Confirm Cash Receipt
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
