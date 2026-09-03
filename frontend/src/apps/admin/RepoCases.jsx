import { useEffect, useMemo, useState } from 'react';
import { getAdminToken } from './api';

const fmt=v=>v?String(v).slice(0,10):'—';
export default function RepoCases(){
 const [rows,setRows]=useState([]),[search,setSearch]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function load(){setLoading(true);setError('');try{const r=await fetch('/api/admin/repo-cases',{headers:{Authorization:`Bearer ${getAdminToken()}`}});const d=await r.json().catch(()=>({}));if(!r.ok||!d.success)throw new Error(d.error||'Could not load Repo register');setRows(d.repossessions||[])}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 const filtered=useMemo(()=>{const q=search.trim().toLowerCase();if(!q)return rows;return rows.filter(r=>[r.vehicle_no,r.loan_applications?.application_no,r.loan_applications?.loan_account_no,r.loan_applications?.customer_profiles?.full_name,r.loan_applications?.customer_profiles?.phone,r.dealer_master?.dealer_name,r.field_executive?.full_name,r.battery_master?.battery_name].some(v=>String(v||'').toLowerCase().includes(q)))},[rows,search]);
 return <div className="admin-page"><div className="admin-page-head"><div><div className="admin-eyebrow">RECOVERY / ASSET CONTROL</div><h1>Vehicle Repo</h1><p>Repossessed vehicle register — search by vehicle, customer, loan, FI or parked dealer.</p></div><div className="admin-count">{rows.length} repo{rows.length===1?'':'s'}</div></div>
 {error&&<div className="admin-alert error">⚠ {error}</div>}
 <section className="admin-card staff-list-card"><div className="admin-card-title"><div><h2>Repo Register</h2><span>Complete vehicle repossession history</span></div><button className="admin-btn secondary" onClick={load} disabled={loading}>↻ Refresh</button></div>
 <div style={{padding:'14px 0'}}><input className="admin-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔎 Search vehicle / customer / mobile / loan / FI / dealer" /></div>
 <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Date / Time</th><th>Loan</th><th>Customer</th><th>Vehicle</th><th>FI</th><th>Battery</th><th>RC</th><th>Charger</th><th>Parked At</th></tr></thead><tbody>
 {loading?<tr><td colSpan="9" className="empty-cell">Loading Repo register…</td></tr>:filtered.length===0?<tr><td colSpan="9" className="empty-cell">No Repo records found.</td></tr>:filtered.map(r=><tr key={r.id}><td>{fmt(r.repo_date)}<div className="muted">{String(r.repo_time||'').slice(0,5)}</div></td><td><strong>{r.loan_applications?.loan_account_no||r.loan_applications?.application_no||'—'}</strong><div className="muted">{r.loan_applications?.application_no||''}</div></td><td>{r.loan_applications?.customer_profiles?.full_name||'—'}<div className="muted">{r.loan_applications?.customer_profiles?.phone||''}</div></td><td><strong>{r.vehicle_no||'—'}</strong></td><td>{r.field_executive?.full_name||'—'}</td><td>{r.battery_available?`${r.battery_master?.battery_name||'—'} · ${r.battery_no||'—'}`:'No'}</td><td>{r.rc_available?'Yes':'No'}</td><td>{r.charger_available?'Yes':'No'}</td><td>{r.dealer_master?.dealer_name||'—'}</td></tr>)}
 </tbody></table></div></section></div>
}
