import { getSupabase } from '../_lib/supabase.js';

function authorized(req){
  const expected=process.env.CHFPL_GRD_BRIDGE_SECRET || '';
  const provided=req.headers['x-grd-bridge-secret'] || '';
  return !!expected && provided===expected;
}

export default async function handler(req,res){
  if(!authorized(req)) return res.status(401).json({success:false,error:'GRD bridge authentication required'});
  if(req.method!=='POST') return res.status(405).json({success:false,error:'Method not allowed'});

  try{
    const s=getSupabase();
    const body=req.body||{};
    const list=Array.isArray(body.vehicles)
      ? body.vehicles
      : (body.vehicle && typeof body.vehicle==='object' ? [body.vehicle] : [body]);

    const results=[];
    for(const v of list){
      const ref=String(v.source_ref??v.id??v.repo_id??'').trim();
      const status=String(v.resale_status??v.status??'').trim().toUpperCase().replace(/[\\s-]+/g,'_');
      if(!ref || !status){
        results.push({ok:false,source_ref:ref,error:'source_ref and resale_status are required.'});
        continue;
      }

      const allowed=['SEIZED','AVAILABLE_FOR_SALE','SOLD'];
      if(!allowed.includes(status)){
        results.push({ok:false,source_ref:ref,error:'Invalid resale status.'});
        continue;
      }

      const {data,error}=await s.from('vehicle_repossessions')
        .update({resale_status:status})
        .eq('id',ref)
        .select('id,resale_status')
        .maybeSingle();

      if(error || !data){
        results.push({ok:false,source_ref:ref,error:error?.message||'Repo record not found.'});
      }else{
        results.push({ok:true,source_ref:ref,resale_status:data.resale_status});
      }
    }

    const failed=results.filter(x=>!x.ok).length;
    return res.status(failed===results.length&&failed>0?400:200).json({success:failed===0,results});
  }catch(e){
    console.error('[grd/repo-status-webhook]',e);
    return res.status(500).json({success:false,error:e.message||'Could not update Repo status.'});
  }
}
