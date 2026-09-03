// GET /api/do/list-pending
//
// Lists loan applications with a completed FI report, awaiting the
// Disbursement Officer's approve/reject decision. DO-only (JWT).

import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;

  const session = requireUserAuth(req, res, ['do']);
  if (!session) return;

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('loan_applications')
      .select(`
        id, application_no, application_status, loan_amount_requested, tenure_months,
        customer_profiles ( full_name, phone, address ),
        vehicle_model_master ( model_name ),
        dealer_master ( dealer_name ),
        fi_reports ( visit_date, residence_type, mobile_no, monthly_income, latitude, longitude, remarks, recommendation, created_at )
      `)
      .in('application_status', ['fi_done', 'approved', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[do/list-pending]', error.message);
      return sendError(res, 500, 'Could not load applications');
    }

    const applications = (data || []).map((row) => {
      const fi = Array.isArray(row.fi_reports) ? row.fi_reports[0] : row.fi_reports;
      return {
        id: row.id,
        application_no: row.application_no,
        application_status: row.application_status,
        loan_amount_requested: row.loan_amount_requested,
        tenure_months: row.tenure_months,
        dealer_name: row.dealer_master?.dealer_name ?? null,
        customer_name: row.customer_profiles?.full_name ?? null,
        customer_phone: row.customer_profiles?.phone ?? null,
        customer_address: row.customer_profiles?.address ?? null,
        vehicle_model: row.vehicle_model_master?.model_name ?? null,
        fi: fi
          ? {
              visit_date: fi.visit_date,
              residence_type: fi.residence_type,
              mobile_no: fi.mobile_no,
              monthly_income: fi.monthly_income,
              latitude: fi.latitude,
              longitude: fi.longitude,
              remarks: fi.remarks,
              recommendation: fi.recommendation,
            }
          : null,
      };
    });

    res.status(200).json({ success: true, applications });
  } catch (err) {
    console.error('[do/list-pending] unhandled', err);
    return sendError(res, 500, 'Could not load applications');
  }
}
