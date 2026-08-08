/**
 * NotFoundPage — Catch-all for unmatched URLs.
 */
import { Link, useLocation } from 'react-router-dom';
import { getAuthToken } from '../utils/auth';

export default function NotFoundPage() {
  const location = useLocation();
  const isLoggedIn = Boolean(getAuthToken());

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div
        className="panel-card"
        style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}
      >
        <span style={{ fontSize: '3rem', opacity: 0.5 }}>🧭</span>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Page not found</h1>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.6 }}>
            Nothing lives at{' '}
            <span style={{ fontFamily: 'monospace', color: '#374151', background: 'rgba(0,0,0,0.05)', padding: '0.1rem 0.4rem', borderRadius: '0.35rem' }}>
              {location.pathname}
            </span>
          </p>
        </div>
        <Link
          to={isLoggedIn ? '/dashboard' : '/login'}
          className="btn-primary"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          {isLoggedIn ? '← Back to dashboard' : 'Go to sign in'}
        </Link>
      </div>
    </div>
  );
}
