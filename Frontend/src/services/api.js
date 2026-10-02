import axios from 'axios';

const rawBaseUrl = (import.meta.env.VITE_API_URL || '').trim();
const cleanBaseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
const baseURL = cleanBaseUrl ? `${cleanBaseUrl}/api` : '/api';

const api = axios.create({
  baseURL,
  withCredentials: true, // Enables HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Dispatched when session token expires
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  googleAuth: (data) => api.post('/auth/google', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const incidentsApi = {
  list: (params) => api.get('/incidents', { params }),
  get: (id) => api.get(`/incidents/${id}`),
  delete: (id) => api.delete(`/incidents/${id}`),
};

export const uploadsApi = {
  uploadFile: (formData, onProgress) =>
    api.post('/uploads/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  analyze: (data) => api.post('/uploads/video/analyze', data),
};

export const analyticsApi = {
  getSummary: () => api.get('/analytics/summary'),
  getOverTime: (params) => api.get('/analytics/incidents-over-time', { params }),
  getDistribution: () => api.get('/analytics/distribution'),
};

export const usersApi = {
  list: () => api.get('/users'),
  updateRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  delete: (id) => api.delete(`/users/${id}`),
};

export const monitoringApi = {
  start: (data) => api.post('/monitoring/start', data),
  stop: () => api.post('/monitoring/stop'),
};

export default api;
