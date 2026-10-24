/**
 * Centralized API Client for Trip Sheet Management System
 * Connects frontend views to backend REST endpoints at /api/v1
 */

const API_BASE = '/api/v1';

export class ApiError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: any[];

  constructor(message: string, statusCode: number, code?: string, details?: any[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // Supply default actor header for audit & authorized actions
  if (!headers.has('x-actor-id')) {
    headers.set('x-actor-id', 'OperationsOfficer');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  let json: any = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const errorMsg = json?.error?.message || json?.message || `Request failed with HTTP ${response.status}`;
    const errorCode = json?.error?.code || json?.code;
    const errorDetails = json?.error?.details || json?.details;
    throw new ApiError(errorMsg, response.status, errorCode, errorDetails);
  }

  // Backend standard response format is { success: true, data: ..., meta?: ... }
  return json?.data !== undefined ? json.data : json;
}

// ==========================================
// 1. DRIVER API
// ==========================================
export const driverApi = {
  list: async (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit || 50));
    return request<any[]>(`/drivers?${q.toString()}`);
  },
  getById: async (id: string) => {
    return request<any>(`/drivers/${id}`);
  },
  create: async (data: any) => {
    return request<any>('/drivers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, updates: any) => {
    return request<any>(`/drivers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
  changeStatus: async (id: string, status: string, reason?: string) => {
    return request<any>(`/drivers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  },
};

// ==========================================
// 2. VEHICLE API
// ==========================================
export const vehicleApi = {
  list: async (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    return request<any[]>(`/vehicles?${q.toString()}`);
  },
  getById: async (id: string) => {
    return request<any>(`/vehicles/${id}`);
  },
  getLatestOdometer: async (id: string) => {
    return request<{
      vehicleId: string;
      externalVehicleId: string;
      registrationNumber: string;
      latestAuthoritativeOdometer: number;
      effectiveDate: string;
      source: string;
      isBaselineAvailable: boolean;
    }>(`/vehicles/${id}/latest-odometer`);
  },
};

// ==========================================
// 3. TRIP API
// ==========================================
export const tripApi = {
  list: async (params?: { status?: string; driverId?: string; vehicleId?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.driverId) q.append('driverId', params.driverId);
    if (params?.vehicleId) q.append('vehicleId', params.vehicleId);
    if (params?.search) q.append('search', params.search);
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit || 50));
    return request<any[]>(`/trips?${q.toString()}`);
  },
  getById: async (id: string) => {
    return request<any>(`/trips/${id}`);
  },
  create: async (data: any) => {
    return request<any>('/trips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, updates: any) => {
    return request<any>(`/trips/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
  transition: async (id: string, targetStatus: string, expectedVersion: number, reason?: string) => {
    return request<any>(`/trips/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ targetStatus, expectedVersion, reason }),
    });
  },
  addRouteSegment: async (tripId: string, segment: any) => {
    return request<any>(`/trips/${tripId}/segments`, {
      method: 'POST',
      body: JSON.stringify(segment),
    });
  },
  updateRouteSegment: async (tripId: string, segmentId: string, updates: any) => {
    return request<any>(`/trips/${tripId}/segments/${segmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
  deleteRouteSegment: async (tripId: string, segmentId: string) => {
    return request<any>(`/trips/${tripId}/segments/${segmentId}`, {
      method: 'DELETE',
    });
  },
};

// ==========================================
// 4. ADVANCES API
// ==========================================
export const advanceApi = {
  list: async (params?: { driverId?: string; tripId?: string; transactionType?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.driverId) q.append('driverId', params.driverId);
    if (params?.tripId) q.append('tripId', params.tripId);
    if (params?.transactionType) q.append('transactionType', params.transactionType);
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit || 50));
    return request<any[]>(`/advances?${q.toString()}`);
  },
  getDriverSummary: async (driverId: string) => {
    return request<any>(`/advances/driver/${driverId}/summary`);
  },
  create: async (data: any) => {
    return request<any>('/advances', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  allocateToTrip: async (tripId: string, amount: number | string) => {
    return request<any>(`/advances/trips/${tripId}/allocate`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },
  releaseAllocation: async (allocationId: string, reason: string) => {
    return request<any>(`/advances/allocations/${allocationId}/release`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};

// ==========================================
// 5. EXPENSES API
// ==========================================
export const expenseApi = {
  list: async (params?: { tripId?: string; category?: string; approvalStatus?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.tripId) q.append('tripId', params.tripId);
    if (params?.category) q.append('category', params.category);
    if (params?.approvalStatus) q.append('approvalStatus', params.approvalStatus);
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit || 100));
    return request<any[]>(`/expenses?${q.toString()}`);
  },
  submit: async (data: any) => {
    return request<any>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  review: async (id: string, reviewInput: { action: 'approve' | 'reject' | 'adjust' | 'return_for_correction'; approvedAmount?: number; adjustedAmount?: number; comments?: string; rejectionReason?: string }) => {
    return request<any>(`/expenses/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(reviewInput),
    });
  },
};

// ==========================================
// 6. SETTLEMENT API
// ==========================================
export const settlementApi = {
  getCalculation: async (tripId: string) => {
    return request<any>(`/settlements/trip/${tripId}`);
  },
  finalize: async (tripId: string, input?: { expectedVersion?: number; settledDate?: string; notes?: string }) => {
    return request<any>(`/settlements/trip/${tripId}/finalize`, {
      method: 'POST',
      body: JSON.stringify(input || {}),
    });
  },
  reopen: async (tripId: string, reason: string) => {
    return request<any>(`/settlements/trip/${tripId}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
  recordCashReturn: async (tripId: string, data: { amount: number | string; referenceNumber: string; transactionDate: string; paymentMethod?: string; notes?: string }) => {
    return request<any>(`/settlements/trip/${tripId}/return`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ==========================================
// 7. FUEL & BENCHMARKS API
// ==========================================
export const fuelApi = {
  listTopUps: async (params?: { vehicleId?: string; driverId?: string }) => {
    const q = new URLSearchParams();
    if (params?.vehicleId) q.append('vehicleId', params.vehicleId);
    if (params?.driverId) q.append('driverId', params.driverId);
    return request<any[]>(`/fuel-topups?${q.toString()}`);
  },
  createTopUp: async (data: any) => {
    return request<any>('/fuel-topups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  listBenchmarks: async () => {
    return request<any[]>('/benchmarks');
  },
  listDeductions: async () => {
    return request<any[]>('/fuel-deductions');
  },
  proposeDeduction: async (tripId: string) => {
    return request<any>('/fuel-deductions/propose', {
      method: 'POST',
      body: JSON.stringify({ tripId }),
    });
  },
  reviewDeduction: async (id: string, action: 'approve' | 'reject' | 'adjust', data?: any) => {
    return request<any>(`/fuel-deductions/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, ...data }),
    });
  },
};

// ==========================================
// 8. AUDIT LOGS API
// ==========================================
export const auditApi = {
  list: async (params?: { entityType?: string; entityId?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.entityType) q.append('entityType', params.entityType);
    if (params?.entityId) q.append('entityId', params.entityId);
    if (params?.limit) q.append('limit', String(params.limit || 50));
    return request<any[]>(`/audit-logs?${q.toString()}`);
  },
};
