// POST /api/admin/masters/update-hp
// Body: { id, hp_name?, hp_code?, city?, state?, is_active? }
// Admin-only (JWT).

import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const { id, hp_name, hp_code, city, state, is_active } = req.body || {};
    if (!id) return sendError(res, 422, 'id is required');

    const patch = {};
    if (hp_name !== undefined) {
      if (!String(hp_name).trim()) return sendError(res, 422, 'hp_name cannot be empty');
      patch.hp_name = hp_name.trim();
    }
    if (hp_code !== undefined) patch.hp_code = hp_code || null;
    if (city !== undefined) patch.city = city || null;
    if (state !== undefined) patch.state = state || null;
    if (is_active !== undefined) patch.is_active = !!is_active;

    const supabase = getSupabase();
    const { data: item, error } = await supabase
      .from('hypothecation_master')
      .update(patch)
      .eq('id', id)
      .select('id, hp_name, hp_code, city, state, is_active, created_at')
      .single();

    if (error) {
      console.error('[admin/masters/update-hp]', error.message);
      if (error.code === '23505') {
        return sendError(res, 409, 'An HP record with this name or code already exists.');
      }
      return sendError(res, 500, 'Failed to update HP record.');
    }

    return res.status(200).json({ success: true, message: 'HP record updated.', item });
  } catch (err) {
    console.error('[admin/masters/update-hp] unhandled', err);
    return sendError(res, 500, 'Failed to update HP record.');
  }
}
