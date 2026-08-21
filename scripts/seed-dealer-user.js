// Creates one demo dealer_user row so you can log in and test the flow.
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-dealer-user.js
//
// Or load from .env locally:
//   node -r dotenv/config scripts/seed-dealer-user.js

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const DEMO_PHONE = '9999999999';
const DEMO_PASSWORD = 'Dealer@123';

async function main() {
  // 0001_init.sql seeds a "Demo Dealer" row with dealer_code DLR-0001.
  const { data: dealer, error: dealerErr } = await supabase
    .from('dealer_master')
    .select('id')
    .eq('dealer_code', 'DLR-0001')
    .single();

  if (dealerErr || !dealer) {
    console.error('Demo dealer not found — run supabase/migrations/0001_init.sql first.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const { error } = await supabase.from('dealer_users').upsert(
    {
      dealer_id: dealer.id,
      full_name: 'Demo Dealer User',
      phone: DEMO_PHONE,
      password_hash: passwordHash,
      role: 'dealer',
    },
    { onConflict: 'phone' }
  );

  if (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }

  console.log('Seeded dealer_user OK.');
  console.log(`  phone:    ${DEMO_PHONE}`);
  console.log(`  password: ${DEMO_PASSWORD}`);

  // Also seed one vehicle model + a mapping so the Step 2 dropdown isn't empty.
  const { data: oem } = await supabase.from('vehicle_oem_master').select('id').limit(1).single();

  const { data: model, error: modelErr } = await supabase
    .from('vehicle_model_master')
    .upsert(
      { model_name: 'GRD Volt 2W', vehicle_type: '2W', ex_showroom_price: 95000, oem_id: oem?.id ?? null },
      { onConflict: 'model_name' }
    )
    .select('id')
    .single();

  if (!modelErr && model) {
    await supabase
      .from('dealer_vehicle_mapping')
      .upsert({ dealer_id: dealer.id, vehicle_model_id: model.id }, { onConflict: 'dealer_id,vehicle_model_id' });
    console.log('Seeded vehicle model + dealer mapping OK.');
  }
}

main();
