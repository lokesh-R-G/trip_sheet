import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { Trip } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { TripWizardModal } from './TripWizardModal';
import { TripDetailModal } from './TripDetailModal';
import { formatKm, formatLitres, formatMileage, formatDate } from '../../utils/formatters';
import {
  FileSpreadsheet,
  Plus,
  Eye,
  AlertTriangle,
  Truck,
  User,
  CheckCircle2,
  Clock,
  Filter
} from 'lucide-react';

export const TripListView: React.FC = () => {
  const { trips, drivers, vehicles } = useFleetStore();

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Filters
  const [driverFilter, setDriverFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [discrepancyOnly, setDiscrepancyOnly] = useState(false);

  const filteredTrips = React.useMemo(() => {
    return trips.filter(t => {
      if (driverFilter !== 'all' && t.driverId !== driverFilter) return false;
      if (vehicleFilter !== 'all' && t.vehicleId !== vehicleFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (discrepancyOnly && !t.odometer.discrepancyFlag) return false;
      return true;
    });
  }, [trips, driverFilter, vehicleFilter, statusFilter, discrepancyOnly]);

  const handleOpenDetail = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsDetailOpen(true);
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
      header: 'Pilot',
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
      render: t => (
        <span className="font-mono font-medium text-gray-800 text-xs">
          {t.vehicleReg}
        </span>
      )
    },
    {
      key: 'route',
      header: 'Route Corridor & Payload',
      render: t => {
        const segCount = t.routeSegments.length;
        const totalDist = t.routeSegments.reduce((s, seg) => s + (seg.distanceKm || 0), 0);
        const totalTonneKm = t.routeSegments.reduce((s, seg) => s + (seg.distanceKm || 0) * (seg.tonnage || 0), 0);
        const avgTonnage = totalDist > 0 ? (totalTonneKm / totalDist).toFixed(1) : undefined;
        return (
          <div className="truncate max-w-[220px]" title={`${t.startingLocation} → ${t.finalDestination}`}>
            <span className="text-gray-800 font-medium block truncate">{t.startingLocation}</span>
            <span className="text-[10px] text-gray-400 block truncate">↓ {t.finalDestination}</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                {segCount} {segCount === 1 ? 'leg' : 'legs'}
              </span>
              {avgTonnage !== undefined && (
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-mono">
                  {avgTonnage}T payload
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'odometerReadings',
      header: 'Odo (Start / End)',
      render: t => (
        <div className="font-mono text-[11px] text-gray-700">
          <div>{t.odometer.startingReading !== undefined ? formatKm(t.odometer.startingReading) : '—'}</div>
          <div className="text-gray-400">
            {t.odometer.endingReading !== undefined ? formatKm(t.odometer.endingReading) : '—'}
          </div>
        </div>
      )
    },
    {
      key: 'distance',
      header: 'Distance',
      sortable: true,
      align: 'right',
      render: t => (
        <div>
          <span className="font-mono font-bold text-gray-900 block">
            {formatKm(t.distance.acceptedDistance)}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-gray-400">
            {t.odometer.odometerCase.replace(/case_\d_/g, '')}
          </span>
        </div>
      )
    },
    {
      key: 'fuelLitres',
      header: 'Fuel Consumed',
      sortable: true,
      align: 'right',
      render: t => (
        <span className="font-mono font-medium text-gray-800">
          {formatLitres(t.fuel.acceptedFuelLitres)}
        </span>
      )
    },
    {
      key: 'mileage',
      header: 'Mileage (km/L)',
      sortable: true,
      align: 'right',
      render: t => (
        <span className="font-mono font-bold text-emerald-800">
          {formatMileage(t.fuel.tripMileageKmPerLitre)}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Trip Status',
      sortable: true,
      render: t => <Badge status={t.status} />
    },
    {
      key: 'odoStatus',
      header: 'Odometer Validation',
      sortable: true,
      render: t => (
        <div className="flex items-center gap-1.5">
          <Badge status={t.odometer.validationStatus} />
          {t.odometer.discrepancyFlag && (
            <span title={t.odometer.discrepancyReason}>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            </span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: t => (
        <div className="flex items-center justify-end" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handleOpenDetail(t)}
            title="Inspect Trip Sheet"
            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header and Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Trip Sheets & Odometer Logs</h2>
          <p className="text-xs text-gray-500">
            End-to-end trip records, multi-segment routes, odometer sequence validation, and fuel reconciliation
          </p>
        </div>

        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Trip Sheet</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select
          value={driverFilter}
          onChange={e => setDriverFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700"
        >
          <option value="all">All Drivers</option>
          {drivers.map(d => (
            <option key={d.id} value={d.id}>{d.fullName}</option>
          ))}
        </select>

        <select
          value={vehicleFilter}
          onChange={e => setVehicleFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700"
        >
          <option value="all">All Vehicles</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>{v.registrationNumber}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="draft">Draft</option>
        </select>

        <label className="flex items-center gap-1.5 text-xs text-gray-700 ml-2 font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={discrepancyOnly}
            onChange={e => setDiscrepancyOnly(e.target.checked)}
            className="rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
          />
          <span>Flagged Discrepancies Only</span>
        </label>
      </div>

      <DataTable
        data={filteredTrips}
        columns={columns}
        searchPlaceholder="Search by trip #, pilot, vehicle, or corridor..."
        searchFilter={(t, q) =>
          t.tripNumber.toLowerCase().includes(q) ||
          t.driverName.toLowerCase().includes(q) ||
          t.vehicleReg.toLowerCase().includes(q) ||
          t.startingLocation.toLowerCase().includes(q) ||
          t.finalDestination.toLowerCase().includes(q)
        }
        onRowClick={t => handleOpenDetail(t)}
      />

      {/* Trip Wizard Stepper Modal */}
      <TripWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onTripCreated={trip => {
          setSelectedTrip(trip);
          setIsDetailOpen(true);
        }}
      />

      {/* Trip Detail & Action Modal */}
      <TripDetailModal
        trip={selectedTrip}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTrip(null);
        }}
      />
    </div>
  );
};
