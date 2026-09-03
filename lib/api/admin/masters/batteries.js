// GET/POST/PATCH/DELETE /api/admin/masters/batteries
import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError } from '../../_lib/auth.js';

export default async function handler(req, res) {
  const session = requireAdminAuth(req, res);
  if (!session) return;
  const s = getSupabase();
  try {
    if (req.method === 'GET') {
      const { data, error } = await s.from('battery_master').select('id,battery_name,is_active,created_at').order('battery_name');
      if (error) return sendError(res, 500, 'Failed to load battery master.');
      return res.status(200).json({ success: true, items: data || [] });
    }
    const body = req.body || {};
    if (req.method === 'POST') {
      const battery_name = String(body.battery_name || '').trim();
      if (!battery_name) return sendError(res, 422, 'Battery name is required.');
      const { data, error } = await s.from('battery_master').insert({ battery_name, is_active: true }).select('id,battery_name,is_active,created_at').single();
      if (error) return sendError(res, error.code === '23505' ? 409 : 500, error.code === '23505' ? 'Battery name already exists.' : 'Failed to create battery.');
      return res.status(200).json({ success: true, item: data, message: 'Battery master created.' });
    }
    const id = Number(body.id);
    if (!Number.isInteger(id)) return sendError(res, 422, 'Battery ID is required.');
    if (req.method === 'PATCH') {
      const patch = {};
      if (body.battery_name !== undefined) patch.battery_name = String(body.battery_name).trim();
      if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active);
      if (!Object.keys(patch).length) return sendError(res, 422, 'Nothing to update.');
      if (patch.battery_name === '') return sendError(res, 422, 'Battery name is required.');
      const { data, error } = await s.from('battery_master').update(patch).eq('id', id).select('id,battery_name,is_active,created_at').single();
      if (error) return sendError(res, error.code === '23505' ? 409 : 500, error.code === '23505' ? 'Battery name already exists.' : 'Failed to update battery.');
      return res.status(200).json({ success: true, item: data, message: 'Battery master updated.' });
    }
    if (req.method === 'DELETE') {
      const { error } = await s.from('battery_master').delete().eq('id', id);
      if (error) return sendError(res, 500, 'Could not remove battery. If it is used in a Repo record, deactivate it instead.');
      return res.status(200).json({ success: true, message: 'Battery master removed.' });
    }
    return sendError(res, 405, 'Method not allowed');
  } catch (err) {
    console.error('[admin/masters/batteries]', err);
    return sendError(res, 500, 'Could not process battery master.');
  }
}
