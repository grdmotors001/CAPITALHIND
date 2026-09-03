import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../utils/session';

// Reads the logged-in user (set by Login.jsx on successful login) from
// localStorage. If nobody's logged in, or their role isn't in `allow`,
// bounce to /login.
//
// NOTE: this is a UI-routing guard only, not the security boundary — every
// API call under /api/dealer/* independently re-verifies the JWT
// server-side (see api/_lib/auth.js), so a user can't get real data just by
// tampering with localStorage here.

export default function RoleGuard({ allow, children }) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
