// GET/POST/PATCH/DELETE /api/admin/dealers
// Admin-only dealer master + dealer login management.
import bcrypt from 'bcryptjs';
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError } from '../_lib/auth.js';

function validPhone(phone) { return /^\d{10}$/.test(String(phone || '')); }
function validEmail(email) { return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)); }

export default async function handler(req, res) {
  const session = requireAdminAuth(req, res);
  if (!session) return;

  const supabase = getSupabase();
  try {
    if (req.method === 'GET') {
      const [{ data: dealers, error: dealerError }, { data: users, error: userError }] = await Promise.all([
        supabase.from('dealer_master').select('id, dealer_code, dealer_name, created_at').order('created_at', { ascending: false }),
        supabase.from('dealer_users').select('id, dealer_id, full_name, phone, role, is_active, created_at').order('created_at', { ascending: false }),
      ]);
      if (dealerError) return sendError(res, 500, 'Failed to load dealers.');
      if (userError) return sendError(res, 500, 'Failed to load dealer login accounts.');

      const rows = (dealers || []).map((d) => ({
        ...d,
        users: (users || []).filter((u) => String(u.dealer_id) === String(d.id)),
      }));
      return res.status(200).json({ success: true, dealers: rows });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const dealer_name = String(body.dealer_name || '').trim();
      const dealer_code = String(body.dealer_code || '').trim().toUpperCase();
      const full_name = String(body.full_name || '').trim();
      const phone = String(body.phone || '').trim();
      const password = String(body.password || '');

      if (!dealer_name) return sendError(res, 422, 'Dealer name is required.');
      if (!dealer_code) return sendError(res, 422, 'Dealer code is required.');
      if (!full_name) return sendError(res, 422, 'Dealer login name is required.');
      if (!validPhone(phone)) return sendError(res, 422, 'Valid 10-digit phone is required.');
      if (password.length < 8) return sendError(res, 422, 'Password must be at least 8 characters.');

      const { data: dealer, error: dealerError } = await supabase.from('dealer_master').insert({
        dealer_code,
        dealer_name,
      }).select('id, dealer_code, dealer_name, created_at').single();
      if (dealerError) {
        if (dealerError.code === '23505') return sendError(res, 409, 'Dealer code already exists.');
        console.error('[admin/dealers create dealer]', dealerError.message);
        return sendError(res, 500, 'Failed to create dealer.');
      }

      const password_hash = await bcrypt.hash(password, 10);
      const { data: dealerUser, error: userError } = await supabase.from('dealer_users').insert({
        dealer_id: dealer.id,
        full_name,
        phone,
        password_hash,
        role: 'dealer',
      }).select('id, dealer_id, full_name, phone, role, is_active, created_at').single();

      if (userError) {
        await supabase.from('dealer_master').delete().eq('id', dealer.id);
        if (userError.code === '23505') return sendError(res, 409, 'A dealer login with this phone or email already exists.');
        console.error('[admin/dealers create user]', userError.message);
        return sendError(res, 500, 'Failed to create dealer login.');
      }

      return res.status(200).json({ success: true, message: 'Dealer created successfully.', dealer: { ...dealer, users: [dealerUser] } });
    }

    if (req.method === 'PATCH') {
      const { id, dealer_name, dealer_code } = req.body || {};
      if (!id) return sendError(res, 422, 'Dealer id is required.');
      const updates = {};
      if (dealer_name !== undefined) updates.dealer_name = String(dealer_name).trim();
      if (dealer_code !== undefined) updates.dealer_code = String(dealer_code).trim().toUpperCase();
      if (!Object.keys(updates).length) return sendError(res, 422, 'Nothing to update.');
      const { data, error } = await supabase.from('dealer_master').update(updates).eq('id', id).select('id, dealer_code, dealer_name, created_at').single();
      if (error) return sendError(res, error.code === '23505' ? 409 : 500, error.code === '23505' ? 'Dealer code already exists.' : 'Failed to update dealer.');
      return res.status(200).json({ success: true, message: 'Dealer updated.', dealer: data });
    }

    if (req.method === 'DELETE') {
      const id = req.body?.id || req.query?.id;
      if (!id) return sendError(res, 422, 'Dealer id is required.');
      const { error } = await supabase.from('dealer_master').delete().eq('id', id);
      if (error) {
        console.error('[admin/dealers delete]', error.message);
        return sendError(res, 500, 'Could not remove dealer. Existing loan records may be linked to this dealer.');
      }
      return res.status(200).json({ success: true, message: 'Dealer removed.' });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return sendError(res, 405, 'Method not allowed');
  } catch (err) {
    console.error('[admin/dealers] unhandled', err);
    return sendError(res, 500, 'Dealer management request failed.');
  }
}
