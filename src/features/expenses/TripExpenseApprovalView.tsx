import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { expenseApi } from '../../services/api';
import { TripExpense, ExpenseApprovalStatus } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Receipt, Check, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const TripExpenseApprovalView: React.FC = () => {
  const { trips, approveExpense, rejectExpense, refreshExpenses, refreshTrips } = useFleetStore();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Flatten expenses across trips
  const allExpenses: (TripExpense & { driverName: string; vehicleReg: string })[] = React.useMemo(() => {
    return trips.flatMap(t =>
      t.expenses.map(e => ({
        ...e,
        driverName: t.driverName,
        vehicleReg: t.vehicleReg
      }))
    );
  }, [trips]);

  const filteredExpenses = React.useMemo(() => {
    if (statusFilter === 'all') return allExpenses;
    return allExpenses.filter(e => e.approvalStatus === statusFilter);
  }, [allExpenses, statusFilter]);

  const handleApprove = async (tripId: string, expId: string) => {
    try {
      await expenseApi.review(expId, { action: 'approve' });
      await refreshExpenses();
      await refreshTrips();
      setFeedback({ message: `Approved expense #${expId.slice(-4)} and persisted to database.`, type: 'success' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ message: err?.message || 'Failed to approve expense on backend.', type: 'error' });
    }
  };

  const handleReject = async (tripId: string, expId: string) => {
    try {
      await expenseApi.review(expId, {
        action: 'reject',
        rejectionReason: 'Audit rejection: Receipt documentation incomplete or limit exceeded',
      });
      await refreshExpenses();
      await refreshTrips();
      setFeedback({ message: `Rejected expense #${expId.slice(-4)} on backend.`, type: 'error' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ message: err?.message || 'Failed to reject expense on backend.', type: 'error' });
    }
  };

  const pendingCount = allExpenses.filter(e => e.approvalStatus === 'pending').length;
  const approvedTotal = allExpenses
    .filter(e => e.approvalStatus === 'approved')
    .reduce((s, e) => s + (e.approvedAmount || e.amount), 0);
  const pendingTotal = allExpenses
    .filter(e => e.approvalStatus === 'pending')
    .reduce((s, e) => s + e.amount, 0);

  const columns: Column<TripExpense & { driverName: string; vehicleReg: string }>[] = [
    {
      key: 'tripNumber',
      header: 'Trip #',
      sortable: true,
      render: e => (
        <div>
          <span className="font-mono font-bold text-emerald-800 text-xs block">{e.tripNumber}</span>
          <span className="text-[10px] text-gray-400 font-sans">{e.vehicleReg}</span>
        </div>
      )
    },
    {
      key: 'driverName',
      header: 'Submitted By',
      sortable: true,
      render: e => <span className="font-semibold text-gray-900">{e.submittedBy || e.driverName}</span>
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: e => (
        <span className="px-2 py-0.5 rounded text-xs bg-gray-100 font-medium text-gray-800">
          {e.category}
        </span>
      )
    },
    {
      key: 'description',
      header: 'Description / Purpose',
      render: e => (
        <div className="truncate max-w-[220px]">
          <span className="text-gray-800 font-medium block truncate">{e.description}</span>
          <span className="text-[10px] text-gray-400 font-mono">Ref: {e.receiptReference || 'No Ref'}</span>
        </div>
      )
    },
    {
      key: 'expenseDate',
      header: 'Date',
      sortable: true,
      render: e => <span>{formatDate(e.expenseDate)}</span>
    },
    {
      key: 'paymentMethod',
      header: 'Payment Method',
      render: e => <span className="text-gray-600">{e.paymentMethod}</span>
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      render: e => (
        <span className="font-mono font-bold text-gray-900 text-sm">
          {formatCurrency(e.approvedAmount || e.amount)}
        </span>
      )
    },
    {
      key: 'approvalStatus',
      header: 'Status',
      sortable: true,
      render: e => <Badge status={e.approvalStatus} />
    },
    {
      key: 'actions',
      header: 'Audit Action',
      align: 'right',
      render: e => (
        <div className="flex items-center justify-end gap-1.5" onClick={ev => ev.stopPropagation()}>
          {e.approvalStatus === 'pending' ? (
            <>
              <button
                onClick={() => handleApprove(e.tripId, e.id)}
                title="Approve expense into advance settlement"
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs"
              >
                <Check className="w-3 h-3" /> Approve
              </button>
              <button
                onClick={() => handleReject(e.tripId, e.id)}
                title="Reject expense"
                className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded text-[11px] font-semibold flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Reject
              </button>
            </>
          ) : (
            <span className="text-[11px] text-gray-400 font-medium">
              {e.reviewer || 'Audited'}
            </span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Top metric row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Awaiting Audit Approval</span>
          <div className="text-xl font-bold text-amber-700 mt-1">{pendingCount} expenses ({formatCurrency(pendingTotal)})</div>
          <span className="text-xs text-gray-400">Not yet allocated to advance balance</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Approved Reconciled Expenses</span>
          <div className="text-xl font-bold text-emerald-800 mt-1">{formatCurrency(approvedTotal)}</div>
          <span className="text-xs text-gray-400">Credited to advance settlements</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Rule 13 Compliance</span>
          <div className="text-xs font-semibold text-gray-800 mt-1.5 leading-snug">
            Only approved expenses count toward driver advance settlement. Unapproved entries are excluded.
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${feedback.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`} />
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="font-bold ml-2">×</button>
        </div>
      )}

      {/* Header & Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Trip Expense Auditing</h2>
          <p className="text-xs text-gray-500">
            Review receipts, tolls, Hamali labor, and refreshments submitted across all fleet trip sheets
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs text-gray-700"
        >
          <option value="all">All Approval States</option>
          <option value="pending">Pending Approval Only</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <DataTable
        data={filteredExpenses}
        columns={columns}
        searchPlaceholder="Search by trip #, driver, or description..."
        searchFilter={(e, q) =>
          e.tripNumber.toLowerCase().includes(q) ||
          e.driverName.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
        }
      />
    </div>
  );
};
