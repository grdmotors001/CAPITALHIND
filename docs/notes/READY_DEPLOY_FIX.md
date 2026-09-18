# CHFPL Ready-to-Upload Fix

## Important fixes in this package
- Removed legacy `api/[...path].js` catch-all.
- Kept exactly 9 top-level grouped Vercel functions under `api/`.
- Added explicit Vercel rewrites for all grouped API domains.
- Registered missing Admin grouped routes:
  - `/api/admin/applicants`
  - `/api/admin/expense-master`
  - `/api/admin/loan-ledger`
  - `/api/admin/repo-cases`
  - `/api/admin/reports`
  - `/api/admin/masters/batteries`
- Kept shared API helpers in `api/_lib` and backend route implementations in `lib/api`.
- Migration `0012_backfill_legacy_fe_assignments.sql` already uses `array_agg(... ORDER BY ...)` instead of `min(uuid)`.

## Vercel
Deploy this folder as the project root. Do not copy the old `api` directory back over this one.

Before push, verify:
`dir /s /b api\*.js`

The output should contain 15 JS files total:
9 grouped route files + 6 `api/_lib` helper files.

Do not commit `.vercel` metadata.
