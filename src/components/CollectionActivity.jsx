import { useEffect, useState } from 'react';

function tokenForCurrentRole() {
  return localStorage.getItem('chfpl_admin_token')
    || localStorage.getItem('chfpl_dealer_token')
    || localStorage.getItem('chfpl_app_user_token');
}

function money(v) {
  return `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function CollectionActivity({ compact = false }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const token = tokenForCurrentRole();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch('/api/collection/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) setMessages(data.messages || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="admin-card collection-activity-card" style={{ marginTop: 24 }}>
      <div className="admin-card-title">
        <div>
          <h2>💬 Collection Messages</h2>
          <span>Cash collection activity from Field Executives</span>
        </div>
        <button type="button" className="admin-btn secondary small" onClick={load}>↻ Refresh</button>
      </div>
      {loading ? (
        <div className="empty-cell">Loading collection messages…</div>
      ) : !messages.length ? (
        <div className="empty-cell">No cash collection recorded yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {messages.slice(0, compact ? 5 : 20).map(m => (
            <div key={m.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <strong>{m.message}</strong>
                <span className="role-pill field_executive">{money(m.amount)}</span>
              </div>
              <div className="muted" style={{ marginTop: 5 }}>
                {m.application_no || m.loan_account_no || 'Loan'} · Receipt {m.receipt_no} · {m.receipt_date}
                {m.remarks ? ` · ${m.remarks}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
