# Vercel Hobby Deployment

This project is intentionally structured to use **one** Vercel Serverless Function.

## Function layout

- `api/[...path].js` is the **only** file under the top-level `api/` directory.
- All application/server handlers are stored under `lib/api/`, outside Vercel's file-based Function discovery directory.
- The catch-all function dispatches `/api/...` requests to the corresponding handler in `lib/api/`.

This avoids creating one Vercel Function per backend handler on the Hobby plan.

## Environment variables (Production)

Set these in Vercel Production:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (preferred; the new `sb_secret_...` server key)
- `JWT_SECRET`

`SUPABASE_SERVICE_ROLE_KEY` remains supported as a legacy fallback, but do not put either secret in frontend/Vite variables.

After changing environment variables, create a fresh Production deployment.

## Expected deployment result

The Vercel deployment should discover only:

```text
api/[...path].js
```

Do not add individual `.js` handlers under the top-level `api/` directory.
