// GET /api/admin/dealers
// Dealer master is owned by GRD. CHFPL exposes it read-only.
import { requireAdminAuth, sendError } from '../_lib/auth.js';
import { fetchGrdMasters, mapGrdDealers } from '../_lib/grd.js';

export default async function handler(req, res) {
  const session = requireAdminAuth(req, res);
  if (!session) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendError(res, 405, 'Dealer master is maintained in GRD.');
  }
  try {
    const data = await fetchGrdMasters();
    return res.status(200).json({ success: true, dealers: mapGrdDealers(data), source: 'grd' });
  } catch (err) {
    console.error('[admin/dealers GRD]', err.message || err);
    return sendError(res, 502, 'Could not load dealers from GRD.');
  }
}
