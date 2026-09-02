import { useNavigate } from 'react-router-dom';
import ProfileMenu from './ProfileMenu';
import { clearCurrentUser } from '../utils/session';
import { clearAppUserToken } from '../utils/appUserAuth';
import { clearStaffToken } from '../utils/staffAuth';
import { clearDealerToken } from '../apps/dealer/api';

const labels={field_executive:'Field Executive',tele_caller:'Tele Caller',team_leader:'Team Leader',do:'Disbursement Officer',dealer:'Dealer',cashier:'Cashier',staff:'Staff'};
export default function RoleNavigation({role,onLogout}){
 const nav=useNavigate();
 const title=labels[role]||'Portal';
 function logout(){clearAppUserToken();clearStaffToken();try{clearDealerToken()}catch{}clearCurrentUser();onLogout?.();nav('/login',{replace:true});}
 const items=[{label:'Dashboard',icon:'⌂',action:()=>window.scrollTo({top:0,behavior:'smooth'})}];
 if(role==='field_executive') items.push({label:'Collect EMI',icon:'₹',action:()=>document.querySelector('.fe-collect-top')?.click()},{label:'History',icon:'▣',action:()=>document.getElementById('fe-history')?.scrollIntoView({behavior:'smooth'})},{label:'Repo',icon:'🚗',action:()=>document.querySelector('.fe-bottom-nav button:nth-child(4)')?.click()});
 return <><aside className="role-side-nav"><div className="role-nav-brand"><img src="/logo.png" alt="Capital Hind Finance"/><div><strong>Capital Hind</strong><span>Finance</span></div></div><div className="role-nav-title">{title}</div><nav>{items.map(i=><button key={i.label} onClick={i.action}>{i.icon}<span>{i.label}</span></button>)}</nav><div className="role-nav-profile"><ProfileMenu compact/></div><button className="role-nav-logout" onClick={logout}>↪ <span>Logout</span></button></aside>{role!=='field_executive'&&<nav className="role-bottom-nav">{items.slice(0,5).map(i=><button key={i.label} onClick={i.action}>{i.icon}<span>{i.label}</span></button>)}<button onClick={()=>document.querySelector('.profile-trigger')?.click()}>◉<span>Profile</span></button></nav></>;
}
