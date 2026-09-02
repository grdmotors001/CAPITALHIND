// tests/admin-login.test.js
//
// Exercises the real api/admin/login.js handler logic without needing a
// live Supabase project — the Supabase client and bcrypt are swapped out
// with node:test's built-in module mocking.
//
// Run with:
//   node --experimental-test-module-mocks --test tests/admin-login.test.js

import { test, mock, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const supabaseLibPath = path.join(__dirname, '../api/_lib/supabase.js');

const DEMO_ADMIN = {
  id: 'admin-1',
  full_name: 'Demo Admin',
  phone: '9876543210',
  email: 'admin@example.com',
  password_hash: '$fake-hash$',
  role: 'admin',
  is_active: true,
};

// In-memory fake of the Supabase query-builder chain used by
// api/admin/login.js: supabase.from('users').select(...).eq(...).eq(...).or(...).maybeSingle()
function makeFakeSupabase({ result = null, error = null } = {}) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    or: () => chain,
    maybeSingle: async () => ({ data: result, error }),
  };
  return {
    from: () => chain,
  };
}

let bcryptCompareResult = true;
let supabaseMockHandle = null;

// mock.module() throws if the same specifier is already mocked, so route
// every (re-)mock of '../_lib/supabase.js' through here, restoring the
// previous one first.
function mockSupabase(opts) {
  if (supabaseMockHandle) supabaseMockHandle.restore();
  supabaseMockHandle = mock.module(supabaseLibPath, {
    namedExports: {
      getSupabase: () => makeFakeSupabase(opts),
    },
  });
}

before(() => {
  mockSupabase({ result: DEMO_ADMIN });

  mock.module('bcryptjs', {
    defaultExport: {
      compare: async () => bcryptCompareResult,
      hash: async (pw) => `hashed:${pw}`,
    },
  });
});

beforeEach(() => {
  bcryptCompareResult = true;
});

// Force a fresh module evaluation each time so a freshly-registered
// mock.module() for '../_lib/supabase.js' is actually picked up by the
// `import { getSupabase } from '../_lib/supabase.js'` at the top of
// api/admin/login.js (plain caching would otherwise reuse the first load).
let importCounter = 0;
async function importHandler() {
  importCounter += 1;
  const mod = await import(`../api/admin/login.js?t=${importCounter}`);
  return mod.default;
}

function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

test('rejects non-POST requests', async () => {
  const handler = await importHandler();
  const res = makeRes();
  await handler({ method: 'GET', body: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.success, false);
});

test('rejects missing identifier/password', async () => {
  const handler = await importHandler();
  const res = makeRes();
  await handler({ method: 'POST', body: { identifier: '9876543210' } }, res);
  assert.equal(res.statusCode, 422);
  assert.equal(res.body.success, false);
});

test('logs in a valid admin with correct password and returns a JWT', async () => {
  const handler = await importHandler();
  const res = makeRes();
  bcryptCompareResult = true;

  await handler(
    { method: 'POST', body: { identifier: '9876543210', password: 'Admin@123' } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.role, 'admin');
  assert.equal(res.body.user.phone, DEMO_ADMIN.phone);
  assert.equal(typeof res.body.token, 'string');
  assert.ok(res.body.token.split('.').length === 3, 'token looks like a JWT');
  // password hash must never be echoed back to the client
  assert.equal(res.body.user.password_hash, undefined);
});

test('rejects a wrong password with 401', async () => {
  const handler = await importHandler();
  const res = makeRes();
  bcryptCompareResult = false;

  await handler(
    { method: 'POST', body: { identifier: '9876543210', password: 'wrong' } },
    res
  );

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.success, false);
});

test('rejects an unknown identifier with 401 (no such admin)', async () => {
  mockSupabase({ result: null });
  const handler = await importHandler();
  const res = makeRes();

  await handler(
    { method: 'POST', body: { identifier: 'nobody@example.com', password: 'whatever' } },
    res
  );

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.success, false);

  // restore the default mock for any later tests in the file
  mockSupabase({ result: DEMO_ADMIN });
});

test('returns 500 if the Supabase query itself errors', async () => {
  mockSupabase({ error: { message: 'connection refused' } });
  const handler = await importHandler();
  const res = makeRes();

  await handler(
    { method: 'POST', body: { identifier: '9876543210', password: 'Admin@123' } },
    res
  );

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
});
