// POST /api/admin/masters/update-oem
import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';
export default async function handler(req,res){
  if(!methodGuard(req,res,'POST'))return; const session=requireAdminAuth(req,res); if(!session)return;
  try{const {id,oem_name,is_active}=req.body||{}; if(!id)return sendError(res,422,'id is required.'); const patch={};
    if(oem_name!==undefined){const n=String(oem_name).trim();if(!n)return sendError(res,422,'OEM name cannot be empty.');patch.oem_name=n;}
    if(is_active!==undefined)patch.is_active=!!is_active; if(!Object.keys(patch).length)return sendError(res,422,'Nothing to update.');
    const {data,error}=await getSupabase().from('vehicle_oem_master').update(patch).eq('id',id).select('id,oem_name,is_active,created_at').single();
    if(error)return sendError(res,error.code==='23505'?409:500,error.code==='23505'?'OEM already exists.':'Failed to update OEM.'); return res.status(200).json({success:true,message:'OEM updated.',item:data});
  }catch(e){console.error('[admin/masters/update-oem]',e);return sendError(res,500,'Failed to update OEM.');}
}
