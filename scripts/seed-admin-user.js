// scripts/seed-admin-user.js
// Creates (or resets) a demo admin login you can actually test with,
// against /api/admin/login. Mirrors scripts/seed-dealer-user.js.
//
// Usage (from project root, after `npm install`):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:admin
//
// Uses the service-role key so it bypasses RLS (same as the API functions
// do). Never run this with the anon key.
//
// Demo login created:
//   identifier: admin@example.com  (or phone 9876543210)
//   password:   Admin@123
// Change DEMO_EMAIL / DEMO_PHONE / DEMO_PASSWORD below if you want
// different values.

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEMO_EMAIL = 'admin@example.com';
const DEMO_PHONE = '9876543210';
const DEMO_PASSWORD = 'Admin@123';
const DEMO_NAME = 'Demo Admin User';

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      '\n❌ Missing env vars. Run it like:\n\n' +
      '  SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... npm run seed:admin\n\n' +
      '(Get both from Supabase dashboard → Project Settings → API.)\n'
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // users table (see supabase/migrations/0001_init.sql) holds
  // field_executive / tele_caller / customer / admin roles.
  const { data: user, error: upsertErr } = await supabase
    .from('users')
    .upsert(
      {
        full_name: DEMO_NAME,
        phone: DEMO_PHONE,
        email: DEMO_EMAIL,
        password_hash: passwordHash,
        role: 'admin',
        is_active: true,
      },
      { onConflict: 'phone' } // `phone` is the unique column on `users`; `email` has no unique constraint
    )
    .select('id, full_name, phone, email')
    .single();

  if (upsertErr) {
    console.error('❌ Failed to create admin user:', upsertErr.message);
    process.exit(1);
  }

  console.log('\n✅ Demo admin login ready:\n');
  console.log(`   User:       ${user.full_name} (users.id=${user.id})`);
  console.log(`   Identifier: ${DEMO_EMAIL}  (or phone ${DEMO_PHONE})`);
  console.log(`   Password:   ${DEMO_PASSWORD}`);
  console.log('\nLog in with these at /login on your dev/deployed site → redirects to /app/admin.\n');
}

main();
