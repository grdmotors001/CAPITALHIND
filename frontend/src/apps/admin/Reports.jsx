import { useEffect, useMemo, useState } from 'react';
import { downloadReportCsv, listReport } from './api';

const money = (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };

const REPORTS = [
  { value: 'daybook', label: 'Day Book', desc: 'Date-wise debit, credit and running balance' },
  { value: 'collections', label: 'Collection Report', desc: 'All loan receipts and collection entries' },
  { value: 'expenses', label: 'Expense / NOC Report', desc: 'Loan expenses and NOC charges' },
  { value: 'repo', label: 'Repo Report', desc: 'Vehicle repossession register' },
  { value: 'loan-ledger', label: 'Loan Ledger', desc: 'Customer-wise loan financial entries' },
];

export default function Reports() {
  const [filters, setFilters] = useState({ from: firstOfMonth(), to: today(), report: 'daybook', vchType: 'All', username: 'All', ledger: 'All', showType: 'TYPE_1', search: '' });
  const [data, setData] = useState({ rows: [], users: [], ledgers: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setData(await listReport(filters)); }
    catch (e) { setError(e.message || 'Could not load report.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return data.rows || [];
    return (data.rows || []).filter(r => [r.date, r.voucher_no, r.type, r.particulars, r.loan, r.vehicle_no, r.username, r.ledger_name, r.customer].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [data.rows, filters.search]);

  const totals = useMemo(() => rows.reduce((a, r) => ({ debit: a.debit + Number(r.debit || 0), credit: a.credit + Number(r.credit || 0) }), { debit: 0, credit: 0 }), [rows]);
  const diff = totals.credit - totals.debit;

  function printReport() {
    const title = REPORTS.find(x => x.value === filters.report)?.label || 'Report';
    const html = `<html><head><title>${title}</title><style>body{font-family:Arial;padding:20px;color:#222}h1{margin:0 0 5px;color:#7a1730}p{color:#666}table{width:100%;border-collapse:collapse;margin-top:18px;font-size:11px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#fce7d9;color:#57101f}.num{text-align:right}.summary{display:flex;gap:30px;margin-top:15px;font-weight:bold}</style></head><body><h1>Capital Hind Finance — ${title}</h1><p>${filters.from} to ${filters.to}</p><div class="summary"><span>Debit: ₹${money(totals.debit)}</span><span>Credit: ₹${money(totals.credit)}</span><span>Difference: ₹${money(diff)}</span></div><table><thead><tr><th>Date</th><th>Voucher</th><th>Type</th><th>Particulars</th><th>Ledger</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.date||''}</td><td>${r.voucher_no||''}</td><td>${r.type||''}</td><td>${r.particulars||''}</td><td>${r.ledger_name||''}</td><td class="num">${money(r.debit)}</td><td class="num">${money(r.credit)}</td><td class="num">${money(r.balance)}</td></tr>`).join('')}</tbody></table></body></html>`;
    const w = window.open('', '_blank', 'width=1200,height=800');
    if (!w) return;
    w.document.write(html); w.document.close(); w.focus(); w.print();
  }

  return <div className="admin-page reports-page">
    <div className="admin-page-head">
      <div><div className="admin-eyebrow">REPORTING & CONTROL</div><h1>Reports</h1><p>Day Book, collections, expenses, repo aur loan-wise financial reports.</p></div>
      <div className="admin-count">{rows.length} rows</div>
    </div>
    {error && <div className="admin-alert error">⚠ {error}</div>}

    <section className="report-filter-card">
      <div className="report-filter-grid">
        <div><label>From Date</label><input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></div>
        <div><label>To Date</label><input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></div>
        <div><label>Report</label><select value={filters.report} onChange={e=>setFilters({...filters,report:e.target.value})}>{REPORTS.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
        <div><label>Vch Type</label><select value={filters.vchType} onChange={e=>setFilters({...filters,vchType:e.target.value})}><option>All</option><option>Receipt</option><option>Payment</option><option>Expense</option><option>NOC Charge</option><option>Repo</option></select></div>
        <div><label>Username / Staff</label><select value={filters.username} onChange={e=>setFilters({...filters,username:e.target.value})}><option>All</option>{(data.users||[]).map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}</select></div>
        <div><label>Ledger Name</label><select value={filters.ledger} onChange={e=>setFilters({...filters,ledger:e.target.value})}><option>All</option>{(data.ledgers||[]).map(l=><option key={l} value={l}>{l}</option>)}</select></div>
        <div><label>Show Type</label><select value={filters.showType} onChange={e=>setFilters({...filters,showType:e.target.value})}><option>TYPE_1</option><option>TYPE_2</option><option>ALL</option></select></div>
        <div className="report-filter-actions"><button className="admin-btn" onClick={load} disabled={loading}>{loading?'Loading…':'↻ Load'}</button><button className="admin-btn secondary" onClick={()=>downloadReportCsv(filters)}>⇩ Download as Excel</button></div>
      </div>
      <div className="report-description">{REPORTS.find(r=>r.value===filters.report)?.desc}</div>
    </section>

    <section className="report-search-card"><input value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})} placeholder="Search for names, loan, vehicle, voucher, ledger..." /><button className="admin-btn secondary" onClick={printReport}>🖨 Print Report</button></section>

    <section className="report-summary-grid">
      <div><span>Debit</span><strong>₹{money(totals.debit)}</strong></div>
      <div><span>Credit</span><strong>₹{money(totals.credit)}</strong></div>
      <div><span>Diff Amount</span><strong>₹{money(diff)}</strong></div>
      <div><span>Entries</span><strong>{rows.length}</strong></div>
    </section>

    <section className="admin-card report-table-card">
      <div className="admin-card-title"><div><h2>{REPORTS.find(r=>r.value===filters.report)?.label}</h2><span>{filters.from} → {filters.to}</span></div><button className="admin-btn secondary" onClick={load}>↻ Refresh</button></div>
      <div className="admin-table-wrap"><table className="admin-table report-table"><thead><tr><th>Date</th><th>Voucher / Ref</th><th>Type</th><th>Particulars</th><th>Ledger Name</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>
        {loading?<tr><td colSpan="8" className="empty-cell">Loading report…</td></tr>:rows.map((r,i)=><tr key={r.id||i}><td>{r.date||'—'}</td><td><strong>{r.voucher_no||r.loan||'—'}</strong></td><td>{r.type||'—'}</td><td>{r.particulars||r.customer||'—'}{r.vehicle_no&&<div className="muted">{r.vehicle_no}</div>}</td><td>{r.ledger_name||'—'}</td><td className="num">{Number(r.debit)?`₹${money(r.debit)}`:'—'}</td><td className="num">{Number(r.credit)?`₹${money(r.credit)}`:'—'}</td><td className="num">₹{money(r.balance)}</td></tr>)}
        {!loading&&!rows.length&&<tr><td colSpan="8" className="empty-cell">No report entries found for selected filters.</td></tr>}
      </tbody></table></div>
    </section>
  </div>;
}
