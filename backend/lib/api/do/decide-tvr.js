// POST /api/do/decide-tvr — DO verifies/fails/holds a submitted TVR.
import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';
export default async function handler(req,res){
  if(!methodGuard(req,res,'POST'))return; const session=requireUserAuth(req,res,['do']); if(!session)return;
  try{const {tvr_id,decision,remarks}=req.body||{}; if(!tvr_id)return sendError(res,422,'tvr_id is required'); if(!['verified','failed','hold'].includes(decision))return sendError(res,422,'decision must be verified, failed, or hold'); const s=getSupabase();
    const {data:t,error:te}=await s.from('loan_tvrs').select('id,loan_application_id,status').eq('id',tvr_id).maybeSingle(); if(te)return sendError(res,500,'Could not load TVR.'); if(!t)return sendError(res,404,'TVR not found.'); if(t.status!=='submitted' && decision!=='verified')return sendError(res,422,`TVR is in '${t.status}' status.`);
    const {error:ue}=await s.from('loan_tvrs').update({status:decision,verified_by:session.user_id,verified_at:new Date().toISOString(),updated_at:new Date().toISOString(),remarks:remarks||null}).eq('id',tvr_id); if(ue)return sendError(res,500,'Could not update TVR.');
    const {error:ae}=await s.from('loan_applications').update({tvr_status:decision}).eq('id',t.loan_application_id).eq('application_status','approved'); if(ae)return sendError(res,500,'TVR updated but application gate could not be updated.');
    await s.from('application_status_history').insert({loan_application_id:t.loan_application_id,from_status:'approved',to_status:'approved',changed_by:session.user_id,changed_by_type:'do',remarks:`TVR ${decision}${remarks?` — ${remarks}`:''}`});
    return res.status(200).json({success:true,message:`TVR ${decision}.`});
  }catch(e){console.error('[do/decide-tvr] unhandled',e);return sendError(res,500,'Could not update TVR.')}
}
