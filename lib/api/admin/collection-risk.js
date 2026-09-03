// GET/POST/PATCH /api/admin/collection-risk — NPA ageing + restructure/foreclosure requests.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError } from '../_lib/auth.js';

const BUCKET_LABELS = {
  STANDARD: 'Standard',
  SMA: 'SMA (Special Mention)',
  SUB_STANDARD: 'Sub-Standard (NPA)',
  DOUBTFUL: 'Doubtful',
  LOSS: 'Loss',
};

export default async function handler(req, res) {
  const session = requireAdminAuth(req, res); if (!session) return;
  const s = getSupabase();
  try {
    if (req.method === 'GET') {
      const view = String(req.query?.view || 'summary');

      if (view === 'npa') {
        const { data, error } = await s
          .from('loan_npa_status')
          .select('loan_id,loan_account_no,application_no,customer_name,customer_phone,days_past_due,overdue_amount,overdue_emi_count,npa_bucket')
          .order('days_past_due', { ascending: false });
        if (error) { console.error('[admin/collection-risk] npa', error); return sendError(res, 500, 'Could not load NPA ageing data.'); }
        const rows = (data || []).map(r => ({ ...r, npa_bucket_label: BUCKET_LABELS[r.npa_bucket] || r.npa_bucket }));
        const summary = {};
        for (const key of Object.keys(BUCKET_LABELS)) summary[key] = { count: 0, amount: 0 };
        for (const r of rows) {
          if (!summary[r.npa_bucket]) summary[r.npa_bucket] = { count: 0, amount: 0 };
          summary[r.npa_bucket].count += 1;
          summary[r.npa_bucket].amount += Number(r.overdue_amount || 0);
        }
        return res.status(200).json({ success: true, rows, summary, labels: BUCKET_LABELS });
      }

      if (view === 'requests') {
        const status = String(req.query?.status || 'All');
        let q = s.from('loan_restructure_requests')
          .select('id,loan_id,request_type,requested_amount,new_tenure_months,new_emi_amount,reason,status,remarks,created_at,approved_at,requested_by,approved_by,loan_applications(loan_account_no,application_no,customer_profiles(full_name,phone))')
          .order('created_at', { ascending: false })
          .limit(500);
        if (status !== 'All') q = q.eq('status', status);
        const { data, error } = await q;
        if (error) { console.error('[admin/collection-risk] requests', error); return sendError(res, 500, 'Could not load restructure requests.'); }
        return res.status(200).json({ success: true, items: data || [] });
      }

      const { data: cfg, error: cfgErr } = await s.from('risk_config').select('*').eq('id', 1).single();
      if (cfgErr) { console.error('[admin/collection-risk] config', cfgErr); return sendError(res, 500, 'Could not load risk configuration.'); }
      return res.status(200).json({ success: true, config: cfg });
    }

    if (req.method === 'POST') {
      const action = String(req.body?.action || 'create-request');

      if (action === 'update-config') {
        const patch = {};
        for (const k of ['penal_interest_rate_per_day', 'bounce_charge_flat', 'sma1_start_days', 'sma2_start_days', 'npa_start_days', 'doubtful_start_days', 'loss_start_days']) {
          if (req.body?.[k] !== undefined) patch[k] = Number(req.body[k]);
        }
        if (!Object.keys(patch).length) return sendError(res, 422, 'Nothing to update.');
        patch.updated_by = session.user_id || null;
        patch.updated_at = new Date().toISOString();
        const { data, error } = await s.from('risk_config').update(patch).eq('id', 1).select('*').single();
        if (error) { console.error('[admin/collection-risk] update-config', error); return sendError(res, 500, 'Could not update risk configuration.'); }
        return res.status(200).json({ success: true, config: data, message: 'Risk configuration updated.' });
      }

      // Create a restructure / part-payment / foreclosure request
      const loanId = Number(req.body?.loan_id);
      const requestType = String(req.body?.request_type || '');
      if (!Number.isInteger(loanId)) return sendError(res, 422, 'A valid loan is required.');
      if (!['RESTRUCTURE', 'PART_PAYMENT', 'FORECLOSURE'].includes(requestType)) return sendError(res, 422, 'Invalid request type.');

      const insert = {
        loan_id: loanId,
        request_type: requestType,
        requested_amount: req.body?.requested_amount != null ? Number(req.body.requested_amount) : null,
        new_tenure_months: req.body?.new_tenure_months != null ? Number(req.body.new_tenure_months) : null,
        new_emi_amount: req.body?.new_emi_amount != null ? Number(req.body.new_emi_amount) : null,
        reason: req.body?.reason ? String(req.body.reason).trim() : null,
        requested_by: session.user_id || null,
      };
      const { data, error } = await s.from('loan_restructure_requests').insert(insert)
        .select('id,loan_id,request_type,requested_amount,new_tenure_months,new_emi_amount,reason,status,created_at').single();
      if (error) { console.error('[admin/collection-risk] create', error); return sendError(res, 500, 'Could not create request.'); }
      return res.status(200).json({ success: true, item: data, message: 'Request submitted.' });
    }

    if (req.method === 'PATCH') {
      const id = String(req.body?.id || '');
      const status = String(req.body?.status || '');
      if (!id) return sendError(res, 422, 'Request ID is required.');
      if (!['APPROVED', 'REJECTED'].includes(status)) return sendError(res, 422, 'Status must be APPROVED or REJECTED.');

      const patch = {
        status,
        approved_by: session.user_id || null,
        approved_at: new Date().toISOString(),
      };
      if (req.body?.remarks !== undefined) patch.remarks = String(req.body.remarks).trim();

      const { data, error } = await s.from('loan_restructure_requests').update(patch).eq('id', id)
        .select('id,loan_id,request_type,status,approved_at,remarks').single();
      if (error) { console.error('[admin/collection-risk] decide', error); return sendError(res, 500, 'Could not update request.'); }
      return res.status(200).json({ success: true, item: data, message: `Request ${status.toLowerCase()}.` });
    }

    return sendError(res, 405, 'Method not allowed');
  } catch (e) { console.error('[admin/collection-risk] unhandled', e); return sendError(res, 500, 'Could not process request.'); }
}
