import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRedirectPathForRole } from '../../utils/roleRedirect';
import { loginDealer } from '../../apps/dealer/api';
import { loginAdmin } from '../../apps/admin/api';
import { loginAppUser } from '../../utils/appUserAuth';
import { requestCustomerOtp, verifyCustomerOtp, loginCustomerWithGoogle } from '../../utils/customerAuth';
import { setCurrentUser } from '../../utils/session';

// Single login screen shared by all apps.
// Admin / Dealer / Field Executive / Tele Caller / DO -> username+password,
// tried in turn against their respective endpoints (see handleLogin below).
// Customer -> Mobile OTP (api/customer/request-otp + verify-otp) or
// Google Sign-In (api/customer/google-login). See customerAuth.js.

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const RESEND_SECONDS = 30;

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('password'); // 'password' | 'otp'

  // password mode
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // otp mode
  const [otpStep, setOtpStep] = useState('phone'); // 'phone' | 'code'
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef(null);

  function afterLogin(role, user) {
    setCurrentUser({
      id: user?.id,
      name: user?.full_name,
      phone: user?.phone,
      email: user?.email,
      role,
    });
    navigate(getRedirectPathForRole(role));
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');

    if (!phone || !password) {
      setError('Phone aur password dono bharein.');
      return;
    }

    setLoading(true);
    try {
      // Admin accounts live in the Supabase `users` table (role='admin').
      // Try that first so one login box can serve both admin and dealer.
      try {
        const adminResult = await loginAdmin({ identifier: phone, password });
        afterLogin(adminResult.role, adminResult.user);
        return;
      } catch {
        // Not an admin account; continue with the existing dealer login.
      }

      const result = await loginDealer({ phone, password }).catch(async (dealerErr) => {
        // Not a dealer account either; try Field Executive / Tele Caller /
        // Customer / DO (also in the Supabase `users` table).
        try {
          const appResult = await loginAppUser({ identifier: phone, password });
          return { user: appResult.user, role: appResult.role };
        } catch {
          throw dealerErr;
        }
      });
      afterLogin(result.role, result.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ---- OTP flow (customer login) ----

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!/^[6-9]\d{9}$/.test(otpPhone)) {
      setError('Valid 10-digit mobile number daalein.');
      return;
    }

    setLoading(true);
    try {
      const res = await requestCustomerOtp(otpPhone);
      setInfo(res.message || 'OTP bhej diya gaya hai.');
      setOtpStep('code');
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(err.message || 'OTP bhejne mein dikkat hui.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');

    if (!otpCode || otpCode.length !== 6) {
      setError('6-digit OTP daalein.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyCustomerOtp(otpPhone, otpCode);
      afterLogin(res.role, res.user);
    } catch (err) {
      setError(err.message || 'OTP verify nahi hua.');
    } finally {
      setLoading(false);
    }
  }

  function resetOtpFlow() {
    setOtpStep('phone');
    setOtpCode('');
    setError('');
    setInfo('');
  }

  // ---- Google Sign-In (customer login) ----

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || mode !== 'otp') return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
      });
    };
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function handleGoogleCredential(response) {
    setError('');
    setLoading(true);
    try {
      const res = await loginCustomerWithGoogle(response.credential);
      afterLogin(res.role, res.user);
    } catch (err) {
      setError(err.message || 'Google login fail hua.');
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
          <span className="login-badge">ADMIN · STAFF · DEALER · CUSTOMER</span>
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
              onClick={() => {
                setMode('password');
                setError('');
                setInfo('');
              }}
            >
              🔒 Password Login
            </button>
            <button
              type="button"
              className={`login-tab ${mode === 'otp' ? 'active' : ''}`}
              onClick={() => {
                setMode('otp');
                setError('');
                setInfo('');
              }}
            >
              📱 Customer Login
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}
          {info && !error && <p className="otp-info">{info}</p>}

          {mode === 'password' ? (
            <form onSubmit={handleLogin}>
              <label htmlFor="phone">Username / Mobile number</label>
              <div className="login-field">
                <span className="icon">👤</span>
                <input
                  id="phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Username or 10-digit mobile number"
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

              <p className="login-footnote">
                Customer? Use the <b>Customer Login</b> tab above — OTP or Gmail, no password needed.
              </p>
            </form>
          ) : (
            <div>
              {otpStep === 'phone' ? (
                <form onSubmit={handleSendOtp}>
                  <label htmlFor="otp-phone">Registered mobile number</label>
                  <div className="login-field">
                    <span className="icon">📱</span>
                    <input
                      id="otp-phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit mobile number"
                      autoComplete="tel"
                    />
                  </div>
                  <button type="submit" disabled={loading}>
                    {loading ? 'Sending OTP…' : '→ Send OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <label htmlFor="otp-code">Enter the 6-digit OTP sent to {otpPhone}</label>
                  <div className="login-field">
                    <span className="icon">🔑</span>
                    <input
                      id="otp-code"
                      type="tel"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit OTP"
                      autoComplete="one-time-code"
                    />
                  </div>

                  <div className="login-row-between">
                    <span onClick={resetOtpFlow}>Change number</span>
                    {resendIn > 0 ? (
                      <span style={{ color: 'var(--ink-soft)', cursor: 'default' }}>
                        Resend OTP in {resendIn}s
                      </span>
                    ) : (
                      <span onClick={handleSendOtp}>Resend OTP</span>
                    )}
                  </div>

                  <button type="submit" disabled={loading}>
                    {loading ? 'Verifying…' : '→ Verify & Login'}
                  </button>
                </form>
              )}

              <div className="login-or-row">or continue with</div>
              {GOOGLE_CLIENT_ID ? (
                <div ref={googleBtnRef} className="google-btn-wrap" />
              ) : (
                <button type="button" className="btn-google" disabled title="Google login not configured yet">
                  <span>G</span> Continue with Google
                </button>
              )}

              <p className="hint">
                Sirf woh mobile number ya Gmail kaam karega jo aapki loan application mein register hai.
              </p>
            </div>
          )}

          <p className="login-footnote">📍 Your data is safe and secure with us.</p>
        </div>
      </div>
    </div>
  );
}
