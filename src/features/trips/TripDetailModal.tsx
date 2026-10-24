import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useFleetStore } from '../../services/store';
import { tripApi, expenseApi, advanceApi, settlementApi } from '../../services/api';
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
  Send,
  Plus
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
    completeTrip,
    refreshTrips,
    refreshAdvances,
    refreshExpenses
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
  const [backendCalculation, setBackendCalculation] = useState<any>(null);

  useEffect(() => {
    if (trip?.id) {
      settlementApi.getCalculation(trip.id)
        .then(res => setBackendCalculation(res))
        .catch(() => setBackendCalculation(null));
    }
  }, [trip?.id, activeTab]);

  // New expense form state
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newCategory, setNewCategory] = useState('tolls');
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState<number>(500);
  const [newReceipt, setNewReceipt] = useState('');

  // Edit tonnage modal/inline state
  const [isEditingTonnage, setIsEditingTonnage] = useState(false);
  const [targetSegmentId, setTargetSegmentId] = useState('');
  const [editedTonnage, setEditedTonnage] = useState<string>('24.5');

  const handleApproveExpense = async (expId: string) => {
    try {
      await expenseApi.review(expId, { action: 'approve' });
      await refreshExpenses();
      await refreshTrips();
      if (trip?.id) {
        settlementApi.getCalculation(trip.id).then(setBackendCalculation).catch(() => {});
      }
      setActionFeedback({ message: 'Expense approved and persisted to database.', type: 'success' });
    } catch (err: any) {
      setActionFeedback({ message: err?.message || 'Failed to approve expense on backend.', type: 'error' });
    }
  };

  const handleRejectExpense = async (expId: string) => {
    try {
      await expenseApi.review(expId, { action: 'reject', rejectionReason: 'Receipt documentation incomplete / policy limit exceeded' });
      await refreshExpenses();
      await refreshTrips();
      setActionFeedback({ message: 'Expense rejected on backend.', type: 'error' });
    } catch (err: any) {
      setActionFeedback({ message: err?.message || 'Failed to reject expense on backend.', type: 'error' });
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip?.id || newAmount <= 0) return;
    try {
      await expenseApi.submit({
        tripId: trip.id,
        driverId: trip.driverId,
        category: newCategory.toLowerCase(),
        description: newDesc.trim() || `${newCategory} expense`,
        amount: Number(newAmount),
        expenseDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        receiptReference: newReceipt.trim() || undefined,
      });
      setIsAddingExpense(false);
      setNewDesc('');
      setNewReceipt('');
      await refreshExpenses();
      await refreshTrips();
      if (trip?.id) {
        settlementApi.getCalculation(trip.id).then(setBackendCalculation).catch(() => {});
      }
      setActionFeedback({ message: 'Expense recorded successfully to trip.', type: 'success' });
    } catch (err: any) {
      setActionFeedback({ message: err?.message || 'Failed to record expense.', type: 'error' });
    }
  };

  const handleUpdateSegmentTonnage = async (segmentId: string, newTonnageValue: string) => {
    if (!trip?.id) return;
    try {
      await tripApi.updateRouteSegment(trip.id, segmentId, {
        tonnage: String(newTonnageValue),
      });
      await refreshTrips();
      setIsEditingTonnage(false);
      setActionFeedback({ message: `Updated segment tonnage to ${newTonnageValue} MT.`, type: 'success' });
    } catch (err: any) {
      setActionFeedback({ message: err?.message || 'Failed to update segment tonnage.', type: 'error' });
    }
  };

  const handleApproveDeduction = () => {
    if (!trip) return;
    approveFuelDeduction(trip.id, 'Approved by fleet auditor');
    setActionFeedback({ message: 'Fuel deduction approved for monthly payroll inclusion.', type: 'success' });
  };

  const handleRejectDeduction = () => {
    if (!trip) return;
    rejectFuelDeduction(trip.id, 'Exemption approved by audit committee due to extreme terrain grade.');
    setActionFeedback({ message: 'Fuel deduction waived / rejected.', type: 'error' });
  };

  const handleConfirmAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;
    if (!mandatoryReason.trim()) {
      alert('A mandatory reason is required to adjust a proposed fuel deduction.');
      return;
    }
    adjustFuelDeduction(trip.id, Number(adjustAmount), mandatoryReason.trim());
    setIsAdjustingDeduction(false);
    setActionFeedback({ message: `Fuel deduction adjusted to ₹${adjustAmount} with audit justification.`, type: 'success' });
  };

  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (returnInput <= 0 || !trip?.id) return;
    try {
      await settlementApi.recordCashReturn(trip.id, {
        amount: Number(returnInput),
        referenceNumber: `RET-${Date.now().toString().slice(-6)}`,
        transactionDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        notes: 'Cash return recorded from driver',
      });
      await refreshAdvances();
      await refreshTrips();
      settlementApi.getCalculation(trip.id).then(setBackendCalculation).catch(() => {});
      setIsReturning(false);
      setReturnInput(0);
      setActionFeedback({ message: `Recorded cash return of ₹${returnInput} into backend database.`, type: 'success' });
    } catch (err: any) {
      setActionFeedback({ message: err?.message || 'Failed to record cash return on backend.', type: 'error' });
    }
  };

  const handleAuthorizeRecovery = () => {
    if (!trip) return;
    authorizePayrollAdvanceRecovery(trip.id, trip.settlement.outstandingBalance);
    setActionFeedback({
      message: `Authorized recovery of ₹${trip.settlement.outstandingBalance} through upcoming driver payroll run.`,
      type: 'success'
    });
  };

  const handleTriggerTyreAttribution = () => {
    if (!trip) return;
    const res = triggerTLCMTyreAttribution(trip.id);
    setActionFeedback({ message: res.message, type: res.success ? 'success' : 'error' });
  };

  const handleMarkCompleted = async () => {
    if (!trip?.id) return;
    try {
      await tripApi.transition(trip.id, 'completed', trip.version || 1, 'Marked complete from trip details');
      await refreshTrips();
      setActionFeedback({ message: 'Trip successfully completed and persisted.', type: 'success' });
    } catch (err: any) {
      setActionFeedback({ message: err?.message || 'Failed to complete trip. Verify state machine requirements.', type: 'error' });
    }
  };

  const handleStartTrip = async () => {
    if (!trip?.id) return;
    try {
      await tripApi.transition(trip.id, 'in_progress', trip.version || 1, 'Trip dispatched from details modal');
      await refreshTrips();
      setActionFeedback({ message: 'Trip dispatched (in_progress) successfully.', type: 'success' });
    } catch (err: any) {
      setActionFeedback({ message: err?.message || 'Failed to start trip.', type: 'error' });
    }
  };

  if (!trip) return null;

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
              {trip.status === 'draft' && (
                <button
                  onClick={handleStartTrip}
                  className="px-2 py-0.5 rounded bg-emerald-700 text-white font-bold text-[10px] hover:bg-emerald-800"
                >
                  Start Trip
                </button>
              )}
              {trip.status === 'in_progress' && (
                <button
                  onClick={handleMarkCompleted}
                  className="px-2 py-0.5 rounded bg-blue-700 text-white font-bold text-[10px] hover:bg-blue-800"
                >
                  Record Arrival / Complete
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
          <div className="space-y-3 text-xs">
            {/* Aggregate Segment & Payload Analytics */}
            {(() => {
              const totalSegDist = trip.routeSegments.reduce((s, seg) => s + (seg.distanceKm || 0), 0);
              const totalTonneKm = trip.routeSegments.reduce((s, seg) => s + (seg.distanceKm || 0) * (seg.tonnage || 0), 0);
              const avgTonnage = totalSegDist > 0 ? (totalTonneKm / totalSegDist).toFixed(1) : '0';
              const maxTonnage = trip.routeSegments.length > 0 ? Math.max(...trip.routeSegments.map(s => s.tonnage || 0)) : 0;
              const ladenDist = trip.routeSegments.filter(s => (s.tonnage || 0) > 0).reduce((sum, s) => sum + (s.distanceKm || 0), 0);
              const emptyDist = trip.routeSegments.filter(s => (s.tonnage || 0) === 0).reduce((sum, s) => sum + (s.distanceKm || 0), 0);

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3.5">
                  <div>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase block">Total Route Legs</span>
                    <span className="text-sm font-bold text-gray-900">{trip.routeSegments.length} Segments</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Sum: {formatKm(totalSegDist)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase block">Weighted Avg Payload</span>
                    <span className="text-sm font-bold text-emerald-800 font-mono">{avgTonnage} Tonnes</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Peak Leg: {maxTonnage} MT</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase block">Haul Distribution</span>
                    <div className="text-xs font-semibold text-gray-800 mt-0.5">
                      <span className="text-emerald-700">{formatKm(ladenDist)} Laden</span>
                      <span className="text-gray-400 mx-1">•</span>
                      <span className="text-amber-700">{formatKm(emptyDist)} Empty</span>
                    </div>
                    <span className="text-[10px] text-gray-500 block mt-0.5">
                      {totalSegDist > 0 ? `${Math.round((ladenDist / totalSegDist) * 100)}% laden haul efficiency` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase block">Freight Haulage Volume</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">
                      {Math.round(totalTonneKm).toLocaleString()} T-km
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Tonne-Kilometre Work Metric</span>
                  </div>
                </div>
              );
            })()}

            {/* Individual Segments Breakdown Table/List */}
            <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="bg-gray-50/75 px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider grid grid-cols-12 gap-2">
                <span className="col-span-1">Leg</span>
                <span className="col-span-4">Segment Origin & Destination</span>
                <span className="col-span-3">Cargo Consignment</span>
                <span className="col-span-2 text-right">Payload Tonnage</span>
                <span className="col-span-2 text-right">Distance</span>
              </div>
              {trip.routeSegments.map((seg, idx) => (
                <div key={seg.id} className="p-3 grid grid-cols-12 gap-2 items-center hover:bg-gray-50/70 transition-colors">
                  <div className="col-span-1 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                      {seg.sequence || idx + 1}
                    </span>
                  </div>
                  <div className="col-span-4">
                    <span className="font-bold text-gray-900 block text-xs">
                      {seg.fromLocation} → {seg.toLocation}
                    </span>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Dep: {seg.departureTime || '—'} • Arr: {seg.arrivalTime || '—'}
                      {seg.notes && <span className="ml-1 text-gray-500 font-medium">({seg.notes})</span>}
                    </div>
                  </div>
                  <div className="col-span-3">
                    <span className="text-xs text-gray-700 block truncate" title={seg.cargoDescription || 'Standard Consignment'}>
                      {seg.cargoDescription || (seg.tonnage === 0 ? 'Empty Repositioning Leg' : 'Commercial Freight')}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {seg.tonnage === 0 ? 'Unladen run (0T)' : 'Revenue freight load'}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    {seg.tonnage === 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        0 MT (Empty)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                        {seg.tonnage !== undefined ? `${seg.tonnage} MT` : '—'}
                      </span>
                    )}
                    {trip.status !== 'completed' && (
                      <button
                        onClick={() => {
                          setTargetSegmentId(seg.id);
                          setEditedTonnage(seg.tonnage !== undefined ? String(seg.tonnage) : '24.5');
                          setIsEditingTonnage(true);
                        }}
                        className="block text-[10px] text-emerald-700 hover:underline mt-0.5 ml-auto"
                      >
                        Edit Tonnage
                      </button>
                    )}
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="font-mono font-bold text-gray-900 text-xs">{formatKm(seg.distanceKm)}</span>
                    <span className="block text-[10px] text-gray-400 font-mono">
                      {seg.tonnage !== undefined ? `${Math.round(seg.distanceKm * seg.tonnage)} T-km` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {isEditingTonnage && (
              <div className="p-3 bg-white border border-emerald-300 rounded-xl space-y-2 shadow-xs">
                <span className="font-bold text-gray-900 block">Edit Route Leg Payload Tonnage (MT)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editedTonnage}
                    onChange={e => setEditedTonnage(e.target.value)}
                    className="w-36 px-2.5 py-1.5 rounded-lg border border-gray-300 font-mono font-bold"
                  />
                  <span className="text-gray-500 font-medium">MT (Metric Tonnes)</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateSegmentTonnage(targetSegmentId, editedTonnage)}
                    className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800"
                  >
                    Save to Database
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingTonnage(false)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-700">Recorded Trip Expenses ({trip.expenses.length})</span>
              {trip.status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => setIsAddingExpense(!isAddingExpense)}
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold text-xs flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Record Expense
                </button>
              )}
            </div>

            {isAddingExpense && (
              <form onSubmit={handleCreateExpense} className="p-3 bg-gray-50 border border-gray-300 rounded-xl space-y-2">
                <span className="font-bold text-gray-900 block text-xs">New Trip Expense</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Category *</label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      className="w-full px-2 py-1 rounded border border-gray-300 bg-white"
                    >
                      <option value="tolls">Tolls</option>
                      <option value="permits">Permits</option>
                      <option value="loading & unloading">Loading & Unloading</option>
                      <option value="parking">Parking</option>
                      <option value="repairs">Repairs</option>
                      <option value="refreshments">Refreshments</option>
                      <option value="rto charges">RTO Charges</option>
                      <option value="fuel">Fuel</option>
                      <option value="other operational">Other Operational</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newAmount}
                      onChange={e => setNewAmount(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded border border-gray-300 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Receipt #</label>
                    <input
                      type="text"
                      value={newReceipt}
                      onChange={e => setNewReceipt(e.target.value)}
                      placeholder="e.g. REC-1029"
                      className="w-full px-2 py-1 rounded border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Description *</label>
                    <input
                      type="text"
                      required
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      placeholder="e.g. Toll receipt NH-48"
                      className="w-full px-2 py-1 rounded border border-gray-300"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingExpense(false)}
                    className="px-2.5 py-1 rounded border border-gray-300 text-gray-600 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                  >
                    Submit Expense
                  </button>
                </div>
              </form>
            )}

            {trip.expenses.length === 0 ? (
              <div className="p-4 text-center text-gray-400 bg-white border border-gray-200 rounded-xl">
                No operational expenses recorded for this trip yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {trip.expenses.map(exp => (
                  <div key={exp.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 capitalize">{exp.category}</span>
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
            )}
          </div>
        )}

        {/* TAB 5: Advance Settlement */}
        {activeTab === 'settlement' && (
          <div className="space-y-3 text-xs">
            {backendCalculation && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                <span className="font-semibold">Backend Settlement Calculation Engine: Verified</span>
                <span className="font-mono text-[11px]">Net: ₹{backendCalculation.calculation?.netBalance ?? backendCalculation.netBalance ?? 0}</span>
              </div>
            )}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2.5">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Advances Issued Against Trip:</span>
                <span className="font-bold font-mono text-gray-900">
                  {formatCurrency(backendCalculation?.totalAdvancesAllocated ?? trip.settlement.totalAdvancesIssued)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>− Less Total Approved Expenses:</span>
                <span className="font-bold font-mono">
                  − {formatCurrency(backendCalculation?.totalApprovedExpenses ?? trip.settlement.totalApprovedExpenses)}
                </span>
              </div>
              <div className="flex justify-between text-blue-800">
                <span>− Less Amount Returned by Driver:</span>
                <span className="font-bold font-mono">
                  − {formatCurrency(backendCalculation?.totalCashReturns ?? trip.settlement.amountReturnedByDriver)}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-sm">
                <span className="text-rose-800">Outstanding Settlement Balance:</span>
                <span className="font-mono text-rose-800">
                  {formatCurrency(backendCalculation?.netBalance ?? trip.settlement.outstandingBalance)}
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
