// GET /api/field-executive/list-assigned
//
// Lists loan applications assigned to the logged-in Field Executive —
// pending FI (fi_pending) and already completed by them (fi_done onward).
// Field-executive-only (JWT).

import { getSupabase } from '../_lib/supabase.js';
import { requireUserAuth, sendError, methodGuard } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'GET')) return;

  const session = requireUserAuth(req, res, ['field_executive']);
  if (!session) return;

  try {
    const supabase = getSupabase();

    // Legacy imported loans may have only fi_executive_name populated.
    // Resolve the logged-in FE name and include those loans only when the
    // name belongs to exactly one active Field Executive.
    const { data: me, error: meErr } = await supabase
      .from('users')
      .select('id, full_name, role, is_active')
      .eq('id', session.user_id)
      .maybeSingle();
    if (meErr) {
      console.error('[field-executive/list-assigned] user lookup', meErr.message);
      return sendError(res, 500, 'Could not load assigned visits');
    }

    const { data: assignedRows, error: assignedErr } = await supabase
      .from('loan_applications')
      .select(`
        id, application_no, loan_account_no, application_status, assigned_at, case_status,
        customer_profiles ( full_name, phone, address, city ),
        vehicle_model_master ( model_name ),
        fi_reports ( recommendation, remarks, created_at )
      `)
      .eq('assigned_fe_id', session.user_id)
      .order('assigned_at', { ascending: false })
      .limit(100);

    if (assignedErr) {
      console.error('[field-executive/list-assigned]', assignedErr.message);
      return sendError(res, 500, 'Could not load assigned visits');
    }

    let legacyRows = [];
    if (me?.full_name && me.role === 'field_executive' && me.is_active) {
      const { data: sameNameUsers, error: sameNameErr } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'field_executive')
        .eq('is_active', true)
        .ilike('full_name', me.full_name);
      if (sameNameErr) {
        console.error('[field-executive/list-assigned] name lookup', sameNameErr.message);
        return sendError(res, 500, 'Could not load assigned visits');
      }
      if ((sameNameUsers || []).length === 1 && sameNameUsers[0].id === session.user_id) {
        const { data, error } = await supabase
          .from('loan_applications')
          .select(`
            id, application_no, loan_account_no, application_status, assigned_at, case_status,
            customer_profiles ( full_name, phone, address, city ),
            vehicle_model_master ( model_name ),
            fi_reports ( recommendation, remarks, created_at )
          `)
          .is('assigned_fe_id', null)
          .ilike('fi_executive_name', me.full_name)
          .order('assigned_at', { ascending: false })
          .limit(100);
        if (error) {
          console.error('[field-executive/list-assigned] legacy lookup', error.message);
          return sendError(res, 500, 'Could not load assigned visits');
        }
        legacyRows = data || [];
      }
    }

    const byId = new Map();
    [...(assignedRows || []), ...legacyRows].forEach((row) => byId.set(row.id, row));
    const data = [...byId.values()].sort((a, b) => {
      const at = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
      const bt = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;
      return bt - at;
    });
    const applications = (data || []).map((row) => {
      const fi = Array.isArray(row.fi_reports) ? row.fi_reports[0] : row.fi_reports;
      return {
        id: row.id,
        application_no: row.application_no,
        application_status: row.application_status,
        assigned_at: row.assigned_at,
        customer_name: row.customer_profiles?.full_name ?? null,
        customer_phone: row.customer_profiles?.phone ?? null,
        customer_address: row.customer_profiles?.address ?? null,
        customer_city: row.customer_profiles?.city ?? null,
        vehicle_model: row.vehicle_model_master?.model_name ?? null,
        fi_submitted: !!fi,
        fi_recommendation: fi?.recommendation ?? null,
      };
    });

    res.status(200).json({ success: true, applications });
  } catch (err) {
    console.error('[field-executive/list-assigned] unhandled', err);
    return sendError(res, 500, 'Could not load assigned visits');
  }
}
