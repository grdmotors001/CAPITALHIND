import { useEffect, useMemo, useState } from 'react';
import { addReceipt, listReceiptLoans, listReceipts } from './api';
import { printReceipt, printCashReceipt } from './printUtils';

function money(v){return `₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`}
function today(){return new Date().toISOString().slice(0,10)}

export default function Receipts(){
  const [loans,setLoans]=useState([]),[receipts,setReceipts]=useState([]),[selectedId,setSelectedId]=useState('');
  const [form,setForm]=useState({amount:'',receipt_date:today(),payment_mode:'cash',reference_no:'',remarks:''});
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  async function load(){setLoading(true);setError('');try{const [l,r]=await Promise.all([listReceiptLoans(),listReceipts()]);setLoans(l.loans||[]);setReceipts(r.receipts||[])}catch(e){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);
  const selected=useMemo(()=>loans.find(l=>String(l.id)===String(selectedId))||null,[loans,selectedId]);
  function selectLoan(id){setSelectedId(id);setForm(f=>({...f,amount:'',reference_no:'',remarks:''}));setMessage('');setError('')}
  async function save(e){e.preventDefault();if(!selected)return;setSaving(true);setError('');setMessage('');try{const d=await addReceipt({loan_application_id:selected.id,...form});setMessage(d.message||'Receipt saved.');setForm(f=>({...f,amount:'',reference_no:'',remarks:''}));await load()}catch(e){setError(e.message)}finally{setSaving(false)}}
  return <div className="admin-page"><div className="admin-page-head"><div><div className="admin-eyebrow">COLLECTION</div><h1>Receipts</h1><p>Loan select karke amount aur date enter karein. Vehicle aur customer details automatically fetch hoti hain.</p></div><div className="admin-count">{receipts.length} receipt{receipts.length===1?'':'s'}</div></div>
    {error&&<div className="admin-alert error">⚠ {error}</div>}{message&&<div className="admin-alert success">✓ {message}</div>}
    <section className="admin-card create-card"><div className="admin-card-title"><div><h2>New Receipt</h2><span>Loan number dropdown se select karein</span></div></div><form className="staff-form" onSubmit={save}><div className="form-grid">
      <div><label>Loan No.</label><select required value={selectedId} onChange={e=>selectLoan(e.target.value)}><option value="">— Select Loan —</option>{loans.map(l=><option key={l.id} value={l.id}>{l.loan_account_no||l.application_no} · {l.customer_name||'Customer'}</option>)}</select></div>
      <div><label>Receipt Date</label><input type="date" required value={form.receipt_date} onChange={e=>setForm({...form,receipt_date:e.target.value})}/></div>
      <div><label>Amount</label><input type="number" min="0.01" step="0.01" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div>
      <div><label>Payment Mode</label><select value={form.payment_mode} onChange={e=>setForm({...form,payment_mode:e.target.value})}><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank</option><option value="cheque">Cheque</option><option value="other">Other</option></select></div>
      {selected&&<><div><label>Vehicle No.</label><input value={selected.vehicle_no||'—'} readOnly/></div><div><label>Customer Name</label><input value={selected.customer_name||'—'} readOnly/></div><div><label>Customer Mobile</label><input value={selected.customer_phone||'—'} readOnly/></div><div><label>Loan Amount</label><input value={money(selected.loan_amount_requested)} readOnly/></div></>}
      <div><label>Reference No. <span>(optional)</span></label><input value={form.reference_no} onChange={e=>setForm({...form,reference_no:e.target.value})}/></div>
      <div className="form-field-full"><label>Remarks <span>(optional)</span></label><textarea rows="2" value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})}/></div>
    </div><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="admin-btn" disabled={saving||!selected}>{saving?'Saving…':'✓ Save Receipt'}</button></div></form></section>
    <section className="admin-card staff-list-card"><div className="admin-card-title"><div><h2>Receipt Register</h2><span>Latest receipts</span></div><button className="admin-btn secondary" onClick={load}>↻ Refresh</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Receipt</th><th>Date</th><th>Loan</th><th>Customer</th><th>Vehicle</th><th>Amount</th><th>Mode</th><th>Print</th></tr></thead><tbody>{loading?<tr><td colSpan="8" className="empty-cell">Loading…</td></tr>:receipts.map(r=><tr key={r.id}><td><strong>{r.receipt_no}</strong></td><td>{r.receipt_date}</td><td>{r.loan_applications?.loan_account_no||r.loan_applications?.application_no||'—'}</td><td>{r.loan_applications?.customer_profiles?.full_name||'—'}</td><td>{r.loan_applications?.vehicle_no||'—'}</td><td>{money(r.amount)}</td><td>{r.payment_mode}</td><td><button className="admin-btn small" onClick={()=>r.payment_mode==='cash'?printCashReceipt(r):printReceipt(r)}>🖨 Print</button></td></tr>)}{!loading&&!receipts.length&&<tr><td colSpan="8" className="empty-cell">No receipts yet.</td></tr>}</tbody></table></div></section>
  </div>
}
