// api/_lib/supabase.js
// Server-side Supabase client using the SERVICE ROLE key.
// This key bypasses Row Level Security, so it must NEVER be exposed to the
// browser — only used here, inside Vercel serverless functions.

import { createClient } from '@supabase/supabase-js';

let client = null;

// CHFPL tables live inside the shared GRD database under the chfpl_ prefix.
// Keep the mapping here so every existing CHFPL API automatically targets
// the isolated CHFPL tables without touching GRD's tables with the same names.
const CHFPL_TABLES = new Set(["users","customer_profiles","loan_applications","guarantor_details","kyc_documents","application_status_history","fi_reports","sanction_records","dealer_incentives","otp_codes","hypothecation_master","loan_type_master","staff_accounts","telecaller_registers","telecaller_call_logs","loan_receipts","loan_payment_vouchers","delivery_details","sales","co_borrower_details","expense_master","loan_expenses","loan_charges","audit_logs","loan_status_history","emi_schedule","collection_entries","payment_transactions","emandate_records","loan_ledger","payment_webhook_events","loan_disbursement_events","risk_config","loan_restructure_requests","telecaller_ptp","loan_tvrs","chf_application_counters"]);

function chfplTableName(name) {
  if (typeof name !== 'string') return name;
  if (name.startsWith('chfpl_')) return name;
  return CHFPL_TABLES.has(name) ? 'chfpl_' + name : name;
}

export function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars are not set');
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Route only known CHFPL tables to their chfpl_ counterparts.
  const originalFrom = client.from.bind(client);
  client.from = (table) => originalFrom(chfplTableName(table));

  return client;
}
