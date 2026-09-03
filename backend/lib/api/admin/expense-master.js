// GET/POST/PATCH /api/admin/expense-master
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError } from '../_lib/auth.js';
export default async function handler(req, res) {
  const session = requireAdminAuth(req, res); if (!session) return;
  const s = getSupabase();
  try {
    if (req.method === 'GET') {
      const { data, error } = await s.from('expense_master').select('id,expense_name,is_active,created_at').order('expense_name');
      if (error) return sendError(res, 500, 'Could not load expense master.');
      return res.status(200).json({ success: true, items: data || [] });
    }
    if (req.method === 'POST') {
      const name = String(req.body?.expense_name || '').trim();
      if (!name) return sendError(res, 422, 'Expense name is required.');
      const { data, error } = await s.from('expense_master').insert({ expense_name: name, is_active: true }).select('id,expense_name,is_active,created_at').single();
      if (error) return sendError(res, error.code === '23505' ? 409 : 500, error.code === '23505' ? 'Expense name already exists.' : 'Could not create expense master.');
      return res.status(200).json({ success: true, item: data, message: 'Expense master created.' });
    }
    if (req.method === 'PATCH') {
      const id = Number(req.body?.id); if (!Number.isInteger(id)) return sendError(res, 422, 'Expense ID is required.');
      const patch = {};
      if (req.body?.expense_name !== undefined) patch.expense_name = String(req.body.expense_name).trim();
      if (req.body?.is_active !== undefined) patch.is_active = Boolean(req.body.is_active);
      if (!Object.keys(patch).length) return sendError(res, 422, 'Nothing to update.');
      if (patch.expense_name === '') return sendError(res, 422, 'Expense name is required.');
      const { data, error } = await s.from('expense_master').update(patch).eq('id', id).select('id,expense_name,is_active,created_at').single();
      if (error) return sendError(res, error.code === '23505' ? 409 : 500, error.code === '23505' ? 'Expense name already exists.' : 'Could not update expense master.');
      return res.status(200).json({ success: true, item: data, message: 'Expense master updated.' });
    }
    return sendError(res, 405, 'Method not allowed');
  } catch (e) { console.error('[admin/expense-master]', e); return sendError(res, 500, 'Could not process expense master.'); }
}
