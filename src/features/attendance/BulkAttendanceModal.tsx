import React, { useState } from 'react';
import { Driver, AttendanceStatus } from '../../types';
import { attendanceApi } from '../../services/api';
import { X, Users, AlertCircle, Check, Calendar } from 'lucide-react';

interface BulkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  selectedDate: string;
  existingDriverIds: Set<string>;
  onSuccess: () => void;
}

export const BulkAttendanceModal: React.FC<BulkAttendanceModalProps> = ({
  isOpen,
  onClose,
  drivers,
  selectedDate: initialDate,
  existingDriverIds,
  onSuccess,
}) => {
  const [attendanceDate, setAttendanceDate] = useState(initialDate);
  const [defaultStatus, setDefaultStatus] = useState<AttendanceStatus>('present');
  const [markedBy, setMarkedBy] = useState('Operations Officer');
  const [remarks, setRemarks] = useState('');
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(() => {
    // Select active drivers that do not already have attendance on initialDate
    const set = new Set<string>();
    drivers.filter((d) => d.status === 'active' && !existingDriverIds.has(d.id)).forEach((d) => set.add(d.id));
    return set;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyDefaultStatus = () => {
    const updated: Record<string, AttendanceStatus> = {};
    for (const dId of selectedDrivers) {
      updated[dId] = defaultStatus;
    }
    setStatuses(updated);
  };

  const toggleDriver = (id: string) => {
    const next = new Set(selectedDrivers);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedDrivers(next);
  };

  const toggleSelectAll = () => {
    if (selectedDrivers.size === drivers.length) {
      setSelectedDrivers(new Set());
    } else {
      setSelectedDrivers(new Set(drivers.map((d) => d.id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDrivers.size === 0) {
      setError('Please select at least one driver to mark attendance.');
      return;
    }

    setLoading(true);
    setError(null);

    const records = Array.from(selectedDrivers).map((driverId) => ({
      driverId,
      status: statuses[driverId] || defaultStatus,
      source: 'MANUAL',
      remarks: remarks.trim() || undefined,
      approvedBy: markedBy.trim() || undefined,
    }));

    try {
      const res = await attendanceApi.bulkMark({
        attendanceDate,
        records,
      });

      if (res.skipped && res.skipped.length > 0) {
        console.warn('Some drivers were skipped:', res.skipped);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit bulk attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Bulk Mark Driver Attendance
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Record daily presence, leave, or off-duty status for active drivers in batch
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Attendance Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Batch Default Status
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={defaultStatus}
                  onChange={(e) => setDefaultStatus(e.target.value as AttendanceStatus)}
                  className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="present">Present (Full Day)</option>
                  <option value="absent">Absent</option>
                  <option value="half_day">Half Day</option>
                  <option value="on_leave">On Leave</option>
                  <option value="rest_day">Rest Day / Off</option>
                </select>
                <button
                  type="button"
                  onClick={handleApplyDefaultStatus}
                  className="px-2.5 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shrink-0"
                >
                  Apply to Selected
                </button>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={selectedDrivers.size === drivers.length && drivers.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                Select All ({selectedDrivers.size} of {drivers.length} drivers selected)
              </label>
              <span className="text-[11px] text-gray-500">Individual Status Override</span>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
              {drivers.map((d) => {
                const isSelected = selectedDrivers.has(d.id);
                const isAlreadyMarked = existingDriverIds.has(d.id);
                const currentStatus = statuses[d.id] || defaultStatus;

                return (
                  <div
                    key={d.id}
                    className={`px-3 py-2 flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-emerald-50/30' : 'bg-white'
                    }`}
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDriver(d.id)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="text-xs font-medium text-gray-900">{d.fullName}</span>
                        <span className="text-[11px] font-mono text-gray-400 ml-2">({d.driverNumber})</span>
                        {isAlreadyMarked && (
                          <span className="text-[10px] ml-2 font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Already Recorded
                          </span>
                        )}
                      </div>
                    </label>

                    {isSelected && (
                      <select
                        value={currentStatus}
                        onChange={(e) =>
                          setStatuses({ ...statuses, [d.id]: e.target.value as AttendanceStatus })
                        }
                        className="text-xs px-2 py-1 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="half_day">Half Day</option>
                        <option value="on_leave">On Leave</option>
                        <option value="rest_day">Rest Day</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedDrivers.size === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>Recording...</>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Mark Attendance ({selectedDrivers.size})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

