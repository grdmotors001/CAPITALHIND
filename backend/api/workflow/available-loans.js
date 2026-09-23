import { getSupabase } from '../_lib/supabase.js';
import { requireDealerAuth, sendJson, sendError, methodGuard } from '../_lib/auth.js';
export default async function handler(req,res){
 if(!methodGuard(req,res,'GET')) return;
 const user=requireDealerAuth(req,res); if(!user) return;
 try{
  const supabase=getSupabase();
  const {data,error}=await supabase.from('loan_applications').select('id,application_no,application_status,dealer_user_id,customer_name,customer_phone,vehicle_model,loan_amount_requested,approved_at,approval_valid_until').eq('dealer_user_id',user.dealer_user_id).in('application_status',['approved','sanctioned','disbursed']).order('approved_at',{ascending:false});
  if(error) throw error;
  const ids=(data||[]).map(x=>x.id);
  const {data:used,error:ue}=ids.length?await supabase.from('sales').select('loan_application_id').in('loan_application_id',ids).neq('sale_status','cancelled'):({data:[],error:null});
  if(ue) throw ue;
  const usedSet=new Set((used||[]).map(x=>x.loan_application_id));
  return sendJson(res,200,{success:true,loans:(data||[]).filter(x=>!usedSet.has(x.id))});
 }catch(e){return sendError(res,500,e.message||'Could not load available loans');}
}