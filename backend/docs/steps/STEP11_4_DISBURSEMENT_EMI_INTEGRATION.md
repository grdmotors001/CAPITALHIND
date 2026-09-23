# STEP 11.4 Disbursement API -> Auto EMI Generation

Architecture: Frontend + Backend separated, Vercel Hobby compatible.

Flow:
Loan Approved -> Disbursement API -> Loan Status DISBURSED -> EMI Schedule Generation -> Ledger Entry -> Collection Tracking

Added foundation:
- loan disbursement API location
- EMI generator module location
- workflow documentation
