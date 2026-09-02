import { useEffect, useMemo, useState } from 'react';
import { addReceipt, createLoan, listApprovedLoans } from './api';

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : '—';
}

export default function CreateLoan() {
  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [entry, setEntry] = useState({ vehicle_no:'', chassis_no:'', ledger_no:'', file_no:'', cheques_qty:0, file_record_no:'', case_status:'active', disbursement_date:'', disbursed_amount:'' });
  const [receipt, setReceipt] = useState({ receipt_no:'', receipt_date:new Date().toISOString().slice(0,10), amount:'', payment_mode:'cash', reference_no:'', remarks:'' });
  const [receiptMessage, setReceiptMessage] = useState('');
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
      setSelectedId((current) => current && (data.applications || []).some((a) => a.id === current) ? current : '');
    } catch (err) {
      setError(err.message || 'Could not load approved loans.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const selected = useMemo(
    () => applications.find((a) => a.id === selectedId) || null,
    [applications, selectedId]
  );

  function selectApplication(id) {
    setSelectedId(id);
    setAccountNo('');
    setEntry({ vehicle_no:'', chassis_no:'', ledger_no: applications.find(a=>a.id===id)?.physical_register_serial_no || '', file_no:'', cheques_qty:0, file_record_no:'', case_status:'active', disbursement_date:'', disbursed_amount:'' });
    setReceipt({ receipt_no:'', receipt_date:new Date().toISOString().slice(0,10), amount:'', payment_mode:'cash', reference_no:'', remarks:'' });
    setReceiptMessage('');
    setMessage('');
    setError('');
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data = await createLoan({
        loan_application_id: selected.id,
        ...(accountNo.trim() ? { loan_account_no: accountNo.trim() } : {}),
        ...entry,
      });
      setMessage(data.message || 'Loan created successfully.');
      await load();
      setSelectedId('');
      setAccountNo('');
    } catch (err) {
      setError(err.message || 'Could not create loan.');
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
          <p>Approved loan application se data load karke loan account create karein.</p>
        </div>
        <div className="admin-count">{applications.length} approved</div>
      </div>

      {message && <div className="admin-alert success">✓ {message}</div>}
      {error && <div className="admin-alert error">⚠ {error}</div>}

      <section className="admin-card staff-list-card">
        <div className="admin-card-title">
          <div><h2>Approved Loans</h2><span>Sirf DO-approved applications yahan available hain.</span></div>
          <button className="admin-btn secondary" onClick={load} disabled={loading}>↻ Refresh</button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Application</th><th>Customer</th><th>Dealer</th><th>Vehicle</th><th>Loan Amount</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="empty-cell">Loading…</td></tr>
              ) : applications.length === 0 ? (
                <tr><td colSpan="7" className="empty-cell">No approved loans ready for creation.</td></tr>
              ) : applications.map((app) => (
                <tr key={app.id}>
                  <td><strong>{app.application_no}</strong><div className="muted">{app.physical_register_serial_no || 'No register no.'}</div></td>
                  <td className="contact-text"><div>{app.customer?.full_name || '—'}</div><div className="muted">{app.customer?.phone || ''}</div></td>
                  <td>{app.dealer_name || '—'}</td>
                  <td>{app.vehicle_model || '—'}</td>
                  <td>{money(app.loan_amount_requested)}<div className="muted">{app.tenure_months || '—'} months</div></td>
                  <td><span className="role-pill field_executive">Approved</span></td>
                  <td className="actions-cell">
                    <button className="admin-btn small" onClick={() => selectApplication(app.id)}>Create Loan</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <section className="admin-card staff-list-card" style={{ marginTop: 20 }}>
          <div className="admin-card-title">
            <div><h2>Loan Details</h2><span>Application data automatically loaded from approved loan.</span></div>
            <span>{selected.application_no}</span>
          </div>
          <form className="staff-form" onSubmit={handleCreate}>
            <div className="form-grid">
              <div><label>Application No.</label><input value={selected.application_no || ''} readOnly /></div>
              <div><label>Customer Name</label><input value={selected.customer?.full_name || ''} readOnly /></div>
              <div><label>Phone</label><input value={selected.customer?.phone || ''} readOnly /></div>
              <div><label>Dealer</label><input value={selected.dealer_name || ''} readOnly /></div>
              <div><label>Vehicle Model</label><input value={selected.vehicle_model || ''} readOnly /></div>
              <div><label>Approved Loan Amount</label><input value={money(selected.loan_amount_requested)} readOnly /></div>
              <div><label>Tenure</label><input value={selected.tenure_months ? `${selected.tenure_months} months` : ''} readOnly /></div>
              <div><label>Approval Valid Until</label><input value={selected.approval_valid_until || '—'} readOnly /></div>
              <div><label>Vehicle No.</label><input value={entry.vehicle_no} onChange={e=>setEntry({...entry,vehicle_no:e.target.value.toUpperCase()})} placeholder="e.g. RJ14AB1234" /></div>
              <div><label>Chassis No.</label><input value={entry.chassis_no} onChange={e=>setEntry({...entry,chassis_no:e.target.value.toUpperCase()})} /></div>
              <div><label>Ledger / Physical Register No.</label><input value={entry.ledger_no} onChange={e=>setEntry({...entry,ledger_no:e.target.value.toUpperCase()})} placeholder="Tele Caller assignment ke liye" /></div>
              <div><label>File No.</label><input value={entry.file_no} onChange={e=>setEntry({...entry,file_no:e.target.value})} /></div>
              <div><label>File Record No.</label><input value={entry.file_record_no} onChange={e=>setEntry({...entry,file_record_no:e.target.value})} /></div>
              <div><label>Cheques Qty</label><input type="number" min="0" value={entry.cheques_qty} onChange={e=>setEntry({...entry,cheques_qty:e.target.value})} /></div>
              <div><label>Case Status</label><select value={entry.case_status} onChange={e=>setEntry({...entry,case_status:e.target.value})}><option value="active">Active</option><option value="suit_filed">Suit Filed</option><option value="vehicle_seized">Vehicle Seized</option><option value="closed">Closed</option><option value="written_off">Written Off</option></select></div>
              <div><label>Disbursement Date</label><input type="date" value={entry.disbursement_date} onChange={e=>setEntry({...entry,disbursement_date:e.target.value})} /></div>
              <div><label>Disbursed Amount</label><input type="number" min="0" value={entry.disbursed_amount} onChange={e=>setEntry({...entry,disbursed_amount:e.target.value})} /></div>
              <div>
                <label>Loan Account No. <span>(optional — blank = auto generate)</span></label>
                <input value={accountNo} onChange={(e) => setAccountNo(e.target.value)} placeholder="Auto generate" />
              </div>
            </div>
            <div className="admin-alert" style={{ marginTop: 14 }}>
              Create karne par application status <strong>Approved → Sanctioned</strong> ho jayega aur Loan Account No. save ho jayega.
            </div>
            <button type="submit" className="admin-btn" disabled={saving}>
              {saving ? 'Creating…' : '✓ Create Loan Account'}
            </button>
          </form>
          <div className="admin-alert" style={{ marginTop: 18 }}>Loan create hone ke baad manual receipt entry neeche se ki ja sakti hai.</div>
          <form className="staff-form" onSubmit={async (e)=>{e.preventDefault();setReceiptMessage('');try{const d=await addReceipt({loan_application_id:selected.id,...receipt});setReceiptMessage(d.message||'Receipt saved.');setReceipt({receipt_no:'',receipt_date:new Date().toISOString().slice(0,10),amount:'',payment_mode:'cash',reference_no:'',remarks:''});}catch(err){setReceiptMessage(err.message||'Receipt save failed.')}}}>
            <h3>Manual Receipt Entry</h3><div className="form-grid"><div><label>Receipt No.</label><input value={receipt.receipt_no} onChange={e=>setReceipt({...receipt,receipt_no:e.target.value})} required /></div><div><label>Receipt Date</label><input type="date" value={receipt.receipt_date} onChange={e=>setReceipt({...receipt,receipt_date:e.target.value})} required /></div><div><label>Amount</label><input type="number" min="1" value={receipt.amount} onChange={e=>setReceipt({...receipt,amount:e.target.value})} required /></div><div><label>Payment Mode</label><select value={receipt.payment_mode} onChange={e=>setReceipt({...receipt,payment_mode:e.target.value})}><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank</option><option value="cheque">Cheque</option><option value="other">Other</option></select></div><div><label>Reference No.</label><input value={receipt.reference_no} onChange={e=>setReceipt({...receipt,reference_no:e.target.value})} /></div><div className="form-field-full"><label>Remarks</label><textarea rows="2" value={receipt.remarks} onChange={e=>setReceipt({...receipt,remarks:e.target.value})}/></div></div><button className="admin-btn secondary">Save Receipt</button>{receiptMessage&&<span style={{marginLeft:10}}>{receiptMessage}</span>}</form>
        </section>
      )}
    </div>
  );
}
