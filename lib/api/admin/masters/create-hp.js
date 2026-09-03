// POST /api/admin/masters/create-hp
// Body: { hp_name, hp_code?, city?, state? }
// Admin-only (JWT).

import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const { hp_name, hp_code, city, state } = req.body || {};

    if (!hp_name || !String(hp_name).trim()) {
      return res.status(422).json({ success: false, error: 'hp_name is required' });
    }

    const supabase = getSupabase();

    const { data: item, error } = await supabase
      .from('hypothecation_master')
      .insert({
        hp_name: hp_name.trim(),
        hp_code: hp_code || null,
        city: city || null,
        state: state || null,
        is_active: true,
      })
      .select('id, hp_name, hp_code, city, state, is_active, created_at')
      .single();

    if (error) {
      console.error('[admin/masters/create-hp]', error.message);
      if (error.code === '23505') {
        return sendError(res, 409, 'An HP record with this name or code already exists.');
      }
      return sendError(res, 500, 'Failed to create HP record.');
    }

    return res.status(200).json({ success: true, message: 'HP record created.', item });
  } catch (err) {
    console.error('[admin/masters/create-hp] unhandled', err);
    return sendError(res, 500, 'Failed to create HP record.');
  }
}
