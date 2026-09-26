import { useEffect, useMemo, useState } from 'react';
import { getPaymentReceivable } from './api';

const money=(v)=>'₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2});

export default function PaymentReceivable(){
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[q,setQ]=useState('');
  async function load(){setLoading(true);setError('');try{setData(await getPaymentReceivable())}catch(e){setError(e.message||'Could not load payment receivable')}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);
  const loans=useMemo(()=>{
    const term=q.trim().toLowerCase(); if(!term)return data?.loans||[];
    return (data?.loans||[]).filter(x=>[x.loan_account_no,x.application_no,x.customer_name,x.customer_phone,x.dealer_name].some(v=>String(v||'').toLowerCase().includes(term)));
  },[data,q]);
  return <div className="admin-page">
    <div className="admin-page-head"><div><div className="admin-eyebrow">COLLECTION</div><h1>Payment Receivable</h1><p>EMI schedule ke basis par total outstanding, overdue aur aaj ka due.</p></div><button className="admin-btn" onClick={load} disabled={loading}>↻ Refresh</button></div>
    {error&&<div className="admin-alert error">⚠ {error}</div>}
    <div className="dealer-kpis" style={{marginBottom:16}}>
      <div className="dealer-kpi"><span>Total Outstanding</span><strong>{loading?'—':money(data?.totals?.outstanding)}</strong><small>All active EMI balances</small></div>
      <div className="dealer-kpi"><span>Overdue</span><strong>{loading?'—':money(data?.totals?.overdue)}</strong><small>Past due date</small></div>
      <div className="dealer-kpi"><span>Due Today</span><strong>{loading?'—':money(data?.totals?.due_today)}</strong><small>{data?.today||'—'}</small></div>
      <div className="dealer-kpi"><span>Receipts Recorded</span><strong>{loading?'—':money(data?.totals?.received)}</strong><small>Receipt entries</small></div>
    </div>
    <section className="admin-card staff-list-card"><div className="admin-card-title"><div><h2>Receivable Register</h2><span>{loans.length} loan account{loans.length===1?'':'s'} with outstanding balance</span></div><input className="admin-search" value={q} onChange={e=>setQ(e.target.value)} placeholder="🔎 Search loan / customer / mobile / dealer" style={{maxWidth:360}}/></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Loan</th><th>Customer</th><th>Dealer</th><th>Outstanding</th><th>Overdue</th><th>Due Today</th><th>Next Due</th></tr></thead><tbody>
      {loading?<tr><td colSpan="7" className="empty-cell">Loading…</td></tr>:loans.length?loans.map(x=><tr key={x.id}><td><strong>{x.loan_account_no||x.application_no}</strong><div className="muted">{x.application_no}</div></td><td>{x.customer_name}<div className="muted">{x.customer_phone}</div></td><td>{x.dealer_name}<div className="muted">{x.dealer_code||''}</div></td><td><strong>{money(x.outstanding)}</strong></td><td>{money(x.overdue)}</td><td>{money(x.due_today)}</td><td>{x.next_due_date?x.next_due_date+' · '+money(x.next_due_amount):'—'}</td></tr>):<tr><td colSpan="7" className="empty-cell">No outstanding EMI receivables.</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
