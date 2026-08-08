/**
 * SettingsPage — Phase 8
 * Holds DEFAULTS only. These never override a per-memory choice the user
 * already made, and they never bypass an approval gate.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getUserProfile } from '../services/api';

const TIMEBOX_OPTIONS = [
  { key: 'session',   label: 'This session only',  hint: 'Forgotten when you close the tab' },
  { key: '30d',       label: '30 days',             hint: 'Good default for an active job search' },
  { key: '90d',       label: '90 days',             hint: 'For longer transitions' },
  { key: 'long_term', label: 'Until I revoke it',   hint: 'Persists until you forget it' },
];

const TOGGLES = [
  { key: 'notifyExpiringMemories',   label: 'Notify me before a memory expires',      hint: 'A heads-up 3 days before, so nothing disappears silently.' },
  { key: 'notifyPendingSuggestions', label: 'Notify me about pending AI suggestions',  hint: 'When the AI has proposals waiting in your review queue.' },
  { key: 'autoRedactFlaggedPII',     label: 'Pre-select flagged PII for redaction on export', hint: 'Ticks the boxes in the export dialog — you still confirm before downloading.' },
];

const DEFAULTS = {
  defaultMemoryTimebox: '30d',
  notifyExpiringMemories: true,
  notifyPendingSuggestions: true,
  defaultExportTemplate: 'modern',
  autoRedactFlaggedPII: true,
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) { navigate('/login'); return; }
    getUserProfile()
      .then((res) => {
        const stored = res.data?.data?.settings;
        if (stored) setSettings({ ...DEFAULTS, ...stored });
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [navigate]);

  async function save(next) {
    setSettings(next);
    setSaving(true);
    try {
      await api.put('/user/settings', { settings: next });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        Loading settings…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Sora', system-ui, sans-serif" }}>
      <main className="page-wrap py-10 space-y-8" style={{ maxWidth: '760px' }}>
        {/* Header */}
        <section>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Settings</h1>
          <p style={{ color: '#6b7280', lineHeight: 1.7, fontSize: '0.9rem', maxWidth: '520px' }}>
            These set defaults for future decisions. They never change a memory you've already timeboxed,
            and nothing here lets the AI skip asking you first.
          </p>
        </section>

        <div style={{ height: '1px', background: 'rgba(0,0,0,0.07)' }} />

        {/* Memory Timebox */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h2 style={{ fontWeight: 700, color: '#111827', fontSize: '1rem', marginBottom: '0.25rem' }}>Default memory lifespan</h2>
            <p style={{ color: '#6b7280', fontSize: '0.82rem' }}>
              Pre-selected on new Memory Cards. You can still pick something different on any individual card.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TIMEBOX_OPTIONS.map((option) => {
              const active = settings.defaultMemoryTimebox === option.key;
              return (
                <button
                  key={option.key}
                  onClick={() => save({ ...settings, defaultMemoryTimebox: option.key })}
                  disabled={saving}
                  className="panel-card text-left transition-all"
                  style={{
                    padding: '1rem',
                    cursor: 'pointer',
                    border: active ? '1.5px solid rgba(59,130,246,0.45)' : undefined,
                    background: active ? 'rgba(59,130,246,0.07)' : undefined,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <span style={{ display: 'block', fontWeight: 600, color: active ? '#1d4ed8' : '#111827', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{option.label}</span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af' }}>{option.hint}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div style={{ height: '1px', background: 'rgba(0,0,0,0.07)' }} />

        {/* Notifications */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontWeight: 700, color: '#111827', fontSize: '1rem' }}>Notifications &amp; defaults</h2>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', listStyle: 'none', padding: 0, margin: 0 }}>
            {TOGGLES.map((toggle) => (
              <li key={toggle.key}>
                <label
                  className="panel-card"
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(settings[toggle.key])}
                    onChange={(e) => save({ ...settings, [toggle.key]: e.target.checked })}
                    disabled={saving}
                    style={{ marginTop: '0.1rem', width: '1rem', height: '1rem', accentColor: '#3b82f6', flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 600, color: '#111827', fontSize: '0.88rem', marginBottom: '0.15rem' }}>{toggle.label}</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af' }}>{toggle.hint}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <div style={{ height: '1px', background: 'rgba(0,0,0,0.07)' }} />

        {/* Cross-links */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontWeight: 700, color: '#111827', fontSize: '1rem' }}>Your data</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { to: '/memory',  icon: '🧠', label: 'Memory Dashboard',  sub: 'Inspect, edit, forget anything the AI remembers' },
              { to: '/privacy', icon: '🔒', label: 'Privacy Dashboard', sub: 'Consent per purpose, plus data export and deletion' },
            ].map(({ to, icon, label, sub }) => (
              <Link
                key={to}
                to={to}
                className="panel-card"
                style={{ display: 'block', padding: '1rem', textDecoration: 'none', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span style={{ display: 'block', fontWeight: 600, color: '#111827', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{icon} {label}</span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af' }}>{sub}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
