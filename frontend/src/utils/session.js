// Persists the logged-in user's role/profile so RoleGuard can check it
// without decoding the JWT on every route change. The JWT itself (used for
// actual API auth) lives separately in localStorage under 'chfpl_dealer_token'
// — see src/apps/dealer/api.js. This is just UI-routing state, not a trust
// boundary; every API endpoint re-verifies the JWT server-side regardless.

const USER_KEY = 'chf_user';

export function setCurrentUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCurrentUser() {
  localStorage.removeItem(USER_KEY);
}
