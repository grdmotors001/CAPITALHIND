// Maps to: guarantor_details table (one row per guarantor, linked to loan_application_id)

function emptyGuarantor() {
  return {
    full_name: '',
    relation_with_customer: '',
    phone: '',
    address: '',
    pan: '',
    aadhaar_masked: '',
  };
}

export default function StepGuarantor({ data, onChange, errors }) {
  const guarantors = data.guarantors && data.guarantors.length ? data.guarantors : [emptyGuarantor()];

  function updateGuarantor(idx, field, value) {
    const next = guarantors.map((g, i) => (i === idx ? { ...g, [field]: value } : g));
    onChange({ ...data, guarantors: next });
  }

  function addGuarantor() {
    onChange({ ...data, guarantors: [...guarantors, emptyGuarantor()] });
  }

  function removeGuarantor(idx) {
    onChange({ ...data, guarantors: guarantors.filter((_, i) => i !== idx) });
  }

  return (
    <div className="form-step">
      <h3>Guarantor details</h3>

      {guarantors.map((g, idx) => (
        <div key={idx} className="guarantor-block">
          <div className="guarantor-block-header">
            <span>Guarantor {idx + 1}</span>
            {guarantors.length > 1 && (
              <button type="button" className="link-button" onClick={() => removeGuarantor(idx)}>
                Remove
              </button>
            )}
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Full name *</label>
              <input
                value={g.full_name}
                onChange={(e) => updateGuarantor(idx, 'full_name', e.target.value)}
              />
              {errors[`guarantor_${idx}_full_name`] && (
                <span className="field-error">{errors[`guarantor_${idx}_full_name`]}</span>
              )}
            </div>

            <div className="form-field">
              <label>Relation with customer</label>
              <input
                value={g.relation_with_customer}
                onChange={(e) => updateGuarantor(idx, 'relation_with_customer', e.target.value)}
                placeholder="e.g. Father, Spouse, Friend"
              />
            </div>

            <div className="form-field">
              <label>Phone *</label>
              <input
                value={g.phone}
                onChange={(e) => updateGuarantor(idx, 'phone', e.target.value)}
              />
              {errors[`guarantor_${idx}_phone`] && (
                <span className="field-error">{errors[`guarantor_${idx}_phone`]}</span>
              )}
            </div>

            <div className="form-field">
              <label>PAN</label>
              <input
                value={g.pan}
                onChange={(e) => updateGuarantor(idx, 'pan', e.target.value.toUpperCase())}
                maxLength={10}
              />
            </div>

            <div className="form-field form-field-full">
              <label>Address</label>
              <textarea
                rows={2}
                value={g.address}
                onChange={(e) => updateGuarantor(idx, 'address', e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="secondary-button" onClick={addGuarantor}>
        + Add another guarantor
      </button>
    </div>
  );
}
