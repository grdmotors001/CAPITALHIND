// Hobby-plan grouped Vercel Function. One function per API domain/role.
import route_dashboard_0 from '../lib/api/tele-caller/dashboard.js';
import route_log_call_1 from '../lib/api/tele-caller/log-call.js';

const routes = {
  '/dashboard': route_dashboard_0,
  '/log-call': route_log_call_1,
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
