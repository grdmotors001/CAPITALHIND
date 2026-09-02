// GET /api/cashier/dashboard — live cash held by every Field Executive.
import { getSupabase } from '../_lib/supabase.js';
import { requireCashierAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  const session = requireCashierAuth(req, res);
  if (!session) return;
  try {
    const supabase = getSupabase();
    const [{ data: fes, error: feErr }, { data: receipts, error: rErr }, { data: handovers, error: hErr }] = await Promise.all([
      supabase.from('users').select('id, full_name, phone, profile_photo, is_active').eq('role', 'field_executive').order('full_name'),
      supabase.from('loan_receipts').select('id, entered_by, receipt_no, receipt_date, amount, created_at, loan_applications(application_no, vehicle_no, customer_profiles(full_name, phone))').order('created_at',{ascending:false}).limit(1000),
      supabase.from('cash_handovers').select('id, fe_user_id, amount, handover_date, remarks, created_at, cashier_staff_id, staff_accounts(username)').order('created_at',{ascending:false}).limit(1000),
    ]);
    if (feErr || rErr || hErr) { console.error('[cashier/dashboard]', feErr?.message || rErr?.message || hErr?.message); return sendError(res, 500, 'Could not load cash dashboard'); }
    const byFe = new Map((fes || []).map(fe => [fe.id, { ...fe, total_collected: 0, total_handed_over: 0, cash_in_hand: 0 }]));
    (receipts || []).forEach(r => { const x=byFe.get(r.entered_by); if(x) x.total_collected += Number(r.amount||0); });
    (handovers || []).forEach(h => { const x=byFe.get(h.fe_user_id); if(x) x.total_handed_over += Number(h.amount||0); });
    const field_executives = [...byFe.values()].map(x => ({...x, cash_in_hand: Math.max(0, x.total_collected-x.total_handed_over)}));
    return res.status(200).json({ success:true, field_executives, total_cash_in_hand: field_executives.reduce((s,x)=>s+x.cash_in_hand,0), recent_receipts: feReceipts.slice(0,50).map(r=>({...r, customer_name:r.loan_applications?.customer_profiles?.full_name||null, vehicle_no:r.loan_applications?.vehicle_no||null})), recent_handovers: (handovers||[]).slice(0,50) });
  } catch(err) { console.error('[cashier/dashboard] unhandled',err); return sendError(res,500,'Could not load cash dashboard'); }
}
