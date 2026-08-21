import { Navigate } from 'react-router-dom';

// WIREFRAME: reads logged-in user from context/localStorage (replace with
// real auth state — Supabase session / your existing PHP session bridge).
// If no user or role not in `allow`, redirect to /login.

function getCurrentUser() {
  // TODO: replace with real session lookup
  // e.g. return JSON.parse(localStorage.getItem('chf_user'));
  return { id: 1, role: 'field_executive' }; // placeholder
}

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
