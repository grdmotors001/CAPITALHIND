import { getSupabase } from '../_lib/supabase.js';
import { requireDealerAuth, sendJson, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req,res){
 const user=requireDealerAuth(req,res); if(!user) return;
 if(!methodGuard(req,res,req.method==='GET'?'GET':'POST')) return;
 try{
  const supabase=getSupabase();
  if(req.method==='GET'){
   const {data,error}=await supabase.from('delivery_details').select('*,loan_applications(application_no,application_status,customer_name,customer_phone,vehicle_model,loan_amount_requested)').eq('dealer_user_id',user.dealer_user_id).order('created_at',{ascending:false});
   if(error) throw error; return sendJson(res,200,{success:true,deliveries:data||[]});
  }
  const {loan_application_id,vehicle_no,chassis_no,delivery_date,remarks}=req.body||{};
  if(!loan_application_id) return sendError(res,400,'Loan is required');
  const {data:loan,error:le}=await supabase.from('loan_applications').select('id,dealer_user_id,application_status').eq('id',loan_application_id).single();
  if(le||!loan) return sendError(res,404,'Loan not found');
  if(loan.dealer_user_id!==user.dealer_user_id) return sendError(res,403,'Loan does not belong to this dealer');
  if(!['approved','sanctioned','disbursed'].includes(loan.application_status)) return sendError(res,400,'Only approved/sanctioned/disbursed loans can be delivered');
  const {data:existing}=await supabase.from('sales').select('id,sale_status').eq('loan_application_id',loan_application_id).neq('sale_status','cancelled').maybeSingle();
  if(existing) return sendError(res,409,'This loan is already used in a sale');
  const {data,error}=await supabase.from('delivery_details').upsert({loan_application_id,dealer_user_id:user.dealer_user_id,status:'locked',vehicle_no:vehicle_no||null,chassis_no:chassis_no||null,delivery_date:delivery_date||null,remarks:remarks||null,locked_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'loan_application_id'}).select().single();
  if(error) throw error; return sendJson(res,200,{success:true,delivery:data});
 }catch(e){return sendError(res,500,e.message||'Delivery operation failed');}
}