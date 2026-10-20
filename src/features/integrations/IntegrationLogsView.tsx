import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { IntegrationJob } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { formatDateTime } from '../../utils/formatters';
import { History, RotateCcw, CheckCircle2 } from 'lucide-react';

export const IntegrationLogsView: React.FC = () => {
  const { integrationJobs, retryIntegrationJob } = useFleetStore();
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredJobs = React.useMemo(() => {
    if (statusFilter === 'all') return integrationJobs;
    return integrationJobs.filter(j => j.status === statusFilter);
  }, [integrationJobs, statusFilter]);

  const columns: Column<IntegrationJob>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: j => <span className="font-mono text-gray-700">{formatDateTime(j.timestamp)}</span>
    },
    {
      key: 'id',
      header: 'Job ID',
      sortable: true,
      render: j => <span className="font-mono font-bold text-gray-900">{j.id}</span>
    },
    {
      key: 'jobType',
      header: 'Event Type',
      sortable: true,
      render: j => <span className="font-medium text-gray-800 capitalize">{j.jobType.replace(/_/g, ' ')}</span>
    },
    {
      key: 'vehicleReg',
      header: 'Vehicle / Trip',
      render: j => (
        <div>
          <span className="font-mono font-bold text-gray-900 block">{j.vehicleReg}</span>
          {j.tripNumber && <span className="text-[10px] text-emerald-800 font-mono">{j.tripNumber}</span>}
        </div>
      )
    },
    {
      key: 'payloadSummary',
      header: 'Payload Summary',
      render: j => (
        <div className="max-w-md">
          <p className="text-gray-700 leading-snug">{j.payloadSummary}</p>
          {j.errorMessage && <p className="text-rose-700 font-mono text-[10px] mt-0.5">{j.errorMessage}</p>}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: j => <Badge status={j.status} />
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: j => (
        <div className="flex items-center justify-end" onClick={e => e.stopPropagation()}>
          {j.status === 'failed' && (
            <button
              onClick={() => retryIntegrationJob(j.id)}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs"
            >
              <RotateCcw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">TLCM Pro Integration Audit Logs</h2>
          <p className="text-xs text-gray-500">
            Immutable log of telemetry exchanges, odometer payloads, and tyre lifecycle distance allocations
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-700"
        >
          <option value="all">All Events</option>
          <option value="success">Success Only</option>
          <option value="failed">Failed / Action Required</option>
          <option value="retry_queued">Queued for Retry</option>
        </select>
      </div>

      <DataTable
        data={filteredJobs}
        columns={columns}
        searchPlaceholder="Search integration logs..."
        searchFilter={(j, q) =>
          j.payloadSummary.toLowerCase().includes(q) ||
          j.vehicleReg.toLowerCase().includes(q) ||
          j.id.toLowerCase().includes(q)
        }
      />
    </div>
  );
};
