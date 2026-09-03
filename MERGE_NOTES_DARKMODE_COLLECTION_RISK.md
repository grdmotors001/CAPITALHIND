# MERGE NOTES — STEP11_7_TVR branch + Dark Mode + Collection & Risk

This build merges two branches that had diverged:

1. **Base (this upload):** `CHFPL_STEP11_7_TVR_AFTER_APPROVAL_READY` —
   frontend/backend split, EMI auto-generation foundation (Step 11.2–11.4),
   Tele Caller Collection CRM (PTP tracking, migration 0026), TVR after
   approval workflow (migration 0027). This already had a partial dark-mode
   CSS block, but no toggle was wired anywhere in the UI.
2. **Merged in:** Dark/light mode (all roles) + Collection & Risk module
   (NPA ageing, penal/bounce config, restructure/foreclosure requests) —
   built in a separate, older-structure branch.

## What changed in this merge

### Dark mode
- Reused the existing `html[data-theme="dark"]` CSS block and the
  `chfpl_theme` localStorage key (already used by `AdminTools.jsx`) instead
  of introducing a second mechanism.
- Extended `:root` / `html[data-theme="dark"]` with the extra variables the
  Collection & Risk / older branch relied on (`--maroon-heading`,
  `--page-bg`, `--shadow`).
- Ran the same structural-color → CSS-variable conversion across the full
  `styles.css` (now includes the Tele Caller CRM and TVR sections, which
  the older branch never touched).
- Removed the dark/light button from `AdminTools.jsx`'s utility bar (admin
  only) and replaced it with a single **global floating toggle**
  (`ThemeToggle.jsx`, bottom-right) mounted in `main.jsx` — now works on
  every role's dashboard and the login screen, not just admin.
- Added a pre-paint inline script in `frontend/index.html` to avoid a
  flash-of-wrong-theme on load.
- Fixed the same hardcoded-color drawer (`LoanCases.jsx`,
  `CollectionActivity.jsx`) found in the older branch — same bug existed
  here too.

### Collection & Risk
- Migration renumbered **0025** (fills the gap that existed between 0024
  and 0026 in this branch).
- Extended the `loan_id uuid → bigint` fix to also cover
  `loan_disbursement_events` (new table from this branch's 0024, not
  present when the fix was first written).
- Backend: `backend/lib/api/admin/collection-risk.js`, registered in
  `backend/api/admin.js`.
- Frontend: `frontend/src/apps/admin/CollectionRisk.jsx`, wired into
  `AdminDashboard.jsx` nav/routes/home card, API helpers added to
  `frontend/src/apps/admin/api.js`.

## Still open (unchanged from before)
- EMI schedule generation is still a foundation/stub
  (`backend/lib/emi/generator.js`, `backend/api/loan/disburse.js`) — not
  wired to Supabase yet, so `loan_dpd` / `loan_npa_status` have no real
  data until that's connected.
- Penal interest / bounce charge columns exist but nothing auto-applies
  them yet on late collection / bounced payment.
- eNACH + payment gateway (Step 8/9) still pending, as discussed.
