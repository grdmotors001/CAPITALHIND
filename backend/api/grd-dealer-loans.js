// GET /api/grd-dealer-loans
// Private bridge used by GRD Motors to read CHFPL loan status.
// Authenticates with X-GRD-BRIDGE-SECRET.
import { getSupabase } from '../lib/api/_lib/supabase.js';
import { sendError, methodGuard } from '../lib/api/_lib/auth.js';
import { ensureGrdDealer } from '../lib/api/_lib/ensure-grd-dealer.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;

  const expected = String(process.env.CHFPL_GRD_BRIDGE_SECRET || '');
  const supplied = String(req.headers['x-grd-bridge-secret'] || '');
  if (!expected || !supplied || supplied !== expected) {
    return sendError(res, 401, 'Invalid GRD bridge secret');
  }

  const grdDealerId = Number(req.query?.grd_dealer_id || 0);
  const requestedStatuses = String(req.query?.status || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  const supabase = getSupabase();

  try {
    if (!Number.isInteger(grdDealerId) || grdDealerId <= 0) {
      return sendError(res, 400, 'GRD dealer ID is required');
    }

    // A GRD request is allowed to bootstrap the CHFPL dealer mirror.
    // No manual dealer_master mapping is required.
    const dealer = await ensureGrdDealer({ grdDealerId });
    const dealers = [dealer];
    const dealerIds = [dealer.id];
    if (!dealerIds.length) {
      return res.status(200).json({ success: true, applications: [] });
    }

    let query = supabase
      .from('loan_applications')
      .select(`
        id,
        application_no,
        application_status,
        loan_account_no,
        loan_amount_requested,
        tenure_months,
        submitted_at,
        dealer_id,
        customer_profiles(full_name, phone),
        vehicle_model_master(model_name, grd_model_id, grd_model_code)
      `)
      .in('dealer_id', dealerIds)
      .order('submitted_at', { ascending: false })
      .limit(500);

    if (requestedStatuses.length) {
      query = query.in('application_status', requestedStatuses);
    }

    const { data: applications, error: applicationErr } = await query;
    if (applicationErr) throw applicationErr;

    const dealerMap = new Map((dealers || []).map(d => [d.id, d]));
    const rows = (applications || []).map(row => ({
      id: row.id,
      application_no: row.application_no,
      status: row.application_status,
      loan_account_no: row.loan_account_no,
      loan_amount_requested: Number(row.loan_amount_requested || 0),
      tenure_months: row.tenure_months,
      submitted_at: row.submitted_at,
      grd_dealer_id: dealerMap.get(row.dealer_id)?.grd_dealer_id || null,
      dealer_name: dealerMap.get(row.dealer_id)?.dealer_name || null,
      dealer_code: dealerMap.get(row.dealer_id)?.dealer_code || null,
      customer_name: row.customer_profiles?.full_name || null,
      customer_phone: row.customer_profiles?.phone || null,
      vehicle_model_name: row.vehicle_model_master?.model_name || null,
      grd_model_id: row.vehicle_model_master?.grd_model_id || null,
      grd_model_code: row.vehicle_model_master?.grd_model_code || null,
    }));

    return res.status(200).json({ success: true, applications: rows });
  } catch (err) {
    console.error('[grd-dealer-loans]', err);
    return sendError(res, 500, 'Could not load GRD loan status from CHFPL');
  }
}
