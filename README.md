> **Deploying?** See [DEPLOY.md](./DEPLOY.md) — this project runs on
> **Vercel (Node serverless functions) + Supabase (Postgres)**. The `api/`
> folder below was originally written in PHP/MySQL; it has since been
> rewritten in Node — see DEPLOY.md for the full mapping.

# CHFPL Role Portal — Structure Wireframe

React + Vite wireframe for:
1. Unified login portal with role-based redirect (4 apps: Field Executive,
   Tele Caller, Dealer, Customer Payment)
2. Accounting & Finance module (9 sub-pages under a sidebar layout)

This is **structure only** — no real auth, no API calls, no styling polish.
Every page is a labeled placeholder (`wireframe-block`) showing what goes
where. Fill in real components once the flow is approved.

## Run locally

```bash
npm install
npm run dev
```

## Folder structure

```
src/
  routes/
    AppRoutes.jsx       -- top-level router, all routes defined here
    RoleGuard.jsx        -- wraps protected routes, checks user.role
  utils/
    roleRedirect.js       -- role -> landing route mapping (edit ROLE_KEYS
                             to match your `users`/`dealer_users` role column)
  pages/
    auth/Login.jsx         -- single shared login screen
    accounting/*.jsx       -- 9 accounting sub-pages
  apps/
    field-executive/Dashboard.jsx
    tele-caller/Dashboard.jsx
    dealer/Dashboard.jsx    -- aligned to Phase 10 schema (loan_applications,
                               kyc_documents, guarantor_details, etc.)
    customer-payment/Dashboard.jsx
  layouts/
    AccountingLayout.jsx    -- sidebar nav wrapping the 9 accounting pages
  styles.css                -- minimal wireframe styling
```

## Role -> route mapping (src/utils/roleRedirect.js)

| Role key          | Route                    |
|--------------------|---------------------------|
| field_executive    | /app/field-executive      |
| tele_caller         | /app/tele-caller           |
| dealer               | /app/dealer                  |
| customer             | /app/customer-payment       |
| admin                | /app/admin (+ /app/accounting) |

Update `ROLE_KEYS` values to exactly match whatever string your `users` /
`dealer_users` table stores in the `role` column.

## PHP API layer (api/)

Backend endpoints for the Dealer Loan Application form, matching CHFPL's
existing PHP/MySQL/PDO stack (session-based auth + CSRF header check).

```
api/
  includes/
    db.php         -- PDO connection (reads DB_HOST/DB_NAME/DB_USER/DB_PASS env vars)
    auth.php        -- require_dealer_session(), require_csrf_token(), JSON helpers
    validate.php     -- server-side field validation, application_no generator
  dealer/
    create_loan_application.php  -- POST: creates customer_profiles + loan_applications
                                     + guarantor_details + application_status_history
                                     in one transaction, status='submitted'
    upload_kyc_document.php       -- POST (multipart): validates + stores one KYC file,
                                       inserts a kyc_documents row
    list_vehicle_models.php        -- GET: dealer_vehicle_mapping join vehicle_model_master
    list_loan_applications.php      -- GET: this dealer's applications for the status tracker
  uploads/kyc/                       -- uploaded KYC files land here, one folder per application
```

**Before deploying:**
1. Set `DB_HOST` / `DB_NAME` / `DB_USER` / `DB_PASS` env vars, or edit `db.php` directly
2. Wire `$_SESSION['dealer_user_id']` / `$_SESSION['dealer_id']` at dealer login time
3. Confirm your app emits a `<meta name="csrf-token" content="...">` tag (or update
   `getCsrfToken()` in `src/apps/dealer/api.js` to match how you already expose it)
4. Move `api/` and `api/uploads/` outside the public web root if your existing CHFPL
   deployment does that for uploads — adjust paths in `upload_kyc_document.php`
5. Run `phase10_dealer_loan_application_schema.sql` on the DB before testing

The frontend (`src/apps/dealer/api.js`) calls these at `/api/dealer/*` — adjust
`API_BASE` if your PHP files are mounted elsewhere.

## CIBIL export (Admin Dashboard)

`/app/admin` has an "Export CIBIL Data" card. It pulls live, reportable
(`submitted`/`fi_pending`/`fi_done`/`approved`/`sanctioned`/`disbursed`)
loan applications from Supabase and generates an `.xlsx` in CIBIL's TUDF
"Data Submission Form" layout — same headers/column order as CIBIL's
template, one row per applicant and one per guarantor. Admin enters an
"As on Date" each time, which becomes the CIBIL "Date Reported" field.

Backend: `api/admin/export-cibil.js` (+ `api/_lib/cibilExport.js`,
`api/_lib/cibilWorkbook.js`). Several TUDF fields (repayment tenure, EMI,
rate of interest, exact state/address-category codes, days-past-due, etc.)
aren't in the current schema and are left blank or fixed — see the comment
block at the top of `api/_lib/cibilExport.js` before relying on this for a
real upload. Tested in `tests/admin-export-cibil.test.js` (`npm run
test:export-cibil`).

## What's NOT done yet (next pass)

- Real session login (dealer_users) — `create_loan_application.php` expects
  `$_SESSION['dealer_user_id']` / `$_SESSION['dealer_id']` to already be set
- Accounting module pages — still wireframe placeholders (no API yet)
- Field Executive / Tele Caller / Customer Payment apps — still wireframe placeholders
- Mobile responsive pass
- Design system / visual polish (currently flat wireframe CSS only)
- KYC file download/view endpoint for internal staff (verification_status update)

## Manage Staff API migration

Manage Staff no longer calls the old PHP `/admin/staff-api.php` endpoint. It now uses JWT-authenticated Vercel serverless endpoints under `/api/admin/staff/*` and the Supabase database.

Before deploying, run `supabase/migrations/0005_staff_accounts.sql` once in the Supabase SQL Editor. Existing admin accounts remain in `public.users` with `role='admin'`; staff accounts are stored separately in `public.staff_accounts`.

## Tele Caller + Team Leader workflow

- `team_leader` is now a supported app role and can be created from Admin → Manage Users.
- A loan application records its physical register / ledger serial number in `loan_applications.physical_register_serial_no`.
- Team Leader dashboard: `/app/team-leader` — assign a physical register serial to an active Tele Caller and reassign/unassign it later.
- Tele Caller dashboard: `/app/tele-caller` — sees loans whose physical register is assigned to that Tele Caller and can save call outcome, notes and callback time.
- Run `supabase/migrations/0006_telecaller_team_leader.sql` + `0007_loan_business_workflow.sql` once in Supabase SQL Editor before testing this workflow.

## Business workflow additions
- CIBIL score is mandatory before Admin assigns an application to a Field Executive (300–900); the check timestamp is stored.
- DO approval stores `approved_at` and a 30-day `approval_valid_until` date. Loan creation is blocked after expiry until re-approval.
- Loan entry supports vehicle no., chassis no., ledger/physical register no., file no., cheque quantity, file record no., case status, disbursement date/amount.
- Admin can manually enter receipts and create loan-linked payment/incentive vouchers for Tele Callers, Field Executives and other recipients.
- Customer OTP login loads loan records by the same registered mobile number.
- Admin dashboard includes six-month applied/approved/rejected/disbursed/vehicle-seized metrics and active-case totals.
