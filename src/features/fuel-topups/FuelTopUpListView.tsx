import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { FuelTopUp } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { formatCurrency, formatLitres, formatKm, formatDateTime } from '../../utils/formatters';
import { Fuel, Plus, TrendingDown, Receipt, Calendar, Building, CreditCard } from 'lucide-react';

export const FuelTopUpListView: React.FC = () => {
  const { fuelTopUps, vehicles, settings, recordFuelTopUp } = useFleetStore();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [litres, setLitres] = useState<number>(100);
  const [pricePerLitre, setPricePerLitre] = useState<number>(settings.defaultFuelPricePerLitre);
  const [fuelStation, setFuelStation] = useState('IndianOil Nelamangala Hub, NH-48');
  const [odometerReading, setOdometerReading] = useState<number | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<'Company Fleet Card' | 'Driver Advance' | 'Corporate Account' | 'Cash'>('Company Fleet Card');
  const [receiptReference, setReceiptReference] = useState(`IOCL-REC-${Math.floor(10000 + Math.random() * 90000)}`);
  const [notes, setNotes] = useState('');

  // Summary statistics
  const totalLitres = fuelTopUps.reduce((sum, f) => sum + f.litres, 0);
  const totalExpenditure = fuelTopUps.reduce((sum, f) => sum + f.totalCost, 0);
  const averagePricePerLitre = totalLitres > 0 ? totalExpenditure / totalLitres : 0;
  const totalTopUpsCount = fuelTopUps.length;

  const calculatedTotal = Math.round(litres * pricePerLitre * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || litres <= 0 || pricePerLitre <= 0) return;

    const v = vehicles.find(veh => veh.id === vehicleId);

    recordFuelTopUp({
      vehicleId,
      vehicleReg: v?.registrationNumber || 'Vehicle',
      dateTime: new Date(dateTime).toISOString(),
      litres: Number(litres),
      pricePerLitre: Number(pricePerLitre),
      fuelStation,
      odometerReading: odometerReading ? Number(odometerReading) : undefined,
      paymentMethod,
      receiptReference,
      recordedBy: 'Logistics Supervisor (Bunkering)',
      notes: notes.trim() || undefined
    });

    setIsModalOpen(false);
  };

  const columns: Column<FuelTopUp>[] = [
    {
      key: 'dateTime',
      header: 'Date & Time',
      sortable: true,
      render: f => <span className="font-medium text-gray-700">{formatDateTime(f.dateTime)}</span>
    },
    {
      key: 'vehicleReg',
      header: 'Vehicle Reg #',
      sortable: true,
      render: f => <span className="font-mono font-bold text-gray-900">{f.vehicleReg}</span>
    },
    {
      key: 'litres',
      header: 'Quantity (L)',
      sortable: true,
      align: 'right',
      render: f => <span className="font-mono font-bold text-emerald-800">{formatLitres(f.litres)}</span>
    },
    {
      key: 'pricePerLitre',
      header: 'Price / Litre',
      sortable: true,
      align: 'right',
      render: f => <span className="text-gray-600">{formatCurrency(f.pricePerLitre)}/L</span>
    },
    {
      key: 'totalCost',
      header: 'Total Cost',
      sortable: true,
      align: 'right',
      render: f => <span className="font-bold text-gray-900">{formatCurrency(f.totalCost)}</span>
    },
    {
      key: 'odometerReading',
      header: 'Odometer at Bunkering',
      align: 'right',
      render: f => (
        <span className="font-mono text-gray-700">
          {f.odometerReading ? formatKm(f.odometerReading) : '—'}
        </span>
      )
    },
    {
      key: 'fuelStation',
      header: 'Fuel Station / Outpost',
      render: f => (
        <div>
          <span className="text-gray-800 font-medium block truncate max-w-[200px]">{f.fuelStation}</span>
          <span className="text-[10px] text-gray-400 font-mono">{f.receiptReference}</span>
        </div>
      )
    },
    {
      key: 'paymentMethod',
      header: 'Payment Method',
      render: f => (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
          {f.paymentMethod}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Litres Purchased</span>
          <div className="text-xl font-bold text-emerald-800 mt-1">{formatLitres(totalLitres)}</div>
          <span className="text-xs text-gray-400">Total volume added</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Fuel Expenditure</span>
          <div className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalExpenditure)}</div>
          <span className="text-xs text-gray-400">Company fleet card & accounts</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Average Price / Litre</span>
          <div className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(averagePricePerLitre)}/L</div>
          <span className="text-xs text-gray-400">Weighted average</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Fuel Top-Up Events</span>
          <div className="text-xl font-bold text-gray-900 mt-1">{totalTopUpsCount}</div>
          <span className="text-xs text-gray-400">Logged bunkering stops</span>
        </div>
      </div>

      {/* Distinction Reminder Callout (Rule 7) */}
      <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
        <div>
          <strong>Rule 7 & 8 Separation:</strong> Fuel purchased for a vehicle is bunkering inventory and not automatically fuel consumed by an individual trip. Trip consumption is measured strictly from opening balance, en route additions, and closing fuel balance on individual trip sheets.
        </div>
      </div>

      {/* Header and Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Vehicle Fuel Top-Up Log</h2>
          <p className="text-xs text-gray-500">
            Record retail and bunkering hub refuels with volume, invoice reference, and odometer logs
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Fuel Purchase</span>
        </button>
      </div>

      <DataTable
        data={fuelTopUps}
        columns={columns}
        searchPlaceholder="Search by vehicle reg #, receipt, or station name..."
        searchFilter={(f, q) =>
          f.vehicleReg.toLowerCase().includes(q) ||
          f.receiptReference.toLowerCase().includes(q) ||
          f.fuelStation.toLowerCase().includes(q)
        }
      />

      {/* Modal: Record Fuel Top-Up */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Vehicle Fuel Top-Up"
        subtitle="Log fuel purchased at an authorized bunkering depot or retail station."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Vehicle *</label>
              <select
                value={vehicleId}
                onChange={e => {
                  setVehicleId(e.target.value);
                  const v = vehicles.find(veh => veh.id === e.target.value);
                  if (v?.latestOdometer) setOdometerReading(v.latestOdometer);
                }}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber} ({v.vehicleType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={dateTime}
                onChange={e => setDateTime(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Fuel Quantity (Litres) *</label>
              <input
                type="number"
                required
                step="0.1"
                min="1"
                value={litres}
                onChange={e => setLitres(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Price per Litre (₹) *</label>
              <input
                type="number"
                required
                step="0.01"
                min="1"
                value={pricePerLitre}
                onChange={e => setPricePerLitre(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 font-mono"
              />
            </div>
          </div>

          {/* Formula calculation display */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
            <span className="text-gray-600">
              Formula: {litres} Litres × ₹{pricePerLitre}
            </span>
            <span className="text-sm font-bold text-emerald-800">
              Total Cost = {formatCurrency(calculatedTotal)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Fuel Station / Vendor</label>
              <input
                type="text"
                required
                value={fuelStation}
                onChange={e => setFuelStation(e.target.value)}
                placeholder="e.g. BPCL COCO Outpost, Hosur"
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Odometer Reading (km)</label>
              <input
                type="number"
                value={odometerReading || ''}
                onChange={e => setOdometerReading(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Cluster reading at pump"
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
              >
                <option value="Company Fleet Card">Company Fleet Card (PetroCard)</option>
                <option value="Driver Advance">Driver Advance Reimbursed</option>
                <option value="Corporate Account">Corporate Account Credit</option>
                <option value="Cash">Cash Receipt</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Receipt / Invoice Ref #</label>
              <input
                type="text"
                required
                value={receiptReference}
                onChange={e => setReceiptReference(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Full tank top-up, DEF urea added, etc."
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
            >
              Save Top-Up Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
