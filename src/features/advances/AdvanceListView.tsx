import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { advanceApi, settlementApi } from '../../services/api';
import { DriverAdvance, AdvanceType } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { HandCoins, Plus, ArrowUpRight, CheckCircle2, ShieldCheck, DollarSign } from 'lucide-react';

export const AdvanceListView: React.FC = () => {
  const { advances, drivers, vehicles, trips, issueAdvance, recordSettlementReturn, refreshAdvances, refreshTrips } = useFleetStore();

  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<DriverAdvance | null>(null);
  const [returnAmount, setReturnAmount] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for issuing advance
  const [driverId, setDriverId] = useState(drivers[0]?.id || '');

  React.useEffect(() => {
    if (!driverId && drivers.length > 0) {
      setDriverId(drivers[0].id);
    }
  }, [drivers, driverId]);

  const [vehicleId, setVehicleId] = useState('');
  const [tripId, setTripId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState<number>(5000);
  const [advanceType, setAdvanceType] = useState<AdvanceType>('trip_advance');
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'Cash' | 'Fuel Card' | 'Cheque'>('Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState(`ADV-VCH-${Math.floor(1000 + Math.random() * 9000)}`);
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const totalIssued = advances.reduce((sum, a) => sum + a.advanceAmount, 0);
  const totalAllocatedExpenses = advances.reduce((sum, a) => sum + a.approvedExpensesAllocated, 0);
  const totalReturned = advances.reduce((sum, a) => sum + a.amountReturned, 0);
  const totalOutstanding = advances.reduce((sum, a) => sum + a.outstandingBalance, 0);

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId || advanceAmount <= 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await advanceApi.create({
        driverId,
        tripId: tripId || null,
        referenceNumber,
        transactionDate: advanceDate,
        transactionType: 'advance_issued',
        advanceType: advanceType === 'trip_advance' ? 'trip_advance' : 'operational_advance',
        amount: Number(advanceAmount),
        currency: 'INR',
        paymentMethod: paymentMethod.toLowerCase(),
        notes: notes.trim() || null,
      });

      // If tied to trip, allocate advance to the trip
      if (tripId) {
        try {
          await advanceApi.allocateToTrip(tripId, advanceAmount);
        } catch (allocErr) {
          console.warn('Advance allocation note:', allocErr);
        }
      }

      await refreshAdvances();
      await refreshTrips();
      setFeedback({ message: `Successfully issued advance of ₹${advanceAmount} to driver.`, type: 'success' });
      setIsIssueModalOpen(false);
      setNotes('');
      setReferenceNumber(`ADV-VCH-${Math.floor(1000 + Math.random() * 9000)}`);
    } catch (err: any) {
      setFeedback({ message: err?.message || 'Failed to issue advance.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReturnModal = (adv: DriverAdvance) => {
    setSelectedAdvance(adv);
    setReturnAmount(adv.outstandingBalance);
    setIsReturnModalOpen(true);
  };

  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvance || returnAmount <= 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (selectedAdvance.tripId) {
        await settlementApi.recordCashReturn(selectedAdvance.tripId, {
          amount: Number(returnAmount),
          referenceNumber: `RET-${Date.now().toString().slice(-6)}`,
          transactionDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'cash',
          notes: 'Driver cash return against outstanding advance',
        });
      } else {
        await advanceApi.create({
          driverId: selectedAdvance.driverId,
          referenceNumber: `RET-${Date.now().toString().slice(-6)}`,
          transactionDate: new Date().toISOString().split('T')[0],
          transactionType: 'cash_return',
          amount: Number(returnAmount),
          currency: 'INR',
          paymentMethod: 'cash',
          notes: 'Cash return for unallocated driver advance',
        });
      }

      await refreshAdvances();
      await refreshTrips();
      setFeedback({ message: `Recorded cash return of ₹${returnAmount}.`, type: 'success' });
      setIsReturnModalOpen(false);
    } catch (err: any) {
      setFeedback({ message: err?.message || 'Failed to record cash return.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<DriverAdvance>[] = [
    {
      key: 'advanceDate',
      header: 'Date',
      sortable: true,
      render: a => <span className="font-medium text-gray-700">{formatDate(a.advanceDate)}</span>
    },
    {
      key: 'referenceNumber',
      header: 'Reference #',
      sortable: true,
      render: a => <span className="font-mono font-bold text-gray-900">{a.referenceNumber}</span>
    },
    {
      key: 'driverName',
      header: 'Driver',
      sortable: true,
      render: a => (
        <div>
          <span className="font-semibold text-gray-900">{a.driverName}</span>
          <span className="text-[11px] text-gray-400 block font-mono">{a.driverNumber}</span>
        </div>
      )
    },
    {
      key: 'advanceType',
      header: 'Advance Type',
      sortable: true,
      render: a => (
        <span className="capitalize px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 font-medium">
          {a.advanceType.replace(/_/g, ' ')}
        </span>
      )
    },
    {
      key: 'tripNumber',
      header: 'Linked Trip #',
      render: a => (
        <span className="font-mono text-emerald-800 font-semibold">
          {a.tripNumber || <span className="text-gray-400 italic font-sans">Pre-trip advance</span>}
        </span>
      )
    },
    {
      key: 'advanceAmount',
      header: 'Issued Amount',
      sortable: true,
      align: 'right',
      render: a => <span className="font-bold text-gray-900">{formatCurrency(a.advanceAmount)}</span>
    },
    {
      key: 'approvedExpensesAllocated',
      header: 'Approved Expenses',
      align: 'right',
      render: a => (
        <span className="font-medium text-gray-600">
          {formatCurrency(a.approvedExpensesAllocated)}
        </span>
      )
    },
    {
      key: 'amountReturned',
      header: 'Returned',
      align: 'right',
      render: a => (
        <span className="font-medium text-emerald-700">
          {formatCurrency(a.amountReturned)}
        </span>
      )
    },
    {
      key: 'outstandingBalance',
      header: 'Outstanding Balance',
      sortable: true,
      align: 'right',
      render: a => (
        <span className={`font-bold ${a.outstandingBalance > 0 ? 'text-rose-700' : 'text-gray-400'}`}>
          {formatCurrency(a.outstandingBalance)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: a => <Badge status={a.status} />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: a => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          {a.outstandingBalance > 0 && a.tripId && (
            <button
              onClick={() => handleOpenReturnModal(a)}
              className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 rounded text-[11px] font-semibold transition-colors"
            >
              Record Return
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Advances Issued</span>
          <div className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalIssued)}</div>
          <span className="text-xs text-gray-400">{advances.length} transactions</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Approved Expenses Settled</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(totalAllocatedExpenses)}</div>
          <span className="text-xs text-gray-400">Reconciled against slips</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Cash Returned by Drivers</span>
          <div className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(totalReturned)}</div>
          <span className="text-xs text-gray-400">Credited to treasury</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Outstanding Driver Advances</span>
          <div className="text-xl font-bold text-rose-700 mt-1">{formatCurrency(totalOutstanding)}</div>
          <span className="text-xs text-rose-600">Active ledger balances</span>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="font-bold ml-2">×</button>
        </div>
      )}

      {/* Table & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Driver Advance Ledger</h2>
          <p className="text-xs text-gray-500">
            Rule 3 & 14: Every advance is an independent transaction; outstanding advances are not automatic salary deductions.
          </p>
        </div>

        <button
          onClick={() => setIsIssueModalOpen(true)}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Disburse Driver Advance</span>
        </button>
      </div>

      <DataTable
        data={advances}
        columns={columns}
        searchPlaceholder="Search by reference #, driver name, or trip #..."
        searchFilter={(a, q) =>
          a.referenceNumber.toLowerCase().includes(q) ||
          a.driverName.toLowerCase().includes(q) ||
          a.driverNumber.toLowerCase().includes(q) ||
          (a.tripNumber?.toLowerCase().includes(q) ?? false)
        }
      />

      {/* Modal: Issue Advance */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Disburse Driver Advance"
        subtitle="Issue operational or trip advance funds with independent transaction tracking."
        maxWidth="xl"
      >
        <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Driver *</label>
              <select
                value={driverId}
                onChange={e => {
                  setDriverId(e.target.value);
                  const d = drivers.find(drv => drv.id === e.target.value);
                  if (d?.currentVehicleId) setVehicleId(d.currentVehicleId);
                }}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
              >
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.driverNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Advance Amount (₹) *</label>
              <input
                type="number"
                required
                min={100}
                value={advanceAmount}
                onChange={e => setAdvanceAmount(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Advance Type *</label>
              <select
                value={advanceType}
                onChange={e => setAdvanceType(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
              >
                <option value="trip_advance">Trip Advance (For tolls/loading)</option>
                <option value="operational_advance">Operational Advance</option>
                <option value="other_approved">Other Approved Advance</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
              >
                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="Cash">Cash Voucher</option>
                <option value="Fuel Card">Fleet Fuel Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Disbursement Date</label>
              <input
                type="date"
                value={advanceDate}
                onChange={e => setAdvanceDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Reference / Voucher #</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Link to Active Trip (Optional)</label>
              <select
                value={tripId}
                onChange={e => setTripId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
              >
                <option value="">None (Stand-alone advance)</option>
                {trips.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.tripNumber} ({t.vehicleReg} - {t.driverName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Assigned Vehicle</label>
              <select
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
              >
                <option value="">Select vehicle...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber} ({v.vehicleType})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Notes & Purpose</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. En route toll FASTag recharge, interstate permit fees..."
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsIssueModalOpen(false)}
              className="px-4 py-2 font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
            >
              Confirm Disbursement
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record Cash Return */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Record Advance Return"
        subtitle="Driver returning unspent advance balance to company treasury."
        maxWidth="sm"
      >
        <form onSubmit={handleConfirmReturn} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Outstanding Advance: {formatCurrency(selectedAdvance?.outstandingBalance || 0)}
            </label>
            <input
              type="number"
              required
              max={selectedAdvance?.outstandingBalance || 0}
              value={returnAmount}
              onChange={e => setReturnAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 font-mono font-bold text-sm"
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-600 text-[11px]">
            This reduces the driver's outstanding advance ledger balance and updates the trip advance settlement calculation.
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
              Record Return
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
