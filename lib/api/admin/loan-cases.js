// GET/POST /api/admin/loan-cases — manage active/suit-filed/seized case status and loan-entry fields.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError } from '../_lib/auth.js';
export default async function handler(req,res){
 const session=requireAdminAuth(req,res); if(!session)return; const s=getSupabase();
 try{
  if(req.method==='GET'){
   const {data,error}=await s.from('loan_applications').select(`id,application_no,loan_account_no,application_status,case_status,vehicle_no,chassis_no,ledger_no,file_no,file_record_no,cheques_qty,approved_at,approval_valid_until,disbursement_date,disbursed_amount,
      hypothecation,do_no,case_received_date,fi_send_date,fi_received_date,fi_status,fi_executive_name,sanction_date,approved_by,file_received_date,file_check_date,
      interest_rate,interest_amount,principal_amount,emi_no,emi_amount,vehicle_registration_date,
      loan_amount_requested,tenure_months,customer_profiles(full_name,phone),dealer_master(dealer_name),vehicle_model_master(model_name),vehicle_repossessions(id,repo_date,repo_time,vehicle_no,battery_available,battery_no,rc_available,charger_available,remarks,seized_by_fe_id,battery_master(battery_name),dealer_master(dealer_name))`).not('loan_account_no','is',null).order('created_at',{ascending:false}).limit(500);
   if(error)return sendError(res,500,'Could not load loan cases.'); return res.status(200).json({success:true,loans:data||[]});
  }
  if(req.method!=='POST')return sendError(res,405,'Method not allowed');
  const {loan_application_id,case_status,loan_status,vehicle_no,chassis_no,ledger_no,file_no,file_record_no,cheques_qty,disbursement_date,disbursed_amount}=req.body||{};
  if(!loan_application_id||!case_status)return sendError(res,422,'Loan and case status are required.');
  if(!['active','suit_filed','vehicle_seized','closed','written_off'].includes(case_status))return sendError(res,422,'Invalid case status.');
  const update={case_status,vehicle_no:vehicle_no||null,chassis_no:chassis_no||null,ledger_no:ledger_no?String(ledger_no).trim().toUpperCase():null,file_no:file_no||null,file_record_no:file_record_no||null,cheques_qty:Math.max(0,Number(cheques_qty||0)),disbursement_date:disbursement_date||null,disbursed_amount:disbursed_amount!==''&&disbursed_amount!=null?Number(disbursed_amount):null};
  if (['sanctioned','disbursed'].includes(loan_status)) update.application_status = loan_status;
  if (loan_status === 'disbursed' && !update.disbursement_date) update.disbursement_date = new Date().toISOString().slice(0,10);
  if(case_status==='vehicle_seized')update.vehicle_seized_at=new Date().toISOString(); else update.vehicle_seized_at=null;
  if(ledger_no)update.physical_register_serial_no=String(ledger_no).trim().toUpperCase();
  const {data,error}=await s.from('loan_applications').update(update).eq('id',loan_application_id).not('loan_account_no','is',null).select('id,loan_account_no,case_status,ledger_no,vehicle_seized_at').single();
  if(error)return sendError(res,500,'Could not update loan case.');
  await s.from('application_status_history').insert({loan_application_id,from_status:null,to_status:case_status,changed_by:session.user_id,changed_by_type:'admin',remarks:`Loan case status updated to ${case_status}`});
  return res.status(200).json({success:true,loan:data,message:'Loan case updated.'});
 }catch(e){console.error('[admin/loan-cases]',e);return sendError(res,500,'Could not process loan case.');}
}
