// GET /api/admin/dashboard-stats — dashboard KPIs and monthly workflow/collection stats.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';
export default async function handler(req,res){
  if(!methodGuard(req,res,'GET')) return; const session=requireAdminAuth(req,res); if(!session)return;
  try{
    const s=getSupabase();
    const {data:rows,error}=await s.from('loan_applications').select('id,application_status,created_at,submitted_at,approval_valid_until,approved_at,disbursement_date,case_status,vehicle_seized_at,loan_amount_requested,disbursed_amount');
    if(error)return sendError(res,500,'Could not load dashboard stats.');
    const list=rows||[]; const now=new Date();
    const months=[]; for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1); const y=d.getFullYear(),m=d.getMonth(); const label=d.toLocaleString('en-IN',{month:'short',year:'numeric'}); const inMonth=(date)=>{if(!date)return false;const x=new Date(date);return x.getFullYear()===y&&x.getMonth()===m;}; months.push({month:label,applied:list.filter(r=>inMonth(r.submitted_at||r.created_at)).length,approved:list.filter(r=>r.application_status==='approved'&&inMonth(r.approved_at)).length,rejected:list.filter(r=>r.application_status==='rejected'&&inMonth(r.created_at)).length,disbursement:list.filter(r=>r.application_status==='disbursed'&&inMonth(r.disbursement_date||r.created_at)).length,seized:list.filter(r=>r.vehicle_seized_at&&inMonth(r.vehicle_seized_at)).length});}
    return res.status(200).json({success:true,months,active_cases:list.filter(r=>r.case_status==='active').length,vehicle_seized_total:list.filter(r=>r.case_status==='vehicle_seized').length,total_applications:list.length,approved_total:list.filter(r=>r.application_status==='approved').length,disbursed_total:list.filter(r=>r.application_status==='disbursed').length});
  }catch(e){console.error('[admin/dashboard-stats]',e);return sendError(res,500,'Could not load dashboard stats.');}
}
