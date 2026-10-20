import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useFleetStore } from '../../services/store';
import { Trip, TripExpense } from '../../types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatKm,
  formatLitres,
  formatMileage
} from '../../utils/formatters';
import {
  FileSpreadsheet,
  Truck,
  User,
  Gauge,
  Fuel,
  Receipt,
  Scale,
  Percent,
  Network,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Check,
  X,
  Edit3,
  Send
} from 'lucide-react';

interface TripDetailModalProps {
  trip: Trip | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TripDetailModal: React.FC<TripDetailModalProps> = ({
  trip,
  isOpen,
  onClose
}) => {
  const {
    approveExpense,
    rejectExpense,
    recordSettlementReturn,
    authorizePayrollAdvanceRecovery,
    approveFuelDeduction,
    rejectFuelDeduction,
    adjustFuelDeduction,
    triggerTLCMTyreAttribution,
    completeTrip
  } = useFleetStore();

  const [activeTab, setActiveTab] = useState<'odometer' | 'route' | 'fuel' | 'expenses' | 'settlement' | 'fuel-deduction' | 'tlcm'>('odometer');
  
  // Adjustment state for fuel deduction
  const [isAdjustingDeduction, setIsAdjustingDeduction] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [mandatoryReason, setMandatoryReason] = useState('');

  // Settlement return state
  const [returnInput, setReturnInput] = useState<number>(0);
  const [isReturning, setIsReturning] = useState(false);

  // Status message
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!trip) return null;

  const handleApproveExpense = (expId: string) => {
    approveExpense(trip.id, expId);
    setActionFeedback({ message: 'Expense approved and reconciled into advance balance.', type: 'success' });
  };

  const handleRejectExpense = (expId: string) => {
    rejectExpense(trip.id, expId, 'Policy limit exceeded');
    setActionFeedback({ message: 'Expense rejected.', type: 'error' });
  };

  const handleApproveDeduction = () => {
    approveFuelDeduction(trip.id, 'Approved by fleet auditor');
    setActionFeedback({ message: 'Fuel deduction approved for monthly payroll inclusion.', type: 'success' });
  };

  const handleRejectDeduction = () => {
    rejectFuelDeduction(trip.id, 'Exemption approved by audit committee due to extreme terrain grade.');
    setActionFeedback({ message: 'Fuel deduction waived / rejected.', type: 'error' });
  };

  const handleConfirmAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mandatoryReason.trim()) {
      alert('A mandatory reason is required to adjust a proposed fuel deduction.');
      return;
    }
    adjustFuelDeduction(trip.id, Number(adjustAmount), mandatoryReason.trim());
    setIsAdjustingDeduction(false);
    setActionFeedback({ message: `Fuel deduction adjusted to ₹${adjustAmount} with audit justification.`, type: 'success' });
  };

  const handleConfirmReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (returnInput <= 0) return;
    recordSettlementReturn(trip.id, Number(returnInput));
    setIsReturning(false);
    setReturnInput(0);
    setActionFeedback({ message: `Recorded cash return of ₹${returnInput} from driver.`, type: 'success' });
  };

  const handleAuthorizeRecovery = () => {
    authorizePayrollAdvanceRecovery(trip.id, trip.settlement.outstandingBalance);
    setActionFeedback({
      message: `Authorized recovery of ₹${trip.settlement.outstandingBalance} through upcoming driver payroll run.`,
      type: 'success'
    });
  };

  const handleTriggerTyreAttribution = () => {
    const res = triggerTLCMTyreAttribution(trip.id);
    setActionFeedback({ message: res.message, type: res.success ? 'success' : 'error' });
  };

  const handleMarkCompleted = () => {
    const res = completeTrip(trip.id);
    setActionFeedback({
      message: res.warnings.length > 0 ? `Trip completed with warnings: ${res.warnings.join(' ')}` : 'Trip completed operationally.',
      type: 'success'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Trip Sheet: ${trip.tripNumber}`}
      subtitle={`${trip.driverName} (${trip.driverNumber}) • ${trip.vehicleReg}`}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Action feedback toast */}
        {actionFeedback && (
          <div
            className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{actionFeedback.message}</span>
            <button onClick={() => setActionFeedback(null)} className="font-bold ml-2">×</button>
          </div>
        )}

        {/* Top Operational Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs">
          <div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Operational Status</span>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge status={trip.status} />
              {trip.status !== 'completed' && (
                <button
                  onClick={handleMarkCompleted}
                  className="px-2 py-0.5 rounded bg-emerald-700 text-white font-bold text-[10px] hover:bg-emerald-800"
                >
                  Mark Complete
                </button>
              )}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Accepted Distance</span>
            <div className="mt-1 font-bold text-gray-900 text-sm font-mono">
              {formatKm(trip.distance.acceptedDistance)}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Advance Settlement</span>
            <div className="mt-1 font-bold text-sm">
              <span className={trip.settlement.outstandingBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                {formatCurrency(trip.settlement.outstandingBalance)}
              </span>
              <span className="text-[10px] text-gray-400 font-normal ml-1">({trip.settlement.status.replace(/_/g, ' ')})</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Fuel Deduction</span>
            <div className="mt-1 font-bold text-sm text-gray-900">
              {formatCurrency(trip.fuelDeduction.approvedDeductionAmount || trip.fuelDeduction.potentialDeductionAmount)}
              <span className="text-[10px] text-gray-400 font-normal ml-1">({trip.fuelDeduction.reviewStatus.replace(/_/g, ' ')})</span>
            </div>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto text-xs font-semibold space-x-1">
          {[
            { id: 'odometer', label: 'Odometer & Distance', icon: Gauge },
            { id: 'route', label: `Route Segments (${trip.routeSegments.length})`, icon: Truck },
            { id: 'fuel', label: 'Fuel & Mileage', icon: Fuel },
            { id: 'expenses', label: `Expenses (${trip.expenses.length})`, icon: Receipt },
            { id: 'settlement', label: 'Advance Settlement', icon: Scale },
            { id: 'fuel-deduction', label: 'Fuel Deduction', icon: Percent },
            { id: 'tlcm', label: 'TLCM Pro Attribution', icon: Network }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 py-2 px-3 border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-md font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Odometer & Distance */}
        {activeTab === 'odometer' && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-gray-200 bg-white">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Starting Odometer</span>
                <span className="text-base font-bold text-gray-900 font-mono">
                  {trip.odometer.startingReading !== undefined ? formatKm(trip.odometer.startingReading) : 'Unavailable'}
                </span>
                <span className="text-[10px] text-gray-400 block mt-1">Source: {trip.odometer.startingSource || 'measured'}</span>
              </div>
              <div className="p-3 rounded-lg border border-gray-200 bg-white">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Ending Odometer</span>
                <span className="text-base font-bold text-gray-900 font-mono">
                  {trip.odometer.endingReading !== undefined ? formatKm(trip.odometer.endingReading) : 'Unavailable'}
                </span>
                <span className="text-[10px] text-gray-400 block mt-1">Source: {trip.odometer.endingSource || 'measured'}</span>
              </div>
              <div className="p-3 rounded-lg border border-gray-200 bg-white">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Accepted Distance</span>
                <span className="text-base font-bold text-emerald-800 font-mono">
                  {formatKm(trip.distance.acceptedDistance)}
                </span>
                <span className="text-[10px] text-gray-400 block mt-1">Reported: {trip.distance.reportedDistance ? formatKm(trip.distance.reportedDistance) : '—'}</span>
              </div>
            </div>

            {/* Case Notice */}
            <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="font-bold text-gray-800">
                  Evaluation Case: <span className="font-mono text-emerald-800">{trip.odometer.odometerCase.toUpperCase()}</span>
                </span>
                <Badge status={trip.odometer.validationStatus} />
              </div>

              {trip.odometer.discrepancyFlag && (
                <div className="mt-2 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-900">
                  <strong>Discrepancy:</strong> {trip.odometer.discrepancyReason}
                </div>
              )}

              {trip.odometer.odometerCase === 'case_2_derived_ending' && (
                <p className="mt-2 text-gray-600">
                  Provisional derived reading applied based on driver GPS waybill. Marked as derived, not measured.
                </p>
              )}

              {trip.odometer.odometerCase === 'case_3_unreported_odometer' && (
                <p className="mt-2 text-amber-800">
                  Odometer readings unrecorded. Trip accepted for operational reporting only; tyre attribution is held until validation.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Route Segments */}
        {activeTab === 'route' && (
          <div className="space-y-2 text-xs">
            <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden bg-white">
              {trip.routeSegments.map((seg, idx) => (
                <div key={seg.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                      {seg.sequence}
                    </span>
                    <div>
                      <span className="font-bold text-gray-900">{seg.fromLocation} → {seg.toLocation}</span>
                      {seg.notes && <span className="text-gray-400 ml-2">({seg.notes})</span>}
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        Dep: {seg.departureTime || '—'} • Arr: {seg.arrivalTime || '—'}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-gray-900">{formatKm(seg.distanceKm)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Fuel & Mileage */}
        {activeTab === 'fuel' && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-gray-200 bg-white">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Opening Tank</span>
                <span className="text-base font-bold text-gray-900 font-mono">
                  {trip.fuel.openingFuelQuantity !== undefined ? formatLitres(trip.fuel.openingFuelQuantity) : '—'}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-gray-200 bg-white">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Fuel Added</span>
                <span className="text-base font-bold text-gray-900 font-mono">
                  {trip.fuel.fuelAddedDuringTrip !== undefined ? formatLitres(trip.fuel.fuelAddedDuringTrip) : '—'}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-gray-200 bg-white">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Closing Tank</span>
                <span className="text-base font-bold text-gray-900 font-mono">
                  {trip.fuel.closingFuelQuantity !== undefined ? formatLitres(trip.fuel.closingFuelQuantity) : '—'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-semibold">Accepted Trip Fuel</span>
                <span className="text-lg font-bold text-emerald-800 font-mono">
                  {formatLitres(trip.fuel.acceptedFuelLitres)}
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Method: {trip.fuel.measurementMethod.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 block text-[10px] uppercase font-semibold">Calculated Mileage</span>
                <span className="text-lg font-bold text-gray-900 font-mono">
                  {formatMileage(trip.fuel.tripMileageKmPerLitre)}
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Formula: {trip.distance.acceptedDistance} km ÷ {trip.fuel.acceptedFuelLitres} L
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Trip Expenses */}
        {activeTab === 'expenses' && (
          <div className="space-y-3 text-xs">
            <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden bg-white">
              {trip.expenses.map(exp => (
                <div key={exp.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{exp.category}</span>
                      <Badge status={exp.approvalStatus} />
                    </div>
                    <p className="text-gray-600 mt-0.5">{exp.description}</p>
                    <span className="text-[10px] text-gray-400">
                      Receipt: {exp.receiptReference || 'None'} • Payment: {exp.paymentMethod}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 font-mono text-sm">
                      {formatCurrency(exp.approvedAmount || exp.amount)}
                    </span>
                    {exp.approvalStatus === 'pending' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleApproveExpense(exp.id)}
                          className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold text-[11px]"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectExpense(exp.id)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-semibold text-[11px]"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: Advance Settlement */}
        {activeTab === 'settlement' && (
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Advances Issued Against Trip:</span>
                <span className="font-bold font-mono text-gray-900">
                  {formatCurrency(trip.settlement.totalAdvancesIssued)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>− Less Total Approved Expenses:</span>
                <span className="font-bold font-mono">
                  − {formatCurrency(trip.settlement.totalApprovedExpenses)}
                </span>
              </div>
              <div className="flex justify-between text-blue-800">
                <span>− Less Amount Returned by Driver:</span>
                <span className="font-bold font-mono">
                  − {formatCurrency(trip.settlement.amountReturnedByDriver)}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm">
                <span className="text-rose-800">Outstanding Settlement Balance:</span>
                <span className="font-mono text-rose-800">
                  {formatCurrency(trip.settlement.outstandingBalance)}
                </span>
              </div>
            </div>

            {/* Actions for settlement */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {trip.settlement.outstandingBalance > 0 && (
                <>
                  <button
                    onClick={() => setIsReturning(!isReturning)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 font-semibold text-gray-700"
                  >
                    Record Cash Return
                  </button>
                  <button
                    onClick={handleAuthorizeRecovery}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                  >
                    Authorize Payroll Recovery
                  </button>
                </>
              )}
            </div>

            {isReturning && (
              <form onSubmit={handleConfirmReturn} className="p-3 bg-white border border-gray-200 rounded-lg flex items-center gap-2">
                <span className="font-semibold text-gray-700">Cash Return (₹):</span>
                <input
                  type="number"
                  required
                  max={trip.settlement.outstandingBalance}
                  value={returnInput}
                  onChange={e => setReturnInput(Number(e.target.value))}
                  className="w-32 px-2 py-1 rounded border border-gray-300 font-mono font-bold"
                />
                <button type="submit" className="px-3 py-1 bg-emerald-700 text-white rounded font-semibold">
                  Confirm
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 6: Fuel Deduction */}
        {activeTab === 'fuel-deduction' && (
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <div>
                  <span className="font-bold text-gray-900">Benchmark: {trip.fuelDeduction.benchmarkName}</span>
                  <p className="text-[11px] text-gray-500 font-mono">
                    Target: {trip.fuelDeduction.benchmarkMileage} km/L • Tolerance: +{trip.fuelDeduction.tolerancePercent}%
                  </p>
                </div>
                <Badge status={trip.fuelDeduction.reviewStatus} />
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded bg-white border border-gray-200">
                  <span className="text-gray-400 block text-[10px]">Expected</span>
                  <span className="font-bold font-mono">{formatLitres(trip.fuelDeduction.expectedFuelLitres)}</span>
                </div>
                <div className="p-2 rounded bg-white border border-gray-200">
                  <span className="text-gray-400 block text-[10px]">Allowed (+5%)</span>
                  <span className="font-bold font-mono">{formatLitres(trip.fuelDeduction.allowedFuelLitres)}</span>
                </div>
                <div className="p-2 rounded bg-white border border-gray-200">
                  <span className="text-gray-400 block text-[10px]">Actual</span>
                  <span className="font-bold font-mono">{formatLitres(trip.fuel.acceptedFuelLitres)}</span>
                </div>
                <div className="p-2 rounded bg-white border border-gray-200">
                  <span className="text-gray-400 block text-[10px]">Excess Fuel</span>
                  <span className="font-bold font-mono text-rose-700">{formatLitres(trip.fuelDeduction.excessFuelLitres)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                <div>
                  <span className="text-gray-600 block">Proposed Potential Deduction:</span>
                  <span className="font-mono text-base font-bold text-rose-700">
                    {formatCurrency(trip.fuelDeduction.potentialDeductionAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 block">Approved Payroll Amount:</span>
                  <span className="font-mono text-base font-bold text-emerald-800">
                    {formatCurrency(trip.fuelDeduction.approvedDeductionAmount)}
                  </span>
                </div>
              </div>

              {trip.fuelDeduction.adjustmentReason && (
                <div className="p-2.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-900">
                  <strong>Audit Adjustment Note:</strong> {trip.fuelDeduction.adjustmentReason}
                </div>
              )}
            </div>

            {/* Audit Approval Buttons */}
            {trip.fuelDeduction.reviewStatus === 'pending_review' && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleApproveDeduction}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Approve Full Amount
                </button>
                <button
                  onClick={() => {
                    setAdjustAmount(trip.fuelDeduction.potentialDeductionAmount);
                    setIsAdjustingDeduction(true);
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded font-semibold flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Adjust with Reason
                </button>
                <button
                  onClick={handleRejectDeduction}
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded font-semibold flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Reject / Waive
                </button>
              </div>
            )}

            {isAdjustingDeduction && (
              <form onSubmit={handleConfirmAdjustment} className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                <h5 className="font-bold text-gray-800">Adjust Proposed Fuel Deduction</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Adjusted Deduction Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      value={adjustAmount}
                      onChange={e => setAdjustAmount(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded border border-gray-300 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Mandatory Audit Justification *</label>
                    <input
                      type="text"
                      required
                      value={mandatoryReason}
                      onChange={e => setMandatoryReason(e.target.value)}
                      placeholder="e.g. Engine injector telemetry verified..."
                      className="w-full px-2 py-1 rounded border border-gray-300"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAdjustingDeduction(false)}
                    className="px-3 py-1 text-gray-600 border border-gray-300 rounded font-semibold"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-3 py-1 bg-emerald-700 text-white rounded font-semibold">
                    Save Adjustment
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 7: TLCM Pro Integration */}
        {activeTab === 'tlcm' && (
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="font-bold text-gray-900">TLCM Pro Tyre Attribution Engine</span>
                <Badge status={trip.distance.tyreAttributionStatus} />
              </div>

              <div className="text-gray-600 space-y-1">
                <div>
                  <strong>Attribution Distance:</strong> {formatKm(trip.distance.acceptedDistance)}
                </div>
                <div>
                  <strong>Odometer Telemetry Sync:</strong> {trip.tlcmIntegration.odometerSubmitted ? 'Pushed to vehicle master' : 'Pending'}
                </div>
                <div>
                  <strong>Rule 22 Compliance:</strong> STEPNEY / spare tyres are strictly excluded from usage distance accumulation.
                </div>
              </div>

              {trip.distance.tyreAttributionHoldReason && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800">
                  <strong>Hold Notice:</strong> {trip.distance.tyreAttributionHoldReason}
                </div>
              )}
            </div>

            {trip.distance.tyreAttributionStatus !== 'attributed' && (
              <button
                onClick={handleTriggerTyreAttribution}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Trigger Tyre Attribution Event
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
