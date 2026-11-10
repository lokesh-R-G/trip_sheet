import React, { useState, useEffect } from 'react';
import { useFleetStore } from '../../services/store';
import { MonthlyAttendanceSummary, MonthlyDriverAttendanceSummary } from '../../types';
import { attendanceApi } from '../../services/api';
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
  Download,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

export const MonthlyAttendanceRegisterView: React.FC = () => {
  const { drivers } = useFleetStore();
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [summary, setSummary] = useState<MonthlyAttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await attendanceApi.getMonthlySummary(selectedMonth);
      setSummary(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load monthly attendance register.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedMonth]);

  const driverSummaries = summary?.driverSummaries || [];

  const filteredSummaries = driverSummaries.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return d.driverName.toLowerCase().includes(q) || d.driverNumber.toLowerCase().includes(q);
  });

  // Calculate totals
  const totalPresent = driverSummaries.reduce((sum, d) => sum + d.presentDays, 0);
  const totalAbsent = driverSummaries.reduce((sum, d) => sum + d.absentDays, 0);
  const totalLeaves = driverSummaries.reduce((sum, d) => sum + d.leaveDays, 0);
  const totalHalfDays = driverSummaries.reduce((sum, d) => sum + d.halfDays, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Monthly Attendance Register
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Aggregated monthly driver presence, absence, leave, and shift breakdown
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs px-3 py-2 border border-gray-200 rounded-lg shadow-2xs bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={fetchSummary}
            disabled={loading}
            className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-2xs transition-colors"
            title="Refresh Register"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-medium">Total Present Days</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{totalPresent}</div>
          <span className="text-[11px] text-emerald-600">Across all active drivers</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-100 bg-rose-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-medium">Total Absent Days</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700">{totalAbsent}</div>
          <span className="text-[11px] text-rose-600">Unexcused driver absences</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-100 bg-purple-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700 mb-1">
            <span className="text-xs font-medium">Total Approved Leaves</span>
            <CalendarOff className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-700">{totalLeaves}</div>
          <span className="text-[11px] text-purple-600">Authoritative approved leaves</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-100 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-medium">Total Half Days</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{totalHalfDays}</div>
          <span className="text-[11px] text-amber-600">Partial work shifts logged</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search driver by name or driver #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Monthly Register Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Driver #</th>
                <th className="px-4 py-3">Driver Name</th>
                <th className="px-4 py-3 text-center">Month Days</th>
                <th className="px-4 py-3 text-center text-emerald-700">Present</th>
                <th className="px-4 py-3 text-center text-rose-700">Absent</th>
                <th className="px-4 py-3 text-center text-amber-700">Half Day</th>
                <th className="px-4 py-3 text-center text-purple-700">On Leave</th>
                <th className="px-4 py-3 text-center text-blue-700">Rest Days</th>
                <th className="px-4 py-3 text-center text-gray-500">Unrecorded</th>
                <th className="px-4 py-3 text-right">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    {loading ? 'Loading monthly attendance data...' : 'No drivers found for this month.'}
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((d) => {
                  const effectivePresent = d.presentDays + d.halfDays * 0.5;
                  const totalDays = summary?.totalDays || 30;
                  const attendancePct = totalDays > 0 ? Math.round((effectivePresent / totalDays) * 100) : 0;

                  return (
                    <tr key={d.driverId} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-emerald-800">
                        {d.driverNumber}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {d.driverName}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {summary?.totalDays}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-emerald-700">
                        {d.presentDays}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-rose-700">
                        {d.absentDays}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-amber-700">
                        {d.halfDays}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-purple-700">
                        {d.leaveDays}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-blue-700">
                        {d.restDays}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-gray-400">
                        {d.unrecordedDays}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs ${
                            attendancePct >= 80
                              ? 'bg-emerald-50 text-emerald-700'
                              : attendancePct >= 50
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {attendancePct}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

