import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { Trip } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { formatCurrency, formatDate, formatKm, formatLitres, formatMileage } from '../../utils/formatters';
import { Percent, Check, X, Edit3, ShieldAlert, CheckCircle2, History, Info } from 'lucide-react';

export const FuelDeductionsView: React.FC = () => {
  const { trips, approveFuelDeduction, rejectFuelDeduction, adjustFuelDeduction } = useFleetStore();

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [mandatoryReason, setMandatoryReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Trips that have potential or approved fuel deductions
  const deductionTrips = trips.filter(
    t => t.fuelDeduction.potentialDeductionAmount > 0 || t.fuelDeduction.approvedDeductionAmount > 0
  );

  const filteredTrips = React.useMemo(() => {
    if (statusFilter === 'all') return deductionTrips;
    return deductionTrips.filter(t => t.fuelDeduction.reviewStatus === statusFilter);
  }, [deductionTrips, statusFilter]);

  // Summary Metrics
  const totalPotential = deductionTrips.reduce((s, t) => s + t.fuelDeduction.potentialDeductionAmount, 0);
  const pendingCount = deductionTrips.filter(t => t.fuelDeduction.reviewStatus === 'pending_review').length;
  const pendingAmount = deductionTrips
    .filter(t => t.fuelDeduction.reviewStatus === 'pending_review')
    .reduce((s, t) => s + t.fuelDeduction.potentialDeductionAmount, 0);

  const approvedCount = deductionTrips.filter(t => t.fuelDeduction.reviewStatus === 'approved' || t.fuelDeduction.reviewStatus === 'adjusted').length;
  const approvedAmount = deductionTrips
    .filter(t => t.fuelDeduction.reviewStatus === 'approved' || t.fuelDeduction.reviewStatus === 'adjusted')
    .reduce((s, t) => s + (t.fuelDeduction.approvedDeductionAmount || 0), 0);

  const postedCount = deductionTrips.filter(t => t.fuelDeduction.reviewStatus === 'posted_to_payroll').length;
  const postedAmount = deductionTrips
    .filter(t => t.fuelDeduction.reviewStatus === 'posted_to_payroll')
    .reduce((s, t) => s + (t.fuelDeduction.approvedDeductionAmount || 0), 0);

  const rejectedCount = deductionTrips.filter(t => t.fuelDeduction.reviewStatus === 'rejected').length;

  const handleApprove = (trip: Trip) => {
    approveFuelDeduction(trip.id, 'Approved by audit committee');
    setFeedback(`Approved fuel deduction of ₹${trip.fuelDeduction.potentialDeductionAmount} for ${trip.tripNumber}`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleReject = (trip: Trip) => {
    rejectFuelDeduction(trip.id, 'Waived per driver appeal due to documented grade/traffic slowdown');
    setFeedback(`Waived / rejected deduction for ${trip.tripNumber}`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleOpenAdjust = (trip: Trip) => {
    setSelectedTrip(trip);
    setAdjustAmount(trip.fuelDeduction.potentialDeductionAmount);
    setMandatoryReason('');
    setIsAdjustModalOpen(true);
  };

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !mandatoryReason.trim()) {
      alert('Mandatory justification is required to adjust deduction amounts.');
      return;
    }
    adjustFuelDeduction(selectedTrip.id, Number(adjustAmount), mandatoryReason.trim());
    setIsAdjustModalOpen(false);
    setFeedback(`Adjusted fuel deduction for ${selectedTrip.tripNumber} to ₹${adjustAmount}`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const columns: Column<Trip>[] = [
    {
      key: 'tripNumber',
      header: 'Trip #',
      sortable: true,
      render: t => (
        <div>
          <span className="font-mono font-bold text-emerald-800 text-xs block">{t.tripNumber}</span>
          <span className="text-[10px] text-gray-400 font-sans">{formatDate(t.startDate)}</span>
        </div>
      )
    },
    {
      key: 'driverName',
      header: 'Pilot / Driver',
      sortable: true,
      render: t => (
        <div>
          <span className="font-semibold text-gray-900">{t.driverName}</span>
          <span className="text-[10px] text-gray-400 font-mono block">{t.driverNumber}</span>
        </div>
      )
    },
    {
      key: 'vehicleReg',
      header: 'Vehicle',
      sortable: true,
      render: t => <span className="font-mono font-medium text-gray-800">{t.vehicleReg}</span>
    },
    {
      key: 'acceptedDistance',
      header: 'Distance',
      sortable: true,
      align: 'right',
      render: t => <span className="font-mono">{formatKm(t.distance.acceptedDistance)}</span>
    },
    {
      key: 'actualMileage',
      header: 'Actual (km/L)',
      sortable: true,
      align: 'right',
      render: t => (
        <span className="font-mono font-semibold text-gray-800">
          {formatMileage(t.fuel.tripMileageKmPerLitre)}
        </span>
      )
    },
    {
      key: 'benchmark',
      header: 'Benchmark Target',
      sortable: true,
      align: 'right',
      render: t => (
        <div className="font-mono text-xs">
          <span>{t.fuelDeduction.benchmarkMileage} km/L</span>
          <span className="text-[10px] text-gray-400 block">(+{t.fuelDeduction.tolerancePercent}% tol)</span>
        </div>
      )
    },
    {
      key: 'excessFuel',
      header: 'Excess Fuel',
      sortable: true,
      align: 'right',
      render: t => (
        <span className="font-mono font-bold text-rose-700">
          {formatLitres(t.fuelDeduction.excessFuelLitres)}
        </span>
      )
    },
    {
      key: 'potentialDeduction',
      header: 'Potential Deduction',
      sortable: true,
      align: 'right',
      render: t => (
        <span className="font-mono font-bold text-gray-900">
          {formatCurrency(t.fuelDeduction.potentialDeductionAmount)}
        </span>
      )
    },
    {
      key: 'approvedDeduction',
      header: 'Approved for Payroll',
      sortable: true,
      align: 'right',
      render: t => (
        <span className="font-mono font-bold text-emerald-800">
          {formatCurrency(t.fuelDeduction.approvedDeductionAmount)}
        </span>
      )
    },
    {
      key: 'reviewStatus',
      header: 'Audit Status',
      sortable: true,
      render: t => <Badge status={t.fuelDeduction.reviewStatus} />
    },
    {
      key: 'actions',
      header: 'Audit Review',
      align: 'right',
      render: t => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          {t.fuelDeduction.reviewStatus === 'pending_review' ? (
            <>
              <button
                onClick={() => handleApprove(t)}
                title="Approve deduction"
                className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs"
              >
                <Check className="w-3 h-3" /> Approve
              </button>
              <button
                onClick={() => handleOpenAdjust(t)}
                title="Adjust amount with mandatory reason"
                className="px-2 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-[11px] font-semibold flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" /> Adjust
              </button>
              <button
                onClick={() => handleReject(t)}
                title="Reject or waive deduction"
                className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded text-[11px] font-semibold flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Waive
              </button>
            </>
          ) : (
            <span className="text-[10px] text-gray-400 capitalize">
              {t.fuelDeduction.reviewStatus.replace(/_/g, ' ')}
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
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total Potential</span>
          <div className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalPotential)}</div>
          <span className="text-xs text-gray-400">{deductionTrips.length} trips evaluated</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">Pending Audit Review</span>
          <div className="text-xl font-bold text-amber-800 mt-1">{formatCurrency(pendingAmount)}</div>
          <span className="text-xs text-amber-700">{pendingCount} trips awaiting sign-off</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">Approved Deductions</span>
          <div className="text-xl font-bold text-emerald-800 mt-1">{formatCurrency(approvedAmount)}</div>
          <span className="text-xs text-emerald-700">{approvedCount} ready for payroll</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Posted to Payroll</span>
          <div className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(postedAmount)}</div>
          <span className="text-xs text-gray-400">Rule 16: Sealed from reposting</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Waived / Rejected</span>
          <div className="text-xl font-bold text-gray-600 mt-1">{rejectedCount}</div>
          <span className="text-xs text-gray-400">Terrain / technical appeals</span>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Header and Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Fuel Deduction Audit Queue</h2>
          <p className="text-xs text-gray-500">
            Rule 15 & 16: Review and approve excess fuel deductions before monthly payroll posting. Unapproved items are strictly blocked from payroll.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs text-gray-700"
        >
          <option value="all">All Audit States</option>
          <option value="pending_review">Pending Review Only</option>
          <option value="approved">Approved</option>
          <option value="adjusted">Adjusted</option>
          <option value="posted_to_payroll">Posted to Payroll</option>
          <option value="rejected">Rejected / Waived</option>
        </select>
      </div>

      <DataTable
        data={filteredTrips}
        columns={columns}
        searchPlaceholder="Search by trip #, driver name, or vehicle..."
        searchFilter={(t, q) =>
          t.tripNumber.toLowerCase().includes(q) ||
          t.driverName.toLowerCase().includes(q) ||
          t.vehicleReg.toLowerCase().includes(q)
        }
      />

      {/* Modal: Adjust Fuel Deduction with Mandatory Reason */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Adjust Proposed Fuel Deduction"
        subtitle={`Trip ${selectedTrip?.tripNumber} • Driver: ${selectedTrip?.driverName}`}
        maxWidth="md"
      >
        <form onSubmit={handleConfirmAdjust} className="space-y-4 text-xs">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Calculated Proposed Deduction:</span>
              <span className="font-mono font-bold text-gray-900">
                {formatCurrency(selectedTrip?.fuelDeduction.potentialDeductionAmount || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Excess Fuel Litres:</span>
              <span className="font-mono font-bold text-rose-700">
                {formatLitres(selectedTrip?.fuelDeduction.excessFuelLitres || 0)}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Adjusted Amount (₹) *
            </label>
            <input
              type="number"
              required
              value={adjustAmount}
              onChange={e => setAdjustAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono font-bold text-sm bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Mandatory Audit Reason / Justification *
            </label>
            <textarea
              rows={3}
              required
              value={mandatoryReason}
              onChange={e => setMandatoryReason(e.target.value)}
              placeholder="e.g. Engine telemetry confirms high idle at border checkpoint; approved 50% waiver."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-3 py-1.5 font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
            >
              Save Adjustment & Approve
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
