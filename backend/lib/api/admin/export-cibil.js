import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError, methodGuard } from '../_lib/auth.js';
import { buildTudfRows, buildExportFilename } from '../_lib/cibilExport.js';
import { buildCibilWorkbook } from '../_lib/cibilWorkbook.js';

// Applications in these statuses are considered "live" loan accounts worth
// reporting to the bureau. Adjust to match your actual reporting policy.
const REPORTABLE_STATUSES = ['submitted', 'fi_pending', 'fi_done', 'approved', 'sanctioned', 'disbursed'];

function toDDMMYYYY(input) {
  // Accepts 'YYYY-MM-DD' (native <input type="date">) or already-formatted 'DDMMYYYY'.
  if (/^\d{8}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}${mm}${d.getFullYear()}`;
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, 'POST')) return;

  const admin = requireAdminAuth(req, res);
  if (!admin) return;

  try {
    const { asOnDate, dealerId } = req.body || {};

    if (!asOnDate) {
      return sendError(res, 422, 'asOnDate is required (the date this export is "as on")');
    }

    const asOnDateDDMMYYYY = toDDMMYYYY(asOnDate);
    if (!asOnDateDDMMYYYY) {
      return sendError(res, 422, 'asOnDate must be a valid date');
    }

    const supabase = getSupabase();

    let query = supabase
      .from('loan_applications')
      .select(
        `
        id, application_no, loan_account_no, loan_amount_requested, submitted_at, created_at, application_status,
        customer:customer_profiles(full_name, dob, gender, pan, aadhaar_masked, phone, email, address, pincode, occupation, monthly_income),
        dealer:dealer_master(dealer_name, dealer_code),
        guarantors:guarantor_details(full_name, phone, address, pan, aadhaar_masked)
      `
      )
      .in('application_status', REPORTABLE_STATUSES)
      .order('id', { ascending: true });

    if (dealerId) {
      query = query.eq('dealer_id', dealerId);
    }

    const { data: applications, error } = await query;

    if (error) {
      console.error('[admin/export-cibil]', error.message);
      return sendError(res, 500, 'Failed to load loan applications for export.');
    }

    if (!applications || applications.length === 0) {
      return sendError(res, 404, 'No reportable loan applications found for export.');
    }

    const rows = buildTudfRows(applications, asOnDateDDMMYYYY);
    const workbook = buildCibilWorkbook({ rows, asOnDateDDMMYYYY });
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = buildExportFilename({ asOnDateDDMMYYYY });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error('[admin/export-cibil] unhandled', err);
    return sendError(res, 500, 'Export failed. Please try again.');
  }
}
