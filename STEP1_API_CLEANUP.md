# Step 1 API Cleanup (Hobby Plan Ready)

Completed:
- Kept Vercel Hobby compatible API entry points under `/api`.
- Kept shared route handlers under `/lib/api` because `/api/*.js` imports them.
- Removed duplicate unused `/server/api` folder.

Deployment structure:
```
api/          -> Vercel serverless entry points
lib/api/      -> shared API route handlers
src/          -> React frontend
```

No paid server runtime dependency added.
