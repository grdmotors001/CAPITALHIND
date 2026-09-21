// GET /api/admin/repo-cases — vehicle repossession register with search/filter.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req,res){
  const session=requireAdminAuth(req,res); if(!session)return;
  try{
    const s=getSupabase();
    if(req.method==='POST'){
      const id=String(req.body?.id||'').trim();
      const status=String(req.body?.resale_status||'').trim().toUpperCase();
      const allowed=['SEIZED','AVAILABLE_FOR_SALE','ALLOCATED_TO_GRD','SOLD'];
      if(!id||!allowed.includes(status)) return sendError(res,422,'Invalid repo status update.');
      const {data,error}=await s.from('vehicle_repossessions').update({resale_status:status}).eq('id',id).select('id,resale_status').single();
      if(error) return sendError(res,500,'Could not update Repo status.');
      return res.status(200).json({success:true,repo:data});
    }
    if(!methodGuard(req,res,'GET')) return;
    const {data,error}=await s.from('vehicle_repossessions').select(`
      id, loan_application_id, repo_date, repo_time, seized_by_fe_id, vehicle_no, model_name, colour, toolkit,
      battery_available, battery_no, battery_master_id, rc_available, charger_available,
      parked_dealer_id, resale_status, remarks, created_at,
      loan_applications(application_no,loan_account_no,application_status,case_status,customer_profiles(full_name,phone)),
      battery_master(battery_name), dealer_master(dealer_name,dealer_code)
    `).order('repo_date',{ascending:false}).order('repo_time',{ascending:false}).limit(500);
    if(error){console.error('[admin/repo-cases]',error.message);return sendError(res,500,'Could not load Repo register.');}
    const feIds=[...new Set((data||[]).map(r=>r.seized_by_fe_id).filter(Boolean))];
    let feMap={};
    if(feIds.length){const {data:fe}=await s.from('users').select('id,full_name,phone').in('id',feIds);feMap=Object.fromEntries((fe||[]).map(u=>[u.id,u]));}
    return res.status(200).json({success:true,repossessions:(data||[]).map(r=>({...r,field_executive:feMap[r.seized_by_fe_id]||null}))});
  }catch(e){console.error('[admin/repo-cases] unhandled',e);return sendError(res,500,'Could not load Repo register.');}
}
