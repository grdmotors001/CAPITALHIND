// GET /api/admin/masters/list-loan-types
// Finance/financer master is owned by GRD and exposed read-only to CHFPL.
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';
import { fetchGrdMasters, mapGrdFinancers } from '../../_lib/grd.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  const session = requireAdminAuth(req, res);
  if (!session) return;
  try {
    const data = await fetchGrdMasters();
    const items = mapGrdFinancers(data).map((f) => ({
      id: f.id,
      loan_type_name: f.financer_name,
      description: [f.code, f.mobile].filter(Boolean).join(' · '),
      is_active: true,
      source: 'grd',
      ...f,
    }));
    return res.status(200).json({ success: true, items, financers: items, source: 'grd' });
  } catch (err) {
    console.error('[admin/masters/list-loan-types GRD]', err.message || err);
    return sendError(res, 502, 'Failed to load finance master from GRD.');
  }
}
