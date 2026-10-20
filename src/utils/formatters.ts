export function formatCurrency(amount: number = 0, currency: string = '₹'): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(abs);

  return `${isNegative ? '-' : ''}${currency}${formatted}`;
}

export function formatKm(distance: number = 0): string {
  return `${new Intl.NumberFormat('en-IN').format(Math.round(distance))} km`;
}

export function formatLitres(litres: number = 0): string {
  return `${Number(litres.toFixed(1))} L`;
}

export function formatMileage(mileage?: number): string {
  if (mileage === undefined || mileage === null || isNaN(mileage) || mileage <= 0) {
    return '—';
  }
  return `${mileage.toFixed(2)} km/L`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateTimeString?: string): string {
  if (!dateTimeString) return '—';
  try {
    const d = new Date(dateTimeString);
    if (isNaN(d.getTime())) return dateTimeString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateTimeString;
  }
}

export function getStatusBadgeClasses(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
    case 'verified':
    case 'completed':
    case 'approved':
    case 'connected':
    case 'synced':
    case 'settled':
    case 'eligible':
    case 'finalized':
    case 'valid':
    case 'paid':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';

    case 'in_progress':
    case 'processing':
    case 'provisional':
    case 'partially_settled':
    case 'pending_review':
    case 'under_review':
    case 'scheduled':
    case 'pending':
    case 'pending_verification':
    case 'last_sync':
    case 'idle':
      return 'bg-amber-50 text-amber-800 border-amber-200';

    case 'on_hold':
    case 'discrepancy_held':
    case 'discrepancy':
    case 'rejected':
    case 'failed':
    case 'sync_failed':
    case 'suspended':
    case 'in_maintenance':
    case 'cancelled':
    case 'unverified':
      return 'bg-rose-50 text-rose-800 border-rose-200';

    case 'draft':
    case 'inactive':
    case 'written_off':
    case 'decommissioned':
    case 'resigned':
    case 'unpaid':
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}
