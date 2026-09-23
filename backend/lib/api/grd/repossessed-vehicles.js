import { getSupabase } from '../_lib/supabase.js';

function authorized(req){
  const expected=process.env.GRD_BRIDGE_SECRET || process.env.CHFPL_GRD_BRIDGE_SECRET || '';
  const provided=req.headers['x-grd-bridge-secret'] || '';
  return !!expected && provided===expected;
}

export default async function handler(req,res){
  if(!authorized(req)) return res.status(401).json({success:false,error:'GRD bridge authentication required'});
  const s=getSupabase();
  try{
    if(req.method==='GET'){
      const status=String(req.query?.status||'AVAILABLE_FOR_SALE').trim().toUpperCase();
      const allowed=['SEIZED','AVAILABLE_FOR_SALE','ALLOCATED_TO_GRD','SOLD'];
      const q=s.from('vehicle_repossessions').select('id, loan_application_id, repo_date, repo_time, vehicle_no, model_name, colour, toolkit, battery_available, battery_no, battery_master_id, rc_available, charger_available, parked_dealer_id, resale_status, remarks, dealer_master(dealer_name,dealer_code), loan_applications(application_no,loan_account_no,application_status,case_status,customer_profiles(full_name,phone),grd_model_id,grd_model_code,grd_model_name)').order('repo_date',{ascending:false}).order('repo_time',{ascending:false}).limit(500);
      const {data,error}=allowed.includes(status)?await q.eq('resale_status',status):await q;
      if(error) return res.status(500).json({success:false,error:'Could not load repossessed vehicles.'});
      return res.status(200).json({success:true,vehicles:data||[]});
    }
    if(req.method==='POST'){
      const rawPath=Array.isArray(req.query?.path)?req.query.path.join('/'):String(req.query?.path||'');
      const id=rawPath.split('/').pop();
      if(!id) return res.status(400).json({success:false,error:'Vehicle repo id required.'});
      const status=String(req.body?.status||'').trim().toUpperCase();
      const allowed=['SEIZED','AVAILABLE_FOR_SALE','ALLOCATED_TO_GRD','SOLD'];
      if(!allowed.includes(status)) return res.status(400).json({success:false,error:'Invalid resale status.'});
      const {data,error}=await s.from('vehicle_repossessions').update({resale_status:status}).eq('id',id).select('id,resale_status').single();
      if(error) return res.status(500).json({success:false,error:'Could not update resale status.'});
      return res.status(200).json({success:true,vehicle:data});
    }
    return res.status(405).json({success:false,error:'Method not allowed'});
  }catch(e){
    console.error('[grd/repossessed]',e);
    return res.status(500).json({success:false,error:'Could not process GRD repossession request.'});
  }
}
