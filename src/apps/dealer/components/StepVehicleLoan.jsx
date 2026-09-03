import { useEffect, useState } from 'react';
import { MOCK_VEHICLE_MODELS } from '../mockData';
import { fetchVehicleModels } from '../api';

// Maps to: loan_applications table
// (vehicle_model_id, vehicle_price, down_payment, loan_amount_requested, tenure_months)

const TENURE_OPTIONS = [12, 18, 24, 30, 36, 48];

export default function StepVehicleLoan({ data, onChange, errors }) {
  const [models, setModels] = useState(MOCK_VEHICLE_MODELS);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    fetchVehicleModels()
      .then(setModels)
      .catch(() => {
        // API not wired yet / failed — fall back to mock list so the form stays usable
        setLoadError('Live vehicle list load nahi hui, showing sample models.');
        setModels(MOCK_VEHICLE_MODELS);
      });
  }, []);

  function set(field, value) {
    const next = { ...data, [field]: value };

    // keep loan_amount_requested in sync = vehicle_price - down_payment
    const price = parseFloat(field === 'vehicle_price' ? value : next.vehicle_price) || 0;
    const down = parseFloat(field === 'down_payment' ? value : next.down_payment) || 0;
    if (field === 'vehicle_price' || field === 'down_payment' || field === 'vehicle_model_id') {
      next.loan_amount_requested = Math.max(price - down, 0);
    }

    onChange(next);
  }

  function selectModel(modelId) {
    const model = models.find((m) => String(m.id) === String(modelId));
    const next = {
      ...data,
      vehicle_model_id: modelId,
      vehicle_price: model ? model.ex_showroom_price : data.vehicle_price,
    };
    const price = parseFloat(next.vehicle_price) || 0;
    const down = parseFloat(next.down_payment) || 0;
    next.loan_amount_requested = Math.max(price - down, 0);
    onChange(next);
  }

  return (
    <div className="form-step">
      <h3>Vehicle and loan details</h3>
      {loadError && <p className="field-hint">{loadError}</p>}

      <div className="form-grid">
        <div className="form-field form-field-full">
          <label>Vehicle model *</label>
          <select value={data.vehicle_model_id || ''} onChange={(e) => selectModel(e.target.value)}>
            <option value="">Select model</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.model_name} ({m.vehicle_type}) — \u20b9{Number(m.ex_showroom_price).toLocaleString('en-IN')}
              </option>
            ))}
          </select>
          {errors.vehicle_model_id && <span className="field-error">{errors.vehicle_model_id}</span>}
        </div>

        <div className="form-field">
          <label>Vehicle price *</label>
          <input
            type="number"
            value={data.vehicle_price || ''}
            onChange={(e) => set('vehicle_price', e.target.value)}
          />
          {errors.vehicle_price && <span className="field-error">{errors.vehicle_price}</span>}
        </div>

        <div className="form-field">
          <label>Down payment *</label>
          <input
            type="number"
            value={data.down_payment || ''}
            onChange={(e) => set('down_payment', e.target.value)}
          />
          {errors.down_payment && <span className="field-error">{errors.down_payment}</span>}
        </div>

        <div className="form-field">
          <label>Loan amount requested</label>
          <input value={data.loan_amount_requested ?? 0} readOnly className="readonly-input" />
          <span className="field-hint">Auto = vehicle price − down payment</span>
        </div>

        <div className="form-field">
          <label>Physical register / ledger serial no. (optional)</label>
          <input
            value={data.physical_register_serial_no || ''}
            onChange={(e) => set('physical_register_serial_no', e.target.value.toUpperCase())}
            maxLength={50}
            placeholder="e.g. REG-00125"
          />
          <span className="field-hint">Loan entry ke time Admin ledger / register no. enter karega; Team Leader ise Tele Caller ko assign karega.</span>
          {errors.physical_register_serial_no && <span className="field-error">{errors.physical_register_serial_no}</span>}
        </div>

        <div className="form-field">
          <label>Tenure (months) *</label>
          <select value={data.tenure_months || ''} onChange={(e) => set('tenure_months', e.target.value)}>
            <option value="">Select tenure</option>
            {TENURE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t} months</option>
            ))}
          </select>
          {errors.tenure_months && <span className="field-error">{errors.tenure_months}</span>}
        </div>
      </div>
    </div>
  );
}
