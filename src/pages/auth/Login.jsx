import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRedirectPathForRole } from '../../utils/roleRedirect';
import { loginDealer } from '../../apps/dealer/api';
import { setCurrentUser } from '../../utils/session';

// Single login screen shared by all 4 apps.
// Dealer login is wired to the real /api/dealer/login endpoint (Vercel
// serverless + Supabase, JWT-based). Field Executive / Tele Caller /
// Customer logins are not built yet — see README "What's NOT done yet".
// OTP login and Google sign-in are shown per the design but are not
// functional yet.

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('password'); // 'password' | 'otp'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      setCurrentUser({
        id: result.user?.id,
        name: result.user?.full_name,
        phone: result.user?.phone,
        role: result.role,
      });
      navigate(getRedirectPathForRole(result.role));
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-brand-panel">
        <div>
          <img src="/logo.png" alt="Capital Hind Finance" className="brand-logo" />
          <h1>
            Empowering Your Financial <span className="accent">Growth</span>
          </h1>
          <p>Reliable finance solutions to fuel your ambitions and secure your future.</p>
          <div className="login-rule" />
        </div>
        <div className="login-stats">
          <div className="login-stat">
            <div className="ic">🛡️</div>
            Secure
            <span className="sub">Your Data</span>
          </div>
          <div className="login-stat">
            <div className="ic">👥</div>
            Trusted
            <span className="sub">By Thousands</span>
          </div>
          <div className="login-stat">
            <div className="ic">📈</div>
            Growth
            <span className="sub">With Us</span>
          </div>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <span className="login-badge">STAFF · DEALER · FIELD EXECUTIVE</span>
          <h1>
            Welcome <span className="accent">Back!</span>
          </h1>
          <p className="subtitle">
            Login to access your account — you'll land on your own dashboard automatically.
          </p>
          <div className="login-divider" />

          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab ${mode === 'password' ? 'active' : ''}`}
              onClick={() => setMode('password')}
            >
              🔒 Password Login
            </button>
            <button
              type="button"
              className={`login-tab ${mode === 'otp' ? 'active' : ''}`}
              onClick={() => setMode('otp')}
              title="Coming soon"
            >
              📱 Login with OTP
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}

          {mode === 'password' ? (
            <form onSubmit={handleLogin}>
              <label htmlFor="phone">Phone number</label>
              <div className="login-field">
                <span className="icon">👤</span>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  autoComplete="username"
                />
              </div>

              <label htmlFor="password">Password</label>
              <div className="login-field">
                <span className="icon">🔒</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-pw"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>

              <div className="login-row-between">
                <span title="Coming soon">Forgot Password?</span>
              </div>

              <button type="submit" disabled={loading}>
                {loading ? 'Signing in…' : '→ Login'}
              </button>
            </form>
          ) : (
            <p className="otp-pending">
              OTP login is launching soon. Please use Password Login for now.
            </p>
          )}

          <div className="login-or-row">or continue with</div>
          <button type="button" className="btn-google" disabled title="Coming soon">
            <span>G</span> Continue with Google
          </button>

          <p className="login-footnote">📍 Your data is safe and secure with us.</p>

          <p className="hint">
            Currently wired for Dealer login. Field Executive / Tele Caller /
            Customer logins are still placeholders — see project README.
          </p>
        </div>
      </div>
    </div>
  );
}
