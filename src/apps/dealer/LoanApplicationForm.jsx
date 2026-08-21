import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLoanApplication, uploadKycDocument } from './api';

import StepIndicator from './components/StepIndicator';
import StepCustomerDetails from './components/StepCustomerDetails';
import StepVehicleLoan from './components/StepVehicleLoan';
import StepKycUpload from './components/StepKycUpload';
import StepGuarantor from './components/StepGuarantor';
import StepReview from './components/StepReview';

const STEPS = ['Customer', 'Vehicle & loan', 'KYC', 'Guarantor', 'Review'];
const REQUIRED_DOCS = ['pan', 'aadhaar_front', 'aadhaar_back', 'photo', 'address_proof'];

function validateCustomer(c) {
  const errors = {};
  if (!c.full_name) errors.full_name = 'Naam bharein';
  if (!c.phone || !/^\d{10}$/.test(c.phone)) errors.phone = '10-digit phone number bharein';
  if (!c.dob) errors.dob = 'Date of birth bharein';
  if (!c.pan || !/^[A-Z]{5}\d{4}[A-Z]$/.test(c.pan)) errors.pan = 'Valid PAN bharein (ABCDE1234F)';
  if (!c.aadhaar || !/^\d{12}$/.test(c.aadhaar)) errors.aadhaar = '12-digit Aadhaar bharein';
  if (!c.pincode || !/^\d{6}$/.test(c.pincode)) errors.pincode = '6-digit pincode bharein';
  if (!c.address) errors.address = 'Address bharein';
  return errors;
}

function validateVehicleLoan(v) {
  const errors = {};
  if (!v.vehicle_model_id) errors.vehicle_model_id = 'Vehicle model select karein';
  if (!v.vehicle_price || Number(v.vehicle_price) <= 0) errors.vehicle_price = 'Vehicle price bharein';
  if (v.down_payment === undefined || v.down_payment === '' || Number(v.down_payment) < 0)
    errors.down_payment = 'Down payment bharein';
  if (Number(v.down_payment) >= Number(v.vehicle_price)) {
    errors.down_payment = 'Down payment, vehicle price se kam hona chahiye';
  }
  if (!v.tenure_months) errors.tenure_months = 'Tenure select karein';
  return errors;
}

function validateKyc(k) {
  const errors = {};
  const docs = k.documents || {};
  const missing = REQUIRED_DOCS.filter((d) => !docs[d]);
  if (missing.length > 0) {
    errors.documents = `Missing: ${missing.join(', ')}`;
  }
  return errors;
}

function validateGuarantors(list) {
  const errors = {};
  const guarantors = list && list.length ? list : [{}];
  guarantors.forEach((g, idx) => {
    if (!g.full_name) errors[`guarantor_${idx}_full_name`] = 'Naam bharein';
    if (!g.phone || !/^\d{10}$/.test(g.phone)) errors[`guarantor_${idx}_phone`] = '10-digit phone number bharein';
  });
  return errors;
}

export default function LoanApplicationForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const [customer, setCustomer] = useState({});
  const [vehicleLoan, setVehicleLoan] = useState({});
  const [kyc, setKyc] = useState({});
  const [guarantorData, setGuarantorData] = useState({ guarantors: [] });
  const [errors, setErrors] = useState({});

  function validateCurrentStep() {
    let stepErrors = {};
    if (step === 1) stepErrors = validateCustomer(customer);
    if (step === 2) stepErrors = validateVehicleLoan(vehicleLoan);
    if (step === 3) stepErrors = validateKyc(kyc);
    if (step === 4) stepErrors = validateGuarantors(guarantorData.guarantors);

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  }

  function goBack() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        customer,
        vehicleLoan: {
          vehicle_model_id: vehicleLoan.vehicle_model_id,
          vehicle_price: vehicleLoan.vehicle_price,
          down_payment: vehicleLoan.down_payment,
          loan_amount_requested: vehicleLoan.loan_amount_requested,
          tenure_months: vehicleLoan.tenure_months,
        },
        guarantors: guarantorData.guarantors || [],
      };

      const result = await createLoanApplication(payload);

      // Upload each KYC document now that we have the application/customer ids.
      const docs = kyc.documents || {};
      const uploads = Object.entries(docs).map(([docType, doc]) =>
        uploadKycDocument({
          loanApplicationId: result.application_id,
          customerId: result.customer_id,
          docType,
          file: doc.file,
        })
      );
      await Promise.all(uploads);

      setSubmitted({ applicationNo: result.application_no });
    } catch (err) {
      setSubmitError(err.details ? err.details.join(', ') : err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="app-shell">
        <header className="app-header">Dealer App</header>
        <main className="app-body">
          <div className="success-card">
            <h3>Application submitted</h3>
            <p>Application number: <strong>{submitted.applicationNo}</strong></p>
            <p className="step-note">Status: submitted. FI process ab shuru hoga.</p>
            <button className="primary-button" onClick={() => navigate('/app/dealer')}>
              Back to dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">New loan application</header>
      <main className="app-body">
        <StepIndicator steps={STEPS} currentStep={step} />

        {step === 1 && (
          <StepCustomerDetails data={customer} onChange={setCustomer} errors={errors} />
        )}
        {step === 2 && (
          <StepVehicleLoan data={vehicleLoan} onChange={setVehicleLoan} errors={errors} />
        )}
        {step === 3 && <StepKycUpload data={kyc} onChange={setKyc} errors={errors} />}
        {step === 4 && (
          <StepGuarantor data={guarantorData} onChange={setGuarantorData} errors={errors} />
        )}
        {step === 5 && (
          <StepReview formData={{ customer, vehicleLoan, kyc, guarantors: guarantorData.guarantors }} />
        )}

        {submitError && <p className="field-error submit-error">{submitError}</p>}

        <div className="form-nav">
          {step > 1 && (
            <button type="button" className="secondary-button" onClick={goBack} disabled={submitting}>
              Back
            </button>
          )}
          {step < STEPS.length && (
            <button type="button" className="primary-button" onClick={goNext}>
              Next
            </button>
          )}
          {step === STEPS.length && (
            <button type="button" className="primary-button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
