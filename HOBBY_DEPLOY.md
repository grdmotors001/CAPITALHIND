# Vercel Hobby deployment

This build consolidates all API handlers behind one Vercel catch-all serverless function:

- Vercel function: `api/[...path].js`
- Original handlers: `server/api/**`
- Existing API URLs remain unchanged, e.g. `/api/admin/login`, `/api/dealer/login`, `/api/customer/request-otp`.
- `/admin/react-login.php` remains rewritten to `/api/admin/login`.

## Required Production environment variables

Set these in Vercel Production:

- `SUPABASE_URL` = `https://ddnknnviczpnqqbegdec.supabase.co`
- `SUPABASE_SECRET_KEY` = your Supabase `sb_secret_...` key
- `JWT_SECRET` = your existing JWT secret

The backend also accepts `SUPABASE_SERVICE_ROLE_KEY` as a legacy fallback.

Never put the Supabase secret key in `VITE_*` variables or frontend code.

After changing Vercel environment variables, create a fresh Production deployment.
