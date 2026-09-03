// POST /api/admin/masters/create-oem
import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';
export default async function handler(req,res){
  if(!methodGuard(req,res,'POST')) return; const session=requireAdminAuth(req,res); if(!session)return;
  try{const {oem_name}=req.body||{}; const name=String(oem_name||'').trim(); if(!name)return sendError(res,422,'OEM name is required.');
    const {data,error}=await getSupabase().from('vehicle_oem_master').insert({oem_name:name,is_active:true}).select('id,oem_name,is_active,created_at').single();
    if(error)return sendError(res,error.code==='23505'?409:500,error.code==='23505'?'OEM already exists.':'Failed to create OEM.');
    return res.status(200).json({success:true,message:'OEM created.',item:data});
  }catch(e){console.error('[admin/masters/create-oem]',e);return sendError(res,500,'Failed to create OEM.');}
}
