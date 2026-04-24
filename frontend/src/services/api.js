const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: getHeaders(),
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  getDemoCredentials: () => request('/auth/demo-credentials'),

  // Generic CRUD
  getAll: (resource, params = '') => request(`/${resource}${params ? '?' + params : ''}`),
  getOne: (resource, id) => request(`/${resource}/${id}`),
  create: (resource, body) => request(`/${resource}`, { method: 'POST', body: JSON.stringify(body) }),
  update: (resource, id, body) => request(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (resource, id) => request(`/${resource}/${id}`, { method: 'DELETE' }),

  // AI endpoints
  aiAnalyze: (resource, id, action = 'ai-analyze') => request(`/${resource}/${id}/${action}`, { method: 'POST' }),
  aiAction: (resource, action, body = {}) => request(`/${resource}/${action}`, { method: 'POST', body: JSON.stringify(body) }),
  aiChat: (message) => request('/ai/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  aiDashboard: () => request('/ai/dashboard'),
  aiBusinessHealth: () => request('/ai/business-health', { method: 'POST' }),
  aiStatus: () => request('/ai/status'),
  aiLogs: () => request('/ai/logs'),
};
