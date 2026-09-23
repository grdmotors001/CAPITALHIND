import { getSupabase } from '../_lib/supabase.js';

function json(res, status, body){res.status(status).json(body);}
function authUser(req){
  const h=req.headers.authorization||'';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

export default async function handler(req,res){
  if(req.method!=='GET'){return json(res,405,{success:false,error:'Method not allowed'});}
  try{
    const supabase=getSupabase();
    const token=authUser(req);
    if(!token) return json(res,401,{success:false,error:'Unauthorized'});
    const {data,error}=await supabase.from('loan_applications')
      .select('id,application_no,application_status,dealer_user_id,customer_name,customer_phone,vehicle_model,loan_amount_requested,approved_at,approval_valid_until')
      .in('application_status',['approved','sanctioned','disbursed'])
      .order('approved_at',{ascending:false});
    if(error) throw error;
    const ids=(data||[]).map(x=>x.id);
    const {data:used,error:ue}=ids.length?await supabase.from('sales').select('loan_application_id,sale_status').in('loan_application_id',ids).neq('sale_status','cancelled'):({data:[],error:null});
    if(ue) throw ue;
    const usedSet=new Set((used||[]).map(x=>x.loan_application_id));
    return json(res,200,{success:true,loans:(data||[]).filter(x=>!usedSet.has(x.id))});
  }catch(e){return json(res,500,{success:false,error:e.message||'Could not load available loans'});}
}