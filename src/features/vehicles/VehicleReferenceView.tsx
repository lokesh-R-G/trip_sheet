import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { Vehicle } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { formatKm, formatDateTime } from '../../utils/formatters';
import { Truck, RefreshCw, Disc, Shield, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

export const VehicleReferenceView: React.FC = () => {
  const { vehicles, trips, syncVehicleMaster } = useFleetStore();
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSync = (vId: string) => {
    setSyncingId(vId);
    setTimeout(() => {
      syncVehicleMaster(vId);
      setSyncingId(null);
    }, 600);
  };

  const columns: Column<Vehicle>[] = [
    {
      key: 'registrationNumber',
      header: 'Registration #',
      sortable: true,
      render: v => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono font-bold text-gray-900 text-xs block">{v.registrationNumber}</span>
            <span className="text-[10px] text-gray-400 font-sans">{v.makeModel}</span>
          </div>
        </div>
      )
    },
    {
      key: 'tlcmVehicleId',
      header: 'TLCM Pro ID (Authoritative)',
      sortable: true,
      render: v => (
        <span className="font-mono text-emerald-800 font-semibold text-xs px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
          {v.tlcmVehicleId}
        </span>
      )
    },
    {
      key: 'vehicleType',
      header: 'Class / Tonnage',
      sortable: true,
      render: v => (
        <div>
          <span className="font-medium text-gray-800">{v.vehicleType}</span>
          <span className="text-[11px] text-gray-400 block">{v.tonnage} Tonnes Rated</span>
        </div>
      )
    },
    {
      key: 'currentDriverName',
      header: 'Current Pilot',
      sortable: true,
      render: v => <span>{v.currentDriverName || <span className="text-gray-400 italic">Unassigned</span>}</span>
    },
    {
      key: 'latestOdometer',
      header: 'TLCM Master Odometer',
      sortable: true,
      align: 'right',
      render: v => <span className="font-mono font-bold text-gray-900">{formatKm(v.latestOdometer)}</span>
    },
    {
      key: 'totalTripDistance',
      header: 'Trip Distance Logged',
      sortable: true,
      align: 'right',
      render: v => <span className="font-mono font-medium text-emerald-700">{formatKm(v.totalTripDistance)}</span>
    },
    {
      key: 'assignedTyresCount',
      header: 'Tyres Configured',
      align: 'center',
      render: v => (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
          <Disc className="w-3.5 h-3.5 text-gray-500" />
          <span>{v.assignedTyresCount} Positions</span>
          {v.hasStepneyFitted && (
            <span className="text-[10px] text-emerald-700 font-bold ml-1" title="Stepney Spare Fitted (Rule 22: Excluded from usage distance)">
              +1 Stepney
            </span>
          )}
        </div>
      )
    },
    {
      key: 'syncStatus',
      header: 'Sync State',
      sortable: true,
      render: v => <Badge status={v.syncStatus} />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: v => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handleSync(v.id)}
            disabled={syncingId === v.id}
            title="Poll authoritative telemetry from TLCM Pro backend API"
            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncingId === v.id ? 'animate-spin text-emerald-700' : ''}`} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Information Header Box */}
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Authoritative Vehicle Records from TLCM Pro System
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
              Per Architecture Rule 20 & 21: Vehicle identities, master odometers, and tyre lifecycle wheel positions are strictly owned by TLCM Pro. The Trip Sheet app caches these records via the backend API and attributes verified distance only.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-md font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            Connected to TLCM Pro API v2
          </span>
        </div>
      </div>

      {/* Vehicles Table */}
      <DataTable
        data={vehicles}
        columns={columns}
        searchPlaceholder="Search by registration #, TLCM ID, or pilot name..."
        searchFilter={(v, q) =>
          v.registrationNumber.toLowerCase().includes(q) ||
          v.tlcmVehicleId.toLowerCase().includes(q) ||
          v.vehicleType.toLowerCase().includes(q) ||
          (v.currentDriverName?.toLowerCase().includes(q) ?? false)
        }
      />
    </div>
  );
};
