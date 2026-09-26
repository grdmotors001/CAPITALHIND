import { getSupabase } from '../_lib/supabase.js';
import { requireDealerAuth, sendJson, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req,res){
 const user=requireDealerAuth(req,res); if(!user) return;
 if(!methodGuard(req,res,req.method==='GET'?'GET':'POST')) return;
 try{
  const supabase=getSupabase();
  if(req.method==='GET'){
   const {data,error}=await supabase.from('delivery_details').select('*,loan_applications(application_no,application_status,dealer_id,loan_amount_requested,vehicle_no,chassis_no,customer_profiles(full_name,phone),vehicle_model_master(model_name))').eq('loan_applications.dealer_id',user.dealer_id).order('created_at',{ascending:false});
   if(error) throw error;
   const deliveries=(data||[]).map(d=>({
     ...d,
     customer_name:d.loan_applications?.customer_profiles?.full_name||null,
     customer_phone:d.loan_applications?.customer_profiles?.phone||null,
     vehicle_model:d.loan_applications?.vehicle_model_master?.model_name||null,
     loan_amount_requested:d.loan_applications?.loan_amount_requested||null,
   }));
   return sendJson(res,200,{success:true,deliveries});
  }
  const {loan_application_id,vehicle_no,chassis_no,delivery_date,remarks}=req.body||{};
  if(!loan_application_id) return sendError(res,400,'Loan is required');
  const {data:loan,error:le}=await supabase.from('loan_applications').select('id,dealer_id,application_status').eq('id',loan_application_id).single();
  if(le||!loan) return sendError(res,404,'Loan not found');
  if(String(loan.dealer_id)!==String(user.dealer_id)) return sendError(res,403,'Loan does not belong to this dealer');
  if(!['approved','sanctioned','disbursed'].includes(loan.application_status)) return sendError(res,400,'Only approved/sanctioned/disbursed loans can be delivered');
  const {data:existing}=await supabase.from('sales').select('id,sale_status').eq('loan_application_id',loan_application_id).neq('sale_status','cancelled').maybeSingle();
  if(existing) return sendError(res,409,'This loan is already used in a sale');
  const payload={loan_application_id,status:'locked',vehicle_no:vehicle_no||null,chassis_no:chassis_no||null,delivery_date:delivery_date||null,remarks:remarks||null,locked_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  const {data,error}=await supabase.from('delivery_details').upsert(payload,{onConflict:'loan_application_id'}).select().single();
  if(error) throw error;
  return sendJson(res,200,{success:true,delivery:data});
 }catch(e){console.error('[workflow/deliveries]',e);return sendError(res,500,e.message||'Delivery operation failed');}
}
