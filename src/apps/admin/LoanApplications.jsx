import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listLoanApplicationsAdmin } from './api';

const statusFor = (a) => {
  const s = String(a.application_status || '').toLowerCase();
  const tvr = String(a.tvr_status || 'pending').toLowerCase();
  if (s === 'rejected') return { key:'rejected', label:'Rejected', cls:'staff' };
  if (s === 'disbursed') return { key:'disbursed', label:'Disbursed', cls:'field_executive' };
  if (s === 'fi_pending' || s === 'submitted') return { key:'fe', label:'Pending at FE', cls:'staff' };
  if (s === 'fi_done') return { key:'do', label:'Pending at DO', cls:'staff' };
  if (s === 'approved' && tvr === 'pending') return { key:'tvr', label:'Pending at FE — TVR', cls:'staff' };
  if (s === 'approved' && tvr === 'submitted') return { key:'do', label:'Pending at DO — TVR', cls:'staff' };
  if (s === 'approved' && tvr === 'hold') return { key:'tvr', label:'TVR On Hold', cls:'staff' };
  if (s === 'approved' && tvr === 'failed') return { key:'tvr', label:'TVR Failed', cls:'staff' };
  if (s === 'approved' && tvr === 'verified') return { key:'ready', label:'TVR Verified — Ready for Disbursement', cls:'field_executive' };
  return { key:'other', label:s.replaceAll('_',' ') || 'Pending', cls:'staff' };
};

const fmt = v => v ? new Date(v).toLocaleDateString('en-IN') : '—';

export default function LoanApplications() {
  const [apps,setApps]=useState([]),[tab,setTab]=useState('all'),[search,setSearch]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');

  async function load(){
    setLoading(true);
    setError('');
    try{
      const d=await listLoanApplicationsAdmin();
      setApps(d.applications||[]);
    }catch(e){
      setError(e.message||'Could not load loan applications');
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{
    load();
    const t=setInterval(load,15000);
    return()=>clearInterval(t);
  },[]);

  const counts=useMemo(
    ()=>apps.reduce((x,a)=>{
      const s=statusFor(a).key;
      x[s]=(x[s]||0)+1;
      return x;
    },{}),
    [apps]
  );

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return apps.filter(a=>{
      const st=statusFor(a);
      if(tab!=='all'&&tab!==st.key)return false;
      if(!q)return true;
      return [
        a.application_no,
        a.dealer_name,
        a.customer_name,
        a.customer_phone,
        a.vehicle_model,
        a.application_status,
        st.label
      ].some(v=>String(v||'').toLowerCase().includes(q));
    });
  },[apps,tab,search]);

  return <div className="admin-page">
    <div className="admin-page-head">
      <div>
        <div className="admin-eyebrow">LOAN APPLICATION</div>
        <h1>Loan Application</h1>
        <p>Complete application pipeline with live current status.</p>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <Link className="admin-btn secondary" to="/app/admin/manual-create-loan">＋ New Application</Link>
        <button className="admin-btn" onClick={load} disabled={loading}>↻ Refresh</button>
      </div>
    </div>

    {error&&<div className="admin-alert error">⚠ {error}</div>}

    <div className="loan-app-top-tabs">
      {[
        ['all','ALL APPLICATION',apps.length],
        ['fe','AT FE',counts.fe||0],
        ['do','AT DO',counts.do||0],
        ['tvr','AT TVR',counts.tvr||0]
      ].map(([key,label,count])=>
        <button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>
          {label}<b>{count}</b>
        </button>
      )}
    </div>

    <section className="admin-card staff-list-card">
      <div className="admin-card-title">
        <div>
          <h2>{tab==='all'?'All Applications':tab==='fe'?'Applications at FE':tab==='do'?'Applications at DO':'Applications at TVR'}</h2>
          <span>Current workflow status is shown for every application.</span>
        </div>
        <input
          className="admin-search"
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="🔎 Search application / customer / dealer / mobile"
          style={{maxWidth:360}}
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Application</th>
              <th>Customer</th>
              <th>Dealer</th>
              <th>Vehicle</th>
              <th>Current Status</th>
              <th>FE</th>
              <th>Submitted</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="empty-cell">Loading applications…</td></tr>
            ) : filtered.length===0 ? (
              <tr><td colSpan="8" className="empty-cell">No applications in this tab.</td></tr>
            ) : filtered.map(a=>{
              const st=statusFor(a);
              return <tr key={a.id}>
                <td><strong>{a.application_no||'—'}</strong><div className="muted">{a.physical_register_serial_no||''}</div></td>
                <td>{a.customer_name||'—'}<div className="muted">{a.customer_phone||''}</div></td>
                <td>{a.dealer_name||'—'}</td>
                <td>{a.vehicle_model||'—'}<div className="muted">₹{Number(a.loan_amount_requested||0).toLocaleString('en-IN')}</div></td>
                <td>
                  <span className={`role-pill ${st.cls}`}>{st.label}</span>
                  <div className="muted" style={{marginTop:4}}>
                    System: {a.application_status||'—'}{a.tvr_status ? ` · TVR: ${a.tvr_status}` : ''}
                  </div>
                </td>
                <td>{a.assigned_fe_name||'Not assigned'}</td>
                <td>{fmt(a.submitted_at)}</td>
                <td><Link className="admin-btn small secondary" to="/app/admin/assign">Open</Link></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
