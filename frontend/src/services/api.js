// services/api.js - Axios instance and all API calls
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('khatanest_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally - auto logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('khatanest_token');
      localStorage.removeItem('khatanest_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login   : (data) => api.post('/auth/login', data),
  getMe   : ()     => api.get('/auth/me'),
  // NOTE: forgotPassword requires a dedicated backend route (/api/auth/forgot-password).
  // It is not implemented in this version. The ForgotPasswordPage is included for UI
  // completeness — calling this will return a 404 until the route is added.
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
};

// ─── Group ────────────────────────────────────────────────────────
export const groupAPI = {
  getGroup    : ()       => api.get('/group'),
  updateGroup : (data)   => api.put('/group', data),
  addMember   : (data)   => api.post('/group/members', data),
  removeMember: (id)     => api.delete(`/group/members/${id}`),
  monthlyReset: ()       => api.post('/group/reset'),
};

// ─── Expenses ─────────────────────────────────────────────────────
export const expenseAPI = {
  getExpenses   : (params)    => api.get('/expenses', { params }),
  addExpense    : (data)      => api.post('/expenses', data),
  updateExpense : (id, data)  => api.put(`/expenses/${id}`, data),
  deleteExpense : (id)        => api.delete(`/expenses/${id}`),
  getStats      : ()          => api.get('/expenses/stats'),
};

// ─── Payments ─────────────────────────────────────────────────────
// params.type: '' | 'member' | 'self'
//   ''       = all payments
//   'member' = only member-to-admin payments
//   'self'   = only admin's own share payments
export const paymentAPI = {
  getPayments   : (params) => api.get('/payments', { params }),
  recordPayment : (data)   => api.post('/payments', data),
  deletePayment : (id)     => api.delete(`/payments/${id}`),
};

// ─── Balances ─────────────────────────────────────────────────────
// params.type: '' | 'expense' | 'payment' | 'member' | 'self'
export const balanceAPI = {
  getBalances: ()       => api.get('/balances'),
  getHistory : (params) => api.get('/balances/history', { params }),
};

export default api;