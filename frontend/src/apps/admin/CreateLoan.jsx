import { useEffect, useState } from 'react';
import { listApprovedLoans, createLoan } from './api';

const today = () => new Date().toISOString().slice(0, 10);

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—';
}

const emptyEntry = {
  vehicle_no: '',
  chassis_no: '',
  engine_no: '',
  ledger_no: '',
  file_no: '',
  file_record_no: '',
  cheques_qty: 0,
  case_status: 'active',
  disbursement_date: today(),
  disbursed_amount: '',
  interest_rate: '',
  first_emi_date: '',
  remarks: '',
};

export default function CreateLoan() {
  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [entry, setEntry] = useState(emptyEntry);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await listApprovedLoans();
      setApplications(data.applications || []);
      setSelectedId((current) =>
        current && (data.applications || []).some((a) => String(a.id) === String(current)) ? current : ''
      );
    } catch (err) {
      setError(err.message || 'Could not load approved loan applications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const selected = applications.find((a) => String(a.id) === String(selectedId)) || null;

  function selectApplication(id) {
    const app = applications.find((a) => String(a.id) === String(id));
    setSelectedId(id);
    setMessage('');
    setError('');
    setEntry({
      ...emptyEntry,
      disbursement_date: today(),
      disbursed_amount: app?.loan_amount_requested ?? '',
      interest_rate: app?.interest_rate ?? '',
      first_emi_date: '',
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!selected) {
      setError('Approved loan application select karein.');
      return;
    }
    if (!entry.first_emi_date) {
      setError('First EMI Date select karein.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data = await createLoan({
        loan_application_id: selected.id,
        ...entry,
      });
      setMessage(
        `${data.message || 'Loan activated and EMI schedule started.'} EMI: ${money(data.emi_amount)} × ${data.emi_count || selected.tenure_months}.`
      );
      setSelectedId('');
      setEntry(emptyEntry);
      await load();
    } catch (err) {
      setError(err.message || 'Could not activate loan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <div className="admin-eyebrow">LOAN CREATION</div>
          <h1>Create Loan</h1>
          <p>Approved Loan Application select karein. Application ki common details automatically use hongi; yahan sirf remaining loan-file, disbursement aur EMI details bharni hain.</p>
        </div>
        <div className="admin-count">{applications.length} approved</div>
      </div>

      {message && <div className="admin-alert success">✓ {message}</div>}
      {error && <div className="admin-alert error">⚠ {error}</div>}

      <section className="admin-card staff-list-card">
        <div className="admin-card-title">
          <div>
            <h2>Approved Loan</h2>
            <span>Loan Application dropdown se approved application select karein.</span>
          </div>
          <button type="button" className="admin-btn secondary" onClick={load} disabled={loading}>↻ Refresh</button>
        </div>

        <form className="staff-form" onSubmit={handleCreate}>
          <div className="form-grid">
            <div className="form-field-full">
              <label>Loan Application *</label>
              <select required value={selectedId} onChange={(e) => selectApplication(e.target.value)} disabled={loading}>
                <option value="">{loading ? 'Loading approved applications…' : 'Select Approved Loan Application'}</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.application_no} — {app.customer?.full_name || 'Customer'} — {app.dealer_name || 'Dealer'} — {money(app.loan_amount_requested)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selected && (
            <>
              <div className="admin-alert" style={{ marginTop: 16 }}>
                <strong>{selected.application_no}</strong> selected. Customer/dealer/model/loan amount/tenure jaise common application details dobara enter nahi karni hain.
              </div>

              <h2 style={{ marginTop: 22 }}>Vehicle & File Details</h2>
              <div className="form-grid">
                <div><label>Vehicle No.</label><input value={entry.vehicle_no} onChange={e=>setEntry({...entry,vehicle_no:e.target.value.toUpperCase()})} placeholder="Vehicle number" /></div>
                <div><label>Chassis No.</label><input value={entry.chassis_no} onChange={e=>setEntry({...entry,chassis_no:e.target.value.toUpperCase()})} placeholder="Chassis number" /></div>
                <div><label>Engine No.</label><input value={entry.engine_no} onChange={e=>setEntry({...entry,engine_no:e.target.value.toUpperCase()})} placeholder="Engine number" /></div>
                <div><label>Ledger / Physical Register No.</label><input value={entry.ledger_no} onChange={e=>setEntry({...entry,ledger_no:e.target.value.toUpperCase()})} placeholder="Ledger / register no." /></div>
                <div><label>File No.</label><input value={entry.file_no} onChange={e=>setEntry({...entry,file_no:e.target.value})} placeholder="File number" /></div>
                <div><label>File Record No.</label><input value={entry.file_record_no} onChange={e=>setEntry({...entry,file_record_no:e.target.value})} placeholder="File record number" /></div>
                <div><label>Cheques Qty</label><input type="number" min="0" value={entry.cheques_qty} onChange={e=>setEntry({...entry,cheques_qty:e.target.value})} /></div>
              </div>

              <h2 style={{ marginTop: 22 }}>Loan & Disbursement</h2>
              <div className="form-grid">
                <div><label>Loan Stage</label><input value="Disbursed" readOnly /></div>
                <div><label>Case Status</label><select value={entry.case_status} onChange={e=>setEntry({...entry,case_status:e.target.value})}><option value="active">Active</option><option value="suit_filed">Suit Filed</option><option value="vehicle_seized">Vehicle Seized</option><option value="closed">Closed</option><option value="written_off">Written Off</option></select></div>
                <div><label>Disbursement Date *</label><input required type="date" value={entry.disbursement_date} onChange={e=>setEntry({...entry,disbursement_date:e.target.value})} /></div>
                <div><label>Disbursed Amount *</label><input required type="number" min="1" value={entry.disbursed_amount} onChange={e=>setEntry({...entry,disbursed_amount:e.target.value})} /></div>
                <div><label>Annual Interest Rate (%) *</label><input required type="number" min="0" step="0.01" value={entry.interest_rate} onChange={e=>setEntry({...entry,interest_rate:e.target.value})} placeholder="e.g. 18" /></div>
                <div><label>First EMI Date *</label><input required type="date" value={entry.first_emi_date} onChange={e=>setEntry({...entry,first_emi_date:e.target.value})} /></div>
                <div className="form-field-full"><label>Loan Account No.</label><input value="Auto generate on activation" readOnly /></div>
                <div className="form-field-full"><label>Remarks</label><textarea rows="3" value={entry.remarks} onChange={e=>setEntry({...entry,remarks:e.target.value})} placeholder="Remarks" /></div>
              </div>

              <div className="admin-alert" style={{ marginTop: 16 }}>
                <strong>EMI:</strong> Loan activate hone par EMI schedule automatically create hoga. Interest rate aur First EMI Date yahin se schedule ke liye use honge.
              </div>

              <button type="submit" className="admin-btn" disabled={saving}>
                {saving ? 'Activating & Starting EMI…' : '✓ Create Loan & Start EMI'}
              </button>
            </>
          )}

          {!selected && !loading && applications.length === 0 && (
            <div className="empty-cell" style={{ marginTop: 18 }}>
              Koi approved loan ready nahi hai.
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
