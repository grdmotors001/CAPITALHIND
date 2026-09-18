# CHFPL STEP 11.7 — TVR After Loan Approval

## Workflow
Loan Application → FI → DO Approval → **TVR** → DO TVR Verification → Loan Creation / Disbursement

TVR is mandatory after approval. Loan creation is blocked until TVR is `verified`.

## TVR statuses
- pending — approved case waiting for FE TVR
- submitted — FE completed TVR; DO review required
- verified — DO verified; disbursement gate cleared
- failed — DO rejected TVR; disbursement blocked
- hold — DO placed TVR on hold; disbursement blocked

## FE module
Field Executive sees only approved applications assigned to them and can submit:
- verification date/time
- customer contacted
- applicant/details confirmed
- address confirmed
- employment/business confirmed
- reference confirmed
- documents checked
- vehicle details confirmed
- alternate mobile
- reference name/mobile
- remarks
- positive / negative / hold recommendation

## DO module
DO gets a TVR Verification section with the submitted verification details and can:
- Verify
- Hold
- Reject

## Disbursement gate
Admin Create Loan now requires `loan_applications.tvr_status = verified`. This is enforced in the backend, not only in the UI.

## Database
Migration: `0027_tvr_after_approval.sql`
Creates `loan_tvrs`, adds `loan_applications.tvr_status`, backfills already-approved assigned cases, and creates an approval trigger for future approvals.

## Verification
Backend JS syntax checks passed for all new/modified API files. Full Vite build could not be run in this environment because frontend dependencies were not installed and the dependency installation attempt timed out.

Supabase migrations should be applied through the project's normal migration workflow (`supabase db push`) after reviewing/testing the migration. Supabase recommends keeping remote schema changes in migration files and applying them through the migration workflow. 
