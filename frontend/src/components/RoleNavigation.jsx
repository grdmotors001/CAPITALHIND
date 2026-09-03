import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileMenu from './ProfileMenu';
import { clearCurrentUser } from '../utils/session';
import { clearAppUserToken } from '../utils/appUserAuth';
import { clearStaffToken } from '../utils/staffAuth';
import { clearDealerToken } from '../apps/dealer/api';

const labels = {
  field_executive: 'Field Executive',
  tele_caller: 'Tele Caller',
  team_leader: 'Team Leader',
  do: 'Disbursement Officer',
  dealer: 'Dealer',
  cashier: 'Cashier',
  staff: 'Staff',
};

export default function RoleNavigation({ role, onLogout }) {
  const navigate = useNavigate();
  const title = labels[role] || 'Portal';

  const logout = () => {
    clearAppUserToken();
    clearStaffToken();
    try { clearDealerToken(); } catch (e) {}
    clearCurrentUser();
    if (onLogout) onLogout();
    navigate('/login', { replace: true });
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const openCollect = () => {
    const el = document.querySelector('.fe-collect-top');
    if (el) el.click();
  };
  const openHistory = () => {
    const el = document.getElementById('fe-history');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };
  const openRepo = () => {
    const el = document.querySelector('.fe-bottom-nav button:nth-child(4)');
    if (el) el.click();
  };

  const items = [{ label: 'Dashboard', icon: '⌂', action: scrollTop }];
  if (role === 'field_executive') {
    items.push(
      { label: 'Collect EMI', icon: '₹', action: openCollect },
      { label: 'History', icon: '▣', action: openHistory },
      { label: 'Repo', icon: '🚗', action: openRepo },
    );
  }

  return (
    <>
      <aside className="role-side-nav">
        <div className="role-nav-brand">
          <img src="/logo.png" alt="Capital Hind Finance" />
          <div><strong>Capital Hind</strong><span>Finance</span></div>
        </div>
        <div className="role-nav-title">{title}</div>
        <nav>
          {items.map((item) => (
            <button key={item.label} type="button" onClick={item.action}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="role-nav-profile"><ProfileMenu compact /></div>
        <button className="role-nav-logout" type="button" onClick={logout}>
          <span>↪</span><span>Logout</span>
        </button>
      </aside>

      {role !== 'field_executive' && (
        <nav className="role-bottom-nav">
          {items.slice(0, 5).map((item) => (
            <button key={item.label} type="button" onClick={item.action}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
          <button type="button" onClick={() => {
            const el = document.querySelector('.profile-trigger');
            if (el) el.click();
          }}>
            <span>◉</span><span>Profile</span>
          </button>
        </nav>
      )}
    </>
  );
}
