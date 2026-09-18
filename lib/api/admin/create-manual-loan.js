// POST /api/admin/create-manual-loan
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

function accountNo(count){ return 'CHF-'+new Date().getFullYear()+'-LN-'+String(count+1).padStart(5,'0'); }

export default async function handler(req,res){
 if(!methodGuard(req,res,'POST')) return;
 const session=requireAdminAuth(req,res); if(!session) return;
 const b=req.body||{};
 const required=['dealer_name','customer_name','customer_phone','customer_dob','customer_pan','customer_address','customer_pincode','vehicle_model','vehicle_price','down_payment','tenure_months'];
 const missing=required.filter(k=>!String(b[k]??'').trim());
 if(missing.length) return sendError(res,422,'Required fields missing: '+missing.join(', '));
 if(!/^\d{10}$/.test(String(b.customer_phone))) return sendError(res,422,'Customer mobile must be 10 digits.');
 if(!/^\d{6}$/.test(String(b.customer_pincode))) return sendError(res,422,'Customer pincode must be 6 digits.');
 if(Number(b.down_payment)>=Number(b.vehicle_price)) return sendError(res,422,'Down payment must be less than vehicle price.');
 try{
  const supabase=getSupabase();
  let dealer=null;
  if(b.dealer_code){
   const q=await supabase.from('dealer_master').select('id,dealer_name,dealer_code').eq('dealer_code',String(b.dealer_code).trim()).maybeSingle();
   if(q.error) throw q.error; dealer=q.data;
  }
  if(!dealer){
   const q=await supabase.from('dealer_master').select('id,dealer_name,dealer_code').ilike('dealer_name',String(b.dealer_name).trim()).limit(1).maybeSingle();
   if(q.error) throw q.error; dealer=q.data;
  }
  if(!dealer) return sendError(res,422,'Selected dealer is not available in CHFPL dealer master. Please sync/maintain the dealer master first.');
  let model;
  const mq=await supabase.from('vehicle_model_master').select('id,model_name').ilike('model_name',String(b.vehicle_model).trim()).limit(1).maybeSingle();
  if(mq.error) throw mq.error; model=mq.data;
  if(!model){
   const mi=await supabase.from('vehicle_model_master').insert({model_name:String(b.vehicle_model).trim(),vehicle_type:'2W',ex_showroom_price:Number(b.vehicle_price),is_active:true}).select('id,model_name').single();
   if(mi.error) throw mi.error; model=mi.data;
  }
  const aadhaar=String(b.customer_aadhaar||'').replace(/\D/g,'');
  if(aadhaar.length!==12) return sendError(res,422,'Customer Aadhaar must be 12 digits.');
  const cr=await supabase.from('customer_profiles').insert({
   full_name:String(b.customer_name).trim(),phone:String(b.customer_phone),dob:b.customer_dob,
   address:String(b.customer_address).trim(),city:b.customer_city||null,state:b.customer_state||null,
   pincode:String(b.customer_pincode),pan:String(b.customer_pan).trim().toUpperCase(),
   aadhaar_masked:'XXXX-XXXX-'+aadhaar.slice(-4),created_by_dealer_id:dealer.id
  }).select('id').single();
  if(cr.error) throw cr.error;
  const loanAmount=b.loan_amount!==''&&b.loan_amount!=null?Number(b.loan_amount):Math.max(0,Number(b.vehicle_price)-Number(b.down_payment));
  let acc=String(b.loan_account_no||'').trim();
  if(!acc){const c=await supabase.from('loan_applications').select('id',{count:'exact',head:true}).not('loan_account_no','is',null);if(c.error)throw c.error;acc=accountNo(c.count||0);}
  const dup=await supabase.from('loan_applications').select('id').eq('loan_account_no',acc).maybeSingle();if(dup.error)throw dup.error;if(dup.data)return sendError(res,409,'Loan account number already exists.');
  const ar=await supabase.from('loan_applications').insert({
   application_no:'CHF-MAN-'+Date.now(),dealer_id:dealer.id,dealer_user_id:null,customer_id:cr.data.id,
   vehicle_model_id:model.id,vehicle_price:Number(b.vehicle_price),down_payment:Number(b.down_payment),
   loan_amount_requested:loanAmount,tenure_months:Number(b.tenure_months),loan_account_no:acc,
   application_status:'sanctioned',submitted_at:new Date().toISOString(),vehicle_no:b.vehicle_no||null,
   chassis_no:b.chassis_no||null,disbursement_date:b.disbursement_date||null,
   disbursed_amount:b.disbursed_amount!==''?Number(b.disbursed_amount):loanAmount,
   hypothecation:b.hypothecation||null,
   approved_by:session.user_id,sanction_date:new Date().toISOString().slice(0,10)
  }).select('id,application_no,loan_account_no').single();
  if(ar.error) throw ar.error;
  await supabase.from('application_status_history').insert({loan_application_id:ar.data.id,from_status:'draft',to_status:'sanctioned',changed_by:session.user_id,changed_by_type:'admin',remarks:'Manual loan created by Admin'});
  return res.status(200).json({success:true,message:'Manual loan created successfully. Account No: '+acc,loan_account_no:acc,application_no:ar.data.application_no});
 }catch(e){console.error('[admin/create-manual-loan]',e);return sendError(res,500,'Could not create manual loan. '+(e.message||''));}
}
