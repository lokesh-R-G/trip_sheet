import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    type: 'positive' | 'negative' | 'neutral' | 'warning';
  };
  onClick?: () => void;
  accent?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon: Icon,
  badge,
  onClick,
  accent = false
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border p-4 transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-emerald-500 hover:shadow-sm' : ''
      } ${accent ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
        <div
          className={`w-9 h-9 rounded-md flex items-center justify-center ${
            accent ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-bold text-gray-900 tracking-tight">{value}</div>
        {badge && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              badge.type === 'positive'
                ? 'bg-emerald-50 text-emerald-700'
                : badge.type === 'warning'
                ? 'bg-amber-50 text-amber-700'
                : badge.type === 'negative'
                ? 'bg-rose-50 text-rose-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1.5 text-xs text-gray-500 line-clamp-1">{subtitle}</p>}
    </div>
  );
};
