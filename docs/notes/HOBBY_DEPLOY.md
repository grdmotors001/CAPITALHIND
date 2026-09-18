# Vercel Hobby deployment

This build is consolidated for the Vercel Hobby function limit.

- Only one top-level API function exists: `api/[...path].js`.
- All route handlers live under `lib/api/**` and are dispatched by the catch-all.
- The old duplicate `server/api/**` tree is intentionally removed.
- Do not add route files under the top-level `api/` folder.
- In Vercel Project Settings → Functions, select exactly one Function Region on Hobby.
- After changing environment variables, redeploy with a fresh deployment.

Required server env vars:
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (new `sb_secret_...` key) or legacy `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
