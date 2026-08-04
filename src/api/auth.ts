const API_URL = 'http://localhost:5000/api';

export const authApi = {
  register: async (firstName: string, lastName: string, email: string, password: string, captchaInput?: string, captchaId?: string) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, password, captchaInput, captchaId }),
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

  login: async (email: string, password: string, captchaInput?: string, captchaId?: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, captchaInput, captchaId }),
    });
    if (!response.ok) {
       const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Login failed');
    }
    return response.json();
  },

  verifyCaptcha: async (captchaInput: string, captchaId: string) => {
    const response = await fetch(`${API_URL}/auth/verify-captcha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captchaInput, captchaId }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Invalid captcha');
    }
    return response.json();
  },

  sendEmailCode: async (email: string) => {
    const response = await fetch(`${API_URL}/auth/send-email-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to send email code');
    }
    return response.json();
  },

  registerWithEmail: async (firstName: string, lastName: string, email: string, password: string, code: string) => {
    const response = await fetch(`${API_URL}/auth/register-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, password, code }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Registration failed');
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

  forgotPassword: async (email: string): Promise<void> => {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка при отправке запроса');
        }
    },

    verifyResetToken: async (token: string): Promise<void> => {
        const response = await fetch(`${API_URL}/auth/verify-reset-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Недействительный токен');
        }
    },

    resetPassword: async (token: string, newPassword: string): Promise<void> => {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка при сбросе пароля');
        }
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
  getAll: async () => {
    const response = await fetch(`${API_URL}/tutors`);
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

export const lectureApi = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/lectures`);
    if (!response.ok) throw new Error('Failed to fetch lectures');
    return response.json();
  },

  upload: async (token: string, title: string, file: File, description?: string) => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('file', file);
    if (description) formData.append('description', description);
    const response = await fetch(`${API_URL}/lectures`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload lecture');
    return response.json();
  },

  delete: async (token: string, lectureId: number) => {
    const response = await fetch(`${API_URL}/lectures/${lectureId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to delete lecture');
    return response.json();
  },

  reorder: async (token: string, ids: number[]) => {
    const response = await fetch(`${API_URL}/lectures/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('Failed to reorder lectures');
    return response.json();
  },
};
