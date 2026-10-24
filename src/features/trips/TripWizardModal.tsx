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

import { tripApi, expenseApi, vehicleApi } from '../../services/api';

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
  onTripCreated,
}) => {
  const {
    drivers,
    vehicles,
    vehiclesLoading,
    vehiclesError,
    benchmarks,
    settings,
    advances,
    createTrip,
    refreshTrips,
    refreshAdvances,
    refreshExpenses,
    refreshVehicles,
  } = useFleetStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Section A: Trip Details
  const [driverId, setDriverId] = useState(drivers[0]?.id || '');
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');

  // Synchronize initial selection when drivers and vehicles become available
  useEffect(() => {
    if (!driverId && drivers.length > 0) {
      setDriverId(drivers[0].id);
    }
  }, [drivers, driverId]);

  useEffect(() => {
    if (!vehicleId && vehicles.length > 0) {
      setVehicleId(vehicles[0].id);
    }
  }, [vehicles, vehicleId]);

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
      tonnage: 28,
      cargoDescription: 'OEM Auto Components (Full Load)',
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
      tonnage: 28,
      cargoDescription: 'OEM Auto Components (Unloading)',
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
      tonnage: 0,
      cargoDescription: 'Empty Repositioning',
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
      tonnage: 18,
      cargoDescription: 'Return Spares Backhaul',
      notes: 'Final leg to Madhavaram yard'
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
    if (!vehicleId) return;
    const selVeh = vehicles.find(v => v.id === vehicleId);
    const fallbackOdo = selVeh?.latestOdometer || 100000;
    
    // First set local fallback
    setStartingOdometer(fallbackOdo);
    if (odoMode === 'both') {
      setEndingOdometer(fallbackOdo + (reportedDistance || 450));
    }

    // Query authoritative external vehicle database for latest confirmed baseline
    vehicleApi.getLatestOdometer(vehicleId)
      .then((res) => {
        if (res && res.latestAuthoritativeOdometer > 0) {
          setStartingOdometer(res.latestAuthoritativeOdometer);
          if (odoMode === 'both') {
            setEndingOdometer(res.latestAuthoritativeOdometer + (reportedDistance || 450));
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch external authoritative odometer, using local cached baseline:', err);
      });
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
    const selVeh = vehicles.find(v => v.id === vehicleId);
    const newSeg: RouteSegment = {
      id: `seg-${Date.now()}`,
      sequence: nextSeq,
      fromLocation: routeSegments[routeSegments.length - 1]?.toLocation || 'Intermediate City',
      toLocation: 'Next Waypoint',
      distanceKm: 50,
      tonnage: selVeh?.tonnage || 28,
      cargoDescription: 'Commercial Consignment',
      notes: ''
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async (asDraft: boolean = false) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // 1. Prepare create payload conforming to backend createTripSchema
      const payload: any = {
        driverId,
        vehicleId,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : null,
        startingLocation,
        finalDestination,
        purpose: purpose.trim() || 'General Cargo Transit',
        isDraft: asDraft,
        notes: notes.trim() || null,
        odometer: {
          startingReading: odoMode === 'unmeasured' ? null : startingOdometer,
          startingTimestamp: new Date(startDate).toISOString(),
          startingSource: 'measured',
          endingReading: odoMode === 'start_only' || odoMode === 'unmeasured' ? null : (endingOdometer ?? null),
          endingTimestamp: endDate ? new Date(endDate).toISOString() : null,
          endingSource: 'measured',
          reportedDistance: reportedDistance ?? null,
        },
        routeSegments: routeSegments.map((seg, idx) => ({
          sequence: seg.sequence || (idx + 1),
          fromLocation: seg.fromLocation,
          toLocation: seg.toLocation,
          departureTime: null,
          arrivalTime: null,
          distanceKm: String(seg.distanceKm || 0),
          tonnage: seg.tonnage !== undefined && seg.tonnage !== null ? String(seg.tonnage) : null,
          cargoDescription: seg.cargoDescription || null,
          notes: seg.notes || null,
        })),
      };

      // 2. Call backend API
      const createdTripRes = await tripApi.create(payload);

      // 3. If user selected Complete & Submit (not draft), transition to completed
      let finalTripRes = createdTripRes;
      if (!asDraft) {
        try {
          finalTripRes = await tripApi.transition(createdTripRes.id, 'completed', createdTripRes.version, 'Trip completed via operational wizard');
        } catch (transErr: any) {
          console.warn('Completed transition warning:', transErr);
          // If transition requires intermediate in_progress, proceed gracefully
        }
      }

      // 4. Record any initial expenses submitted in the wizard
      if (expenses.length > 0) {
        for (const exp of expenses) {
          try {
            await expenseApi.submit({
              tripId: createdTripRes.id,
              driverId,
              category: exp.category.toLowerCase(),
              description: exp.description,
              amount: exp.amount,
              expenseDate: exp.expenseDate,
              paymentMethod: exp.paymentMethod.toLowerCase(),
              receiptReference: exp.receiptReference || null,
            });
          } catch (expErr) {
            console.warn('Expense creation note:', expErr);
          }
        }
      }

      // 5. Invalidate store and refresh
      await refreshTrips();
      await refreshAdvances();
      await refreshExpenses();

      // Find the updated trip from local or backend
      const mappedTrip: Trip = {
        id: finalTripRes.id,
        tripNumber: finalTripRes.tripNumber,
        driverId: finalTripRes.driverId,
        driverName: finalTripRes.driverName || drivers.find(d => d.id === driverId)?.fullName || 'Driver',
        driverNumber: finalTripRes.driverNumber || drivers.find(d => d.id === driverId)?.driverNumber || 'DRV',
        vehicleId: finalTripRes.vehicleId,
        vehicleReg: finalTripRes.vehicleReg || vehicles.find(v => v.id === vehicleId)?.registrationNumber || 'VEH',
        startDate: finalTripRes.startDate,
        endDate: finalTripRes.endDate || undefined,
        purpose: finalTripRes.purpose,
        notes: finalTripRes.notes || '',
        status: finalTripRes.status,
        version: finalTripRes.version,
        odometer: {
          startingReading: finalTripRes.odometer?.startingReading ?? undefined,
          startingTimestamp: finalTripRes.odometer?.startingTimestamp ?? undefined,
          startingSource: (finalTripRes.odometer?.startingSource as any) || 'measured',
          endingReading: finalTripRes.odometer?.endingReading ?? undefined,
          endingTimestamp: finalTripRes.odometer?.endingTimestamp ?? undefined,
          endingSource: (finalTripRes.odometer?.endingSource as any) || 'measured',
          odometerCase: (finalTripRes.odometer?.odometerCase as any) || 'case_1_both_available',
          discrepancyFlag: Boolean(finalTripRes.odometer?.discrepancyFlag),
          discrepancyReason: finalTripRes.odometer?.discrepancyReason ?? undefined,
          validationStatus: (finalTripRes.odometer?.validationStatus as any) || 'verified',
        },
        distance: {
          measuredDistance: finalTripRes.odometer?.measuredDistance ?? undefined,
          reportedDistance: finalTripRes.odometer?.reportedDistance ?? undefined,
          derivedDistance: finalTripRes.odometer?.derivedDistance ?? undefined,
          acceptedDistance: finalTripRes.odometer?.acceptedDistance ?? 0,
          tyreAttributionEligible: Boolean(finalTripRes.odometer?.tyreAttributionEligible),
          tyreAttributionStatus: (finalTripRes.odometer?.tyreAttributionStatus as any) || 'eligible',
          tyreAttributionHoldReason: finalTripRes.odometer?.tyreAttributionHoldReason ?? undefined,
        },
        routeSegments: (finalTripRes.routeSegments || []).map((s: any) => ({
          id: s.id,
          sequence: s.sequence,
          fromLocation: s.fromLocation,
          toLocation: s.toLocation,
          departureTime: s.departureTime ?? undefined,
          arrivalTime: s.arrivalTime ?? undefined,
          distanceKm: Number(s.distanceKm || 0),
          tonnage: s.tonnage !== null && s.tonnage !== undefined ? Number(s.tonnage) : undefined,
          cargoDescription: s.cargoDescription ?? undefined,
          notes: s.notes ?? undefined,
        })),
        startingLocation: finalTripRes.startingLocation,
        finalDestination: finalTripRes.finalDestination,
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
          mileageStatus: fuelEval.mileageStatus,
        },
        expenses: expenses,
        settlement: {
          advanceIds: [],
          totalAdvancesIssued: 0,
          totalApprovedExpenses: 0,
          amountReturnedByDriver: 0,
          otherValidCredits: 0,
          outstandingBalance: 0,
          status: 'pending',
          authorizedPayrollRecoveryAmount: 0,
        },
        fuelDeduction: {
          benchmarkId: matchedBenchmark?.id,
          benchmarkName: matchedBenchmark?.name,
          benchmarkMileage: matchedBenchmark?.expectedMileageKmPerLitre || 5,
          tolerancePercent: matchedBenchmark?.permittedTolerancePercent || 5,
          expectedFuelLitres: fuelDeductionCalc.expectedFuelLitres,
          allowedFuelLitres: fuelDeductionCalc.allowedFuelLitres,
          excessFuelLitres: fuelDeductionCalc.excessFuelLitres,
          applicableFuelPrice: settings.defaultFuelPricePerLitre,
          potentialDeductionAmount: fuelDeductionCalc.potentialDeductionAmount,
          approvedDeductionAmount: 0,
          calculationStatus: 'calculated',
          reviewStatus: 'pending_review',
        },
        tlcmIntegration: {
          syncStatus: 'synced',
          odometerSubmitted: true,
          tyreDistanceAttributed: Boolean(finalTripRes.odometer?.tyreAttributionEligible),
        },
        createdAt: finalTripRes.createdAt,
        updatedAt: finalTripRes.updatedAt,
      };

      if (onTripCreated) onTripCreated(mappedTrip);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create trip. Please verify inputs.');
    } finally {
      setIsSubmitting(false);
    }
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
        {errorMessage && (
          <div className="p-3 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => setErrorMessage(null)} className="font-bold ml-2">×</button>
          </div>
        )}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-gray-700">Vehicle (Authoritative TLCM) *</label>
                  {import.meta.env.DEV && (
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title="Loaded from TLCM PostgreSQL database">
                      TLCM DB: {vehicles.length} vehicles
                    </span>
                  )}
                </div>

                {vehiclesLoading ? (
                  <div className="p-2 border border-gray-300 rounded-lg text-xs text-gray-500 bg-gray-50 flex items-center gap-2">
                    <span className="inline-block w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    Fetching authoritative vehicles from TLCM database...
                  </div>
                ) : vehiclesError ? (
                  <div className="p-2 border border-rose-300 bg-rose-50 rounded-lg text-xs text-rose-700 space-y-1">
                    <p className="font-semibold">TLCM Database Unavailable</p>
                    <p className="text-[11px]">{vehiclesError}</p>
                    <button
                      type="button"
                      onClick={() => refreshVehicles()}
                      className="mt-1 px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-medium"
                    >
                      Retry Connection
                    </button>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="p-2 border border-amber-300 bg-amber-50 rounded-lg text-xs text-amber-700">
                    No vehicles found in authoritative TLCM database.
                  </div>
                ) : (
                  <select
                    value={vehicleId}
                    onChange={e => setVehicleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} ({v.makeModel || v.vehicleType} - {v.tonnage}T) • Authoritative Odo: {formatKm(v.latestOdometer)}
                      </option>
                    ))}
                  </select>
                )}
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
                <h4 className="font-bold text-gray-900 text-sm">Section C: Multi-Segment Route Legs & Payload Tonnage</h4>
                <p className="text-gray-500 mt-0.5">
                  Record individual segment origins, destinations, distances, and payload tonnage (laden vs empty return legs).
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddSegment}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Route Segment
              </button>
            </div>

            {/* Column Header Guide */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              <div className="col-span-1">Leg</div>
              <div className="col-span-3">From Origin</div>
              <div className="col-span-3">To Destination</div>
              <div className="col-span-2 text-right">Distance (km)</div>
              <div className="col-span-2 text-right">Tonnage (MT)</div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {routeSegments.map((seg, idx) => (
                <div
                  key={seg.id}
                  className="p-3 rounded-xl border border-gray-200 bg-white shadow-xs space-y-2 hover:border-emerald-300 transition-all"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    {/* Leg sequence indicator */}
                    <div className="sm:col-span-1 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                        {idx + 1}
                      </span>
                    </div>

                    {/* From */}
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={seg.fromLocation}
                        onChange={e => {
                          const updated = [...routeSegments];
                          updated[idx].fromLocation = e.target.value;
                          setRouteSegments(updated);
                        }}
                        placeholder="From location..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-gray-50/50"
                      />
                    </div>

                    {/* To */}
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={seg.toLocation}
                        onChange={e => {
                          const updated = [...routeSegments];
                          updated[idx].toLocation = e.target.value;
                          setRouteSegments(updated);
                        }}
                        placeholder="To destination..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-gray-50/50"
                      />
                    </div>

                    {/* Distance km */}
                    <div className="sm:col-span-2">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={seg.distanceKm}
                          onChange={e => {
                            const updated = [...routeSegments];
                            updated[idx].distanceKm = Number(e.target.value);
                            setRouteSegments(updated);
                          }}
                          placeholder="Distance"
                          className="w-full px-2 py-1.5 pr-7 text-right rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 font-mono font-bold"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-sans pointer-events-none">
                          km
                        </span>
                      </div>
                    </div>

                    {/* Tonnage MT */}
                    <div className="sm:col-span-2">
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="120"
                          value={seg.tonnage !== undefined ? seg.tonnage : ''}
                          onChange={e => {
                            const updated = [...routeSegments];
                            updated[idx].tonnage = e.target.value === '' ? undefined : Number(e.target.value);
                            setRouteSegments(updated);
                          }}
                          placeholder="Tonnage"
                          className={`w-full px-2 py-1.5 pr-7 text-right rounded-lg border font-mono font-bold focus:outline-none focus:border-emerald-600 ${
                            seg.tonnage === 0
                              ? 'border-amber-300 bg-amber-50/40 text-amber-900'
                              : 'border-emerald-300 bg-emerald-50/30 text-emerald-900'
                          }`}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-sans font-bold pointer-events-none">
                          MT
                        </span>
                      </div>
                    </div>

                    {/* Remove Action */}
                    <div className="sm:col-span-1 flex items-center justify-center">
                      {routeSegments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSegment(idx)}
                          title="Remove Segment"
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Second row: Quick tonnage helper buttons + Cargo / consignment description */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 text-[10px] uppercase font-semibold">Tonnage Presets:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...routeSegments];
                          const selVeh = vehicles.find(v => v.id === vehicleId);
                          updated[idx].tonnage = selVeh?.tonnage || 28;
                          updated[idx].cargoDescription = 'Full Rated Payload';
                          setRouteSegments(updated);
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold"
                      >
                        Full ({vehicles.find(v => v.id === vehicleId)?.tonnage || 28}T)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...routeSegments];
                          const selVeh = vehicles.find(v => v.id === vehicleId);
                          updated[idx].tonnage = Math.round((selVeh?.tonnage || 28) / 2);
                          updated[idx].cargoDescription = 'Partial Load Consignment';
                          setRouteSegments(updated);
                        }}
                        className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold"
                      >
                        Half Load ({Math.round((vehicles.find(v => v.id === vehicleId)?.tonnage || 28) / 2)}T)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...routeSegments];
                          updated[idx].tonnage = 0;
                          updated[idx].cargoDescription = 'Unladen / Empty Repositioning Leg';
                          setRouteSegments(updated);
                        }}
                        className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold"
                      >
                        Empty Return (0T)
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-1 max-w-sm">
                      <input
                        type="text"
                        value={seg.cargoDescription || ''}
                        onChange={e => {
                          const updated = [...routeSegments];
                          updated[idx].cargoDescription = e.target.value;
                          setRouteSegments(updated);
                        }}
                        placeholder="Cargo description (e.g. Cold-Rolled Steel Coils)..."
                        className="w-full px-2 py-1 rounded border border-gray-200 text-[11px] focus:outline-none focus:border-emerald-600 bg-gray-50/50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Segment Tonnage & Distance Analytics Summary */}
            {(() => {
              const totalSegDist = routeSegments.reduce((s, seg) => s + (seg.distanceKm || 0), 0);
              const totalTonneKm = routeSegments.reduce((s, seg) => s + (seg.distanceKm || 0) * (seg.tonnage || 0), 0);
              const avgTonnage = totalSegDist > 0 ? (totalTonneKm / totalSegDist).toFixed(1) : '0';
              const maxTonnage = routeSegments.length > 0 ? Math.max(...routeSegments.map(s => s.tonnage || 0)) : 0;
              const ladenDist = routeSegments.filter(s => (s.tonnage || 0) > 0).reduce((sum, s) => sum + (s.distanceKm || 0), 0);
              const emptyDist = routeSegments.filter(s => (s.tonnage || 0) === 0).reduce((sum, s) => sum + (s.distanceKm || 0), 0);

              return (
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Total Segments</span>
                    <span className="font-bold text-gray-900">{routeSegments.length} Route Legs</span>
                    <span className="text-[10px] text-gray-400 block">Sum: {totalSegDist} km</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Weighted Avg Payload</span>
                    <span className="font-bold text-emerald-800 font-mono text-sm">{avgTonnage} Tonnes</span>
                    <span className="text-[10px] text-gray-400 block">Peak: {maxTonnage}T Payload</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Laden vs Empty Legs</span>
                    <span className="font-semibold text-gray-800">
                      Laden: {ladenDist} km • Empty: {emptyDist} km
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold block">
                      {totalSegDist > 0 ? `${Math.round((ladenDist / totalSegDist) * 100)}% Laden haul` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Accepted Trip Distance</span>
                    <span className="font-bold text-gray-900 font-mono text-sm">{formatKm(odoEval.acceptedDistance)}</span>
                    <span className="text-[10px] text-gray-400 block">Odo evaluated</span>
                  </div>
                </div>
              );
            })()}
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
              <div className="flex justify-between py-1 items-start">
                <span className="text-gray-500">Route Segments & Payload:</span>
                <div className="text-right">
                  <span className="font-bold text-emerald-800">
                    {routeSegments.length} Segments • {(() => {
                      const totalDist = routeSegments.reduce((s, seg) => s + (seg.distanceKm || 0), 0);
                      const totalTonneKm = routeSegments.reduce((s, seg) => s + (seg.distanceKm || 0) * (seg.tonnage || 0), 0);
                      return totalDist > 0 ? `${(totalTonneKm / totalDist).toFixed(1)} MT avg payload` : '0 MT';
                    })()}
                  </span>
                  <div className="text-[10px] text-gray-500 mt-0.5 space-x-1">
                    {routeSegments.map((s, idx) => (
                      <span key={s.id || idx} className="inline-block bg-gray-100 rounded px-1.5 py-0.5 text-gray-700">
                        Leg {idx + 1}: {s.fromLocation}→{s.toLocation} ({s.tonnage !== undefined ? `${s.tonnage}T` : '—'})
                      </span>
                    ))}
                  </div>
                </div>
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
              disabled={isSubmitting}
              onClick={() => handleFinish(true)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Draft'}
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
                disabled={isSubmitting}
                onClick={() => handleFinish(false)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting to Backend...' : 'Complete & Submit Trip'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
