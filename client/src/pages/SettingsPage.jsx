/**
 * SettingsPage — Phase 8 (PROJECT.md §13.12)
 *
 * Holds DEFAULTS only. Per §13.12 these never override a per-memory choice the
 * user already made, and they never bypass an approval gate — the copy on this
 * page says so explicitly, because a settings screen that quietly weakened the
 * negotiation guarantees would undermine the whole product.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getUserProfile } from '../services/api';

const TIMEBOX_OPTIONS = [
  { key: 'session', label: 'This session only', hint: 'Forgotten when you close the tab' },
  { key: '30d', label: '30 days', hint: 'Good default for an active job search' },
  { key: '90d', label: '90 days', hint: 'For longer transitions' },
  { key: 'long_term', label: 'Until I revoke it', hint: 'Persists until you forget it' },
];

const TOGGLES = [
  {
    key: 'notifyExpiringMemories',
    label: 'Notify me before a memory expires',
    hint: 'A heads-up 3 days before, so nothing disappears silently.',
  },
  {
    key: 'notifyPendingSuggestions',
    label: 'Notify me about pending AI suggestions',
    hint: 'When the AI has proposals waiting in your review queue.',
  },
  {
    key: 'autoRedactFlaggedPII',
    label: 'Pre-select flagged PII for redaction on export',
    hint: 'Ticks the boxes in the export dialog — you still confirm before downloading.',
  },
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
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
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
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl space-y-10 p-6 md:p-12">
      <header className="space-y-4 border-b border-white/10 pb-6">
        <Link
          to="/dashboard"
          className="flex w-fit items-center gap-1 text-sm text-blue-400 transition-colors hover:text-blue-300"
        >
          ← Dashboard
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-white">⚙️ Settings</h1>
          <p className="mt-2 max-w-xl text-gray-400">
            These set defaults for future decisions. They never change a memory you've already
            timeboxed, and nothing here lets the AI skip asking you first.
          </p>
        </div>
      </header>

      {/* ── Default memory timebox ── */}
      <section className="space-y-4">
        <div>
          <h2 className="font-semibold text-white/90">Default memory lifespan</h2>
          <p className="mt-1 text-sm text-gray-400">
            Pre-selected on new Memory Cards. You can still pick something different on any
            individual card.
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
                className={`rounded-xl border p-4 text-left transition-all disabled:opacity-60 ${
                  active
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <span className={`block font-medium ${active ? 'text-blue-300' : 'text-white'}`}>
                  {option.label}
                </span>
                <span className="mt-1 block text-xs text-gray-400">{option.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Notifications & behaviour ── */}
      <section className="space-y-4">
        <h2 className="font-semibold text-white/90">Notifications & defaults</h2>
        <ul className="space-y-3">
          {TOGGLES.map((toggle) => (
            <li key={toggle.key}>
              <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={Boolean(settings[toggle.key])}
                  onChange={(e) => save({ ...settings, [toggle.key]: e.target.checked })}
                  disabled={saving}
                  className="mt-0.5 h-4 w-4 accent-blue-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-white">{toggle.label}</span>
                  <span className="mt-0.5 block text-xs text-gray-400">{toggle.hint}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Cross-links ── */}
      <section className="space-y-4">
        <h2 className="font-semibold text-white/90">Your data</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            to="/memory"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
          >
            <span className="block font-medium text-white">🧠 Memory Dashboard</span>
            <span className="mt-1 block text-xs text-gray-400">
              Inspect, edit, forget anything the AI remembers
            </span>
          </Link>
          <Link
            to="/privacy"
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
          >
            <span className="block font-medium text-white">🔒 Privacy Dashboard</span>
            <span className="mt-1 block text-xs text-gray-400">
              Consent per purpose, plus data export and deletion
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
