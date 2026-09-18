// GET /api/dealer/list-vehicle-models
// CHFPL dealer loan form uses the live GRD finished-goods model master.
import { requireDealerAuth, sendError, methodGuard } from '../_lib/auth.js';
import { fetchGrdMasters, mapGrdModels } from '../_lib/grd.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  const session = requireDealerAuth(req, res);
  if (!session) return;
  try {
    const data = await fetchGrdMasters();
    const models = mapGrdModels(data);
    return res.status(200).json({ success: true, models, source: 'grd' });
  } catch (err) {
    console.error('[dealer/list-vehicle-models GRD]', err.message || err);
    return sendError(res, 502, 'Could not load vehicle models from GRD.');
  }
}
