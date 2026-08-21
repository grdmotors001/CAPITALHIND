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
