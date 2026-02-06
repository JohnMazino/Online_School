const API_URL = 'http://localhost:5000/api';

export const authApi = {
  register: async (firstName: string, lastName: string, phone: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, phone, password }),
    });
    if (!response.ok) throw new Error('Registration failed');
    return response.json();
  },

  login: async (phone: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  },

  getProfile: async (token: string) => {
    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to get profile');
    return response.json();
  },

  // Admin APIs
  getAllUsers: async (token: string, opts: any = {}) => {
    const params = new URLSearchParams();
    if (opts.q) params.set('q', opts.q);
    if (opts.role) params.set('role', opts.role);
    if (opts.status) params.set('status', opts.status);
    if (opts.date_from) params.set('date_from', opts.date_from);
    if (opts.date_to) params.set('date_to', opts.date_to);
    if (opts.sort_by) params.set('sort_by', opts.sort_by);
    if (opts.sort_order) params.set('sort_order', opts.sort_order);
    params.set('page', String(opts.page || 1));
    params.set('per_page', String(opts.per_page || 10));

    const url = `${API_URL}/admin/users?${params.toString()}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  assignRole: async (token: string, userId: number, role: string) => {
    const response = await fetch(`${API_URL}/admin/assign-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ userId, role }),
    });
    if (!response.ok) throw new Error('Failed to assign role');
    return response.json();
  },

  getAuditLogs: async (token: string, params?: any) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.admin_id) search.set('admin_id', String(params.admin_id));
    if (params?.action_type) search.set('action_type', params.action_type);
    if (params?.entity_type) search.set('entity_type', params.entity_type);
    if (params?.date_from) search.set('date_from', params.date_from);
    if (params?.date_to) search.set('date_to', params.date_to);
    search.set('page', String(params?.page || 1));
    search.set('per_page', String(params?.per_page || 20));

    const url = `${API_URL}/admin/audit-logs?${search.toString()}`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error('Failed to fetch audit logs');
    return response.json();
  },

  getStats: async (token: string) => {
    const response = await fetch(`${API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  exportUsers: async (token: string, format = 'csv') => {
    const url = `${API_URL}/admin/export?format=${format}`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error('Failed to export users');
    const blob = await response.blob();
    return blob;
  },

  blockUser: async (token: string, userId: number, block: boolean) => {
    const response = await fetch(`${API_URL}/admin/block-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ userId, block }),
    });
    if (!response.ok) throw new Error('Failed to update user status');
    return response.json();
  },

  resetUserPassword: async (token: string, userId: number) => {
    // Try primary endpoint first, fall back to v2 if it fails
    const response = await fetch(`${API_URL}/admin/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ userId }),
    });
    if (response.ok) return response.json();

    // fallback
    const fallback = await fetch(`${API_URL}/admin/reset-password-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ userId }),
    });
    if (!fallback.ok) throw new Error('Failed to reset password');
    return fallback.json();
  },
};
