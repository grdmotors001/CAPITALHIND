// GET /api/admin/staff/list
// Returns legacy-style staff accounts plus current Supabase admin users.
import { getSupabase } from '../../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();

    const [{ data: admins, error: adminError }, { data: staff, error: staffError }] = await Promise.all([
      supabase.from('users')
        .select('id, full_name, phone, email, role, is_active, created_at')
        .eq('role', 'admin')
        .order('created_at', { ascending: false }),
      supabase.from('staff_accounts')
        .select('id, username, contact_mobile, email, role, is_active, created_at')
        .order('created_at', { ascending: false }),
    ]);

    if (adminError) {
      console.error('[admin/staff/list admins]', adminError.message);
      return sendError(res, 500, 'Failed to load admin accounts.');
    }
    if (staffError) {
      console.error('[admin/staff/list staff]', staffError.message);
      return sendError(res, 500, 'Failed to load staff accounts. Run the staff migration in Supabase first.');
    }

    const rows = [
      ...(admins || []).map((u) => ({
        id: u.id,
        username: u.full_name,
        role: 'admin',
        contact_mobile: u.phone || '',
        email: u.email || '',
        created_at: u.created_at,
        is_active: u.is_active,
        source: 'users',
        is_current: u.id === session.user_id,
      })),
      ...(staff || []).map((u) => ({
        id: u.id,
        username: u.username,
        role: 'staff',
        contact_mobile: u.contact_mobile || '',
        email: u.email || '',
        created_at: u.created_at,
        is_active: u.is_active,
        source: 'staff_accounts',
        is_current: false,
      })),
    ].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

    return res.status(200).json({ success: true, users: rows });
  } catch (err) {
    console.error('[admin/staff/list] unhandled', err);
    return sendError(res, 500, 'Failed to load staff accounts.');
  }
}
