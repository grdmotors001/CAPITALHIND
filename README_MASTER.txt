Capital Hind Finance Pvt Ltd (CHFPL) - Combined Project Package
==================================================================
(Updated merge - includes latest wireframe with API layer)

1. Phase8_Repossession_Recovery/
   - Repossession & Recovery module (schema.sql + docs)

2. Phase10_Dealer_Loan_Application_Portal/
   - Dealer Loan Application Portal planning doc (README + DB placeholder tables)

3. Frontend_Wireframe_RolePortal/  <-- LATEST
   - React + Vite wireframe: unified login + role-based redirect
   - 4 apps: Field Executive, Tele Caller, Dealer, Customer Payment
   - Accounting & Finance module (9 sub-pages)
   - NEW: api/ folder with PHP backend endpoints for dealer loan application
     (create_loan_application.php, list_loan_applications.php,
      list_vehicle_models.php, upload_kyc_document.php) + includes/
      (auth.php, db.php, validate.php)
   - NEW: src/apps/dealer/api.js - frontend wiring to call the above APIs
   - LoanApplicationForm.jsx and StepVehicleLoan.jsx updated to use real API calls

Note: File clash nahi hai in teeno mein - alag modules/phases hain.
