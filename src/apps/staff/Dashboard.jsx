import {useNavigate} from 'react-router-dom';
import ProfileMenu from '../../components/ProfileMenu';
import RoleNavigation from '../../components/RoleNavigation';
import {clearStaffToken} from '../../utils/staffAuth';
import {clearCurrentUser,getCurrentUser} from '../../utils/session';
export default function StaffDashboard(){const nav=useNavigate(),u=getCurrentUser();function logout(){clearStaffToken();clearCurrentUser();nav('/login',{replace:true})}return <div className="cashier-shell"><RoleNavigation role="staff" /><header className="cashier-header"><div><strong>Staff Panel</strong><small>{u?.name||'Staff'}</small></div><div className="cashier-head-actions"><ProfileMenu compact/><button onClick={logout}>↪ Logout</button></div></header><main className="cashier-main"><section className="cashier-card"><div className="cashier-card-head"><h2>My Profile</h2><p>Update your name, DOB, father name, address, email, mobile number and profile photo.</p></div><div style={{padding:22}}><ProfileMenu compact/></div></section></main></div>}
