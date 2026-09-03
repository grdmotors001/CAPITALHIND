// GET/POST /api/admin/payment-vouchers — loan-linked staff payments/incentives.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError } from '../_lib/auth.js';
function guard(req, res) { const s = requireAdminAuth(req, res); return s; }
export default async function handler(req, res) {
  const session = guard(req, res); if (!session) return;
  const supabase = getSupabase();
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('loan_payment_vouchers').select(`*, loan_applications(application_no, loan_account_no, customer_profiles(full_name, phone))`).order('voucher_date', { ascending:false }).order('created_at', { ascending:false }).limit(300);
      if (error) return sendError(res, 500, 'Could not load payment vouchers.');
      return res.status(200).json({ success:true, vouchers:data || [] });
    }
    if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');
    const { voucher_no, loan_application_id, recipient_user_id, recipient_name, recipient_role, voucher_type, amount, voucher_date, narration } = req.body || {};
    if (!voucher_no || !amount || (!recipient_user_id && !recipient_name)) return sendError(res, 422, 'Voucher no., recipient and amount are required.');
    const { data, error } = await supabase.from('loan_payment_vouchers').insert({
      voucher_no:String(voucher_no).trim(), loan_application_id:loan_application_id || null,
      recipient_user_id:recipient_user_id || null, recipient_name:recipient_name || null, recipient_role:recipient_role || null,
      voucher_type:voucher_type || 'incentive', amount:Number(amount), voucher_date:voucher_date || new Date().toISOString().slice(0,10),
      narration:narration || null, created_by:session.user_id,
    }).select('*').single();
    if (error) return sendError(res, 500, error.message.includes('duplicate') ? 'Voucher number already exists.' : 'Could not save payment voucher.');
    return res.status(200).json({ success:true, voucher:data, message:'Payment voucher saved.' });
  } catch (e) { console.error('[admin/payment-vouchers]', e); return sendError(res, 500, 'Could not process payment voucher.'); }
}
