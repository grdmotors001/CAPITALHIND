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
    grd_dealer_id: d.id,
    dealer_code: d.code || '',
    dealer_name: d.name || '',
    mobile: d.mobile || '',
    state: d.state || '',
    state_code: d.state_code || '',
    source: 'grd',
    users: [],
  }));
}

// Resolve the GRD dealer identity to the CHFPL dealer_master row used by
// vehicle_repossessions. GRD remains the source of truth; the local row is
// only an identity mirror needed for the existing FK.
export async function resolveGrdDealer(supabase, grdDealerId, masters = null) {
  const id = String(grdDealerId || '').trim();
  if (!id) throw new Error('Dealer id is required.');

  const data = masters || await fetchGrdMasters();
  const grdDealer = (data.dealers || []).find((d) => String(d.id) === id);
  if (!grdDealer) throw new Error('Dealer not found in GRD dealer master.');

  const code = String(grdDealer.code || '').trim();
  const name = String(grdDealer.name || '').trim();

  const byGrd = await supabase.from('dealer_master')
    .select('id,dealer_name,dealer_code,grd_dealer_id')
    .eq('grd_dealer_id', id)
    .maybeSingle();
  if (byGrd.error) throw new Error('Could not map GRD dealer to CHFPL.');
  if (byGrd.data) return byGrd.data;

  if (code) {
    const byCode = await supabase.from('dealer_master')
      .select('id,dealer_name,dealer_code,grd_dealer_id')
      .eq('dealer_code', code)
      .maybeSingle();
    if (byCode.error) throw new Error('Could not map dealer code.');
    if (byCode.data) {
      if (String(byCode.data.grd_dealer_id || '') !== id) {
        const upd = await supabase.from('dealer_master')
          .update({ grd_dealer_id: Number(id) })
          .eq('id', byCode.data.id);
        if (upd.error && upd.error.code !== '23505') throw new Error('Could not link dealer to GRD.');
      }
      return { ...byCode.data, grd_dealer_id: Number(id) };
    }
  }

  if (name) {
    const byName = await supabase.from('dealer_master')
      .select('id,dealer_name,dealer_code,grd_dealer_id')
      .ilike('dealer_name', name)
      .limit(1)
      .maybeSingle();
    if (byName.error) throw new Error('Could not map dealer name.');
    if (byName.data) {
      if (String(byName.data.grd_dealer_id || '') !== id) {
        const upd = await supabase.from('dealer_master')
          .update({ grd_dealer_id: Number(id) })
          .eq('id', byName.data.id);
        if (upd.error && upd.error.code !== '23505') throw new Error('Could not link dealer to GRD.');
      }
      return { ...byName.data, grd_dealer_id: Number(id) };
    }
  }

  const inserted = await supabase.from('dealer_master')
    .insert({
      dealer_name: name || `GRD Dealer ${id}`,
      dealer_code: code || null,
      grd_dealer_id: Number(id),
      is_active: true,
    })
    .select('id,dealer_name,dealer_code,grd_dealer_id')
    .single();

  if (inserted.error) {
    console.error('[grd/resolveGrdDealer] insert', inserted.error.message);
    if (inserted.error.code === '23505') {
      const retry = await supabase.from('dealer_master')
        .select('id,dealer_name,dealer_code,grd_dealer_id')
        .or(`grd_dealer_id.eq.${Number(id)},dealer_code.eq.${code}`)
        .limit(1)
        .maybeSingle();
      if (!retry.error && retry.data) return retry.data;
    }
    throw new Error('Could not create CHFPL dealer mirror for this GRD dealer.');
  }

  return inserted.data;
}

export async function ensureGrdFactoryDealer(supabase) {
  const existing = await supabase.from('dealer_master')
    .select('id,dealer_name,dealer_code,grd_dealer_id')
    .eq('dealer_code', 'GRD-FACTORY')
    .maybeSingle();
  if (existing.error) throw new Error('Could not load GRD Factory identity.');
  if (existing.data) return existing.data;

  const inserted = await supabase.from('dealer_master')
    .insert({ dealer_name: 'GRD Factory', dealer_code: 'GRD-FACTORY', is_active: true })
    .select('id,dealer_name,dealer_code,grd_dealer_id')
    .single();
  if (inserted.error && inserted.error.code === '23505') {
    const retry = await supabase.from('dealer_master')
      .select('id,dealer_name,dealer_code,grd_dealer_id')
      .eq('dealer_code', 'GRD-FACTORY')
      .maybeSingle();
    if (!retry.error && retry.data) return retry.data;
  }
  if (inserted.error) throw new Error('Could not create GRD Factory identity.');
  return inserted.data;
}

export async function resolveParkedDealer(supabase, dealerId, masters = null) {
  const raw = String(dealerId ?? '').trim();
  if (raw.toLowerCase() === 'factory' || raw.toLowerCase() === 'grd-factory') {
    return ensureGrdFactoryDealer(supabase);
  }
  return resolveGrdDealer(supabase, raw, masters);
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
