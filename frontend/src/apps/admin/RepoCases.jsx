import { useEffect, useMemo, useState } from 'react';
import { getAdminToken } from './api';

const fmt=v=>v?String(v).slice(0,10):'—';
const norm=v=>String(v||'').trim().toLowerCase();

export default function RepoCases(){
 const [rows,setRows]=useState([]),[dealers,setDealers]=useState([]),[search,setSearch]=useState(''),[statusTab,setStatusTab]=useState('ALL'),[loading,setLoading]=useState(true),[error,setError]=useState('');

 function dealerForRow(row){
   const parked=row.dealer_master||{};
   // parked_dealer_id is the CHFPL dealer_master.id, while dealer.id is the
   // GRD dealer id. Never compare those two numeric IDs directly because they
   // can collide (e.g. CHFPL Keshavpur id 310 vs a GRD dealer id 310).
   const byGrdId = parked.grd_dealer_id
     ? dealers.find(d=>String(d.grd_dealer_id||'')===String(parked.grd_dealer_id))
     : null;
   if(byGrdId)return byGrdId;

   const byCode = parked.dealer_code
     ? dealers.find(d=>norm(d.dealer_code)===norm(parked.dealer_code))
     : null;
   if(byCode)return byCode;

   const byName = parked.dealer_name
     ? dealers.find(d=>norm(d.dealer_name)===norm(parked.dealer_name))
     : null;
   if(byName)return byName;

   return null;
 }

 async function updateRepo(id,patch){
   setError('');
   try{
     const r=await fetch('/api/admin/repo-cases',{
       method:'POST',
       headers:{Authorization:`Bearer ${getAdminToken()}`,'Content-Type':'application/json'},
       body:JSON.stringify({id,...patch})
     });
     const d=await r.json().catch(()=>({}));
     if(!r.ok||!d.success)throw new Error(d.error||'Could not update Repo');

     setRows(x=>x.map(row=>{
       if(row.id!==id)return row;
       const next={...row,...patch};
       if(Object.prototype.hasOwnProperty.call(patch,'parked_dealer_id')){
         const selected=dealers.find(v=>String(v.id)===String(patch.parked_dealer_id||''));
         next.dealer_master=patch.parked_dealer_id==='factory'?{
           dealer_name:'GRD Factory',
           dealer_code:'GRD-FACTORY'
         }:selected?{
           dealer_name:selected.dealer_name||'',
           dealer_code:selected.dealer_code||''
         }:null;
       }
       return next;
     }));
   }catch(e){setError(e.message)}
 }

 async function load(){
   setLoading(true);setError('');
   try{
     const [rr,dr]=await Promise.all([
       fetch('/api/admin/repo-cases',{headers:{Authorization:`Bearer ${getAdminToken()}`}}),
       fetch('/api/admin/dealers',{headers:{Authorization:`Bearer ${getAdminToken()}`}})
     ]);
     const d=await rr.json().catch(()=>({}));
     const dm=await dr.json().catch(()=>({}));
     if(!rr.ok||!d.success)throw new Error(d.error||'Could not load Repo register');
     setRows(d.repossessions||[]);
     if(dr.ok&&dm.success)setDealers(dm.dealers||[]);
   }catch(e){setError(e.message)}
   finally{setLoading(false)}
 }

 useEffect(()=>{load()},[]);

 const filtered=useMemo(()=>{
   const q=search.trim().toLowerCase();
   const byStatus=statusTab==='ALL'?rows:rows.filter(r=>String(r.resale_status||'SEIZED').toUpperCase()===statusTab);
   if(!q)return byStatus;
   return byStatus.filter(r=>[
     r.vehicle_no,r.loan_applications?.application_no,r.loan_applications?.loan_account_no,
     r.loan_applications?.customer_profiles?.full_name,r.loan_applications?.customer_profiles?.phone,
     r.dealer_master?.dealer_name,r.field_executive?.full_name,r.battery_master?.battery_name
     ].some(v=>String(v||'').toLowerCase().includes(q));
   });
 },[rows,search,statusTab]);

 return <div className="admin-page">
  <div className="admin-page-head">
   <div><div className="admin-eyebrow">RECOVERY / ASSET CONTROL</div><h1>Vehicle Repo</h1><p>Repossessed vehicle register — search by vehicle, customer, loan, FI or parked dealer.</p></div>
   <div className="admin-count">{rows.length} repo{rows.length===1?'':'s'}</div>
  </div>
  {error&&<div className="admin-alert error">⚠ {error}</div>}
  <section className="admin-card staff-list-card">
   <div className="admin-card-title"><div><h2>Repo Register</h2><span>Complete vehicle repossession history</span></div><button className="admin-btn secondary" onClick={load} disabled={loading}>↻ Refresh</button></div>
   <div style={{padding:'14px 0 10px'}}><input className="admin-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔎 Search vehicle / customer / mobile / loan / FI / dealer" /></div>
   <div style={{display:'flex',gap:8,flexWrap:'wrap',padding:'0 0 14px'}}>
    {[
      ['ALL','All'],['SEIZED','Hold'],['AVAILABLE_FOR_SALE','Available for Sale'],['SOLD','Sold']
    ].map(([key,label])=>{
      const count=key==='ALL'?rows.length:rows.filter(r=>String(r.resale_status||'SEIZED').toUpperCase()===key).length;
      return <button key={key} type="button" onClick={()=>setStatusTab(key)} className="admin-btn secondary" style={{
        borderColor:statusTab===key?'#5b21b6':'#e5dcf5',
        background:statusTab===key?'#f0e7ff':'#fff',
        fontWeight:statusTab===key?800:600
      }}>{label} <span style={{marginLeft:4,opacity:.75}}>{count}</span></button>
    })}
   </div>
   <div className="admin-table-wrap"><table className="admin-table">
    <thead><tr><th>Date / Time</th><th>Loan</th><th>Customer</th><th>Dealer</th><th>Vehicle / Model</th><th>Colour</th><th>Toolkit</th><th>Status</th><th>FI</th><th>Battery</th><th>RC</th><th>Charger</th><th>Park At / Showroom</th></tr></thead>
    <tbody>
     {loading?<tr><td colSpan="13" className="empty-cell">Loading Repo register…</td></tr>:filtered.length===0?<tr><td colSpan="13" className="empty-cell">No Repo records found.</td></tr>:filtered.map(r=>{
       const selectedDealer=dealerForRow(r);
       const isFactory=norm(r.dealer_master?.dealer_code)==='grd-factory';
       return <tr key={r.id}>
        <td>{fmt(r.repo_date)}<div className="muted">{String(r.repo_time||'').slice(0,5)}</div></td>
        <td><strong>{r.loan_applications?.loan_account_no||r.loan_applications?.application_no||'—'}</strong><div className="muted">{r.loan_applications?.application_no||''}</div></td>
        <td>{r.loan_applications?.customer_profiles?.full_name||'—'}<div className="muted">{r.loan_applications?.customer_profiles?.phone||''}</div></td>
        <td>{r.loan_applications?.dealer_name||r.loan_applications?.dealer_master?.dealer_name||'—'}</td>
        <td><strong>{r.vehicle_no||'—'}</strong><div className="muted">{r.model_name||'—'}</div></td>
        <td>{r.colour||'—'}</td>
        <td>{r.toolkit||'—'}</td>
        <td>{String(r.resale_status||'SEIZED').toUpperCase()==='SOLD'
          ? <strong style={{color:'#1f7a45'}}>Sold</strong>
          : <select className="repo-status-select" value={r.resale_status||'SEIZED'} onChange={e=>updateRepo(r.id,{resale_status:e.target.value})}>
             <option value="SEIZED">HOLD</option>
             <option value="AVAILABLE_FOR_SALE" disabled={isFactory}>Available for Sale</option>
            </select>}
        </td>
        <td>{r.field_executive?.full_name||'—'}</td>
        <td>{r.battery_available?(`${r.battery_master?.battery_name||'—'} · ${r.battery_no||'—'}`):'No'}</td>
        <td>{r.rc_available?'Yes':'No'}</td>
        <td>{r.charger_available?'Yes':'No'}</td>
        <td>
         <select
          value={selectedDealer?.id|| (isFactory?'factory':'')}
          onChange={e=>updateRepo(r.id,{parked_dealer_id:e.target.value||'factory'})}
          title="Change parked dealer"
          className="repo-park-select"
         >
          <option value="factory">GRD Factory</option>
          {dealers.map(d=><option key={d.id} value={d.id}>{d.dealer_name||'Unnamed Dealer'}</option>)}
         </select>
         {isFactory&&String(r.resale_status||'SEIZED').toUpperCase()==='SEIZED'&&<div className="muted" style={{marginTop:4,fontSize:10}}>Factory par vehicle HOLD rahega. Available karne se pehle showroom/dealer select karein.</div>}
        </td>
       </tr>
     })}
    </tbody>
   </table></div>
  </section>
 </div>
}
