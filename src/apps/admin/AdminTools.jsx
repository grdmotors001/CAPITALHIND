import { useEffect, useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import { getAdminToken } from './api';

async function parseFile(file){
  const ext=file.name.toLowerCase().split('.').pop();
  if(ext==='csv'){
    const text=await file.text(); const lines=text.split(/\r?\n/).filter(Boolean); if(!lines.length)return [];
    const headers=lines[0].split(',').map(x=>x.trim().replace(/^"|"$/g,''));
    return lines.slice(1).map(line=>{const vals=line.match(/("(?:[^"]|"")*"|[^,]*)/g)?.slice(0,-1)||line.split(','); const o={};headers.forEach((h,i)=>o[h]=String(vals[i]??'').replace(/^"|"$/g,'').replace(/""/g,'"').trim());return o}).filter(o=>Object.values(o).some(Boolean));
  }
  const wb=new ExcelJS.Workbook(); await wb.xlsx.load(await file.arrayBuffer()); const ws=wb.worksheets[0]; const headers=[]; ws.getRow(1).eachCell((c,i)=>headers[i-1]=String(c.value??'').trim());
  const rows=[]; ws.eachRow((row,n)=>{if(n===1)return; const o={}; headers.forEach((h,i)=>o[h]=row.getCell(i+1).value instanceof Date?row.getCell(i+1).value.toISOString().slice(0,10):String(row.getCell(i+1).value??'').trim()); if(Object.values(o).some(Boolean))rows.push(o)}); return rows;
}
function apiImport(path,rows){return fetch(`/api/admin/${path}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getAdminToken()}`},body:JSON.stringify({rows})}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok||!d.success)throw new Error(d.error||'Import failed');return d})}

export default function AdminTools(){
 const [noteOpen,setNoteOpen]=useState(false),[note,setNote]=useState(()=>localStorage.getItem('chfpl_admin_note')||'');
 const [calcOpen,setCalcOpen]=useState(false),[calc,setCalc]=useState('');
 const [importType,setImportType]=useState('applicant'),[file,setFile]=useState(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[err,setErr]=useState('');
 useEffect(()=>{localStorage.setItem('chfpl_admin_note',note)},[note]);
 async function importNow(){if(!file)return;setBusy(true);setMsg('');setErr('');try{const rows=await parseFile(file);const d=await apiImport(importType==='applicant'?'import-loan-cases':'import-receipts',rows);setMsg(`Import complete: ${d.created||0} created, ${d.updated||0} updated, ${d.failed||0} failed.`);setFile(null)}catch(e){setErr(e.message||'Import failed')}finally{setBusy(false)}}
 function key(e){if(e.key==='Enter'){e.preventDefault();try{const safe=calc.replace(/[^0-9+\-*/().% ]/g,'');setCalc(String(Function(`"use strict";return (${safe.replaceAll('%','/100')})`)()))}catch{setCalc('Error')}}}
 return <>
  <div className="admin-utility-bar"><button className="utility-btn" onClick={()=>setNoteOpen(v=>!v)}>📝 <span>Sticky Note</span></button></div>
  {noteOpen&&<div className="sticky-popup"><div className="sticky-head"><strong>Sticky Note</strong><button onClick={()=>setNoteOpen(false)}>✕</button></div><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Yahan note likhiye…" autoFocus/><div className="sticky-bottom"><span>Auto saved</span><button className="calculator-launch" onClick={()=>setCalcOpen(v=>!v)}>🧮 Calculator</button></div></div>}
  {calcOpen&&<div className="calculator-popup"><div className="calc-head"><strong>Calculator</strong><button onClick={()=>setCalcOpen(false)}>✕</button></div><input value={calc} onChange={e=>setCalc(e.target.value)} onKeyDown={key} placeholder="e.g. 12500*0.18" autoFocus/><div className="calc-grid">{['7','8','9','/','4','5','6','*','1','2','3','-','0','.','%','+','C','='].map(x=><button key={x} onClick={()=>x==='C'?setCalc(''):x==='='?key({key:'Enter',preventDefault(){}}):setCalc(v=>v+x)}>{x}</button>)}</div></div>}
  <section className="admin-card import-tools"><div className="admin-card-title"><div><h2>Data Import</h2><span>Admin bulk import — Excel (.xlsx) or CSV</span></div></div><div className="import-tabs"><button className={importType==='applicant'?'active':''} onClick={()=>setImportType('applicant')}>Applicant Import</button><button className={importType==='receipt'?'active':''} onClick={()=>setImportType('receipt')}>Receipt Import</button></div><div className="import-grid"><div><label>Choose File</label><input type="file" accept=".xlsx,.csv" onChange={e=>setFile(e.target.files?.[0]||null)}/><small>{importType==='applicant'?'Uses the same applicant/loan case columns supported by the existing Loan Case import.':'Required: loan_account_no, amount. Optional: receipt_no, receipt_date, payment_mode, reference_no, remarks.'}</small></div><button className="admin-btn" disabled={!file||busy} onClick={importNow}>{busy?'Importing…':`⇧ Import ${importType==='applicant'?'Applicants':'Receipts'}`}</button></div>{msg&&<div className="admin-alert success">✓ {msg}</div>}{err&&<div className="admin-alert error">⚠ {err}</div>}</section>
 </>
}
