const DEFAULT_GRD_BASE = 'https://grdnew.vercel.app/api/backend';

export function getGrdBaseUrl() {
  return String(process.env.GRD_API_BASE_URL || DEFAULT_GRD_BASE).replace(/\/+$/, '');
}

export async function fetchGrdMasters() {
  const secret = process.env.CHFPL_GRD_BRIDGE_SECRET || '';
  if (!secret) throw new Error('CHFPL_GRD_BRIDGE_SECRET is not configured');

  const response = await fetch(`${getGrdBaseUrl()}/integration/masters`, {
    method: 'GET',
    headers: { 'X-GRD-BRIDGE-SECRET': secret, Accept: 'application/json' },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || `GRD master request failed (${response.status})`);
  }
  return data;
}

export function mapGrdDealers(data) {
  return (data.dealers || []).map((d) => ({
    id: d.id,
    dealer_code: d.code || '',
    dealer_name: d.name || '',
    mobile: d.mobile || '',
    state: d.state || '',
    state_code: d.state_code || '',
    source: 'grd',
    users: [],
  }));
}

export function mapGrdModels(data) {
  return (data.models || []).map((m) => ({
    id: m.id,
    model_name: m.name || '',
    vehicle_type: '3W',
    ex_showroom_price: 0,
    battery_capacity: '',
    is_active: true,
    grd_code: m.code || '',
    fuel_type: m.fuel_type || '',
    gst_rate: m.gst_rate || 0,
    source: 'grd',
  }));
}

export function mapGrdFinancers(data) {
  return (data.financers || []).map((f) => ({
    id: f.id,
    financer_name: f.name || '',
    code: f.code || '',
    mobile: f.mobile || '',
    account_no: f.account_no || '',
    ifsc: f.ifsc || '',
    source: 'grd',
  }));
}
