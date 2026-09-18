# Deploying CAPITALHIND — Vercel + Supabase

This repo is React/Vite (frontend) + Vercel serverless functions in `api/`
(Node, replacing the original PHP backend) + Supabase Postgres (replacing
MySQL). Only the **Dealer Loan Application** module (Phase 10) has a working
backend right now — Field Executive / Tele Caller / Customer apps are still
frontend wireframes.

## 1. Push this code to GitHub

```bash
cd capitalhind          # this folder
git init
git add .
git commit -m "Rewrite backend for Vercel + Supabase"
git branch -M main
git remote add origin https://github.com/grdmotors001/CAPITALHIND.git
git push -u origin main
```

## 2. Set up the Supabase database

1. Open your project: https://supabase.com/dashboard/project/ddnknnviczpnqqbegdec
2. Go to **SQL Editor** → paste the contents of `supabase/migrations/0001_init.sql` → **Run**.
   This creates all tables, enables Row Level Security with no policies (so
   only the service-role key can read/write — the anon key gets nothing),
   and seeds one demo dealer + OEM row.
3. Go to **Storage** → create a new **private** bucket named `kyc-documents`.
4. Go to **Project Settings → API** → copy:
   - `Project URL` → this is `SUPABASE_URL`
   - `service_role` secret key → this is `SUPABASE_SERVICE_ROLE_KEY`
     (⚠️ never put this in the frontend or commit it — server-only)

## 3. Connect the Vercel project

1. In Vercel, import `grdmotors001/CAPITALHIND` as a new project (or connect
   your existing `capitalhind/capitalhind` project to this repo).
2. Framework preset: **Vite**. Build command `npm run build`, output `dist`
   (Vercel auto-detects this).
3. Go to **Project → Settings → Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | from step 2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 2 |
   | `JWT_SECRET` | any long random string, e.g. output of `openssl rand -hex 32` |
   | `CIBIL_REPORTING_MEMBER_ID` *(optional)* | your CIBIL Reporting Member ID, e.g. `NB85090001` — defaults to that value if unset |
   | `CIBIL_SHORT_NAME` *(optional)* | your CIBIL short name, e.g. `CAPITALHIND` |
   | `CIBIL_ACCOUNT_TYPE_CODE` *(optional)* | default TUDF account type code written to every export row — defaults to `17` |
   | `SMS_PROVIDER` *(optional)* | `msg91` or `twilio` — leave unset to just log OTPs to the function log while testing |
   | `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `MSG91_SENDER_ID` *(if SMS_PROVIDER=msg91)* | from your MSG91 dashboard |
   | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` *(if SMS_PROVIDER=twilio)* | from your Twilio console |
   | `GOOGLE_CLIENT_ID` | OAuth Client ID from Google Cloud Console (Credentials → OAuth client ID → Web application) |
   | `VITE_GOOGLE_CLIENT_ID` | same value as `GOOGLE_CLIENT_ID`, exposed to the frontend build |

4. Deploy.

## 4. Create a login you can actually test with

Locally, with the same env vars set:

```bash
npm install
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:dealer
```

This creates a demo dealer user:
- phone: `9999999999`
- password: `Dealer@123`

Log in with these at `/login` on your deployed site → redirects to
`/app/dealer` → fill out a loan application to confirm the full write path
(customer_profiles → loan_applications → guarantor_details →
application_status_history) and a KYC file upload to Supabase Storage.

## 5. Customer login (Mobile OTP + Google)

Customers log in without a password — either mobile OTP or Gmail. Both are
gated on the phone/email already existing in `customer_profiles` (i.e. a
dealer filed a loan for them), so random numbers/emails can't self-register.

1. Run `supabase/migrations/0003_customer_otp_google_auth.sql` in the SQL
   Editor (after 0001 and 0002).
2. **OTP SMS**: no provider is wired up by default — OTPs are only logged to
   the Vercel function log, which is fine for testing. To actually send SMS,
   pick one:
   - **MSG91** (recommended for an India-only app — built for the DLT/TRAI
     consent regime, has a dedicated OTP-template API, cheap per SMS).
     Sign up at msg91.com, get a DLT-approved sender ID + OTP template, and
     set `SMS_PROVIDER=msg91` + `MSG91_AUTH_KEY` + `MSG91_TEMPLATE_ID` +
     `MSG91_SENDER_ID`.
   - **Twilio**: set `SMS_PROVIDER=twilio` + `TWILIO_ACCOUNT_SID` +
     `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER`. Easier global reach, pricier
     for India-only volume, and you'll need Twilio's India SMS registration
     for reliable delivery.
   - See `api/_lib/sms.js` — swapping providers only touches this one file.
3. **Google Sign-In**: in Google Cloud Console, create an OAuth 2.0 Client ID
   (Web application), add your deployed domain under "Authorized JavaScript
   origins". Set `GOOGLE_CLIENT_ID` (server) and `VITE_GOOGLE_CLIENT_ID`
   (frontend build, same value) in Vercel env vars.
4. Endpoints: `POST /api/customer/request-otp`, `POST /api/customer/verify-otp`,
   `POST /api/customer/google-login`. Frontend wiring:
   `src/utils/customerAuth.js`, `src/pages/auth/Login.jsx` ("Customer Login" tab).

## What changed from the original PHP/MySQL design

| Original | Now |
|---|---|
| PHP files in `api/dealer/*.php` | Node serverless functions in `api/dealer/*.js` |
| MySQL + PDO | Postgres via Supabase (`supabase/migrations/0001_init.sql`) |
| `$_SESSION` + CSRF header | Stateless JWT in `Authorization: Bearer` header |
| Files saved to `api/uploads/kyc/` on disk | Uploaded to Supabase Storage bucket `kyc-documents` |
| Multi-statement SQL transaction | Manual insert order + best-effort rollback (Supabase JS has no cross-table transactions) |

## What's still not built (same as before)

- Field Executive / Tele Caller / Customer Payment apps — wireframe placeholders only
- Admin dashboard
- Accounting module — no backend yet
- KYC review/verification screen for internal staff
- Phase 8 (Repossession & Recovery) — schema only, not wired to any UI or API yet
