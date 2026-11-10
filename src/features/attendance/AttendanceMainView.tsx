import React, { useState } from 'react';
import { DailyAttendanceView } from './DailyAttendanceView';
import { MonthlyAttendanceRegisterView } from './MonthlyAttendanceRegisterView';
import { DriverAttendanceHistoryView } from './DriverAttendanceHistoryView';
import { Calendar, CalendarCheck2, History } from 'lucide-react';

export type AttendanceTab = 'daily' | 'monthly' | 'history';

export const AttendanceMainView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AttendanceTab>('daily');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 bg-white px-6 pt-3 rounded-t-xl shadow-2xs">
        <nav className="-mb-px flex space-x-6" aria-label="Attendance Tabs">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs transition-colors ${
              activeTab === 'daily'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CalendarCheck2 className="w-4 h-4" />
            Daily Attendance
          </button>

          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs transition-colors ${
              activeTab === 'monthly'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Monthly Register
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs transition-colors ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <History className="w-4 h-4" />
            Driver-wise History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'daily' && <DailyAttendanceView />}
        {activeTab === 'monthly' && <MonthlyAttendanceRegisterView />}
        {activeTab === 'history' && <DriverAttendanceHistoryView />}
      </div>
    </div>
  );
};

