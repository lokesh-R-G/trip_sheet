import React, { useState, useEffect } from 'react';
import { useFleetStore } from '../../services/store';
import { DriverAttendance } from '../../types';
import { attendanceApi } from '../../services/api';
import { AttendanceBadge } from './AttendanceBadge';
import { AttendanceCorrectionModal } from './AttendanceCorrectionModal';
import {
  Calendar,
  User,
  History,
  Search,
  Filter,
  Clock,
  ShieldCheck,
  Edit2,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

export const DriverAttendanceHistoryView: React.FC = () => {
  const { drivers } = useFleetStore();
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id || '');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [history, setHistory] = useState<DriverAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Correction Modal
  const [editingAttendance, setEditingAttendance] = useState<DriverAttendance | null>(null);

  // Audit trail drawer
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedAttendanceForAudit, setSelectedAttendanceForAudit] = useState<DriverAttendance | null>(null);

  const fetchDriverHistory = async () => {
    if (!selectedDriverId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await attendanceApi.list({
        driverId: selectedDriverId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 100,
      });
      setHistory(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load driver attendance history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverHistory();
  }, [selectedDriverId, startDate, endDate]);

  const handleViewAudit = async (att: DriverAttendance) => {
    setSelectedAttendanceForAudit(att);
    setAuditLoading(true);
    try {
      const logs = await attendanceApi.getAuditHistory(att.id);
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (err: any) {
      console.error('Failed to load audit history', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Driver-wise Attendance History
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete chronological attendance ledger and auditable modification history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-xs"
          >
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} ({d.driverNumber})
              </option>
            ))}
          </select>

          <button
            onClick={fetchDriverHistory}
            disabled={loading}
            className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-2xs transition-colors"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Driver Summary Card */}
      {selectedDriver && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold">
              {selectedDriver.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                {selectedDriver.fullName}
                <span className="font-mono text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedDriver.driverNumber}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                License: <span className="font-mono text-gray-700">{selectedDriver.licenseNumber}</span> • Phone: {selectedDriver.phone}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
              placeholder="From"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
              placeholder="To"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-rose-600 hover:underline px-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* History Ledger */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Attendance Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Check-In</th>
                <th className="px-4 py-3">Check-Out</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Remarks</th>
                <th className="px-4 py-3">Marked / Approved By</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    {loading ? 'Loading attendance history...' : 'No attendance entries found for this driver in selected date range.'}
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {record.attendanceDate}
                    </td>
                    <td className="px-4 py-3">
                      <AttendanceBadge status={record.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">
                      {record.checkInTime
                        ? new Date(record.checkInTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">
                      {record.checkOutTime
                        ? new Date(record.checkOutTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-1.5 py-0.5 text-[10px] rounded border border-gray-200 bg-gray-50 text-gray-600 font-mono">
                        {record.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      {record.remarks || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>Marked by: {record.markedBy}</div>
                      {record.approvedBy && (
                        <div className="text-[10px] text-gray-400">Appr: {record.approvedBy}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleViewAudit(record)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          title="View Audit Trail"
                        >
                          <History className="w-3 h-3 text-gray-500" />
                          Audit
                        </button>
                        <button
                          onClick={() => setEditingAttendance(record)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          Correct
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Drawer / Modal */}
      {selectedAttendanceForAudit && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Attendance Audit Log
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Record ID: <span className="font-mono text-gray-700">{selectedAttendanceForAudit.id}</span> • Date: {selectedAttendanceForAudit.attendanceDate}
                </p>
              </div>
              <button
                onClick={() => setSelectedAttendanceForAudit(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto space-y-4">
              {auditLoading ? (
                <div className="text-center py-6 text-xs text-gray-400">Loading audit history...</div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400">No correction audit events recorded.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-2">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-indigo-800 font-mono">{log.action}</span>
                      <span className="text-gray-400 font-normal">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>

                    <div className="text-gray-600">
                      Modified By: <span className="font-medium text-gray-900">{log.changedBy}</span>
                    </div>

                    {log.reason && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-900">
                        <span className="font-semibold">Reason:</span> {log.reason}
                      </div>
                    )}

                    {log.previousValue && (
                      <div className="text-[11px] text-gray-500">
                        <span className="font-medium">Previous:</span> {JSON.stringify(log.previousValue)}
                      </div>
                    )}
                    {log.newValue && (
                      <div className="text-[11px] text-emerald-700">
                        <span className="font-medium">New:</span> {JSON.stringify(log.newValue)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end p-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setSelectedAttendanceForAudit(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {editingAttendance && (
        <AttendanceCorrectionModal
          isOpen={true}
          attendance={editingAttendance}
          onClose={() => setEditingAttendance(null)}
          onSuccess={fetchDriverHistory}
        />
      )}
    </div>
  );
};

