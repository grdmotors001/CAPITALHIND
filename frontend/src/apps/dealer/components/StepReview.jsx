import { MOCK_VEHICLE_MODELS, KYC_DOC_TYPES } from '../mockData';

export default function StepReview({ formData }) {
  const { customer = {}, vehicleLoan = {}, kyc = {}, guarantors = [] } = formData;
  const model = MOCK_VEHICLE_MODELS.find((m) => String(m.id) === String(vehicleLoan.vehicle_model_id));
  const docs = kyc.documents || {};

  return (
    <div className="form-step">
      <h3>Review and submit</h3>

      <div className="review-section">
        <h4>Customer</h4>
        <div className="review-grid">
          <div><span className="review-label">Name</span>{customer.full_name}</div>
          <div><span className="review-label">Phone</span>{customer.phone}</div>
          <div><span className="review-label">PAN</span>{customer.pan}</div>
          <div><span className="review-label">City</span>{customer.city}</div>
        </div>
      </div>

      <div className="review-section">
        <h4>Vehicle and loan</h4>
        <div className="review-grid">
          <div><span className="review-label">Model</span>{model ? model.model_name : '—'}</div>
          <div><span className="review-label">Vehicle price</span>\u20b9{Number(vehicleLoan.vehicle_price || 0).toLocaleString('en-IN')}</div>
          <div><span className="review-label">Down payment</span>\u20b9{Number(vehicleLoan.down_payment || 0).toLocaleString('en-IN')}</div>
          <div><span className="review-label">Loan amount</span>\u20b9{Number(vehicleLoan.loan_amount_requested || 0).toLocaleString('en-IN')}</div>
          <div><span className="review-label">Tenure</span>{vehicleLoan.tenure_months} months</div>
          <div><span className="review-label">Physical register / ledger</span>{vehicleLoan.physical_register_serial_no || '—'}</div>
        </div>
      </div>

      <div className="review-section">
        <h4>KYC documents</h4>
        <ul className="review-doc-list">
          {KYC_DOC_TYPES.filter((t) => docs[t.value]).map((t) => (
            <li key={t.value}>{t.label} — {docs[t.value].file_name}</li>
          ))}
          {Object.keys(docs).length === 0 && <li className="review-empty">No documents uploaded</li>}
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

      <p className="step-note">
        Submit karne par application_no generate hoga aur status "submitted" ho jayega
        (loan_applications.application_status). FI aur approval flow uske baad start hoga.
      </p>
    </div>
  );
}
