# CAPITALHIND / CHFPL

CHFPL is the Capital Hind Finance portal built with React + Vite, Vercel Node functions and Supabase.

## Project structure

```text
CAPITALHIND/
├── backend/
│   ├── api/          # Vercel API entrypoints
│   ├── lib/          # backend services/helpers
│   ├── scripts/      # backend utilities
│   ├── supabase/     # migrations
│   ├── tests/        # backend tests
│   └── docs/         # backend/deployment notes
├── frontend/
│   ├── src/          # React application
│   ├── public/       # static frontend assets
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── vercel.json
├── .gitignore
└── README.md
```

The layout is intentionally organized like the GRD project while preserving the existing CHFPL API URLs such as `/api/admin/*`, `/api/dealer/*` and `/api/workflow/*`.

## Local development

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Backend/API and Vercel routing can be tested with the Vercel CLI from the repository root:

```powershell
cd ..
vercel dev
```

Backend dependencies:

```powershell
cd backend
npm install
```

## Tests

From `frontend/`:

```powershell
npm test
```

Individual suites:

```powershell
npm run test:admin-login
npm run test:export-cibil
```

## Important

- `dist/` and `node_modules/` are generated locally and are not part of the source tree.
- The reorganization does not intentionally change public API URLs.
- Run the build after pulling structural changes before deploying.
