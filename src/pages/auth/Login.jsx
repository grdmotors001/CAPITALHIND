import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRedirectPathForRole } from '../../utils/roleRedirect';
import { loginDealer } from '../../apps/dealer/api';

// Single login screen shared by all 4 apps.
// Dealer login is wired to the real /api/dealer/login endpoint (Supabase +
// JWT). Field Executive / Tele Caller / Customer logins are not built yet —
// see README "What's NOT done yet".

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');

    if (!phone || !password) {
      setError('Phone aur password dono bharein.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginDealer({ phone, password });
      navigate(getRedirectPathForRole(result.role));
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>Capital Hind Finance</h1>
        <p className="subtitle">Sign in to continue</p>

        <form onSubmit={handleLogin}>
          <label>Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit mobile number"
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />

          {error && <p className="error-text">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <p className="hint">
          Currently wired for Dealer login. Field Executive / Tele Caller /
          Customer logins are still placeholders — see project README.
        </p>
      </div>
    </div>
  );
}
