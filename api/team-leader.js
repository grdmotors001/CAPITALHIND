// Hobby-plan grouped Vercel Function. One function per API domain/role.
import route_assign_register_0 from '../lib/api/team-leader/assign-register.js';
import route_overview_1 from '../lib/api/team-leader/overview.js';
import route_unassign_register_2 from '../lib/api/team-leader/unassign-register.js';

const routes = {
  '/assign-register': route_assign_register_0,
  '/overview': route_overview_1,
  '/unassign-register': route_unassign_register_2,
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
