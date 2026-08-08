import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clearSession } from '../../utils/auth';
import { listSuggestions } from '../../api/suggestionApi';

const NAV_LINKS = [
  { to: '/upload',      label: 'Upload Resume' },
  { to: '/builder',     label: 'Build with AI' },
  { to: '/jd/new',      label: 'Analyze JD' },
  { to: '/chat',        label: 'Career Chat' },
  { to: '/memory',      label: 'Memory' },
  { to: '/suggestions', label: 'Suggestions', badge: true },
  { to: '/privacy',     label: 'Privacy' },
  { to: '/profile',     label: 'Profile' },
  { to: '/settings',    label: 'Settings' },
];

export default function GlobalNavbar() {
  const navigate = useNavigate();
  const [pendingSuggestions, setPendingSuggestions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const suggestionRes = await listSuggestions({ status: 'pending' });
        setPendingSuggestions(suggestionRes.data?.data?.suggestions ?? []);
      } catch {
        // Silently fail if suggestions can't be fetched on mount for the navbar
      }
    })();
  }, []);

  function handleLogout() {
    clearSession();
    toast.success('Logged out');
    navigate('/login');
  }

  return (
    <header className="app-navbar" style={{ zIndex: 100 }}>
      <div className="page-wrap flex h-16 items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex flex-shrink-0 items-center gap-2.5"
        >
          <div className="brand-mark h-9 w-9 rounded-xl text-white text-base">✦</div>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', whiteSpace: 'nowrap' }}>CareerPilot AI</span>
        </button>

        <nav
          className="hide-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto relative"
          style={{ 
            scrollbarWidth: 'none',
            WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
            maskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent 100%)'
          }}
        >
          {NAV_LINKS.map(({ to, label, badge }) => (
            <Link
              key={to}
              to={to}
              style={{
                padding: '0.35rem 0.6rem',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 500,
                color: '#374151',
                transition: 'all 0.15s',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.07)'; e.currentTarget.style.color = '#111827'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#374151'; }}
            >
              {label}
              {badge && pendingSuggestions.length > 0 && (
                <span style={{ background: 'rgba(245,158,11,0.15)', color: '#92400e', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '999px', padding: '0 6px', fontSize: '0.68rem', fontWeight: 700 }}>
                  {pendingSuggestions.length}
                </span>
              )}
            </Link>
          ))}
          <div style={{ flexShrink: 0, width: '12px' }} />
        </nav>

        <button
          onClick={handleLogout}
          style={{ flexShrink: 0, padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, color: '#b91c1c', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; }}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
