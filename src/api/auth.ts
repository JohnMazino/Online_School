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
  getAllUsers: async (token: string, q?: string, page: number = 1, perPage: number = 10) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('page', String(page));
    params.set('per_page', String(perPage));
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
};
