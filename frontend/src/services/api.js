// services/api.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('khatanest_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('khatanest_token');
      localStorage.removeItem('khatanest_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────
export const authAPI = {
  register        : (data)          => api.post('/auth/register', data),
  login           : (data)          => api.post('/auth/login', data),
  getMe           : ()              => api.get('/auth/me'),
  updateProfile   : (data)          => api.put('/auth/profile', data),
  changePassword  : (data)          => api.put('/auth/password', data),
  updatePreferences: (data)         => api.put('/auth/preferences', data),
  generateInvite  : ()              => api.post('/auth/invite'),
  forgotPassword  : (email)         => api.post('/auth/forgot-password', { email }),
  resetPassword   : (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
};

// ─── Group ────────────────────────────────────────────────────────
export const groupAPI = {
  getGroup        : ()       => api.get('/group'),
  updateGroup     : (data)   => api.put('/group', data),
  updateSettings  : (data)   => api.put('/group/settings', data),
  updateBudgets   : (data)   => api.put('/group/budgets', data),
  addMember       : (data)   => api.post('/group/members', data),
  removeMember    : (id)     => api.delete(`/group/members/${id}`),
  updateMemberRole: (id, role) => api.put(`/group/members/${id}/role`, { role }),
  monthlyReset    : ()       => api.post('/group/reset'),
  getArchives     : ()       => api.get('/group/archives'),
  getArchive      : (id)     => api.get(`/group/archives/${id}`),
};

// ─── Expenses ─────────────────────────────────────────────────────
export const expenseAPI = {
  getExpenses   : (params)    => api.get('/expenses', { params }),
  addExpense    : (data)      => api.post('/expenses', data),
  updateExpense : (id, data)  => api.put(`/expenses/${id}`, data),
  deleteExpense : (id)        => api.delete(`/expenses/${id}`),
  getStats      : ()          => api.get('/expenses/stats'),
  exportCSV     : (params)    => api.get('/expenses/export', { params, responseType: 'blob' }),
  addComment    : (id, text)  => api.post(`/expenses/${id}/comments`, { text }),
  deleteComment : (id, cId)   => api.delete(`/expenses/${id}/comments/${cId}`),
};

// ─── Payments ─────────────────────────────────────────────────────
export const paymentAPI = {
  getPayments   : (params) => api.get('/payments', { params }),
  recordPayment : (data)   => api.post('/payments', data),
  deletePayment : (id)     => api.delete(`/payments/${id}`),
};

// ─── Balances ─────────────────────────────────────────────────────
export const balanceAPI = {
  getBalances: ()       => api.get('/balances'),
  getHistory : (params) => api.get('/balances/history', { params }),
};

// ─── Activity (NEW) ───────────────────────────────────────────────
export const activityAPI = {
  getActivity   : (params) => api.get('/activity', { params }),
  getUnseenCount: ()       => api.get('/activity/unseen'),
  markSeen      : ()       => api.put('/activity/mark-seen'),
};

export default api;