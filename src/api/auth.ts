const API_URL = 'http://localhost:5000/api';

export const authApi = {
  register: async (firstName: string, lastName: string, phone: string, password: string, captchaInput?: string, captchaId?: string) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, phone, password, captchaInput, captchaId }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Registration failed');
    }
    return response.json();
  },

  getCaptcha: async () => {
    const response = await fetch(`${API_URL}/auth/captcha`);
    if (!response.ok) throw new Error('Failed to load captcha');
    return response.json();
  },

  login: async (phone: string, password: string, captchaInput?: string, captchaId?: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, captchaInput, captchaId }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Login failed');
    }
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
  getStats: async (token: string) => {
    const response = await fetch(`${API_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

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

  updateBalance: async (token: string, userId: number, balance: number) => {
    const response = await fetch(`${API_URL}/admin/update-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ userId, balance }),
    });
    if (!response.ok) throw new Error('Failed to update balance');
    return response.json();
  },
};

export const tutorApi = {
  getAll: async (token: string) => {
    const response = await fetch(`${API_URL}/tutors`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch tutors');
    return response.json();
  },

  add: async (token: string, name: string, specialty: string, bio?: string, education?: string, documents?: string, photo?: File) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('specialty', specialty);
    if (bio) formData.append('bio', bio);
    if (education) formData.append('education', education);
    if (documents) formData.append('documents', documents);
    if (photo) formData.append('photo', photo);
    const response = await fetch(`${API_URL}/tutors`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to add tutor');
    return response.json();
  },

  delete: async (token: string, tutorId: number) => {
    const response = await fetch(`${API_URL}/tutors/${tutorId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to delete tutor');
    return response.json();
  },
};
