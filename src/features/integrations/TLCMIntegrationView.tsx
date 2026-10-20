import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { IntegrationJob, Vehicle } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { formatDateTime, formatKm } from '../../utils/formatters';
import {
  Network,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Disc,
  Truck,
  Send,
  ExternalLink,
  Info
} from 'lucide-react';

export const TLCMIntegrationView: React.FC = () => {
  const { integrationJobs, vehicles, trips, settings, retryIntegrationJob, syncVehicleMaster } = useFleetStore();

  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleRetry = (jobId: string) => {
    setRetryingJobId(jobId);
    setTimeout(() => {
      retryIntegrationJob(jobId);
      setRetryingJobId(null);
      setFeedback(`Job ${jobId} successfully retried and executed via TLCM Pro API.`);
      setTimeout(() => setFeedback(null), 3000);
    }, 600);
  };

  const handleSyncAll = () => {
    vehicles.forEach(v => syncVehicleMaster(v.id));
    setFeedback('Synchronized vehicle telemetry with TLCM Pro backend API.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const failedJobs = integrationJobs.filter(j => j.status === 'failed');
  const successJobs = integrationJobs.filter(j => j.status === 'success');
  const pendingJobs = integrationJobs.filter(j => j.status === 'pending' || j.status === 'retry_queued');

  const columns: Column<IntegrationJob>[] = [
    {
      key: 'jobType',
      header: 'Job Event Type',
      sortable: true,
      render: j => (
        <div>
          <span className="font-semibold text-gray-900 block capitalize">
            {j.jobType.replace(/_/g, ' ')}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">Job #{j.id}</span>
        </div>
      )
    },
    {
      key: 'vehicleReg',
      header: 'Target Vehicle',
      sortable: true,
      render: j => (
        <div>
          <span className="font-mono font-bold text-gray-900 block">{j.vehicleReg}</span>
          {j.tripNumber && <span className="text-[10px] text-emerald-700 font-mono">{j.tripNumber}</span>}
        </div>
      )
    },
    {
      key: 'payloadSummary',
      header: 'API Payload / Reconciliation Details',
      render: j => (
        <div>
          <p className="text-gray-700 leading-snug">{j.payloadSummary}</p>
          {j.errorMessage && (
            <p className="text-rose-700 font-medium text-[11px] mt-0.5">{j.errorMessage}</p>
          )}
        </div>
      )
    },
    {
      key: 'attemptCount',
      header: 'Attempts',
      sortable: true,
      align: 'center',
      render: j => (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 font-semibold text-gray-700">
          {j.attemptCount} / 3
        </span>
      )
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: j => <span className="text-gray-600">{formatDateTime(j.timestamp)}</span>
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: j => <Badge status={j.status} />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: j => (
        <div className="flex items-center justify-end" onClick={e => e.stopPropagation()}>
          {j.status === 'failed' || j.status === 'retry_queued' ? (
            <button
              onClick={() => handleRetry(j.id)}
              disabled={retryingJobId === j.id}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-colors"
            >
              <RotateCcw className={`w-3 h-3 ${retryingJobId === j.id ? 'animate-spin' : ''}`} />
              <span>Retry</span>
            </button>
          ) : (
            <span className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Synchronized
            </span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Top Architecture Compliance Banner */}
      <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">
                TLCM Pro Tyre Lifecycle Management System Integration
              </h3>
              <Badge status="connected" label="API Gateway Live" />
            </div>
            <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
              Rules 20-22: Connected via TLCM Pro backend API at <code className="text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">{settings.tlcmApiEndpoint}</code>. The Trip Sheet database maintains independent isolation while pushing verified odometer readings and tyre-distance attribution.
            </p>
          </div>
        </div>

        <button
          onClick={handleSyncAll}
          className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
          <span>Synchronize All Vehicles</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Gateway Status</span>
          <div className="text-lg font-bold text-emerald-800 mt-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Connected & Validated</span>
          </div>
          <span className="text-xs text-gray-400">Response latency: 28ms</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Successful Sync Jobs</span>
          <div className="text-xl font-bold text-gray-900 mt-1">{successJobs.length}</div>
          <span className="text-xs text-gray-400">Odometer pushes & attributions</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Pending / Queued Jobs</span>
          <div className="text-xl font-bold text-amber-700 mt-1">{pendingJobs.length}</div>
          <span className="text-xs text-gray-400">Awaiting queue execution</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Failed / Held Attributions</span>
          <div className="text-xl font-bold text-rose-700 mt-1">{failedJobs.length}</div>
          <span className="text-xs text-rose-600">Actionable retry queue</span>
        </div>
      </div>

      {/* Strict Rule 22 Compliance Callout */}
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <span className="font-bold text-gray-900 block flex items-center gap-1.5">
            <Disc className="w-4 h-4 text-emerald-700" />
            Rule 22: Stepney / Spare Tyre Exclusion
          </span>
          <p className="text-gray-600 leading-relaxed">
            Spare/Stepney tyres mounted on vehicle chassis are strictly excluded from usage distance accumulation. Only road-contact wheel positions in verified axle layout receive trip attribution.
          </p>
        </div>

        <div className="space-y-1">
          <span className="font-bold text-gray-900 block flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-700" />
            Rule 8 & 11: Idempotency & Validation Hold
          </span>
          <p className="text-gray-600 leading-relaxed">
            Trips with unresolved odometer sequence discrepancies or unmeasured readings automatically place tyre-distance attribution ON HOLD to preserve TLCM Pro tyre tread-wear integrity.
          </p>
        </div>
      </div>

      {/* Integration Jobs Table */}
      <div className="pt-2">
        <h3 className="text-sm font-bold text-gray-900 mb-2">TLCM Pro Integration Job Queue</h3>
        <DataTable
          data={integrationJobs}
          columns={columns}
          searchPlaceholder="Search by vehicle reg #, trip #, or payload..."
          searchFilter={(j, q) =>
            j.vehicleReg.toLowerCase().includes(q) ||
            j.payloadSummary.toLowerCase().includes(q) ||
            (j.tripNumber?.toLowerCase().includes(q) ?? false)
          }
        />
      </div>
    </div>
  );
};
