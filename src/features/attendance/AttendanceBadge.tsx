import React from 'react';
import { AttendanceStatus } from '../../types';
import { CheckCircle2, XCircle, Clock, CalendarOff, Coffee } from 'lucide-react';

interface AttendanceBadgeProps {
  status?: AttendanceStatus | string | null;
  size?: 'sm' | 'md';
}

export const AttendanceBadge: React.FC<AttendanceBadgeProps> = ({ status, size = 'md' }) => {
  if (!status) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-full bg-gray-100 text-gray-500 border border-gray-200 ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Unrecorded
      </span>
    );
  }

  const s = status.toLowerCase();

  switch (s) {
    case 'present':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5 text-emerald-600'} />
          Present
        </span>
      );
    case 'absent':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <XCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5 text-rose-600'} />
          Absent
        </span>
      );
    case 'half_day':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5 text-amber-600'} />
          Half Day
        </span>
      );
    case 'on_leave':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <CalendarOff className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5 text-purple-600'} />
          On Leave
        </span>
      );
    case 'rest_day':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <Coffee className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5 text-blue-600'} />
          Rest Day
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-200 ${
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          }`}
        >
          {status}
        </span>
      );
  }
};

