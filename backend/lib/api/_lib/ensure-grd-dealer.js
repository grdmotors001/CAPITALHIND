// Resolve a GRD dealer into CHFPL's dealer_master.
// GRD is the source of truth; grd_dealer_id is the immutable cross-system identity.
import { getSupabase } from './supabase.js';

function text(value) {
  const s = String(value ?? '').trim();
  return s || null;
}

export async function ensureGrdDealer({
  grdDealerId,
  dealerCode,
  dealerName,
} = {}) {
  const id = Number(grdDealerId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Valid GRD dealer ID is required');
  }

  const supabase = getSupabase();
  const code = text(dealerCode) || `GRD-${id}`;
  const name = text(dealerName) || code;

  const { data: byGrdId, error: lookupErr } = await supabase
    .from('dealer_master')
    .select('id, dealer_name, dealer_code, grd_dealer_id')
    .eq('grd_dealer_id', id)
    .maybeSingle();
  if (lookupErr) throw lookupErr;

  let dealer = byGrdId;

  // Migration compatibility: if an older dealer row exists with the exact
  // GRD code, link it to the immutable GRD dealer ID.
  if (!dealer && dealerCode) {
    const { data: byCode, error: codeErr } = await supabase
      .from('dealer_master')
      .select('id, dealer_name, dealer_code, grd_dealer_id')
      .eq('dealer_code', code)
      .maybeSingle();
    if (codeErr) throw codeErr;

    if (byCode) {
      const { data: linked, error: linkErr } = await supabase
        .from('dealer_master')
        .update({ grd_dealer_id: id, dealer_name: name })
        .eq('id', byCode.id)
        .select('id, dealer_name, dealer_code, grd_dealer_id')
        .single();
      if (linkErr) throw linkErr;
      dealer = linked;
    }
  }

  // No manual mapping is required. First GRD request creates the CHFPL mirror.
  if (!dealer) {
    const { data: created, error: createErr } = await supabase
      .from('dealer_master')
      .upsert({
        grd_dealer_id: id,
        dealer_code: code,
        dealer_name: name,
      }, { onConflict: 'grd_dealer_id' })
      .select('id, dealer_name, dealer_code, grd_dealer_id')
      .single();
    if (createErr) throw createErr;
    dealer = created;
  } else if ((dealerName && dealer.dealer_name !== name) || (dealerCode && dealer.dealer_code !== code)) {
    const { data: updated, error: updateErr } = await supabase
      .from('dealer_master')
      .update({ dealer_name: name, dealer_code: code })
      .eq('id', dealer.id)
      .select('id, dealer_name, dealer_code, grd_dealer_id')
      .single();
    if (updateErr) throw updateErr;
    dealer = updated;
  }

  return dealer;
}
