import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { useFleetStore } from '../../services/store';
import { Trip, RouteSegment, TripExpense, ExpenseCategory, OdometerCase } from '../../types';
import {
  evaluateOdometerAndDistance,
  calculateFuelConsumption,
  calculateFuelDeduction,
  calculateSettlementBalance
} from '../../utils/calculations';
import { formatCurrency, formatKm, formatLitres, formatMileage } from '../../utils/formatters';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  ShieldAlert,
  Gauge,
  Receipt,
  HandCoins,
  Percent,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

interface TripWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated?: (trip: Trip) => void;
}

const STEPS = [
  '1. Trip Details',
  '2. Odometer & Distance',
  '3. Route Segments',
  '4. Fuel Consumption',
  '5. Trip Expenses',
  '6. Advance Settlement',
  '7. Fuel Deduction',
  '8. Review & Complete'
];

export const TripWizardModal: React.FC<TripWizardModalProps> = ({
  isOpen,
  onClose,
  onTripCreated
}) => {
  const { drivers, vehicles, benchmarks, settings, advances, createTrip } = useFleetStore();

  const [currentStep, setCurrentStep] = useState(0);

  // Section A: Trip Details
  const [driverId, setDriverId] = useState(drivers[0]?.id || '');
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState('');
  const [purpose, setPurpose] = useState('Heavy Machinery Consignment Transit');
  const [notes, setNotes] = useState('');
  const [startingLocation, setStartingLocation] = useState('Chennai Madhavaram Logistics Hub');
  const [finalDestination, setFinalDestination] = useState('Bengaluru Peenya Industrial Yard');

  // Section B: Odometer & Distance (Support Cases 1, 2, 3, 4)
  const [odoMode, setOdoMode] = useState<'both' | 'start_only' | 'unmeasured' | 'test_discrepancy'>('both');
  const [startingOdometer, setStartingOdometer] = useState<number>(125000);
  const [endingOdometer, setEndingOdometer] = useState<number | undefined>(125450);
  const [reportedDistance, setReportedDistance] = useState<number>(450);

  // Section C: Route segments
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([
    {
      id: 'seg-1',
      sequence: 1,
      fromLocation: 'Chennai',
      toLocation: 'Vellore',
      departureTime: '08:30',
      arrivalTime: '11:45',
      distanceKm: 135,
      notes: 'NH-48 Corridor'
    },
    {
      id: 'seg-2',
      sequence: 2,
      fromLocation: 'Vellore',
      toLocation: 'Bengaluru',
      departureTime: '12:30',
      arrivalTime: '16:30',
      distanceKm: 215,
      notes: 'Industrial Delivery'
    },
    {
      id: 'seg-3',
      sequence: 3,
      fromLocation: 'Bengaluru',
      toLocation: 'Hosur',
      departureTime: '17:30',
      arrivalTime: '19:00',
      distanceKm: 40,
      notes: 'Return consignment loading'
    },
    {
      id: 'seg-4',
      sequence: 4,
      fromLocation: 'Hosur',
      toLocation: 'Chennai',
      departureTime: '20:00',
      arrivalTime: '02:00',
      distanceKm: 60,
      notes: 'Return leg to base'
    }
  ]);

  // Section D: Fuel Consumption
  const [openingFuel, setOpeningFuel] = useState<number>(120);
  const [fuelAdded, setFuelAdded] = useState<number>(100);
  const [closingFuel, setClosingFuel] = useState<number>(130);
  const [manualFuelLitres, setManualFuelLitres] = useState<number>(90);

  // Section E: Trip Expenses
  const [expenses, setExpenses] = useState<TripExpense[]>([
    {
      id: 'exp-w-1',
      tripId: '',
      tripNumber: 'DRAFT',
      category: 'Tolls',
      description: 'FASTag Toll NH-48 Sriperumbudur',
      amount: 850,
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'FASTag',
      receiptReference: 'FAST-99120',
      submittedBy: 'Driver',
      approvalStatus: 'approved',
      approvedAmount: 850,
      reviewer: 'Fleet Auditor'
    },
    {
      id: 'exp-w-2',
      tripId: '',
      tripNumber: 'DRAFT',
      category: 'Loading & Unloading',
      description: 'Bommasandra Warehouse Hamali Labor',
      amount: 500,
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
      receiptReference: 'UNLOAD-VCH-22',
      submittedBy: 'Driver',
      approvalStatus: 'approved',
      approvedAmount: 500,
      reviewer: 'Operations Manager'
    }
  ]);

  // Section F: Advance Settlement
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string>('');
  const [amountReturned, setAmountReturned] = useState<number>(0);

  // Synchronize vehicle starting odometer when vehicle changes
  useEffect(() => {
    const selVeh = vehicles.find(v => v.id === vehicleId);
    if (selVeh) {
      setStartingOdometer(selVeh.latestOdometer);
      if (odoMode === 'both') {
        setEndingOdometer(selVeh.latestOdometer + (reportedDistance || 450));
      }
    }
  }, [vehicleId]);

  // Adjust inputs based on selected Odometer Case Test Mode
  const handleOdoModeChange = (mode: 'both' | 'start_only' | 'unmeasured' | 'test_discrepancy') => {
    setOdoMode(mode);
    const selVeh = vehicles.find(v => v.id === vehicleId);
    const baseOdo = selVeh?.latestOdometer || 125000;

    if (mode === 'both') {
      setStartingOdometer(baseOdo);
      setEndingOdometer(baseOdo + 450);
      setReportedDistance(450);
    } else if (mode === 'start_only') {
      setStartingOdometer(baseOdo);
      setEndingOdometer(undefined);
      setReportedDistance(450);
    } else if (mode === 'unmeasured') {
      setStartingOdometer(0);
      setEndingOdometer(undefined);
      setReportedDistance(450);
    } else if (mode === 'test_discrepancy') {
      setStartingOdometer(baseOdo);
      setEndingOdometer(baseOdo - 100); // Sequence backwards!
      setReportedDistance(450);
    }
  };

  // Perform dynamic business calculations
  const odoEval = evaluateOdometerAndDistance({
    startingReading: odoMode === 'unmeasured' ? undefined : startingOdometer,
    endingReading: odoMode === 'start_only' || odoMode === 'unmeasured' ? undefined : endingOdometer,
    reportedDistance: reportedDistance,
    previousVehicleOdometer: vehicles.find(v => v.id === vehicleId)?.latestOdometer
  });

  const fuelEval = calculateFuelConsumption(
    openingFuel,
    fuelAdded,
    closingFuel,
    manualFuelLitres,
    odoEval.acceptedDistance
  );

  const matchedBenchmark =
    benchmarks.find(b => b.vehicleId === vehicleId && b.status === 'active') ||
    benchmarks.find(b => b.vehicleType === vehicles.find(v => v.id === vehicleId)?.vehicleType && b.status === 'active') ||
    benchmarks[0];

  const fuelDeductionCalc = calculateFuelDeduction(
    odoEval.acceptedDistance,
    fuelEval.acceptedFuelLitres,
    matchedBenchmark ? matchedBenchmark.expectedMileageKmPerLitre : 5.0,
    matchedBenchmark ? matchedBenchmark.permittedTolerancePercent : 5.0,
    settings.defaultFuelPricePerLitre
  );

  const linkedAdvance = advances.find(a => a.id === selectedAdvanceId);
  const totalAdvances = linkedAdvance ? linkedAdvance.advanceAmount : 10000;
  const approvedExpTotal = expenses
    .filter(e => e.approvalStatus === 'approved')
    .reduce((s, e) => s + (e.approvedAmount || e.amount), 0);
  const outstandingSettlement = calculateSettlementBalance(
    totalAdvances,
    approvedExpTotal,
    amountReturned,
    0
  );

  // Route segments handler
  const handleAddSegment = () => {
    const nextSeq = routeSegments.length + 1;
    const newSeg: RouteSegment = {
      id: `seg-${Date.now()}`,
      sequence: nextSeq,
      fromLocation: routeSegments[routeSegments.length - 1]?.toLocation || 'Intermediate City',
      toLocation: 'Next Waypoint',
      distanceKm: 50
    };
    setRouteSegments([...routeSegments, newSeg]);
  };

  const handleRemoveSegment = (idx: number) => {
    setRouteSegments(routeSegments.filter((_, i) => i !== idx));
  };

  // Expense add handler
  const [newExpCategory, setNewExpCategory] = useState<ExpenseCategory>('Parking');
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpAmount, setNewExpAmount] = useState<number>(250);

  const handleAddExpense = () => {
    if (newExpAmount <= 0) return;
    const newExp: TripExpense = {
      id: `exp-${Date.now()}`,
      tripId: '',
      tripNumber: 'DRAFT',
      category: newExpCategory,
      description: newExpDesc || `${newExpCategory} charge`,
      amount: Number(newExpAmount),
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
      receiptReference: `REC-${Math.floor(100 + Math.random() * 900)}`,
      submittedBy: drivers.find(d => d.id === driverId)?.fullName || 'Driver',
      approvalStatus: 'approved',
      approvedAmount: Number(newExpAmount),
      reviewer: 'Current User'
    };
    setExpenses([...expenses, newExp]);
    setNewExpDesc('');
  };

  const handleFinish = (asDraft: boolean = false) => {
    const trip = createTrip({
      driverId,
      vehicleId,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : new Date().toISOString(),
      purpose,
      notes,
      startingLocation,
      finalDestination,
      status: asDraft ? 'draft' : 'completed',
      odometer: {
        startingReading: odoMode === 'unmeasured' ? undefined : startingOdometer,
        endingReading: odoMode === 'start_only' || odoMode === 'unmeasured' ? undefined : endingOdometer,
        odometerCase: odoEval.odometerCase,
        discrepancyFlag: odoEval.discrepancyFlag,
        discrepancyReason: odoEval.discrepancyReason,
        validationStatus: odoEval.validationStatus
      },
      distance: {
        measuredDistance: odoEval.measuredDistance,
        reportedDistance,
        derivedDistance: odoEval.derivedDistance,
        acceptedDistance: odoEval.acceptedDistance,
        tyreAttributionEligible: odoEval.tyreAttributionEligible,
        tyreAttributionStatus: odoEval.tyreAttributionStatus,
        tyreAttributionHoldReason: odoEval.tyreAttributionHoldReason
      },
      routeSegments,
      fuel: {
        openingFuelQuantity: openingFuel,
        fuelAddedDuringTrip: fuelAdded,
        closingFuelQuantity: closingFuel,
        calculatedConsumption: fuelEval.calculatedConsumption,
        manuallyReportedLitres: manualFuelLitres,
        acceptedFuelLitres: fuelEval.acceptedFuelLitres,
        measurementMethod: 'calculated_balance',
        calculationStatus: fuelEval.calculationStatus,
        tripMileageKmPerLitre: fuelEval.tripMileageKmPerLitre,
        mileageStatus: fuelEval.mileageStatus
      },
      expenses
    });

    if (onTripCreated) onTripCreated(trip);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Trip Sheet"
      subtitle="Complete operational, odometer, fuel, expenses and advance reconciliation workflow."
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Progress Stepper Bar */}
        <div className="flex items-center justify-between overflow-x-auto pb-2 border-b border-gray-200 text-xs">
          {STEPS.map((step, idx) => (
            <button
              key={step}
              onClick={() => setCurrentStep(idx)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors ${
                currentStep === idx
                  ? 'bg-emerald-700 text-white font-bold'
                  : currentStep > idx
                  ? 'text-emerald-800 bg-emerald-50'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>{step}</span>
              {currentStep > idx && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>

        {/* STEP 1: Trip Details */}
        {currentStep === 0 && (
          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-gray-900 text-sm">Trip Details & Pilot Assignment</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Driver Pilot *</label>
                <select
                  value={driverId}
                  onChange={e => {
                    setDriverId(e.target.value);
                    const d = drivers.find(drv => drv.id === e.target.value);
                    if (d?.currentVehicleId) setVehicleId(d.currentVehicleId);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
                >
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.driverNumber}) — {d.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Vehicle *</label>
                <select
                  value={vehicleId}
                  onChange={e => setVehicleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} ({v.vehicleType} - {v.tonnage}T) • Odo: {formatKm(v.latestOdometer)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Departure Timestamp *</label>
                <input
                  type="datetime-local"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Arrival Timestamp (Estimated/Actual)</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Starting Hub / Depot</label>
                <input
                  type="text"
                  value={startingLocation}
                  onChange={e => setStartingLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Final Consignment Destination</label>
                <input
                  type="text"
                  value={finalDestination}
                  onChange={e => setFinalDestination(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Trip Reference / Purpose</label>
              <input
                type="text"
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="e.g. OEM Automotive Components delivery corridor"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Odometer & Distance (Section B - 4 Cases) */}
        {currentStep === 1 && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Section B: Odometer Readings & Distance Attribution</h4>
                <p className="text-gray-500 mt-0.5">Strict compliance with Cases 1 to 4 (Never silently fabricate measured readings).</p>
              </div>

              {/* Mode switch to simulate/test Cases 1-4 */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleOdoModeChange('both')}
                  className={`px-2 py-1 rounded font-semibold ${
                    odoMode === 'both' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Case 1 (Both)
                </button>
                <button
                  type="button"
                  onClick={() => handleOdoModeChange('start_only')}
                  className={`px-2 py-1 rounded font-semibold ${
                    odoMode === 'start_only' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Case 2 (Derived)
                </button>
                <button
                  type="button"
                  onClick={() => handleOdoModeChange('unmeasured')}
                  className={`px-2 py-1 rounded font-semibold ${
                    odoMode === 'unmeasured' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Case 3 (Unavailable)
                </button>
                <button
                  type="button"
                  onClick={() => handleOdoModeChange('test_discrepancy')}
                  className={`px-2 py-1 rounded font-semibold ${
                    odoMode === 'test_discrepancy' ? 'bg-white text-rose-800 shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Case 4 (Discrepancy)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Starting Odometer (km)</label>
                <input
                  type="number"
                  disabled={odoMode === 'unmeasured'}
                  value={odoMode === 'unmeasured' ? '' : startingOdometer}
                  onChange={e => setStartingOdometer(Number(e.target.value))}
                  placeholder="e.g. 125000"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 font-mono font-bold disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Ending Odometer (km)</label>
                <input
                  type="number"
                  disabled={odoMode === 'start_only' || odoMode === 'unmeasured'}
                  value={odoMode === 'start_only' || odoMode === 'unmeasured' ? '' : endingOdometer || ''}
                  onChange={e => setEndingOdometer(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g. 125450"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 font-mono font-bold disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Reported Distance (km)</label>
                <input
                  type="number"
                  value={reportedDistance}
                  onChange={e => setReportedDistance(Number(e.target.value))}
                  placeholder="e.g. 450"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 font-mono font-bold"
                />
              </div>
            </div>

            {/* Evaluation Results Card */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
                    Evaluation Result:
                  </span>
                  <span className="font-mono font-semibold px-2 py-0.5 rounded bg-white border border-gray-300 text-emerald-800">
                    {odoEval.odometerCase.toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 text-[10px] block">Accepted Trip Distance</span>
                  <span className="text-base font-bold text-emerald-800 font-mono">
                    {formatKm(odoEval.acceptedDistance)}
                  </span>
                </div>
              </div>

              {/* Status details */}
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-gray-500 block">Odometer Validation:</span>
                  <span className={`font-semibold capitalize ${odoEval.discrepancyFlag ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {odoEval.validationStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">TLCM Tyre Attribution Status:</span>
                  <span className={`font-semibold capitalize ${odoEval.tyreAttributionEligible ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {odoEval.tyreAttributionStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {odoEval.discrepancyFlag && (
                <div className="p-2.5 rounded-lg bg-rose-100/70 border border-rose-300 text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Discrepancy Flagged:</strong> {odoEval.discrepancyReason}
                    <p className="mt-1 text-[11px] text-rose-800">
                      Rule 10: The system will flag this discrepancy for audit review without silently rewriting readings or clamping values.
                    </p>
                  </div>
                </div>
              )}

              {odoEval.odometerCase === 'case_2_derived_ending' && (
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900">
                  <strong>Provisional Derived Ending:</strong> {formatKm(odoEval.derivedEndingReading || 0)} (Marked as derived, not measured).
                </div>
              )}

              {odoEval.odometerCase === 'case_3_unreported_odometer' && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                  <strong>Operational Distance Only:</strong> Absolute odometer readings are unavailable. Tyre-distance attribution is ON HOLD until validated odometer telemetry is received.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Repeatable Route Segments */}
        {currentStep === 2 && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Section C: Multi-Segment Route Legs</h4>
                <p className="text-gray-500 mt-0.5">
                  Record multiple waypoints within one trip without double-counting trip-level distance.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddSegment}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Route Segment
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {routeSegments.map((seg, idx) => (
                <div
                  key={seg.id}
                  className="p-3 rounded-lg border border-gray-200 bg-white shadow-xs flex items-center gap-3"
                >
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="grid grid-cols-4 gap-2 flex-1">
                    <input
                      type="text"
                      value={seg.fromLocation}
                      onChange={e => {
                        const updated = [...routeSegments];
                        updated[idx].fromLocation = e.target.value;
                        setRouteSegments(updated);
                      }}
                      placeholder="From..."
                      className="px-2 py-1.5 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={seg.toLocation}
                      onChange={e => {
                        const updated = [...routeSegments];
                        updated[idx].toLocation = e.target.value;
                        setRouteSegments(updated);
                      }}
                      placeholder="To..."
                      className="px-2 py-1.5 rounded border border-gray-300"
                    />
                    <input
                      type="number"
                      value={seg.distanceKm}
                      onChange={e => {
                        const updated = [...routeSegments];
                        updated[idx].distanceKm = Number(e.target.value);
                        setRouteSegments(updated);
                      }}
                      placeholder="Segment km"
                      className="px-2 py-1.5 rounded border border-gray-300 font-mono"
                    />
                    <input
                      type="text"
                      value={seg.notes || ''}
                      onChange={e => {
                        const updated = [...routeSegments];
                        updated[idx].notes = e.target.value;
                        setRouteSegments(updated);
                      }}
                      placeholder="Notes (e.g. NH-48)"
                      className="px-2 py-1.5 rounded border border-gray-300"
                    />
                  </div>
                  {routeSegments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSegment(idx)}
                      className="p-1.5 text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
              <span className="text-gray-600">
                Sum of segment distances: {routeSegments.reduce((s, seg) => s + seg.distanceKm, 0)} km
              </span>
              <span className="font-bold text-gray-900">
                Accepted Trip Distance: {formatKm(odoEval.acceptedDistance)}
              </span>
            </div>
          </div>
        )}

        {/* STEP 4: Trip Fuel Consumption */}
        {currentStep === 3 && (
          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-gray-900 text-sm">Section D: Fuel Balance & Mileage Calculation</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Opening Fuel Tank (Litres)</label>
                <input
                  type="number"
                  value={openingFuel}
                  onChange={e => setOpeningFuel(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Fuel Added En Route (Litres)</label>
                <input
                  type="number"
                  value={fuelAdded}
                  onChange={e => setFuelAdded(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Closing Fuel Tank (Litres)</label>
                <input
                  type="number"
                  value={closingFuel}
                  onChange={e => setClosingFuel(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 font-mono font-bold"
                />
              </div>
            </div>

            {/* Calculated Consumption Box */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 grid grid-cols-3 gap-3">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                  Balance Formula ({openingFuel} + {fuelAdded} − {closingFuel})
                </span>
                <span className="text-base font-bold text-emerald-800 font-mono">
                  {formatLitres(fuelEval.calculatedConsumption || 0)}
                </span>
              </div>

              <div>
                <label className="text-gray-500 block text-[10px] uppercase font-semibold mb-0.5">
                  Driver Slip Reported Fuel
                </label>
                <input
                  type="number"
                  value={manualFuelLitres}
                  onChange={e => setManualFuelLitres(Number(e.target.value))}
                  className="w-28 px-2 py-1 rounded border border-gray-300 font-mono font-bold bg-white"
                />
              </div>

              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                  Calculated Trip Mileage (km/L)
                </span>
                <span className="text-base font-bold text-gray-900 font-mono">
                  {formatMileage(fuelEval.tripMileageKmPerLitre)}
                </span>
                <span className="text-[10px] text-gray-400 block">
                  Formula: {odoEval.acceptedDistance} km ÷ {fuelEval.acceptedFuelLitres} L
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Trip Expenses */}
        {currentStep === 4 && (
          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-gray-900 text-sm">Section E: Trip Expenses & Approvals</h4>
            <p className="text-gray-500">
              Only approved expenses reconcile against advances. Unapproved expenses remain pending.
            </p>

            {/* Quick add expense */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl grid grid-cols-4 gap-2 items-end">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={newExpCategory}
                  onChange={e => setNewExpCategory(e.target.value as any)}
                  className="w-full px-2 py-1.5 rounded border border-gray-300 bg-white"
                >
                  <option value="Refreshments">Refreshments</option>
                  <option value="RTO Charges">RTO Charges</option>
                  <option value="Tolls">Tolls</option>
                  <option value="Parking">Parking</option>
                  <option value="Loading & Unloading">Loading & Unloading</option>
                  <option value="Repairs">Repairs</option>
                  <option value="Other Operational">Other Operational</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block font-semibold text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newExpDesc}
                  onChange={e => setNewExpDesc(e.target.value)}
                  placeholder="e.g. Weighbridge toll slip..."
                  className="w-full px-2 py-1.5 rounded border border-gray-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Amount (₹)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newExpAmount}
                    onChange={e => setNewExpAmount(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded border border-gray-300 font-mono bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddExpense}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Expense table */}
            <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden bg-white max-h-52 overflow-y-auto">
              {expenses.map((exp, idx) => (
                <div key={exp.id} className="p-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-800">{exp.category}</span>
                    <span className="text-gray-400 ml-2">({exp.description})</span>
                    <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold uppercase">
                      {exp.approvalStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">{formatCurrency(exp.amount)}</span>
                    <button
                      type="button"
                      onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-700 font-bold"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 6: Advance Settlement */}
        {currentStep === 5 && (
          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-gray-900 text-sm">Section F: Advance Reconciliation & Settlement</h4>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="font-bold text-gray-800">
                  Total Advance Issued to Pilot:
                </span>
                <span className="text-base font-bold text-gray-900 font-mono">
                  {formatCurrency(totalAdvances)}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-600">
                <span>− Less Total Approved Expenses:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  − {formatCurrency(approvedExpTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-600">
                <span>− Less Cash Returned by Driver:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-500">₹</span>
                  <input
                    type="number"
                    value={amountReturned}
                    onChange={e => setAmountReturned(Number(e.target.value))}
                    className="w-24 px-2 py-1 rounded border border-gray-300 font-mono bg-white font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 flex items-center justify-between font-bold text-sm">
                <span className="text-rose-800">Outstanding Advance Settlement Balance:</span>
                <span className="text-rose-800 font-mono text-base">
                  {formatCurrency(outstandingSettlement)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              Rule 14: This outstanding balance will remain in the driver's advance ledger until recovered or authorized for payroll recovery.
            </p>
          </div>
        )}

        {/* STEP 7: Fuel Deduction */}
        {currentStep === 6 && (
          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-gray-900 text-sm">Section G: Mileage Benchmark & Fuel Deduction</h4>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 block">Applicable Mileage Benchmark:</span>
                  <span className="font-bold text-emerald-800">{matchedBenchmark?.name}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Benchmark Rate & Tolerance:</span>
                  <span className="font-bold text-gray-900 font-mono">
                    {matchedBenchmark?.expectedMileageKmPerLitre} km/L (+{matchedBenchmark?.permittedTolerancePercent}% tol)
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                  <span className="text-gray-400 block text-[10px] uppercase">Expected Fuel</span>
                  <span className="font-bold text-gray-800">{formatLitres(fuelDeductionCalc.expectedFuelLitres)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                  <span className="text-gray-400 block text-[10px] uppercase">Allowed Fuel (+5%)</span>
                  <span className="font-bold text-gray-800">{formatLitres(fuelDeductionCalc.allowedFuelLitres)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                  <span className="text-gray-400 block text-[10px] uppercase">Actual Used</span>
                  <span className="font-bold text-gray-800">{formatLitres(fuelEval.acceptedFuelLitres)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                  <span className="text-gray-400 block text-[10px] uppercase">Excess Fuel</span>
                  <span className={`font-bold ${fuelDeductionCalc.excessFuelLitres > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {formatLitres(fuelDeductionCalc.excessFuelLitres)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium">
                  Potential Fuel Deduction @ ₹{settings.defaultFuelPricePerLitre}/L:
                </span>
                <span className="text-base font-bold text-rose-700 font-mono">
                  {formatCurrency(fuelDeductionCalc.potentialDeductionAmount)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              Rule 15: Potential fuel deduction requires audit approval before posting to monthly payroll.
            </p>
          </div>
        )}

        {/* STEP 8: Review & Complete */}
        {currentStep === 7 && (
          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-gray-900 text-sm">Section H: Final Trip Sheet Review</h4>
            <div className="p-4 rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 space-y-2">
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Driver & Vehicle:</span>
                <span className="font-semibold text-gray-900">
                  {drivers.find(d => d.id === driverId)?.fullName} • {vehicles.find(v => v.id === vehicleId)?.registrationNumber}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Accepted Trip Distance:</span>
                <span className="font-bold text-emerald-800">{formatKm(odoEval.acceptedDistance)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Fuel & Mileage:</span>
                <span className="font-semibold text-gray-900">
                  {fuelEval.acceptedFuelLitres}L • {formatMileage(fuelEval.tripMileageKmPerLitre)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Approved Expenses:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(approvedExpTotal)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Outstanding Advance Settlement:</span>
                <span className="font-bold text-rose-700">{formatCurrency(outstandingSettlement)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Potential Fuel Deduction:</span>
                <span className="font-bold text-rose-700">{formatCurrency(fuelDeductionCalc.potentialDeductionAmount)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">TLCM Tyre Attribution:</span>
                <span className={`font-semibold ${odoEval.tyreAttributionEligible ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {odoEval.tyreAttributionStatus.toUpperCase()} ({odoEval.tyreAttributionEligible ? 'Eligible' : 'On Hold'})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Stepper Navigation Controls */}
        <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleFinish(true)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Save Draft
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1 shadow-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFinish(false)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
              >
                Complete & Submit Trip
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
