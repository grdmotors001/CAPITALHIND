# Step 6 - Document & KYC Security

Completed:

- Added KYC document verification status workflow:
  UPLOADED -> VERIFIED / REJECTED
- Added verified_by, verified_at and rejection_reason fields.
- Added index for faster pending document checks.
- Existing upload API validation retained:
  - JPG, PNG, PDF only
  - 5 MB maximum size
  - Dealer ownership check before upload

Production checklist:
- Create private Supabase Storage bucket: kyc-documents
- Add Storage policies
- Test dealer/admin/customer document access
