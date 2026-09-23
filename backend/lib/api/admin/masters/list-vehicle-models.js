// GET /api/admin/masters/list-vehicle-models
// Vehicle models are owned by GRD and are read-only in CHFPL.
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';
import { fetchGrdMasters, mapGrdModels } from '../../_lib/grd.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  const session = requireAdminAuth(req, res);
  if (!session) return;
  try {
    const data = await fetchGrdMasters();
    return res.status(200).json({ success: true, items: mapGrdModels(data), source: 'grd' });
  } catch (err) {
    console.error('[admin/masters/list-vehicle-models GRD]', err.message || err);
    return sendError(res, 502, 'Failed to load vehicle models from GRD.');
  }
}
