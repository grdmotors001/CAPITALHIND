// GET /api/field-executive/collection-history
// Returns the logged-in FE's cash receipts, handovers and live cash-in-hand.
import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  const session = requireUserAuth(req, res, ['field_executive']);
  if (!session) return;
  try {
    const supabase = getSupabase();
    const [{ data: receipts, error: rErr }, { data: handovers, error: hErr }] = await Promise.all([
      supabase.from('loan_receipts')
        .select('id, receipt_no, receipt_date, amount, payment_mode, remarks, collected_at, created_at, loan_applications(application_no, loan_account_no, vehicle_no, customer_profiles(full_name, phone))')
        .eq('entered_by', session.user_id)
        .eq('collection_source', 'field_executive')
        .order('created_at', { ascending: false }).limit(200),
      supabase.from('cash_handovers')
        .select('id, amount, handover_date, remarks, created_at, cashier_staff_id, staff_accounts(username)')
        .eq('fe_user_id', session.user_id)
        .order('created_at', { ascending: false }).limit(200),
    ]);
    if (rErr) { console.error('[field-executive/collection-history receipts]', rErr.message); return sendError(res, 500, 'Could not load collection history'); }
    if (hErr) { console.error('[field-executive/collection-history handovers]', hErr.message); return sendError(res, 500, 'Could not load collection history'); }
    const totalCollected = (receipts || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalHandedOver = (handovers || []).reduce((s, h) => s + Number(h.amount || 0), 0);
    const cashInHand = Math.max(0, totalCollected - totalHandedOver);
    return res.status(200).json({ success: true, total_collected: totalCollected, total_handed_over: totalHandedOver, cash_in_hand: cashInHand,
      receipts: (receipts || []).map(r => ({ ...r, customer_name: r.loan_applications?.customer_profiles?.full_name || null, customer_phone: r.loan_applications?.customer_profiles?.phone || null, application_no: r.loan_applications?.application_no || null, loan_account_no: r.loan_applications?.loan_account_no || null, vehicle_no: r.loan_applications?.vehicle_no || null })),
      handovers: handovers || [] });
  } catch (err) { console.error('[field-executive/collection-history] unhandled', err); return sendError(res, 500, 'Could not load collection history'); }
}
