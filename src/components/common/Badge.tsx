import React from 'react';
import { getStatusBadgeClasses } from '../../utils/formatters';

interface BadgeProps {
  status?: string | null;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, label, size = 'sm', className = '' }) => {
  const safeStatus = (status ?? '').toString().trim();
  const displayLabel = label || (safeStatus ? safeStatus.replace(/_/g, ' ') : 'UNKNOWN');
  const colorClass = getStatusBadgeClasses(safeStatus);
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border capitalize ${sizeClass} ${colorClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {displayLabel}
    </span>
  );
};
