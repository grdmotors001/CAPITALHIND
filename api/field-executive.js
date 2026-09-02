// Hobby-plan grouped Vercel Function. One function per API domain/role.
import route_collect_cash_0 from '../lib/api/field-executive/collect-cash.js';
import route_list_assigned_1 from '../lib/api/field-executive/list-assigned.js';
import route_submit_fi_2 from '../lib/api/field-executive/submit-fi.js';

const routes = {
  '/collect-cash': route_collect_cash_0,
  '/list-assigned': route_list_assigned_1,
  '/submit-fi': route_submit_fi_2,
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
