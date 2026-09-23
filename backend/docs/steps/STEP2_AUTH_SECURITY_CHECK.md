# STEP 2 - Authentication & Role Security Check

Completed for Vercel Hobby Plan architecture.

## Completed

- JWT helper improved with shared token verification helper.
- Bearer token extraction centralized for future API cleanup.
- JWT token duration can now be controlled using JWT_TOKEN_TTL environment variable.
- Existing role checks retained:
  - admin_user
  - dealer_user
  - app_user
  - staff_user/cashier

## Required Environment Variables

```
JWT_SECRET=strong-secret-value
JWT_TOKEN_TTL=12h
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Manual Testing Required

1. Admin login -> admin APIs allowed.
2. Dealer login -> only dealer data visible.
3. Staff login -> only assigned modules.
4. Customer login -> own loan/payment only.
5. Expired/invalid JWT should return 401.

Next phase: database audit logs and loan lifecycle control.
