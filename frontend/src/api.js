const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function api(path, options = {}) {
  const token = localStorage.getItem('warrantyos_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) };
  const response = await fetch(`${API_BASE}${path}`, { method: options.method || 'GET', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) { localStorage.removeItem('warrantyos_user'); localStorage.removeItem('warrantyos_token'); window.location.assign('/'); }
  if (!response.ok) throw new Error(data?.message || data?.error || `Request failed (${response.status})`);
  return data;
}
export const get = path => api(path);
export const post = (path, body) => api(path, { method: 'POST', body });
export const put = (path, body) => api(path, { method: 'PUT', body });
