// tests/admin-export-cibil.test.js
//
// Run with:
//   node --experimental-test-module-mocks --test tests/admin-export-cibil.test.js

import { test, mock, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ExcelJS from 'exceljs';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const supabaseLibPath = path.join(__dirname, '../api/_lib/supabase.js');

const ADMIN_TOKEN = jwt.sign(
  { type: 'admin_user', role: 'admin', user_id: 'admin-1' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const SAMPLE_APPLICATION = {
  id: 1,
  application_no: 'CHF-2026-0001',
  loan_account_no: null,
  loan_amount_requested: 75000,
  submitted_at: '2026-03-10T00:00:00Z',
  created_at: '2026-03-01T00:00:00Z',
  application_status: 'sanctioned',
  customer: {
    full_name: 'Test Customer',
    dob: '1990-05-15',
    gender: 'male',
    pan: 'ABCDE1234F',
    aadhaar_masked: 'XXXXXXXX1234',
    phone: '9999999999',
    email: 'customer@example.com',
    address: 'Test Address, Delhi',
    pincode: '110018',
    occupation: 'Salaried',
    monthly_income: 30000,
  },
  dealer: { dealer_name: 'Demo Dealer', dealer_code: 'DLR-0001' },
  guarantors: [
    {
      full_name: 'Test Guarantor',
      phone: '8888888888',
      address: 'Guarantor Address, Delhi',
      pan: 'FGHIJ5678K',
      aadhaar_masked: 'XXXXXXXX5678',
    },
  ],
};

function makeFakeSupabase({ data = [], error = null } = {}) {
  const builder = {
    select: () => builder,
    in: () => builder,
    eq: () => builder,
    order: () => builder,
    then: (resolve) => resolve({ data, error }),
  };
  return { from: () => builder };
}

let supabaseMockHandle = null;
function mockSupabase(opts) {
  if (supabaseMockHandle) supabaseMockHandle.restore();
  supabaseMockHandle = mock.module(supabaseLibPath, {
    namedExports: { getSupabase: () => makeFakeSupabase(opts) },
  });
}

before(() => {
  mockSupabase({ data: [SAMPLE_APPLICATION] });
});

after(() => {
  if (supabaseMockHandle) supabaseMockHandle.restore();
});

let importCounter = 0;
async function importHandler() {
  importCounter += 1;
  const mod = await import(`../api/admin/export-cibil.js?t=${importCounter}`);
  return mod.default;
}

function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    sentBuffer: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    send(payload) { this.sentBuffer = payload; return this; },
  };
  return res;
}

test('rejects requests with no admin token', async () => {
  const handler = await importHandler();
  const res = makeRes();
  await handler({ method: 'POST', headers: {}, body: { asOnDate: '2026-09-01' } }, res);
  assert.equal(res.statusCode, 401);
});

test('rejects missing asOnDate', async () => {
  const handler = await importHandler();
  const res = makeRes();
  await handler(
    { method: 'POST', headers: { authorization: `Bearer ${ADMIN_TOKEN}` }, body: {} },
    res
  );
  assert.equal(res.statusCode, 422);
});

test('rejects an invalid asOnDate', async () => {
  const handler = await importHandler();
  const res = makeRes();
  await handler(
    {
      method: 'POST',
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
      body: { asOnDate: 'not-a-date' },
    },
    res
  );
  assert.equal(res.statusCode, 422);
});

test('returns 404 when there are no reportable applications', async () => {
  mockSupabase({ data: [] });
  const handler = await importHandler();
  const res = makeRes();
  await handler(
    {
      method: 'POST',
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
      body: { asOnDate: '2026-09-01' },
    },
    res
  );
  assert.equal(res.statusCode, 404);
  mockSupabase({ data: [SAMPLE_APPLICATION] });
});

test('returns 500 when the Supabase query errors', async () => {
  mockSupabase({ error: { message: 'connection refused' } });
  const handler = await importHandler();
  const res = makeRes();
  await handler(
    {
      method: 'POST',
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
      body: { asOnDate: '2026-09-01' },
    },
    res
  );
  assert.equal(res.statusCode, 500);
  mockSupabase({ data: [SAMPLE_APPLICATION] });
});

test('generates a valid CIBIL-layout xlsx with one row per applicant + guarantor', async () => {
  const handler = await importHandler();
  const res = makeRes();
  await handler(
    {
      method: 'POST',
      headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
      body: { asOnDate: '2026-09-01' },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.match(res.headers['Content-Type'], /spreadsheetml/);
  assert.match(res.headers['Content-Disposition'], /^attachment; filename="NB85090001-Consumerdata_/);
  assert.ok(Buffer.isBuffer(res.sentBuffer));

  // Read the generated buffer back with ExcelJS to check the actual layout.
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(res.sentBuffer);
  const ws = wb.getWorksheet('Data Submission Form');
  assert.ok(ws, 'sheet is named exactly "Data Submission Form"');

  // Header segment: reporting member row (row 6)
  assert.equal(ws.getCell('A6').value, 'NB85090001');
  assert.equal(ws.getCell('B6').value, 'CAPITALHIND');
  assert.equal(ws.getCell('D6').value, '01092026'); // asOnDate, DDMMYYYY

  // Column headers (row 10) match the CIBIL template exactly
  assert.equal(ws.getCell('A10').value, 'Consumer Name');
  assert.equal(ws.getCell('P10').value, 'Telephone No.Mobile');
  assert.equal(ws.getCell('AH10').value, 'Current/New Member Code');

  // Row 11 = primary applicant
  assert.equal(ws.getCell('A11').value, 'Test Customer');
  assert.equal(ws.getCell('B11').value, '15051990'); // dob DDMMYYYY
  assert.equal(ws.getCell('C11').value, 2); // male -> 2
  assert.equal(ws.getCell('D11').value, 'ABCDE1234F');
  assert.equal(ws.getCell('P11').value, '9999999999');
  assert.equal(ws.getCell('AK11').value, '17'); // account type default
  assert.equal(ws.getCell('AL11').value, '1'); // ownership: primary
  assert.equal(ws.getCell('AP11').value, '01092026'); // Date Reported = asOnDate
  assert.equal(ws.getCell('AQ11').value, 75000);

  // Row 12 = guarantor
  assert.equal(ws.getCell('A12').value, 'Test Guarantor');
  assert.equal(ws.getCell('AL12').value, '3'); // ownership: guarantor
  assert.equal(ws.getCell('P12').value, '8888888888');

  // No row 13 — exactly 2 rows for 1 applicant + 1 guarantor
  assert.equal(ws.getCell('A13').value, null);
});
