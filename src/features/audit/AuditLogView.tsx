import React, { useState } from 'react';
import { useFleetStore } from '../../services/store';
import { AuditLog } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { formatDateTime } from '../../utils/formatters';
import { ClipboardList, Filter } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useFleetStore();
  const [entityFilter, setEntityFilter] = useState('all');

  const filteredLogs = React.useMemo(() => {
    if (entityFilter === 'all') return auditLogs;
    return auditLogs.filter(l => l.entityType === entityFilter);
  }, [auditLogs, entityFilter]);

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: l => <span className="font-mono text-gray-700 text-xs">{formatDateTime(l.timestamp)}</span>
    },
    {
      key: 'entityType',
      header: 'Entity Class',
      sortable: true,
      render: l => (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
          {l.entityType}
        </span>
      )
    },
    {
      key: 'entityLabel',
      header: 'Record Identifier',
      sortable: true,
      render: l => <span className="font-mono font-bold text-gray-900 text-xs">{l.entityLabel}</span>
    },
    {
      key: 'action',
      header: 'Audit Action Event',
      sortable: true,
      render: l => (
        <span className="font-mono text-emerald-800 font-semibold text-xs">
          {l.action}
        </span>
      )
    },
    {
      key: 'changes',
      header: 'Delta / Details',
      render: l => (
        <div className="max-w-md">
          {l.previousValue && (
            <div className="text-[11px] text-gray-500">
              <span className="font-semibold text-gray-400">Previous:</span> {l.previousValue}
            </div>
          )}
          {l.newValue && (
            <div className="text-[11px] text-gray-800 font-medium">
              <span className="font-semibold text-emerald-700">Updated:</span> {l.newValue}
            </div>
          )}
          {l.reason && (
            <div className="text-[11px] text-gray-500 italic mt-0.5">
              Reason: {l.reason}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'changedBy',
      header: 'Executed By',
      sortable: true,
      render: l => <span className="text-gray-600 font-medium text-xs">{l.changedBy}</span>
    }
  ];

  return (
    <div className="space-y-4">
      {/* Information Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">System Audit Trail & Financial Logs</h2>
          <p className="text-xs text-gray-500">
            PRD Section 17 & Rule 23: Complete chronological audit logs preserving original values, deltas, users, and justifications
          </p>
        </div>

        <select
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-700"
        >
          <option value="all">All Entity Types</option>
          <option value="Trip">Trip Sheets</option>
          <option value="Driver">Drivers</option>
          <option value="Advance">Driver Advances</option>
          <option value="Expense">Expenses</option>
          <option value="FuelDeduction">Fuel Deductions</option>
          <option value="Payroll">Monthly Payroll</option>
          <option value="SalaryStructure">Salary Structures</option>
          <option value="Odometer">Odometer Overrides</option>
        </select>
      </div>

      <DataTable
        data={filteredLogs}
        columns={columns}
        searchPlaceholder="Search audit events by record, action or user..."
        searchFilter={(l, q) =>
          l.entityLabel.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.changedBy.toLowerCase().includes(q) ||
          (l.reason?.toLowerCase().includes(q) ?? false)
        }
      />
    </div>
  );
};
