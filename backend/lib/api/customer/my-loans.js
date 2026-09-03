// GET /api/customer/my-loans — customer sees loans registered against the same mobile number.
import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';
export default async function handler(req,res){
  if(!methodGuard(req,res,'GET'))return; const session=requireUserAuth(req,res,['customer']); if(!session)return;
  try{const s=getSupabase(); const {data:user,error:ue}=await s.from('users').select('phone').eq('id',session.user_id).maybeSingle(); if(ue||!user?.phone)return sendError(res,404,'Registered mobile number not found.');
    const {data:profiles,error:pe}=await s.from('customer_profiles').select('id').eq('phone',user.phone); if(pe)return sendError(res,500,'Could not load customer profile.'); const ids=(profiles||[]).map(x=>x.id); if(!ids.length)return res.status(200).json({success:true,loans:[]});
    const {data:loans,error}=await s.from('loan_applications').select(`id,application_no,loan_account_no,application_status,loan_amount_requested,tenure_months,created_at,approved_at,approval_valid_until,disbursement_date,disbursed_amount,vehicle_no,chassis_no,case_status,vehicle_model_master(model_name),dealer_master(dealer_name),loan_receipts(id,receipt_no,receipt_date,amount,payment_mode)`).in('customer_id',ids).order('created_at',{ascending:false});
    if(error)return sendError(res,500,'Could not load loans.'); return res.status(200).json({success:true,loans:loans||[]});
  }catch(e){console.error('[customer/my-loans]',e);return sendError(res,500,'Could not load loans.');}
}
