import { getSupabase } from '../_lib/supabase.js';
import { requireDealerAuth, sendJson, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req,res){
 const user=requireDealerAuth(req,res); if(!user) return;
 if(!methodGuard(req,res,req.method==='GET'?'GET':'POST')) return;
 const supabase=getSupabase();
 try{
  if(req.method==='GET'){
   const {data,error}=await supabase.from('sales').select('*,loan_applications(application_no,customer_name,customer_phone,vehicle_model,loan_amount_requested)').eq('dealer_user_id',user.dealer_user_id).order('created_at',{ascending:false});
   if(error) throw error; return sendJson(res,200,{success:true,sales:data||[]});
  }
  const {loan_application_id,delivery_id,sale_amount,customer_name,customer_phone,vehicle_model,remarks}=req.body||{};
  if(!loan_application_id) return sendError(res,400,'Approved loan is required');
  const {data:loan,error:le}=await supabase.from('loan_applications').select('id,dealer_user_id,application_status,customer_name,customer_phone,vehicle_model').eq('id',loan_application_id).single();
  if(le||!loan) return sendError(res,404,'Loan not found');
  if(loan.dealer_user_id!==user.dealer_user_id) return sendError(res,403,'Loan does not belong to this dealer');
  if(!['approved','sanctioned','disbursed'].includes(loan.application_status)) return sendError(res,400,'Loan is not approved');
  const {data:existing}=await supabase.from('sales').select('id').eq('loan_application_id',loan_application_id).neq('sale_status','cancelled').maybeSingle();
  if(existing) return sendError(res,409,'This approved loan is already used');
  const {data,error}=await supabase.from('sales').insert({loan_application_id,delivery_id:delivery_id||null,dealer_user_id:user.dealer_user_id,created_by:user.dealer_user_id,source:'dealer',sale_status:'completed',loan_used:true,sale_amount:sale_amount||null,customer_name:customer_name||loan.customer_name||null,customer_phone:customer_phone||loan.customer_phone||null,vehicle_model:vehicle_model||loan.vehicle_model||null,remarks:remarks||null}).select().single();
  if(error) throw error;
  return sendJson(res,201,{success:true,sale:data});
 }catch(e){
  if(e.code==='23505') return sendError(res,409,'This approved loan is already used');
  return sendError(res,500,e.message||'Sale operation failed');
 }
}