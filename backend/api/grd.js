import route_repossessed from '../lib/api/grd/repossessed-vehicles.js';
import route_repo_status_webhook from '../lib/api/grd/repo-status-webhook.js';

export default async function handler(req,res){
  const rawPath=req.query?.path;
  const routePath='/' + (Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath||'').replace(/^\/+|\/+$/g,''));
  if(routePath==='/repo-status-webhook'){
    return route_repo_status_webhook(req,res);
  }
  if(routePath==='/repossessed' || routePath.startsWith('/repossessed/')){
    return route_repossessed(req,res);
  }
  return res.status(404).json({success:false,error:`API route not found: ${routePath}`});
}
