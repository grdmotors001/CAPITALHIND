// Maps to: customer_profiles table

const GENDER_OPTIONS = ['male', 'female', 'other'];

export default function StepCustomerDetails({ data, onChange, errors }) {
  function set(field, value) {
    onChange({ ...data, [field]: value });
  }

  return (
    <div className="form-step">
      <h3>Customer details</h3>

      <div className="form-grid">
        <div className="form-field">
          <label>Full name *</label>
          <input
            value={data.full_name || ''}
            onChange={(e) => set('full_name', e.target.value)}
            placeholder="As per PAN / Aadhaar"
          />
          {errors.full_name && <span className="field-error">{errors.full_name}</span>}
        </div>

        <div className="form-field">
          <label>Phone number *</label>
          <input
            value={data.phone || ''}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="10-digit mobile number"
          />
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </div>

        <div className="form-field">
          <label>Email</label>
          <input
            value={data.email || ''}
            onChange={(e) => set('email', e.target.value)}
            placeholder="name@example.com"
          />
        </div>

        <div className="form-field">
          <label>Date of birth *</label>
          <input
            type="date"
            value={data.dob || ''}
            onChange={(e) => set('dob', e.target.value)}
          />
          {errors.dob && <span className="field-error">{errors.dob}</span>}
        </div>

        <div className="form-field">
          <label>Gender</label>
          <select value={data.gender || ''} onChange={(e) => set('gender', e.target.value)}>
            <option value="">Select</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>PAN *</label>
          <input
            value={data.pan || ''}
            onChange={(e) => set('pan', e.target.value.toUpperCase())}
            placeholder="ABCDE1234F"
            maxLength={10}
          />
          {errors.pan && <span className="field-error">{errors.pan}</span>}
        </div>

        <div className="form-field">
          <label>Aadhaar number *</label>
          <input
            value={data.aadhaar || ''}
            onChange={(e) => set('aadhaar', e.target.value)}
            placeholder="12-digit Aadhaar number"
            maxLength={12}
          />
          {errors.aadhaar && <span className="field-error">{errors.aadhaar}</span>}
          <span className="field-hint">Only last 4 digits are stored; full number goes to KYC document.</span>
        </div>

        <div className="form-field">
          <label>Occupation</label>
          <input
            value={data.occupation || ''}
            onChange={(e) => set('occupation', e.target.value)}
            placeholder="e.g. Driver, Shop owner"
          />
        </div>

        <div className="form-field">
          <label>Monthly income</label>
          <input
            type="number"
            value={data.monthly_income || ''}
            onChange={(e) => set('monthly_income', e.target.value)}
            placeholder="\u20b9"
          />
        </div>

        <div className="form-field">
          <label>Pincode *</label>
          <input
            value={data.pincode || ''}
            onChange={(e) => set('pincode', e.target.value)}
            maxLength={6}
          />
          {errors.pincode && <span className="field-error">{errors.pincode}</span>}
        </div>

        <div className="form-field">
          <label>City</label>
          <input value={data.city || ''} onChange={(e) => set('city', e.target.value)} />
        </div>

        <div className="form-field">
          <label>State</label>
          <input value={data.state || ''} onChange={(e) => set('state', e.target.value)} />
        </div>

        <div className="form-field form-field-full">
          <label>Address *</label>
          <textarea
            value={data.address || ''}
            onChange={(e) => set('address', e.target.value)}
            rows={2}
          />
          {errors.address && <span className="field-error">{errors.address}</span>}
        </div>
      </div>
    </div>
  );
}
