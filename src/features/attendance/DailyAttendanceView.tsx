import React, { useState, useEffect } from 'react';
import { useFleetStore } from '../../services/store';
import { DriverAttendance, AttendanceStatus } from '../../types';
import { attendanceApi } from '../../services/api';
import { AttendanceBadge } from './AttendanceBadge';
import { AttendanceCorrectionModal } from './AttendanceCorrectionModal';
import { BulkAttendanceModal } from './BulkAttendanceModal';
import {
  Calendar,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarOff,
  Coffee,
  RotateCcw,
  Edit2,
  Plus,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export const DailyAttendanceView: React.FC = () => {
  const { drivers } = useFleetStore();
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [attendances, setAttendances] = useState<DriverAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<DriverAttendance | null>(null);
  const [quickMarkDriverId, setQuickMarkDriverId] = useState<string | null>(null);

  const fetchAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await attendanceApi.list({ date: selectedDate, limit: 100 });
      setAttendances(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load attendance for selected date.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const existingMap = new Map<string, DriverAttendance>();
  attendances.forEach((a) => existingMap.set(a.driverId, a));

  const existingDriverIds = new Set(attendances.map((a) => a.driverId));

  // Build complete list of active drivers with their attendance on selectedDate
  const driverAttendanceList = drivers.map((driver) => {
    const attendance = existingMap.get(driver.id) || null;
    return {
      driver,
      attendance,
    };
  });

  const filteredList = driverAttendanceList.filter(({ driver, attendance }) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches =
        driver.fullName.toLowerCase().includes(q) ||
        driver.driverNumber.toLowerCase().includes(q) ||
        (attendance?.remarks && attendance.remarks.toLowerCase().includes(q));
      if (!matches) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'unrecorded') {
        if (attendance !== null) return false;
      } else {
        if (!attendance || attendance.status !== statusFilter) return false;
      }
    }

    return true;
  });

  // KPI metrics
  const totalDrivers = drivers.length;
  const presentCount = attendances.filter((a) => a.status === 'present').length;
  const absentCount = attendances.filter((a) => a.status === 'absent').length;
  const leaveCount = attendances.filter((a) => a.status === 'on_leave').length;
  const halfDayCount = attendances.filter((a) => a.status === 'half_day').length;
  const restDayCount = attendances.filter((a) => a.status === 'rest_day').length;
  const unrecordedCount = Math.max(0, totalDrivers - attendances.length);

  const handleQuickMark = async (driverId: string, status: AttendanceStatus) => {
    try {
      await attendanceApi.mark({
        driverId,
        attendanceDate: selectedDate,
        status,
        source: 'MANUAL',
      });
      fetchAttendance();
    } catch (err: any) {
      alert(err?.message || 'Failed to record attendance');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Daily Driver Attendance
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Independent daily driver attendance log decoupled from trip assignments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs px-3 py-2 border border-gray-200 rounded-lg shadow-2xs bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            Bulk Mark Attendance
          </button>

          <button
            onClick={fetchAttendance}
            disabled={loading}
            className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-2xs transition-colors"
            title="Refresh Attendance"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-medium">Total Drivers</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{totalDrivers}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-medium">Present</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{presentCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-100 bg-rose-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-medium">Absent</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700">{absentCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-100 bg-purple-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-xs font-medium">On Leave</span>
            <CalendarOff className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-700">{leaveCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-100 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-medium">Half Day / Rest</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{halfDayCount + restDayCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-xs font-medium">Unrecorded</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-gray-600">{unrecordedCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search driver name, license, driver # or remarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present Only</option>
            <option value="absent">Absent Only</option>
            <option value="half_day">Half Day Only</option>
            <option value="on_leave">On Leave Only</option>
            <option value="rest_day">Rest Day Only</option>
            <option value="unrecorded">Unrecorded Only</option>
          </select>
        </div>
      </div>

      {/* Driver Attendance Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Driver #</th>
                <th className="px-4 py-3">Driver Name</th>
                <th className="px-4 py-3">License & Status</th>
                <th className="px-4 py-3">Attendance Status</th>
                <th className="px-4 py-3">Check In / Out</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Remarks / Approver</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No drivers match current filters on {selectedDate}.
                  </td>
                </tr>
              ) : (
                filteredList.map(({ driver, attendance }) => (
                  <tr key={driver.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-800">
                      {driver.driverNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{driver.fullName}</div>
                      <div className="text-[11px] text-gray-400">{driver.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-gray-500">{driver.licenseNumber}</span>
                      <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] rounded bg-gray-100 text-gray-600 capitalize">
                        {driver.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <AttendanceBadge status={attendance?.status} />
                    </td>
                    <td className="px-4 py-3">
                      {attendance ? (
                        <div className="space-y-0.5 text-[11px] font-mono">
                          <div>
                            <span className="text-gray-400">In:</span>{' '}
                            {attendance.checkInTime
                              ? new Date(attendance.checkInTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </div>
                          <div>
                            <span className="text-gray-400">Out:</span>{' '}
                            {attendance.checkOutTime
                              ? new Date(attendance.checkOutTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {attendance ? (
                        <span className="inline-block px-1.5 py-0.5 text-[10px] rounded border border-gray-200 bg-gray-50 text-gray-600 font-mono">
                          {attendance.source}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {attendance ? (
                        <div>
                          <div className="text-gray-900 font-medium truncate max-w-xs">
                            {attendance.remarks || '—'}
                          </div>
                          {attendance.approvedBy && (
                            <div className="text-[10px] text-gray-400">
                              By: {attendance.approvedBy}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {attendance ? (
                        <button
                          onClick={() => setEditingAttendance(attendance)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          Correct
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleQuickMark(driver.id, 'present')}
                            className="px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                            title="Mark Present"
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleQuickMark(driver.id, 'absent')}
                            className="px-2 py-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                            title="Mark Absent"
                          >
                            Absent
                          </button>
                          <button
                            onClick={() => handleQuickMark(driver.id, 'on_leave')}
                            className="px-2 py-1 text-[11px] font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded transition-colors"
                            title="Mark On Leave"
                          >
                            Leave
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {editingAttendance && (
        <AttendanceCorrectionModal
          isOpen={true}
          attendance={editingAttendance}
          onClose={() => setEditingAttendance(null)}
          onSuccess={fetchAttendance}
        />
      )}

      {isBulkModalOpen && (
        <BulkAttendanceModal
          isOpen={true}
          drivers={drivers}
          selectedDate={selectedDate}
          existingDriverIds={existingDriverIds}
          onClose={() => setIsBulkModalOpen(false)}
          onSuccess={fetchAttendance}
        />
      )}
    </div>
  );
};

