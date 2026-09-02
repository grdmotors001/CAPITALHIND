// Hobby-plan grouped Vercel Function. One function per API domain/role.
import route_decide_0 from '../lib/api/do/decide.js';
import route_list_pending_1 from '../lib/api/do/list-pending.js';

const routes = {
  '/decide': route_decide_0,
  '/list-pending': route_list_pending_1,
};

export default async function handler(req, res) {
  const rawPath = req.query?.path;
  const routePath = '/' + (Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '').replace(/^\/+|\/+$/g, ''));
  const route = routes[routePath];

  if (!route) {
    return res.status(404).json({ success: false, error: `API route not found: ${routePath}` });
  }

  return route(req, res);
}
