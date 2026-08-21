const API_BASE = '/admin/staff-api.php';

async function request(action, body = {}) {
  const response = await fetch(API_BASE, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...body }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export function listStaff() {
  return request('list');
}

export function createStaff(payload) {
  return request('create', payload);
}

export function updateStaffContact(payload) {
  return request('update_contact', payload);
}

export function deleteStaff(id) {
  return request('delete', { id });
}
