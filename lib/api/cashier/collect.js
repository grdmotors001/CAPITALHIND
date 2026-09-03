// POST /api/cashier/collect — cashier receives cash from a Field Executive.
import { getSupabase } from '../_lib/supabase.js';
import { requireCashierAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;
  const session = requireCashierAuth(req, res);
  if (!session) return;
  try {
    const { fe_user_id, amount, handover_date, remarks } = req.body || {};
    const numericAmount = Number(amount);
    if (!fe_user_id || !Number.isFinite(numericAmount) || numericAmount <= 0) return sendError(res,422,'Field Executive and valid amount are required.');
    const supabase=getSupabase();
    const {data:fe,error:feErr}=await supabase.from('users').select('id,full_name,role,is_active').eq('id',fe_user_id).eq('role','field_executive').maybeSingle();
    if(feErr) return sendError(res,500,'Could not verify Field Executive.');
    if(!fe) return sendError(res,404,'Field Executive not found.');
    const [{data:receipts,error:rErr},{data:handovers,error:hErr}]=await Promise.all([
      supabase.from('loan_receipts').select('amount').eq('entered_by',fe_user_id).eq('collection_source','field_executive'),
      supabase.from('cash_handovers').select('amount').eq('fe_user_id',fe_user_id),
    ]);
    if(rErr||hErr) return sendError(res,500,'Could not calculate cash in hand.');
    const available=Math.max(0,(receipts||[]).reduce((s,r)=>s+Number(r.amount||0),0)-(handovers||[]).reduce((s,h)=>s+Number(h.amount||0),0));
    if(numericAmount>available+0.005) return sendError(res,422,`Only ₹${available.toLocaleString('en-IN')} is currently in hand with ${fe.full_name}.`);
    const handoverNo=`CASH-HO-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${Date.now().toString().slice(-7)}`;
    const {data,rowError}=await supabase.from('cash_handovers').insert({fe_user_id,cashier_staff_id:session.staff_user_id,handover_no:handoverNo,amount:numericAmount,handover_date:handover_date||new Date().toISOString().slice(0,10),remarks:String(remarks||'').trim()||null}).select('id,handover_no,amount,handover_date,remarks,created_at').single();
    if(rowError) { console.error('[cashier/collect]',rowError.message); return sendError(res,500,'Could not record cash handover.'); }
    return res.status(200).json({success:true,message:`₹${numericAmount.toLocaleString('en-IN')} received from ${fe.full_name}.`,handover:row});
  } catch(err){ console.error('[cashier/collect] unhandled',err); return sendError(res,500,'Could not record cash handover.'); }
}
