// GET /api/do/list-tvr — DO reviews submitted TVRs.
import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';
export default async function handler(req,res){
  if(!methodGuard(req,res,'GET'))return; const session=requireUserAuth(req,res,['do']); if(!session)return;
  try{const s=getSupabase(); const {data,error}=await s.from('loan_tvrs').select(`id, loan_application_id, status, verification_date, verification_time, customer_contacted, applicant_confirmed, address_confirmed, employment_confirmed, reference_confirmed, documents_checked, vehicle_details_confirmed, alternate_mobile_no, reference_name, reference_mobile, remarks, recommendation, verified_at, loan_applications ( application_no, loan_account_no, loan_amount_requested, application_status, tvr_status, customer_profiles(full_name,phone,address,city), vehicle_model_master(model_name), dealer_master(dealer_name) )`).in('status',['submitted','verified','failed','hold']).order('created_at',{ascending:false}).limit(200); if(error){console.error('[do/list-tvr]',error.message);return sendError(res,500,'Could not load TVR cases.')} return res.status(200).json({success:true,tvrs:data||[]});}
  catch(e){console.error('[do/list-tvr] unhandled',e);return sendError(res,500,'Could not load TVR cases.')}
}
