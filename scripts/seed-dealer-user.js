// scripts/seed-dealer-user.js
// Creates (or resets) a demo dealer login you can actually test with.
//
// Usage (from project root, after `npm install`):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:dealer
//
// Uses the service-role key so it bypasses RLS (same as the API functions
// do). Never run this with the anon key — it will fail silently or error,
// since RLS has zero policies defined for the anon key on purpose.
//
// Demo login created:
//   phone:    9999999999
//   password: Dealer@123
// Change DEMO_PHONE / DEMO_PASSWORD below if you want different values.

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEMO_DEALER_CODE = 'DLR-0001'; // matches the row seeded by 0001_init.sql
const DEMO_PHONE = '9999999999';
const DEMO_PASSWORD = 'Dealer@123';
const DEMO_NAME = 'Demo Dealer User';

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      '\n❌ Missing env vars. Run it like:\n\n' +
      '  SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... npm run seed:dealer\n\n' +
      '(Get both from Supabase dashboard → Project Settings → API.)\n'
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Find the demo dealer company (seeded by the migration).
  const { data: dealer, error: dealerErr } = await supabase
    .from('dealer_master')
    .select('id, dealer_name')
    .eq('dealer_code', DEMO_DEALER_CODE)
    .maybeSingle();

  if (dealerErr) {
    console.error('❌ Failed to look up dealer_master:', dealerErr.message);
    process.exit(1);
  }

  if (!dealer) {
    console.error(
      `❌ No dealer_master row with dealer_code='${DEMO_DEALER_CODE}' found.\n` +
      '   Run supabase/migrations/0001_init.sql in the Supabase SQL Editor first.'
    );
    process.exit(1);
  }

  // 2. Hash the demo password.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 3. Upsert the dealer_users row (safe to re-run — resets the password
  //    each time in case you forgot it).
  const { data: user, error: upsertErr } = await supabase
    .from('dealer_users')
    .upsert(
      {
        dealer_id: dealer.id,
        full_name: DEMO_NAME,
        phone: DEMO_PHONE,
        password_hash: passwordHash,
        role: 'dealer',
        is_active: true,
      },
      { onConflict: 'phone' }
    )
    .select('id, full_name, phone, dealer_id')
    .single();

  if (upsertErr) {
    console.error('❌ Failed to create dealer user:', upsertErr.message);
    process.exit(1);
  }

  console.log('\n✅ Demo dealer login ready:\n');
  console.log(`   Dealer:   ${dealer.dealer_name} (dealer_id=${dealer.id})`);
  console.log(`   User:     ${user.full_name} (dealer_users.id=${user.id})`);
  console.log(`   Phone:    ${DEMO_PHONE}`);
  console.log(`   Password: ${DEMO_PASSWORD}`);
  console.log('\nLog in with these at /login on your dev/deployed site.\n');
}

main();
