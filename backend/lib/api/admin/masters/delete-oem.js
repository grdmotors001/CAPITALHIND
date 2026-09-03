// POST /api/admin/masters/delete-oem
import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';
export default async function handler(req,res){
  if(!methodGuard(req,res,'POST'))return; const session=requireAdminAuth(req,res); if(!session)return;
  try{const {id}=req.body||{};if(!id)return sendError(res,422,'id is required.');
    const {error}=await getSupabase().from('vehicle_oem_master').delete().eq('id',id);
    if(error)return sendError(res,error.code==='23503'?409:500,error.code==='23503'?'OEM is linked to vehicle models. Deactivate it instead.':'Failed to remove OEM.');
    return res.status(200).json({success:true,message:'OEM removed.'});
  }catch(e){console.error('[admin/masters/delete-oem]',e);return sendError(res,500,'Failed to remove OEM.');}
}
