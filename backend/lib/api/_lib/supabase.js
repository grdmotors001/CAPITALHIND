// api/_lib/supabase.js
// Server-side Supabase client using the SERVICE ROLE key.
// This key bypasses Row Level Security, so it must NEVER be exposed to the
// browser — only used here, inside Vercel serverless functions.

import { createClient } from '@supabase/supabase-js';

let client = null;

export function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY env vars are not set');
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
