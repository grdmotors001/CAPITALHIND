import { useEffect, useState } from 'react';
import { createAdminLoanApplication, listDealers, listVehicleModelsAdmin, uploadAdminKycDocument } from './api';
import StepIndicator from '../dealer/components/StepIndicator';
import StepCustomerDetails from '../dealer/components/StepCustomerDetails';
import StepKycUpload from '../dealer/components/StepKycUpload';
import StepGuarantor from '../dealer/components/StepGuarantor';

const STEPS = ['Dealer', 'Customer', 'Vehicle & loan', 'KYC', 'Guarantor', 'Review'];
const REQUIRED_DOCS = ['pan', 'aadhaar_front', 'aadhaar_back', 'photo', 'address_proof'];
const TENURE_OPTIONS = [12, 18, 24, 30, 36, 48, 60];

const emptyCustomer = {
  full_name:'', phone:'', email:'', dob:'', gender:'', pan:'', aadhaar:'',
  occupation:'', monthly_income:'', pincode:'', city:'', state:'', address:''
};
const emptyVehicle = {
  vehicle_model_id:'', vehicle_price:'', down_payment:'',
  loan_amount_requested:'', tenure_months:'', physical_register_serial_no:''
};
const emptyGuarantor = {
  full_name:'', relation_with_customer:'', phone:'', address:'', pan:'', aadhaar_masked:''
};

function validateCustomer(c) {
  const errors = {};
  if (!c.full_name) errors.full_name = 'Naam bharein';
  if (!/^\\d{10}$/.test(c.phone || '')) errors.phone = '10-digit phone number bharein';
  if (!c.dob) errors.dob = 'Date of birth bharein';
  if (!/^[A-Z]{5}\\d{4}[A-Z]$/.test(c.pan || '')) errors.pan = 'Valid PAN bharein (ABCDE1234F)';
  if (!/^\\d{12}$/.test(c.aadhaar || '')) errors.aadhaar = '12-digit Aadhaar bharein';
  if (!/^\\d{6}$/.test(c.pincode || '')) errors.pincode = '6-digit pincode bharein';
  if (!c.address) errors.address = 'Address bharein';
  return errors;
}

function validateVehicleLoan(v) {
  const errors = {};
  if (!v.vehicle_model_id) errors.vehicle_model_id = 'Vehicle model select karein';
  if (!v.vehicle_price || Number(v.vehicle_price) <= 0) errors.vehicle_price = 'Vehicle price bharein';
  if (v.down_payment === '' || v.down_payment === undefined || Number(v.down_payment) < 0)
    errors.down_payment = 'Down payment bharein';
  if (Number(v.down_payment) >= Number(v.vehicle_price))
    errors.down_payment = 'Down payment, vehicle price se kam hona chahiye';
  if (!v.tenure_months) errors.tenure_months = 'Tenure select karein';
  return errors;
}

function validateKyc(k) {
  const docs = k.documents || {};
  const missing = REQUIRED_DOCS.filter((d) => !docs[d]);
  return missing.length ? { documents: 'Required KYC missing: ' + missing.join(', ') } : {};
}

function validateGuarantors(list) {
  const errors = {};
  const guarantors = list && list.length ? list : [{}];
  guarantors.forEach((g, idx) => {
    if (!g.full_name) errors[`guarantor_${idx}_full_name`] = 'Naam bharein';
    if (!/^\\d{10}$/.test(g.phone || '')) errors[`guarantor_${idx}_phone`] = '10-digit phone number bharein';
  });
  return errors;
}

function Review({ dealer, customer, vehicle, kyc, guarantors, models }) {
  const model = models.find((m) => String(m.id) === String(vehicle.vehicle_model_id));
  const docs = kyc.documents || {};
  return (
    <div className="form-step">
      <h3>Review & submit</h3>
      <div className="review-section">
        <h4>Dealer</h4>
        <div className="review-grid">
          <div><span className="review-label">Dealer</span>{dealer?.dealer_name || '—'}</div>
          <div><span className="review-label">Dealer Code</span>{dealer?.dealer_code || '—'}</div>
        </div>
      </div>
      <div className="review-section">
        <h4>Customer</h4>
        <div className="review-grid">
          <div><span className="review-label">Name</span>{customer.full_name}</div>
          <div><span className="review-label">Phone</span>{customer.phone}</div>
          <div><span className="review-label">PAN</span>{customer.pan}</div>
          <div><span className="review-label">City</span>{customer.city || '—'}</div>
        </div>
      </div>
      <div className="review-section">
        <h4>Vehicle & loan</h4>
        <div className="review-grid">
          <div><span className="review-label">Model</span>{model?.model_name || '—'}</div>
          <div><span className="review-label">Vehicle price</span>₹{Number(vehicle.vehicle_price || 0).toLocaleString('en-IN')}</div>
          <div><span className="review-label">Down payment</span>₹{Number(vehicle.down_payment || 0).toLocaleString('en-IN')}</div>
          <div><span className="review-label">Loan amount</span>₹{Number(vehicle.loan_amount_requested || 0).toLocaleString('en-IN')}</div>
          <div><span className="review-label">Tenure</span>{vehicle.tenure_months} months</div>
          <div><span className="review-label">Physical register / ledger</span>{vehicle.physical_register_serial_no || '—'}</div>
        </div>
      </div>
      <div className="review-section">
        <h4>KYC documents</h4>
        <ul className="review-doc-list">
          {Object.entries(docs).map(([key, doc]) => <li key={key}>{key} — {doc.file_name}</li>)}
        </ul>
      </div>
      <div className="review-section">
        <h4>Guarantor{guarantors.length > 1 ? 's' : ''}</h4>
        {guarantors.map((g, idx) => (
          <div className="review-grid" key={idx}>
            <div><span className="review-label">Name</span>{g.full_name}</div>
            <div><span className="review-label">Relation</span>{g.relation_with_customer}</div>
            <div><span className="review-label">Phone</span>{g.phone}</div>
          </div>
        ))}
      </div>
      <p className="step-note">Submit karne ke baad status <strong>submitted</strong> rahega. FI aur existing loan follow-up flow uske baad continue hoga.</p>
    </div>
  );
}

export default function ManualCreateLoan() {
  const [step, setStep] = useState(1);
  const [dealers, setDealers] = useState([]);
  const [models, setModels] = useState([]);
  const [dealer, setDealer] = useState(null);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [vehicleLoan, setVehicleLoan] = useState(emptyVehicle);
  const [kyc, setKyc] = useState({ documents:{} });
  const [guarantorData, setGuarantorData] = useState({ guarantors:[{ ...emptyGuarantor }] });
  const [errors, setErrors] = useState({});
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listDealers(), listVehicleModelsAdmin()])
      .then(([dealerData, modelData]) => {
        setDealers(dealerData.dealers || []);
        setModels(modelData.items || []);
      })
      .catch((e) => setError(e.message || 'Dealer / vehicle master load nahi hua.'))
      .finally(() => setLoadingMasters(false));
  }, []);

  function validateCurrentStep() {
    let next = {};
    if (step === 1 && !dealer) next = { dealer: 'Dealer select karein' };
    if (step === 2) next = validateCustomer(customer);
    if (step === 3) next = validateVehicleLoan(vehicleLoan);
    if (step === 4) next = validateKyc(kyc);
    if (step === 5) next = validateGuarantors(guarantorData.guarantors);
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function next() {
    if (validateCurrentStep()) setStep((s) => Math.min(6, s + 1));
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  }

  function selectModel(id) {
    const model = models.find((m) => String(m.id) === String(id));
    const price = model?.ex_showroom_price || '';
    const down = Number(vehicleLoan.down_payment || 0);
    setVehicleLoan((v) => ({
      ...v,
      vehicle_model_id: id,
      vehicle_price: price,
      loan_amount_requested: Math.max(Number(price || 0) - down, 0),
    }));
  }

  function setVehicle(field, value) {
    setVehicleLoan((v) => {
      const nextValue = { ...v, [field]: value };
      const price = Number(field === 'vehicle_price' ? value : nextValue.vehicle_price) || 0;
      const down = Number(field === 'down_payment' ? value : nextValue.down_payment) || 0;
      if (field === 'vehicle_price' || field === 'down_payment') {
        nextValue.loan_amount_requested = Math.max(price - down, 0);
      }
      return nextValue;
    });
  }

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      const result = await createAdminLoanApplication({
        dealer: { id: dealer.id },
        customer,
        vehicleLoan,
        guarantors: guarantorData.guarantors || [],
      });

      const docs = kyc.documents || {};
      await Promise.all(Object.entries(docs).map(([docType, doc]) =>
        uploadAdminKycDocument({
          loanApplicationId: result.application_id,
          customerId: result.customer_id,
          docType,
          file: doc.file,
        })
      ));

      setSubmitted(result);
    } catch (e) {
      setError(e.details ? e.details.join(', ') : (e.message || 'Application create nahi hui.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="admin-page">
        <div className="admin-page-head">
          <div>
            <div className="admin-eyebrow">DEALER BEHALF ENTRY</div>
            <h1>Application Created</h1>
            <p>CHFPL ne selected dealer ke behalf par application create kar di.</p>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-alert success">✓ Application submitted successfully.</div>
          <div className="review-grid">
            <div><span className="review-label">Application No.</span><strong>{submitted.application_no}</strong></div>
            <div><span className="review-label">Dealer</span><strong>{submitted.dealer_name}</strong></div>
            <div><span className="review-label">Status</span><strong>Submitted</strong></div>
          </div>
          <button className="admin-btn" onClick={() => {
            setStep(1); setDealer(null); setCustomer({ ...emptyCustomer }); setVehicleLoan({ ...emptyVehicle });
            setKyc({ documents:{} }); setGuarantorData({ guarantors:[{ ...emptyGuarantor }] }); setSubmitted(null);
          }}>+ Create another application</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <div className="admin-eyebrow">DEALER BEHALF ENTRY</div>
          <h1>Create Loan Application</h1>
          <p>CHFPL admin selected dealer ke behalf par dealer jaisa complete loan application enter karega.</p>
        </div>
      </div>

      {error && <div className="admin-alert error">⚠ {error}</div>}
      {loadingMasters && <div className="admin-alert">Dealer aur vehicle master load ho raha hai…</div>}

      <div className="admin-card">
        <StepIndicator steps={STEPS} currentStep={step} />

        {step === 1 && (
          <div className="form-step">
            <h3>Select dealer</h3>
            <p className="step-note">Yahan CHFPL khud dealer select karega. Application usi dealer ke naam se create hogi.</p>
            <div className="form-grid">
              <div className="form-field form-field-full">
                <label>Dealer *</label>
                <select value={dealer?.id || ''} onChange={(e) => {
                  const selected = dealers.find((d) => String(d.id) === String(e.target.value));
                  setDealer(selected || null);
                }} disabled={loadingMasters}>
                  <option value="">Select dealer</option>
                  {dealers.map((d) => (
                    <option key={d.id} value={d.id}>{d.dealer_name}{d.dealer_code ? ' — ' + d.dealer_code : ''}</option>
                  ))}
                </select>
                {errors.dealer && <span className="field-error">{errors.dealer}</span>}
              </div>
            </div>
          </div>
        )}

        {step === 2 && <StepCustomerDetails data={customer} onChange={setCustomer} errors={errors} />}

        {step === 3 && (
          <div className="form-step">
            <h3>Vehicle and loan details</h3>
            <div className="form-grid">
              <div className="form-field form-field-full">
                <label>Vehicle model *</label>
                <select value={vehicleLoan.vehicle_model_id} onChange={(e) => selectModel(e.target.value)}>
                  <option value="">Select model</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.model_name}{m.grd_code ? ' — ' + m.grd_code : ''}</option>
                  ))}
                </select>
                {errors.vehicle_model_id && <span className="field-error">{errors.vehicle_model_id}</span>}
              </div>
              <div className="form-field">
                <label>Vehicle price *</label>
                <input type="number" min="0" value={vehicleLoan.vehicle_price} onChange={(e) => setVehicle('vehicle_price', e.target.value)} />
                {errors.vehicle_price && <span className="field-error">{errors.vehicle_price}</span>}
              </div>
              <div className="form-field">
                <label>Down payment *</label>
                <input type="number" min="0" value={vehicleLoan.down_payment} onChange={(e) => setVehicle('down_payment', e.target.value)} />
                {errors.down_payment && <span className="field-error">{errors.down_payment}</span>}
              </div>
              <div className="form-field">
                <label>Loan amount requested</label>
                <input readOnly className="readonly-input" value={vehicleLoan.loan_amount_requested || 0} />
              </div>
              <div className="form-field">
                <label>Physical register / ledger serial no. (optional)</label>
                <input maxLength="50" value={vehicleLoan.physical_register_serial_no} onChange={(e) => setVehicle('physical_register_serial_no', e.target.value.toUpperCase())} placeholder="e.g. REG-00125" />
              </div>
              <div className="form-field">
                <label>Tenure (months) *</label>
                <select value={vehicleLoan.tenure_months} onChange={(e) => setVehicle('tenure_months', e.target.value)}>
                  <option value="">Select tenure</option>
                  {TENURE_OPTIONS.map((t) => <option key={t} value={t}>{t} months</option>)}
                </select>
                {errors.tenure_months && <span className="field-error">{errors.tenure_months}</span>}
              </div>
            </div>
          </div>
        )}

        {step === 4 && <StepKycUpload data={kyc} onChange={setKyc} errors={errors} />}
        {step === 5 && <StepGuarantor data={guarantorData} onChange={setGuarantorData} errors={errors} />}
        {step === 6 && <Review dealer={dealer} customer={customer} vehicle={vehicleLoan} kyc={kyc} guarantors={guarantorData.guarantors} models={models} />}

        <div className="form-nav">
          {step > 1 && <button type="button" className="secondary-button" onClick={back} disabled={submitting}>Back</button>}
          {step < 6 && <button type="button" className="primary-button" onClick={next} disabled={loadingMasters && step === 1}>Next</button>}
          {step === 6 && <button type="button" className="admin-btn" onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : '✓ Submit application'}</button>}
        </div>
      </div>
    </div>
  );
}
