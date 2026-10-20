import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { MileageBenchmark } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/formatters';
import { Gauge, Plus, CheckCircle2, Shield, ArrowUpCircle } from 'lucide-react';

export const BenchmarkListView: React.FC = () => {
  const { benchmarks, vehicles, addBenchmark } = useFleetStore();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState('Heavy Truck');
  const [specificVehicleId, setSpecificVehicleId] = useState('');
  const [minTonnage, setMinTonnage] = useState<number>(20);
  const [maxTonnage, setMaxTonnage] = useState<number>(35);
  const [expectedMileage, setExpectedMileage] = useState<number>(4.5);
  const [permittedTolerance, setPermittedTolerance] = useState<number>(5.0);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<number>(10);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || expectedMileage <= 0) return;

    const specificVeh = vehicles.find(v => v.id === specificVehicleId);

    addBenchmark({
      name: name.trim(),
      vehicleType: specificVehicleId ? undefined : vehicleType,
      vehicleId: specificVehicleId || undefined,
      vehicleReg: specificVeh?.registrationNumber,
      minTonnage: specificVehicleId ? undefined : minTonnage,
      maxTonnage: specificVehicleId ? undefined : maxTonnage,
      expectedMileageKmPerLitre: Number(expectedMileage),
      permittedTolerancePercent: Number(permittedTolerance),
      effectiveFrom,
      status: 'active',
      priority: specificVehicleId ? 50 : Number(priority),
      notes: notes.trim() || undefined
    });

    setIsModalOpen(false);
    setName('');
    setNotes('');
  };

  const columns: Column<MileageBenchmark>[] = [
    {
      key: 'name',
      header: 'Benchmark Rule Name',
      sortable: true,
      render: b => (
        <div>
          <span className="font-semibold text-gray-900 block">{b.name}</span>
          {b.notes && <span className="text-[10px] text-gray-400">{b.notes}</span>}
        </div>
      )
    },
    {
      key: 'target',
      header: 'Applies To',
      sortable: true,
      render: b => (
        <span className="font-medium text-gray-800">
          {b.vehicleReg ? (
            <span className="font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Vehicle {b.vehicleReg}
            </span>
          ) : (
            `${b.vehicleType || 'Fleet Class'} (${b.minTonnage || 0}T - ${b.maxTonnage || 'Max'}T)`
          )}
        </span>
      )
    },
    {
      key: 'expectedMileageKmPerLitre',
      header: 'Expected Mileage',
      sortable: true,
      align: 'right',
      render: b => (
        <span className="font-mono font-bold text-emerald-800 text-sm">
          {b.expectedMileageKmPerLitre.toFixed(2)} km/L
        </span>
      )
    },
    {
      key: 'permittedTolerancePercent',
      header: 'Permitted Tolerance',
      sortable: true,
      align: 'right',
      render: b => (
        <span className="font-mono font-semibold text-gray-700">
          +{b.permittedTolerancePercent}%
        </span>
      )
    },
    {
      key: 'priority',
      header: 'Matching Priority',
      sortable: true,
      align: 'center',
      render: b => (
        <span
          className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
            b.priority >= 50
              ? 'bg-purple-100 text-purple-800'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {b.priority >= 50 ? `P${b.priority} (Vehicle Override)` : `P${b.priority} (Class)`}
        </span>
      )
    },
    {
      key: 'effectiveFrom',
      header: 'Effective From',
      sortable: true,
      render: b => <span>{formatDate(b.effectiveFrom)}</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: b => <Badge status={b.status} />
    }
  ];

  return (
    <div className="space-y-4">
      {/* Information Header Box */}
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Deterministic Mileage Benchmark Priority Engine
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
              Rule 11: Specific vehicle overrides (Priority 50) take precedence over general fleet tonnage classes (Priority 10). Historical trips preserve the benchmark calibrated on their departure date.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Benchmark Rule</span>
        </button>
      </div>

      <DataTable
        data={benchmarks}
        columns={columns}
        searchPlaceholder="Search benchmarks..."
        searchFilter={(b, q) =>
          b.name.toLowerCase().includes(q) ||
          (b.vehicleReg?.toLowerCase().includes(q) ?? false) ||
          (b.vehicleType?.toLowerCase().includes(q) ?? false)
        }
      />

      {/* Modal: Create Mileage Benchmark */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Mileage Benchmark Rule"
        subtitle="Define expected km/litre performance targets with tolerance buffers."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Benchmark Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Multi-Axle 48T Heavy Corridor Benchmark"
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Target Application</label>
              <select
                value={specificVehicleId ? 'specific' : 'class'}
                onChange={e => {
                  if (e.target.value === 'class') setSpecificVehicleId('');
                  else setSpecificVehicleId(vehicles[0]?.id || '');
                }}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
              >
                <option value="class">Vehicle Class & Tonnage</option>
                <option value="specific">Specific Vehicle Override (Priority 50)</option>
              </select>
            </div>

            {specificVehicleId ? (
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Select Vehicle</label>
                <select
                  value={specificVehicleId}
                  onChange={e => setSpecificVehicleId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white font-mono"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} ({v.vehicleType})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Vehicle Class</label>
                <select
                  value={vehicleType}
                  onChange={e => setVehicleType(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="Heavy Truck">Heavy Truck (6x4)</option>
                  <option value="Multi-Axle Trailer">Multi-Axle Trailer (10x2)</option>
                  <option value="Medium Hauler">Medium Hauler</option>
                  <option value="Container">Container Tractor</option>
                  <option value="Tipper">Tipper</option>
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Expected Mileage (km/L) *</label>
              <input
                type="number"
                required
                step="0.1"
                min="1"
                value={expectedMileage}
                onChange={e => setExpectedMileage(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Permitted Tolerance (%) *</label>
              <input
                type="number"
                required
                step="0.5"
                min="0"
                value={permittedTolerance}
                onChange={e => setPermittedTolerance(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Effective From Date</label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={e => setEffectiveFrom(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Priority Rating</label>
              <input
                type="number"
                value={priority}
                onChange={e => setPriority(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Notes / Operating Context</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Golden Quadrilateral multi-axle freight benchmark"
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300"
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
              Save Benchmark
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
