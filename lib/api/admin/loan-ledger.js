// GET/POST /api/admin/loan-ledger — loan ledger extras: expenses + NOC charges.
import { getSupabase } from '../_lib/supabase.js';
import { requireAdminAuth, sendError } from '../_lib/auth.js';

export default async function handler(req, res) {
  const session = requireAdminAuth(req, res);
  if (!session) return;
  const s = getSupabase();
  try {
    if (req.method === 'GET') {
      const loanId = Number(req.query?.loan_application_id);
      const expenseQuery = s.from('loan_expenses').select('id,loan_application_id,expense_master_id,expense_date,amount,remarks,created_at,expense_master(expense_name),loan_applications(application_no,loan_account_no,vehicle_no,customer_profiles(full_name,phone))').order('expense_date', { ascending: false }).order('created_at', { ascending: false }).limit(500);
      const chargeQuery = s.from('loan_charges').select('id,loan_application_id,charge_type,charge_name,charge_date,amount,remarks,created_at').order('charge_date', { ascending: false }).order('created_at', { ascending: false }).limit(500);
      if (Number.isInteger(loanId)) { expenseQuery.eq('loan_application_id', loanId); chargeQuery.eq('loan_application_id', loanId); }
      const [{ data: expenses, error: eErr }, { data: charges, error: cErr }] = await Promise.all([expenseQuery, chargeQuery]);
      if (eErr || cErr) return sendError(res, 500, 'Could not load loan ledger entries.');
      return res.status(200).json({ success: true, expenses: expenses || [], charges: charges || [] });
    }
    if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');
    const b = req.body || {};
    const loan_application_id = Number(b.loan_application_id);
    const amount = Number(b.amount);
    const date = String(b.date || b.expense_date || b.charge_date || new Date().toISOString().slice(0, 10));
    if (!Number.isInteger(loan_application_id) || !Number.isFinite(amount) || amount <= 0) return sendError(res, 422, 'Loan and valid amount are required.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return sendError(res, 422, 'Invalid entry date.');

    const { data: loan, error: loanErr } = await s.from('loan_applications').select('id').eq('id', loan_application_id).maybeSingle();
    if (loanErr) return sendError(res, 500, 'Could not verify loan.');
    if (!loan) return sendError(res, 404, 'Loan not found.');

    if (b.entry_type === 'expense') {
      const expense_master_id = Number(b.expense_master_id);
      if (!Number.isInteger(expense_master_id)) return sendError(res, 422, 'Expense master is required.');
      const { data: master } = await s.from('expense_master').select('id,expense_name').eq('id', expense_master_id).eq('is_active', true).maybeSingle();
      if (!master) return sendError(res, 422, 'Selected expense master is invalid.');
      const { data, error } = await s.from('loan_expenses').insert({ loan_application_id, expense_master_id, expense_date: date, amount, remarks: String(b.remarks || '').trim() || null, created_by: session.user_id }).select('id,loan_application_id,expense_master_id,expense_date,amount,remarks,created_at,expense_master(expense_name)').single();
      if (error) return sendError(res, 500, 'Could not save loan expense.');
      return res.status(200).json({ success: true, item: data, message: 'Loan expense added to ledger.' });
    }

    if (b.entry_type === 'noc_charge') {
      const charge_name = String(b.charge_name || 'NOC Charges').trim() || 'NOC Charges';
      const { data, error } = await s.from('loan_charges').insert({ loan_application_id, charge_type: 'noc', charge_name, charge_date: date, amount, remarks: String(b.remarks || '').trim() || null, created_by: session.user_id }).select('id,loan_application_id,charge_type,charge_name,charge_date,amount,remarks,created_at').single();
      if (error) return sendError(res, 500, 'Could not save NOC charge.');
      return res.status(200).json({ success: true, item: data, message: 'NOC charge added to ledger.' });
    }
    return sendError(res, 422, 'Unknown ledger entry type.');
  } catch (e) {
    console.error('[admin/loan-ledger]', e);
    return sendError(res, 500, 'Could not process loan ledger.');
  }
}
