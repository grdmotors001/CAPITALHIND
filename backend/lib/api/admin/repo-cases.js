// GET /api/admin/repo-cases — vehicle repossession register with search/filter.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError } from '../_lib/auth.js';
import { resolveParkedDealer } from '../_lib/grd.js';
import { fetchGrdMasters, sendRepoVehicleWebhook } from '../_lib/grd.js';

const norm = (v) => String(v || '').trim().toLowerCase();

export default async function handler(req,res){
  if(!['GET','POST'].includes(req.method)){
    res.setHeader('Allow','GET, POST');
    return sendError(res,405,'Method not allowed');
  }
  const session=requireAdminAuth(req,res); if(!session)return;
  try{
    const s=getSupabase();

    if(req.method==='POST'){
      const id=String(req.body?.id||'').trim();
      if(!id) return sendError(res,400,'Repo id is required.');

      const patch={};
      if(req.body && Object.prototype.hasOwnProperty.call(req.body,'resale_status')){
        const status=String(req.body.resale_status||'').trim().toUpperCase();
        const allowed=['SEIZED','AVAILABLE_FOR_SALE','ALLOCATED_TO_GRD','SOLD'];
        if(!allowed.includes(status)) return sendError(res,400,'Invalid resale status.');
        patch.resale_status=status;
      }

      if(req.body && Object.prototype.hasOwnProperty.call(req.body,'parked_dealer_id')){
        const raw=req.body.parked_dealer_id;
        const dealerInput=raw===null || raw==='' ? 'factory' : String(raw).trim();
        try{
          const dealer=await resolveParkedDealer(s,dealerInput);
          if(!dealer?.id) return sendError(res,404,'Dealer not found.');
          patch.parked_dealer_id=dealer.id;
        }catch(err){
          console.error('[admin/repo-cases dealer]',err.message||err);
          return sendError(res,404,err.message||'Dealer not found.');
        }
      }
      if(!Object.keys(patch).length) return sendError(res,400,'No Repo changes supplied.');

      const {data:errorCheck,error:preloadError}=await s.from('vehicle_repossessions')
        .select(`id,vehicle_no,model_name,colour,toolkit,battery_available,battery_no,repo_date,resale_status,parked_dealer_id,battery_master(battery_name),dealer_master(dealer_name,dealer_code,grd_dealer_id)`)
        .eq('id',id)
        .maybeSingle();
      if(preloadError || !errorCheck) return sendError(res,404,'Repo record not found.');

      const {data,error}=await s.from('vehicle_repossessions')
        .update(patch).eq('id',id)
        .select('id,resale_status,parked_dealer_id')
        .single();

      if(error){
        console.error('[admin/repo-cases POST]',error.message,error.code||'');
        if(error.code==='23503'){
          return sendError(res,409,'Dealer is not available in CHFPL dealer master. Please sync this dealer from GRD first.');
        }
        return sendError(res,500,'Could not update Repo record.');
      }
      // Keep GRD's resale/stock state in sync whenever the status or parked
      // dealer changes. The webhook is deliberately best-effort: CHFPL's
      // local Repo update remains authoritative, while the response exposes
      // the bridge result so the UI can report a sync problem.
      let webhook={ok:true};
      try{
        const finalDealerId=Object.prototype.hasOwnProperty.call(patch,'parked_dealer_id')
          ? patch.parked_dealer_id
          : errorCheck.parked_dealer_id;
        const finalStatus=Object.prototype.hasOwnProperty.call(patch,'resale_status')
          ? patch.resale_status
          : data.resale_status;
        const dealerRow=finalDealerId
          ? await s.from('dealer_master').select('dealer_name,dealer_code,grd_dealer_id').eq('id',finalDealerId).maybeSingle()
          : {data:null};
        const dealer=dealerRow.data;
        webhook=await sendRepoVehicleWebhook({
          id:errorCheck.id,
          vehicle_no:errorCheck.vehicle_no,
          model_name:errorCheck.model_name,
          colour:errorCheck.colour,
          toolkit:errorCheck.toolkit,
          battery_available:errorCheck.battery_available,
          battery_no:errorCheck.battery_no,
          battery_maker:errorCheck.battery_master?.battery_name,
          repo_date:errorCheck.repo_date,
          resale_status:finalStatus,
          dealer_code:dealer?.dealer_code || '',
          dealer_name:dealer?.dealer_name || 'GRD Factory',
          grd_dealer_id:dealer?.grd_dealer_id || null,
        });
      }catch(err){
        console.error('[admin/repo-cases webhook]',err.message||err);
        webhook={ok:false,error:err.message||'GRD Repo webhook failed'};
      }
      return res.status(200).json({success:true,repo:data,webhook});
    }

    const {data,error}=await s.from('vehicle_repossessions').select(`
      id, loan_application_id, repo_date, repo_time, seized_by_fe_id, vehicle_no, resale_status,
      battery_available, battery_no, battery_master_id, rc_available, charger_available,
      parked_dealer_id, remarks, created_at,
      loan_applications(application_no,loan_account_no,application_status,case_status,customer_profiles(full_name,phone)),
      battery_master(battery_name), dealer_master(dealer_name,dealer_code,grd_dealer_id)
    `).order('repo_date',{ascending:false}).order('repo_time',{ascending:false}).limit(500);

    if(error){console.error('[admin/repo-cases]',error.message);return sendError(res,500,'Could not load Repo register.');}

    const feIds=[...new Set((data||[]).map(r=>r.seized_by_fe_id).filter(Boolean))];
    let feMap={};
    if(feIds.length){
      const {data:fe}=await s.from('users').select('id,full_name,phone').in('id',feIds);
      feMap=Object.fromEntries((fe||[]).map(u=>[u.id,u]));
    }

    return res.status(200).json({
      success:true,
      repossessions:(data||[]).map(r=>({...r,field_executive:feMap[r.seized_by_fe_id]||null}))
    });
  }catch(e){
    console.error('[admin/repo-cases] unhandled',e);
    return sendError(res,500,e.message||'Could not load Repo register.');
  }
}
