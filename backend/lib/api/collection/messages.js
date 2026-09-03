// GET /api/collection/messages
// Read-only collection activity for every business dashboard except FE.
// FE is deliberately blocked so the collection activity log is not shown
// on the collecting user's own dashboard.
import jwt from 'jsonwebtoken';
import { getSupabase } from '../_lib/supabase.js';
import { sendError, methodGuard } from '../_lib/auth.js';

const JWT_SECRET = process.env.JWT_SECRET;

function getSession(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;
  const session = getSession(req);
  if (!session) return sendError(res, 401, 'Not logged in. Please login again.');

  const isAdmin = session.type === 'admin_user' && session.role === 'admin' && session.user_id;
  const isDealer = session.type === 'dealer_user' && session.dealer_id;
  const isAppUser = session.type === 'app_user' && session.user_id && session.role;

  if (!isAdmin && !isDealer && !isAppUser) {
    return sendError(res, 401, 'Invalid session. Please login again.');
  }
  if (isAppUser && session.role === 'field_executive') {
    return sendError(res, 403, 'Collection activity is hidden on the Field Executive dashboard.');
  }

  try {
    const supabase = getSupabase();
    let query = supabase
      .from('loan_receipts')
      .select(`
        id, receipt_no, receipt_date, amount, payment_mode, remarks,
        created_at, collected_at, collection_source, entered_by,
        loan_applications (
          id, application_no, loan_account_no, dealer_id,
          customer_profiles ( full_name, phone )
        )
      `)
      .eq('payment_mode', 'cash')
      .order('created_at', { ascending: false })
      .limit(50);

    if (isDealer) query = query.eq('loan_applications.dealer_id', session.dealer_id);

    const { data: receipts, error } = await query;
    if (error) {
      console.error('[collection/messages]', error.message);
      return sendError(res, 500, 'Could not load collection activity.');
    }

    let rows = receipts || [];

    // Customer dashboard: only show this customer's own cash collection.
    if (isAppUser && session.role === 'customer') {
      const { data: customer, error: customerErr } = await supabase
        .from('users').select('phone').eq('id', session.user_id).maybeSingle();
      if (customerErr) return sendError(res, 500, 'Could not load collection activity.');
      const phone = customer?.phone;
      rows = phone ? rows.filter(r => r.loan_applications?.customer_profiles?.phone === phone) : [];
    }

    const ids = [...new Set(rows.map(r => r.entered_by).filter(Boolean))];
    let usersById = {};
    if (ids.length) {
      const { data: users, error: usersErr } = await supabase
        .from('users').select('id, full_name, role').in('id', ids);
      if (usersErr) return sendError(res, 500, 'Could not load collection activity.');
      usersById = Object.fromEntries((users || []).map(u => [u.id, u]));
    }

    const messages = rows.map(r => {
      const collector = usersById[r.entered_by] || {};
      const loan = r.loan_applications || {};
      const customer = loan.customer_profiles || {};
      const source = r.collection_source === 'field_executive' || collector.role === 'field_executive'
        ? 'Field Executive'
        : collector.role === 'admin' ? 'Admin' : String(collector.role || 'Staff').replaceAll('_', ' ');
      return {
        id: r.id,
        receipt_no: r.receipt_no,
        receipt_date: r.receipt_date,
        created_at: r.created_at,
        collected_at: r.collected_at,
        amount: r.amount,
        remarks: r.remarks,
        source,
        collector_name: collector.full_name || 'Staff',
        application_no: loan.application_no,
        loan_account_no: loan.loan_account_no,
        customer_name: customer.full_name,
        customer_phone: customer.phone,
        message: `Cash collection ₹${Number(r.amount || 0).toLocaleString('en-IN')} received from ${customer.full_name || 'customer'} by ${collector.full_name || 'staff'}.`,
      };
    });

    return res.status(200).json({ success: true, messages });
  } catch (err) {
    console.error('[collection/messages] unhandled', err);
    return sendError(res, 500, 'Could not load collection activity.');
  }
}
