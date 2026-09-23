# CHFPL V3 — Vercel Hobby API consolidation

This version deliberately uses only 9 top-level Vercel Functions:

- /api/admin.js
- /api/dealer.js
- /api/customer.js
- /api/field-executive.js
- /api/team-leader.js
- /api/tele-caller.js
- /api/do.js
- /api/users.js
- /api/collection.js

The 66 original route handlers remain under `lib/api/**` and are imported by those grouped functions. They are not themselves Vercel Function entrypoints.

`vercel.json` rewrites each `/api/<group>/<route>` request to the corresponding grouped function with the route passed as the `path` query parameter. The legacy `/admin/react-login.php` endpoint is rewritten to `/api/admin?path=login`.

This is intentionally different from the previous catch-all implementation: Vercel's own documentation says that for direct Vercel Functions each API file maps to a function, so this layout makes the function count explicit and safely below the Hobby limit of 12.

Required production environment variables:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (preferred for the new `sb_secret_...` Supabase key)
- `JWT_SECRET`

The Supabase helper still accepts the legacy `SUPABASE_SERVICE_ROLE_KEY` as a fallback.
