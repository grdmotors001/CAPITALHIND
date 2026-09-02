// Thin API client for the Dealer app. Points at the Vercel serverless
// functions in /api/dealer/*.js (Node + Supabase), which replaced the
// original PHP endpoints.
//
// Auth: serverless functions are stateless, so login returns a JWT that we
// store in localStorage and send back as `Authorization: Bearer <token>`.
// No CSRF token needed — there's no session cookie for anything to forge.

const API_BASE = '/api/dealer';
const TOKEN_KEY = 'chfpl_dealer_token';

export function getDealerToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setDealerToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearDealerToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getDealerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: 'GET',
    headers: { ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

async function apiPatchJson(path, body) {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Request failed');
  return data;
}

async function apiPostJson(path, body) {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    const err = new Error(data.error || 'Request failed');
    err.details = data.errors;
    throw err;
  }
  return data;
}

async function apiPostFormData(path, formData) {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: 'POST',
    headers: { ...authHeaders() }, // don't set Content-Type — browser sets multipart boundary
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Upload failed');
  }
  return data;
}

export function loginDealer({ phone, password }) {
  return apiPostJson('login', { phone, password }).then((d) => {
    setDealerToken(d.token);
    return d;
  });
}

export function fetchVehicleModels() {
  return apiGet('list-vehicle-models').then((d) => d.models);
}

export function fetchLoanApplications() {
  return apiGet('list-loan-applications').then((d) => d.applications);
}

export function createLoanApplication({ customer, vehicleLoan, guarantors }) {
  return apiPostJson('create-loan-application', { customer, vehicleLoan, guarantors });
}

export function uploadKycDocument({ loanApplicationId, customerId, docType, file }) {
  const formData = new FormData();
  formData.append('loan_application_id', loanApplicationId);
  formData.append('customer_id', customerId);
  formData.append('doc_type', docType);
  formData.append('file', file);
  return apiPostFormData('upload-kyc-document', formData);
}

export function fetchDealerProfile() {
  return apiGet('profile').then((d) => d.profile);
}

export function updateDealerProfile(body) {
  return apiPatchJson('profile', body).then((d) => d.profile);
}
