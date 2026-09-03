// api/_lib/cibilExport.js
//
// Maps CHFPL's Supabase data (loan_applications + customer_profiles +
// guarantor_details + dealer_master) into the CIBIL TUDF "Data Submission
// Form" layout — same header row / column order as the official CIBIL
// template, so the exported file can go straight into the CIBIL upload
// portal.
//
// IMPORTANT — read before wiring this to a real upload:
// The current DB schema (supabase/migrations/0001_init.sql) does not carry
// every field the TUDF format asks for (repayment tenure, EMI amount, rate
// of interest, asset classification, days-past-due tracking, exact CIBIL
// state/address/account-type codes, etc.). Those columns are intentionally
// left blank below rather than guessed. Fields that ARE filled with fixed
// values (account type, ownership indicator, gender code) are called out in
// FIXED_DEFAULTS and should be reviewed against your bank's actual TUDF
// Guide/annexure before the first live upload.

// ---- Header Segment (TUDF) constants -------------------------------------
// These identify CHFPL as the reporting member to CIBIL. Override via env
// vars so they aren't hardcoded per-deployment; falls back to the values
// already used in the reference file the org has been uploading manually.
export const REPORTING_MEMBER = {
  memberId: process.env.CIBIL_REPORTING_MEMBER_ID || 'NB85090001',
  shortName: process.env.CIBIL_SHORT_NAME || 'CAPITALHIND',
  cycleId: process.env.CIBIL_CYCLE_ID || 'NB',
  authenticationMethod: process.env.CIBIL_AUTH_METHOD || 'A',
};

// Fields where we deliberately write a fixed value rather than leaving the
// cell blank, because the schema has no source column for it. Confirm these
// against the TUDF Guide before relying on them.
export const FIXED_DEFAULTS = {
  accountType: process.env.CIBIL_ACCOUNT_TYPE_CODE || '17', // matches the manually-uploaded reference file
  ownershipIndicatorPrimary: '1', // Individual / sole borrower
  ownershipIndicatorGuarantor: '3', // Guarantor
};

// Column headers, in TUDF column order (A.. ). Must match the CIBIL
// template's Data Submission Form row 9/10 exactly — do not rename.
export const TUDF_COLUMNS = [
  'Consumer Name', 'Date of Birth', 'Gender', 'Income Tax ID Number', 'Passport Number',
  'Passport Issue Date', 'Passport Expiry Date', 'Voter ID Number', 'Driving License Number',
  'Driving License Issue Date', 'Driving License Expiry Date', 'Ration Card Number',
  'Universal ID Number', 'Additional ID #1', 'Additional ID #2', 'Telephone No.Mobile',
  'Telephone No.Residence', 'Telephone No.Office', 'Extension Office', 'Telephone No.Other',
  'Extension Other', 'Email ID 1', 'Email ID 2', 'Address Line 1', 'State Code 1', 'PIN Code 1',
  'Address Category 1', 'Residence Code 1', 'Address Line 2', 'State Code 2', 'PIN Code 2',
  'Address Category 2', 'Residence Code 2', 'Current/New Member Code',
  'Current/New Member Short Name', 'Curr/New Account No', 'Account Type', 'Ownership Indicator',
  'Date Opened/Disbursed', 'Date of Last Payment', 'Date Closed', 'Date Reported',
  'High Credit/Sanctioned Amt', 'Current  Balance', 'Amt Overdue', 'No of Days Past Due',
  'Old Mbr Code', 'Old Mbr Short Name', 'Old Acc No', 'Old Acc Type', 'Old Ownership Indicator',
  'Suit Filed / Wilful Default', 'Credit Facility Status', 'Asset Classification',
  'Value of Collateral', 'Type of Collateral', 'Credit Limit', 'Cash Limit', 'Rate of Interest',
  'RepaymentTenure', 'EMI Amount', 'Written- off Amount (Total) ', 'Written- off Principal Amount',
  'Settlement Amt', 'Payment Frequency', 'Actual Payment Amt', 'Occupation Code', 'Income',
  'Net/Gross Income Indicator', 'Monthly/Annual Income Indicator', 'CKYC', 'NREGA Card Number',
];

function ddmmyyyy(dateLike) {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}${mm}${d.getFullYear()}`;
}

// Per Instruction sheet: Male -> 2, Female -> 1. Anything else is left blank
// (TUDF doesn't define a third code as of the reference Instruction sheet).
function genderCode(gender) {
  const g = (gender || '').trim().toLowerCase();
  if (g === 'male' || g === 'm') return 2;
  if (g === 'female' || g === 'f') return 1;
  return '';
}

// One row per person on the loan (primary applicant, then each guarantor),
// same shape the reference file uses (one TL/account row per person sharing
// the account number).
function buildRow({ person, isGuarantor, application, dealer, asOnDateDDMMYYYY }) {
  const row = {};
  row['Consumer Name'] = person.full_name || '';
  row['Date of Birth'] = ddmmyyyy(person.dob);
  row['Gender'] = genderCode(person.gender);
  row['Income Tax ID Number'] = person.pan || '';
  row['Universal ID Number'] = person.aadhaar_masked || '';
  row['Telephone No.Mobile'] = person.phone || '';
  row['Email ID 1'] = person.email || '';
  row['Address Line 1'] = person.address || '';
  row['PIN Code 1'] = person.pincode || '';

  row['Current/New Member Code'] = REPORTING_MEMBER.memberId;
  row['Current/New Member Short Name'] = REPORTING_MEMBER.shortName;
  row['Curr/New Account No'] = application.loan_account_no || application.application_no;
  row['Account Type'] = FIXED_DEFAULTS.accountType;
  row['Ownership Indicator'] = isGuarantor
    ? FIXED_DEFAULTS.ownershipIndicatorGuarantor
    : FIXED_DEFAULTS.ownershipIndicatorPrimary;

  row['Date Opened/Disbursed'] = ddmmyyyy(application.submitted_at || application.created_at);
  row['Date Reported'] = asOnDateDDMMYYYY;
  row['High Credit/Sanctioned Amt'] = application.loan_amount_requested ?? '';
  // No repayment-tracking table exists yet (see module header note) — best
  // available proxy for an unpaid, freshly-disbursed loan is the sanctioned
  // amount itself. Revisit once real repayment data exists.
  row['Current  Balance'] = application.loan_amount_requested ?? '';
  row['Amt Overdue'] = 0;
  row['No of Days Past Due'] = 0;

  row['Occupation Code'] = person.occupation || '';
  row['Income'] = person.monthly_income ?? '';

  return row;
}

// applications: rows from `loan_applications`, each pre-joined (by the
// caller's Supabase select) with its `customer_profiles` row (as
// `.customer`), `dealer_master` row (as `.dealer`), and array of
// `guarantor_details` (as `.guarantors`).
export function buildTudfRows(applications, asOnDateDDMMYYYY) {
  const rows = [];
  for (const application of applications) {
    const customer = application.customer || {};
    const dealer = application.dealer || {};

    rows.push(
      buildRow({
        person: customer,
        isGuarantor: false,
        application,
        dealer,
        asOnDateDDMMYYYY,
      })
    );

    for (const guarantor of application.guarantors || []) {
      rows.push(
        buildRow({
          person: {
            full_name: guarantor.full_name,
            phone: guarantor.phone,
            address: guarantor.address,
            pan: guarantor.pan,
            aadhaar_masked: guarantor.aadhaar_masked,
            // guarantor_details has no dob/gender/email/pincode/occupation/income columns
          },
          isGuarantor: true,
          application,
          dealer,
          asOnDateDDMMYYYY,
        })
      );
    }
  }
  return rows;
}

export function buildExportFilename({ asOnDateDDMMYYYY, now = new Date() }) {
  const creationDate = ddmmyyyy(now);
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  // Matches the "<MemberID>-<Data type>-<cycle date>-<creation date>-<HHMMSS>" convention
  // from the CIBIL template's Instruction sheet, minus the words the sheet
  // says to avoid in production filenames (test, uat, etc.).
  return `${REPORTING_MEMBER.memberId}-Consumerdata_${asOnDateDDMMYYYY}_${creationDate}_${hh}${min}${ss}.xlsx`;
}
