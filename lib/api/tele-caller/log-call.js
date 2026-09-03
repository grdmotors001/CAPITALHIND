// POST /api/tele-caller/log-call
// Body: { loan_application_id, outcome, notes?, callback_at?, ptp_date?, ptp_amount? }
import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';
const OUTCOMES = ['connected','not_connected','callback','interested','not_interested','wrong_number','promise_to_pay','paid','do_not_call'];
export default async function handler(req,res){
  if(!methodGuard(req,res,'POST')) return; const session=requireUserAuth(req,res,['tele_caller']); if(!session)return;
  try{
    const loanId=String(req.body?.loan_application_id||'').trim(), outcome=String(req.body?.outcome||'').trim(), notes=String(req.body?.notes||'').trim()||null;
    const callbackAt=req.body?.callback_at?new Date(req.body.callback_at).toISOString():null;
    const ptpDate=req.body?.ptp_date?String(req.body.ptp_date).slice(0,10):null; const ptpAmount=req.body?.ptp_amount===''||req.body?.ptp_amount==null?null:Number(req.body.ptp_amount);
    if(!loanId||!OUTCOMES.includes(outcome))return sendError(res,422,'Application and valid call outcome are required');
    if(callbackAt && Number.isNaN(new Date(callbackAt).getTime()))return sendError(res,422,'Invalid callback date');
    if(ptpDate && !/^\d{4}-\d{2}-\d{2}$/.test(ptpDate))return sendError(res,422,'Invalid PTP date');
    if(ptpAmount!=null && (!Number.isFinite(ptpAmount)||ptpAmount<0))return sendError(res,422,'Invalid PTP amount');
    const supabase=getSupabase();
    const {data:reg}=await supabase.from('telecaller_registers').select('register_serial_no').eq('assigned_telecaller_id',session.user_id).eq('is_active',true);
    const serials=(reg||[]).map(x=>x.register_serial_no).filter(Boolean);
    const {data:app}=await supabase.from('loan_applications').select('id,loan_account_no,physical_register_serial_no').eq('id',loanId).not('loan_account_no','is',null).maybeSingle();
    if(!app)return sendError(res,404,'Loan case not found');
    if(!serials.includes(app.physical_register_serial_no))return sendError(res,403,'This loan is not assigned to you');
    const {data,error}=await supabase.from('telecaller_call_logs').insert({loan_application_id:loanId,telecaller_id:session.user_id,outcome,notes,callback_at:callbackAt}).select('id,loan_application_id,outcome,notes,callback_at,called_at').single();
    if(error)return sendError(res,500,'Could not save call details');
    let ptp=null;
    if(outcome==='promise_to_pay'){
      if(!ptpDate||ptpAmount==null||ptpAmount<=0)return sendError(res,422,'PTP date and PTP amount are required for Promise to Pay');
      const {data:p,error:pe}=await supabase.from('telecaller_ptp').insert({loan_application_id:loanId,telecaller_id:session.user_id,promised_date:ptpDate,promised_amount:ptpAmount,status:'open',remarks}).select('*').single();
      if(pe)return sendError(res,500,'Call saved but PTP could not be created'); ptp=p;
    }
    return res.status(200).json({success:true,message:'Call details saved.',call:data,ptp});
  }catch(err){console.error('[tele-caller/log-call] unhandled',err);return sendError(res,500,'Could not save call details');}
}
