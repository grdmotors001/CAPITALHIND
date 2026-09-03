// GET /api/admin/list-loan-applications
//
// Lists all loan applications across dealers, with assignment/FI/DO status,
// for the admin "Assign to Field Executive" screen. Admin-only (JWT).

import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;

  const session = requireAdminAuth(req, res);
  if (!session) return;

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('loan_applications')
      .select(`
        id, application_no, application_status, physical_register_serial_no, cibil_score, cibil_checked_at, loan_amount_requested,
        tenure_months, submitted_at, assigned_fe_id, assigned_at,
        dealer_master ( dealer_name ),
        customer_profiles ( full_name, phone ),
        vehicle_model_master ( model_name ),
        fi_reports ( recommendation, remarks, created_at )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[admin/list-loan-applications]', error.message);
      return sendError(res, 500, 'Could not load applications');
    }

    const feIds = [...new Set((data || []).map((r) => r.assigned_fe_id).filter(Boolean))];
    let feNames = {};
    if (feIds.length) {
      const { data: feUsers } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', feIds);
      feNames = Object.fromEntries((feUsers || []).map((u) => [u.id, u.full_name]));
    }

    const applications = (data || []).map((row) => {
      const fi = Array.isArray(row.fi_reports) ? row.fi_reports[0] : row.fi_reports;
      return {
        id: row.id,
        application_no: row.application_no,
        application_status: row.application_status,
        physical_register_serial_no: row.physical_register_serial_no,
        cibil_score: row.cibil_score,
        cibil_checked_at: row.cibil_checked_at,
        loan_amount_requested: row.loan_amount_requested,
        tenure_months: row.tenure_months,
        submitted_at: row.submitted_at,
        dealer_name: row.dealer_master?.dealer_name ?? null,
        customer_name: row.customer_profiles?.full_name ?? null,
        customer_phone: row.customer_profiles?.phone ?? null,
        vehicle_model: row.vehicle_model_master?.model_name ?? null,
        assigned_fe_id: row.assigned_fe_id,
        assigned_fe_name: row.assigned_fe_id ? (feNames[row.assigned_fe_id] || null) : null,
        assigned_at: row.assigned_at,
        fi_recommendation: fi?.recommendation ?? null,
      };
    });

    res.status(200).json({ success: true, applications });
  } catch (err) {
    console.error('[admin/list-loan-applications] unhandled', err);
    return sendError(res, 500, 'Could not load applications');
  }
}
