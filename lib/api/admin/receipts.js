// GET /api/admin/receipts — receipt register.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';
export default async function handler(req,res){
  if(!methodGuard(req,res,'GET'))return; const session=requireAdminAuth(req,res); if(!session)return;
  try{
    const {data,error}=await getSupabase().from('loan_receipts').select(`
      id, loan_application_id, receipt_no, receipt_date, amount, payment_mode, reference_no, remarks, created_at,
      loan_applications(application_no,loan_account_no,vehicle_no,customer_profiles(full_name,phone))
    `).order('receipt_date',{ascending:false}).order('created_at',{ascending:false}).limit(500);
    if(error){console.error('[admin/receipts]',error.message);return sendError(res,500,'Could not load receipts.');}
    return res.status(200).json({success:true,receipts:data||[]});
  }catch(e){console.error('[admin/receipts] unhandled',e);return sendError(res,500,'Could not load receipts.');}
}
