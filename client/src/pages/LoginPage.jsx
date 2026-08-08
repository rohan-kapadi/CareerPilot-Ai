import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { registerUser, loginUser } from '../services/api';
import { getAuthToken } from '../utils/auth';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Landing-page "Get started" CTAs pass register:true so the sign-up form is
  // already open on arrival, instead of dropping visitors on a sign-in form.
  const [isRegister, setIsRegister] = useState(() => Boolean(location.state?.register));
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  /**
   * Where to land after signing in. Defaults to the dashboard — the home base
   * that surfaces resumes, memory, pending approvals and match history. If the
   * user was bounced here from a deep link, ProtectedRoute stashed it in
   * location.state.from, so send them back there instead.
   */
  const redirectTo = location.state?.from || '/dashboard';

  // Already signed in? Don't show the form again.
  useEffect(() => {
    if (getAuthToken()) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = isRegister
        ? await registerUser(form)
        : await loginUser({ email: form.email, password: form.password });

      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      toast.success(data.message);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-scene">
      {/* Ambient blobs */}
      <div className="blob blob--amber" />
      <div className="blob blob--blue" />
      <div className="blob blob--teal" />

      <div className="login-stage">
        {/* ── Left card: Auth form ── */}
        <div className="login-card login-card--form animate-slide-up">
          {/* Card header */}
          <div className="lc-header">
            <div className="lc-brand">
              <span className="lc-brand__icon">✦</span>
              <span className="lc-brand__name">CareerPilot AI</span>
            </div>
            <button
              id="toggle-auth-mode"
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="lc-toggle-btn"
            >
              {isRegister ? 'Sign in' : 'Sign up'}
            </button>
          </div>

          {/* Headline */}
          <div className="lc-headline">
            <h1 className="lc-headline__title">
              {isRegister ? 'Create account' : 'Log in'}
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="lc-form" id="auth-form">
            {isRegister && (
              <>
                <label htmlFor="name-input" className="sr-only">Full name</label>
                <input
                  id="name-input"
                  type="text"
                  autoComplete="name"
                  className="lc-input"
                  placeholder="full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </>
            )}

            <label htmlFor="email-input" className="sr-only">E-mail address</label>
            <input
              id="email-input"
              type="email"
              autoComplete="email"
              className="lc-input"
              placeholder="e-mail address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <label htmlFor="password-input" className="sr-only">Password</label>
            <input
              id="password-input"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              className="lc-input"
              placeholder="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={3}
            />

            <div className="lc-form-footer">
              <p className="lc-form-footer__hint">
                Your data stays private &amp; secure.
              </p>
              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="lc-submit-btn"
                aria-label={loading ? 'Submitting' : isRegister ? 'Create account' : 'Sign in'}
              >
                {loading ? (
                  <span className="lc-spinner" />
                ) : (
                  <span className="lc-submit-btn__arrow">→</span>
                )}
              </button>
            </div>
          </form>

          {/* Dark bottom banner */}
          <div className="lc-bottom-banner">
            <p className="lc-bottom-banner__sub">
              {isRegister ? 'Welcome to' : 'New in'}
            </p>
            <p className="lc-bottom-banner__title">CareerPilot AI</p>
          </div>
        </div>

        {/* ── Right card: Info / hero ── */}
        <div className="login-card login-card--info animate-slide-up" style={{ animationDelay: '80ms' }}>
          {/* Top row */}
          <div className="ic-header">
            <div>
              <p className="ic-header__day">
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </p>
              <p className="ic-header__date">
                {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <div className="ic-header__meta">
              <p>AI-Powered</p>
              <p>Career Suite</p>
            </div>
          </div>

          {/* Visual accent: soft blue orb */}
          <div className="ic-orb-wrap">
            <div className="ic-orb" />
            <div className="ic-orb-glow" />
          </div>

          {/* Feature bullets */}
          <div className="ic-features">
            <p className="ic-feature-item">
              <span className="ic-feature-dot" />
              Parse resumes instantly
            </p>
            <p className="ic-feature-item">
              <span className="ic-feature-dot" />
              ATS score optimizer
            </p>
            <p className="ic-feature-item">
              <span className="ic-feature-dot" />
              AI career coaching
            </p>
          </div>

          {/* Bottom row */}
          <div className="ic-footer">
            <div className="ic-footer__brand">
              <span className="ic-footer__icon">♥</span>
              <span>CareerPilot</span>
            </div>
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className="ic-cta-btn"
            >
              Get started
            </button>
          </div>
        </div>
      </div>

      <style>{`
        /* ── Scene / backdrop ── */
        .login-scene {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #f5ede0 0%, #ede8df 35%, #e8e2d8 60%, #ddd9d0 100%);
          font-family: 'Sora', 'Inter', system-ui, -apple-system, sans-serif;
          padding: 2rem 1rem;
        }

        /* Ambient blobs */
        .blob {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .blob--amber {
          width: 420px; height: 420px;
          top: -80px; left: -80px;
          background: radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 70%);
        }
        .blob--blue {
          width: 380px; height: 380px;
          bottom: -60px; right: -60px;
          background: radial-gradient(circle, rgba(96,165,250,0.18) 0%, transparent 70%);
        }
        .blob--teal {
          width: 300px; height: 300px;
          top: 50%; right: 30%;
          background: radial-gradient(circle, rgba(45,212,191,0.12) 0%, transparent 70%);
        }

        /* ── Stage layout ── */
        .login-stage {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 1.25rem;
          align-items: stretch;
          width: 100%;
          max-width: 780px;
        }

        /* ── Shared card ── */
        .login-card {
          border-radius: 2rem;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* ── Form card ── */
        .login-card--form {
          flex: 1.1;
          background: rgba(255,255,255,0.52);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          border: 1px solid rgba(255,255,255,0.7);
          box-shadow:
            0 4px 32px rgba(0,0,0,0.06),
            0 1.5px 0 rgba(255,255,255,0.9) inset;
          padding: 1.75rem 1.75rem 0;
        }

        /* ── Info card ── */
        .login-card--info {
          flex: 0.95;
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.07);
          box-shadow: 0 8px 40px rgba(0,0,0,0.1);
          padding: 1.75rem;
        }

        /* ── Card header (form) ── */
        .lc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .lc-brand {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .lc-brand__icon {
          font-size: 0.85rem;
          color: #6b7280;
        }
        .lc-brand__name {
          font-size: 0.78rem;
          font-weight: 600;
          color: #6b7280;
          letter-spacing: 0.02em;
        }
        .lc-toggle-btn {
          font-size: 0.78rem;
          font-weight: 600;
          color: #374151;
          background: rgba(0,0,0,0.06);
          border: none;
          border-radius: 999px;
          padding: 0.35rem 0.9rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .lc-toggle-btn:hover { background: rgba(0,0,0,0.1); }

        /* ── Headline ── */
        .lc-headline { margin-bottom: 1.5rem; }
        .lc-headline__title {
          font-size: 2.25rem;
          font-weight: 700;
          color: #111827;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }

        /* ── Form ── */
        .lc-form {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          flex: 1;
        }
        .lc-input {
          width: 100%;
          padding: 0.8rem 1.1rem;
          background: rgba(255,255,255,0.75);
          border: 1px solid rgba(0,0,0,0.09);
          border-radius: 999px;
          font-size: 0.85rem;
          color: #1f2937;
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s, background 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          box-sizing: border-box;
        }
        .lc-input::placeholder { color: #9ca3af; }
        .lc-input:focus {
          border-color: rgba(59,130,246,0.4);
          background: rgba(255,255,255,0.92);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }

        /* ── Form footer row ── */
        .lc-form-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.4rem;
          padding-bottom: 1.25rem;
        }
        .lc-form-footer__hint {
          font-size: 0.72rem;
          color: #9ca3af;
        }
        .lc-submit-btn {
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 50%;
          background: #1f2937;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
          flex-shrink: 0;
        }
        .lc-submit-btn:hover { transform: scale(1.08); background: #111827; }
        .lc-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .lc-submit-btn__arrow {
          color: #fff;
          font-size: 1rem;
          line-height: 1;
        }
        .lc-spinner {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lc-spin 0.7s linear infinite;
        }
        @keyframes lc-spin { to { transform: rotate(360deg); } }

        /* ── Dark bottom banner ── */
        .lc-bottom-banner {
          background: #1f2937;
          margin: 0 -1.75rem;
          padding: 1.5rem 1.75rem;
          border-radius: 0 0 2rem 2rem;
          margin-top: auto;
        }
        .lc-bottom-banner__sub {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-bottom: 0.15rem;
        }
        .lc-bottom-banner__title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.02em;
        }

        /* ── Info card header ── */
        .ic-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        .ic-header__day {
          font-size: 2.5rem;
          font-weight: 800;
          color: #111827;
          line-height: 1;
          letter-spacing: -0.04em;
        }
        .ic-header__date {
          font-size: 2.5rem;
          font-weight: 800;
          color: #111827;
          line-height: 1;
          letter-spacing: -0.04em;
        }
        .ic-header__meta {
          text-align: right;
          font-size: 0.72rem;
          color: #9ca3af;
          font-weight: 500;
          line-height: 1.5;
        }

        /* ── Orb visual ── */
        .ic-orb-wrap {
          position: relative;
          height: 160px;
          margin: 0.5rem -1.75rem 0.5rem 0;
          overflow: hidden;
        }
        .ic-orb {
          position: absolute;
          right: -45px;
          top: 50%;
          transform: translateY(-50%);
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: linear-gradient(150deg, #93c5fd 0%, #3b82f6 45%, #1d4ed8 100%);
          box-shadow: -12px 0 48px rgba(37,99,235,0.4);
        }
        .ic-orb-glow {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 130px;
          height: 130px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(147,197,253,0.45) 0%, transparent 65%);
          filter: blur(24px);
        }

        /* ── Feature list ── */
        .ic-features {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          margin-bottom: 1.5rem;
        }
        .ic-feature-item {
          font-size: 0.8rem;
          color: #374151;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .ic-feature-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #6b7280;
          flex-shrink: 0;
        }

        /* ── Info card footer ── */
        .ic-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
        }
        .ic-footer__brand {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 700;
          color: #374151;
        }
        .ic-footer__icon {
          font-size: 0.9rem;
          color: #1e40af;
        }
        .ic-cta-btn {
          padding: 0.55rem 1.2rem;
          background: #1f2937;
          color: #ffffff;
          border: none;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }
        .ic-cta-btn:hover { background: #111827; transform: translateY(-1px); }

        /* ── Entrance animations ── */
        .animate-slide-up {
          animation: lc-slide-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes lc-slide-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .login-stage {
            flex-direction: column;
            max-width: 420px;
          }
          .login-card--info { display: none; }
          .lc-headline__title { font-size: 1.85rem; }
        }
      `}</style>
    </div>
  );
}
