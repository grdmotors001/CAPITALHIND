// Auth (login) -> new Node/Vercel serverless endpoint at /api/admin/login,
// JWT-based, same pattern as src/apps/dealer/api.js.
//
// Staff management uses JWT-authenticated Vercel/Supabase endpoints.

const AUTH_API_BASE = '/api/admin';
const TOKEN_KEY = 'chfpl_admin_token';

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function loginAdmin({ identifier, password }) {
  return fetch(`${AUTH_API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Admin login failed');
      }
      return data;
    })
    .then((data) => {
      setAdminToken(data.token);
      return data;
    });
}

// Export loan-applications data to CIBIL's TUDF "Data Submission Form"
// layout -> new Node/Vercel serverless endpoint at /api/admin/export-cibil
// (Supabase-backed, JWT-authenticated). Triggers a real file download in
// the browser; throws on failure so the caller can show an error.
//
// `asOnDate` is entered by the admin (native <input type="date"> value,
// 'YYYY-MM-DD') and becomes the CIBIL "Date Reported" on every row.
export async function exportCibilData({ asOnDate, dealerId } = {}) {
  const token = getAdminToken();
  const response = await fetch(`${AUTH_API_BASE}/export-cibil`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ asOnDate, dealerId }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Export failed');
  }

  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : 'cibil-export.xlsx';

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return { filename };
}

// --- Users (field_executive / tele_caller / customer / admin) -------------
// New Node/Vercel serverless endpoints backed by Supabase `users` table —
// the same table used by /api/admin/login and RoleGuard everywhere else in
// the app. JWT-authenticated (admin token from loginAdmin above).

async function usersRequest(path, { method = 'GET', body } = {}) {
  const token = getAdminToken();
  const response = await fetch(`${AUTH_API_BASE}/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export function listUsers() {
  return usersRequest('list-users');
}

export function createUser(payload) {
  return usersRequest('create-user', { method: 'POST', body: payload });
}

export function updateUser(payload) {
  return usersRequest('update-user', { method: 'POST', body: payload });
}

export function deleteUser(id) {
  return usersRequest('delete-user', { method: 'POST', body: { id } });
}

export function listDealers() { return usersRequest('dealers'); }
export function createDealer(payload) { return usersRequest('dealers', { method: 'POST', body: payload }); }
export function updateDealer(payload) { return usersRequest('dealers', { method: 'PATCH', body: payload }); }
export function deleteDealer(id) { return usersRequest('dealers', { method: 'DELETE', body: { id } }); }

export function listLoanApplicationsAdmin() {
  return usersRequest('list-loan-applications');
}

export function assignFieldExecutive(payload) {
  return usersRequest('assign-fe', { method: 'POST', body: payload });
}

export function listApprovedLoans() {
  return usersRequest('list-approved-loans');
}

export function createLoan(payload) {
  return usersRequest('create-loan', { method: 'POST', body: payload });
}

export function getDashboardStats() { return usersRequest('dashboard-stats'); }
export function addReceipt(payload) { return usersRequest('add-receipt', { method: 'POST', body: payload }); }
export function listReceiptLoans() { return usersRequest('receipt-loans'); }
export function listReceipts() { return usersRequest('receipts'); }
export function listPaymentVouchers() { return usersRequest('payment-vouchers'); }
export function createPaymentVoucher(payload) { return usersRequest('payment-vouchers', { method: 'POST', body: payload }); }

// --- Masters: HP (Hypothecation) / Vehicle Model / Loan Type --------------
// New Node/Vercel serverless endpoints backed by Supabase (see
// supabase/migrations/0004_admin_masters.sql for HP + Loan Type, and
// 0001_init.sql for the existing Vehicle Model master). JWT-authenticated,
// same `usersRequest` pattern as above.

function mastersRequest(path, opts) {
  return usersRequest(`masters/${path}`, opts);
}

// HP (Hypothecation)
export function listHP() {
  return mastersRequest('list-hp');
}
export function createHP(payload) {
  return mastersRequest('create-hp', { method: 'POST', body: payload });
}
export function updateHP(payload) {
  return mastersRequest('update-hp', { method: 'POST', body: payload });
}
export function deleteHP(id) {
  return mastersRequest('delete-hp', { method: 'POST', body: { id } });
}

// Vehicle Model
export function listOems() { return mastersRequest('list-oems'); }
export function createOEM(payload) { return mastersRequest('create-oem', { method: 'POST', body: payload }); }
export function updateOEM(payload) { return mastersRequest('update-oem', { method: 'POST', body: payload }); }
export function deleteOEM(id) { return mastersRequest('delete-oem', { method: 'POST', body: { id } }); }
export function listVehicleModelsAdmin() {
  return mastersRequest('list-vehicle-models');
}
export function createVehicleModel(payload) {
  return mastersRequest('create-vehicle-model', { method: 'POST', body: payload });
}
export function updateVehicleModel(payload) {
  return mastersRequest('update-vehicle-model', { method: 'POST', body: payload });
}
export function deleteVehicleModel(id) {
  return mastersRequest('delete-vehicle-model', { method: 'POST', body: { id } });
}

// Loan Type
export function listLoanTypes() {
  return mastersRequest('list-loan-types');
}
export function createLoanType(payload) {
  return mastersRequest('create-loan-type', { method: 'POST', body: payload });
}
export function updateLoanType(payload) {
  return mastersRequest('update-loan-type', { method: 'POST', body: payload });
}
export function deleteLoanType(id) {
  return mastersRequest('delete-loan-type', { method: 'POST', body: { id } });
}

export function listBatteries() { return mastersRequest('batteries'); }
export function createBattery(payload) { return mastersRequest('batteries', { method: 'POST', body: payload }); }
export function updateBattery(payload) { return mastersRequest('batteries', { method: 'PATCH', body: payload }); }
export function deleteBattery(id) { return mastersRequest('batteries', { method: 'DELETE', body: { id } }); }

const STAFF_API_BASE = '/api/admin/staff';

async function staffRequest(path, { method = 'GET', body } = {}) {
  const token = getAdminToken();
  const response = await fetch(`${STAFF_API_BASE}/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export function listStaff() {
  return staffRequest('list');
}

export function createStaff(payload) {
  if (payload.role === 'admin') {
    return createUser({
      full_name: payload.username,
      phone: payload.contact_mobile,
      password: payload.password,
      role: 'admin',
      email: payload.email,
    });
  }
  return staffRequest('create', { method: 'POST', body: payload });
}

export function updateStaffContact(payload) {
  if (payload.source === 'users' || payload.role === 'admin') {
    return updateUser({
      id: payload.id,
      phone: payload.contact_mobile || '',
      email: payload.email || '',
    });
  }
  return staffRequest('update', { method: 'POST', body: payload });
}

export function deleteStaff(user) {
  if (user.source === 'users' || user.role === 'admin') {
    return deleteUser(user.id);
  }
  return staffRequest('delete', { method: 'POST', body: { id: user.id } });
}

// --- Reports ---------------------------------------------------------------
export async function listReport(filters = {}) {
  const token = getAdminToken();
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k,v]) => { if (v && v !== 'All') qs.set(k, v); });
  const response = await fetch(`${AUTH_API_BASE}/reports?${qs.toString()}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.error || 'Could not load report');
  return data;
}

export async function downloadReportCsv(filters = {}) {
  const token = getAdminToken();
  const qs = new URLSearchParams({ ...filters, download: 'csv' });
  const response = await fetch(`${AUTH_API_BASE}/reports?${qs.toString()}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!response.ok) { const data = await response.json().catch(()=>({})); throw new Error(data.error || 'Report download failed'); }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href=url; a.download=`CHFPL_${filters.report || 'report'}_${filters.from || 'from'}_${filters.to || 'to'}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
