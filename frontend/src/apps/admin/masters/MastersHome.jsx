import { Link } from 'react-router-dom';

export default function MastersHome() {
  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <div className="admin-eyebrow">ADMINISTRATION</div>
          <h1>Masters</h1>
          <p>Manage the reference/master data used across loan applications.</p>
        </div>
      </div>
      <div className="admin-home-grid">
        <Link to="oem" className="admin-home-card"><span>🏭</span><div><h3>OEM</h3><p>Manage vehicle manufacturers used in the vehicle model master.</p></div><b>→</b></Link>
        <Link to="hp" className="admin-home-card">
          <span>⚖</span>
          <div><h3>HP (Hypothecation)</h3><p>Manage the entities under which vehicle RC hypothecation is registered.</p></div>
          <b>→</b>
        </Link>
        <Link to="batteries" className="admin-home-card">
          <span>🔋</span>
          <div><h3>Battery Master</h3><p>Manage battery names used in Field Executive Vehicle Repo records.</p></div>
          <b>→</b>
        </Link>
      </div>
    </div>
  );
}
