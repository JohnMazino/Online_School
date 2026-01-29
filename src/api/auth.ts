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
};
