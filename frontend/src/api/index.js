const BASE = '/api';

function getToken() {
  return localStorage.getItem('bm_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}

// Auth
export const authAPI = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: () => request('/auth/me'),
};

// Bots
export const botsAPI = {
  list: () => request('/bots'),
  create: (body) => request('/bots', { method: 'POST', body }),
  get: (id) => request(`/bots/${id}`),
  update: (id, body) => request(`/bots/${id}`, { method: 'PUT', body }),
  delete: (id) => request(`/bots/${id}`, { method: 'DELETE' }),
};

// Chat
export const chatAPI = {
  send: (botId, body) => request(`/bots/${botId}/chat`, { method: 'POST', body }),
  conversations: (botId) => request(`/bots/${botId}/conversations`),
  messages: (convId) => request(`/conversations/${convId}/messages`),
};

// Analytics
export const analyticsAPI = {
  get: (botId) => request(`/bots/${botId}/analytics`),
};

// Dashboard
export const dashboardAPI = {
  get: () => request('/dashboard'),
};
