// Shared auth client for `users` table roles other than admin/dealer:
// field_executive, tele_caller, customer, do. Mirrors src/apps/dealer/api.js
// and src/apps/admin/api.js token patterns. Hits /api/users/login.

const AUTH_API_BASE = '/api/users';
const TOKEN_KEY = 'chfpl_app_user_token';

export function getAppUserToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAppUserToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAppUserToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders() {
  const token = getAppUserToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function loginAppUser({ identifier, password }) {
  return fetch(`${AUTH_API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }
      return data;
    })
    .then((data) => {
      setAppUserToken(data.token);
      return data;
    });
}

export async function apiGet(base, path) {
  const res = await fetch(`${base}/${path}`, { method: 'GET', headers: { ...authHeaders() } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || 'Request failed');
  return data;
}

export async function apiPost(base, path, body) {
  const res = await fetch(`${base}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || 'Request failed');
  return data;
}
