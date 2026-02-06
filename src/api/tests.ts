const API_URL = 'http://localhost:5000/api';

export const testsApi = {
  createTest: async (token: string | null, data: any) => {
    const res = await fetch(`${API_URL}/tests/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create test');
    return res.json();
  },

  getTest: async (id: number) => {
    const res = await fetch(`${API_URL}/tests/${id}`);
    if (!res.ok) throw new Error('Failed to fetch test');
    return res.json();
  },

  assignTest: async (token: string | null, payload: any) => {
    const res = await fetch(`${API_URL}/tests/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to assign test');
    return res.json();
  },

  assignBatch: async (token: string | null, payload: any) => {
    const res = await fetch(`${API_URL}/tests/assign/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to assign batch');
    return res.json();
  },

  getAttemptsForUser: async (userId: number) => {
    const res = await fetch(`${API_URL}/tests/attempts/user/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch attempts');
    return res.json();
  },

  getAssignedForUser: async (userId: number) => {
    const res = await fetch(`${API_URL}/tests/assigned/user/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch assignments');
    return res.json();
  },

  submitAttempt: async (token: string | null, payload: any) => {
    const res = await fetch(`${API_URL}/tests/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit attempt');
    return res.json();
  }
};
