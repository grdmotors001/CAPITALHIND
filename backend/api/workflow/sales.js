import { getSupabase } from '../_lib/supabase.js';
import { requireDealerAuth, sendJson, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req,res){
 const user=requireDealerAuth(req,res); if(!user) return;
 if(!methodGuard(req,res,req.method==='GET'?'GET':'POST')) return;
 const supabase=getSupabase();
 try{
  if(req.method==='GET'){
   const {data,error}=await supabase.from('sales').select('*,loan_applications(application_no,dealer_id,customer_profiles(full_name,phone),vehicle_model_master(model_name),loan_amount_requested)').eq('loan_applications.dealer_id',user.dealer_id).order('created_at',{ascending:false});
   if(error) throw error;
   const sales=(data||[]).map(s=>({...s,customer_name:s.customer_name||s.loan_applications?.customer_profiles?.full_name||null,customer_phone:s.customer_phone||s.loan_applications?.customer_profiles?.phone||null,vehicle_model:s.vehicle_model||s.loan_applications?.vehicle_model_master?.model_name||null,loan_amount_requested:s.loan_applications?.loan_amount_requested||null}));
   return sendJson(res,200,{success:true,sales});
  }
  const {loan_application_id,delivery_id,sale_amount,customer_name,customer_phone,vehicle_model,remarks}=req.body||{};
  if(!loan_application_id) return sendError(res,400,'Approved loan is required');
  const {data:loan,error:le}=await supabase.from('loan_applications').select('id,dealer_id,application_status,customer_profiles(full_name,phone),vehicle_model_master(model_name)').eq('id',loan_application_id).single();
  if(le||!loan) return sendError(res,404,'Loan not found');
  if(String(loan.dealer_id)!==String(user.dealer_id)) return sendError(res,403,'Loan does not belong to this dealer');
  if(!['approved','sanctioned','disbursed'].includes(loan.application_status)) return sendError(res,400,'Loan is not approved');
  const {data:existing}=await supabase.from('sales').select('id').eq('loan_application_id',loan_application_id).neq('sale_status','cancelled').maybeSingle();
  if(existing) return sendError(res,409,'This approved loan is already used');
  const payload={loan_application_id,delivery_id:delivery_id||null,created_by:null,source:'dealer',sale_status:'completed',loan_used:true,sale_amount:sale_amount||null,customer_name:customer_name||loan.customer_profiles?.full_name||null,customer_phone:customer_phone||loan.customer_profiles?.phone||null,vehicle_model:vehicle_model||loan.vehicle_model_master?.model_name||null,remarks:remarks||null};
  const {data,error}=await supabase.from('sales').insert(payload).select().single();
  if(error) throw error;
  return sendJson(res,201,{success:true,sale:data});
 }catch(e){console.error('[workflow/sales]',e);if(e.code==='23505')return sendError(res,409,'This approved loan is already used');return sendError(res,500,e.message||'Sale operation failed');}
}
