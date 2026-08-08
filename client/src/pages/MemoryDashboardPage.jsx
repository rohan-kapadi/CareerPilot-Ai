/**
 * MemoryDashboardPage — Phase 3
 * Full Memory Hub: Category tabs, Timeline/Graph views, expiring panel, forget flow.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useMemory } from '../context/MemoryContext';
import { decideMemory, forgetMemory } from '../api/memoryApi';
import MemoryTimeline from '../components/memory/MemoryTimeline';
import MemoryGraph from '../components/memory/MemoryGraph';
import MemoryCard from '../components/memory/MemoryCard';

const CATEGORY_TABS = [
  { key: 'all',         label: 'All',         icon: '🧠' },
  { key: 'skills',      label: 'Skills',      icon: '⚡' },
  { key: 'experience',  label: 'Experience',  icon: '💼' },
  { key: 'goals',       label: 'Goals',       icon: '🎯' },
  { key: 'preferences', label: 'Preferences', icon: '⚙️' },
  { key: 'constraints', label: 'Constraints', icon: '📍' },
  { key: 'sensitive',   label: 'Sensitive',   icon: '🔴' },
  { key: 'inferred',    label: 'Inferred',    icon: '🔮' },
];

const VIEW_TABS = [
  { key: 'Timeline', icon: '📅' },
  { key: 'Graph',    icon: '🕸' },
];

export default function MemoryDashboardPage() {
  const { memories, proposed, refreshMemories } = useMemory();

  const [activeCategory, setActiveCategory] = useState('all');
  const [activeView, setActiveView]         = useState('Timeline');
  const [deciding, setDeciding]             = useState(null);
  const [forgetTarget, setForgetTarget]     = useState(null);
  const [forgetLoading, setForgetLoading]   = useState(false);

  const filteredMemories = activeCategory === 'all'
    ? memories
    : memories.filter(m => m.category === activeCategory);

  const expiringSoon = memories.filter(m => {
    if (!m.expiresAt) return false;
    const diff = new Date(m.expiresAt) - new Date();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  });

  async function handleDecide(id, action, opts = {}) {
    setDeciding(id);
    try {
      await decideMemory(id, { action, ...opts });
      await refreshMemories();
      toast.success(`Memory ${action}ed`);
    } catch {
      toast.error('Failed to update memory');
    } finally {
      setDeciding(null);
    }
  }

  async function handleForgetPreview(memory) {
    setForgetLoading(true);
    try {
      const res = await forgetMemory(memory._id, true);
      setForgetTarget({ memory, impact: res.data?.data });
    } catch {
      toast.error('Failed to load forget impact');
    } finally {
      setForgetLoading(false);
    }
  }

  async function handleForgetConfirm() {
    if (!forgetTarget) return;
    setForgetLoading(true);
    try {
      await forgetMemory(forgetTarget.memory._id, false);
      await refreshMemories();
      toast.success('Memory forgotten ✓');
      setForgetTarget(null);
    } catch {
      toast.error('Failed to forget memory');
    } finally {
      setForgetLoading(false);
    }
  }

  const S = {
    page:      { minHeight: '100vh', fontFamily: "'Sora', system-ui, sans-serif", color: '#111827' },
    main:      { maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' },
    heading:   { fontSize: '1.75rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' },
    sub:       { color: '#6b7280', lineHeight: 1.7, fontSize: '0.9rem', marginTop: '0.4rem' },
    statCard:  (color) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.75rem 1.25rem', borderRadius: '0.9rem', border: `1px solid ${color.border}`, background: color.bg, minWidth: '80px' }),
    statNum:   (color) => ({ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1, color: color.text }),
    statLabel: { fontSize: '0.65rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.2rem' },
  };

  const STAT_COLORS = {
    green: { text: '#065f46', border: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.07)' },
    amber: { text: '#92400e', border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.07)' },
    red:   { text: '#991b1b', border: 'rgba(239,68,68,0.3)',  bg: 'rgba(239,68,68,0.07)' },
  };

  return (
    <div style={S.page}>
      <div style={S.main}>
        {/* Header */}
        <header style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <h1 style={S.heading}>Memory Dashboard</h1>
              <p style={S.sub}>Everything CareerPilot AI remembers about you — negotiated, visible, and revocable.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[
                { label: 'Active',   count: memories.length,     color: STAT_COLORS.green },
                { label: 'Pending',  count: proposed.length,      color: STAT_COLORS.amber },
                { label: 'Expiring', count: expiringSoon.length,  color: STAT_COLORS.red },
              ].map(({ label, count, color }) => (
                <div key={label} style={S.statCard(color)}>
                  <span style={S.statNum(color)}>{count}</span>
                  <span style={S.statLabel}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Pending cards */}
        {proposed.length > 0 && (
          <section>
            <h2 style={{ fontWeight: 700, color: '#111827', marginBottom: '1rem', fontSize: '1rem' }}>⏳ Awaiting Your Decision</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {proposed.map(m => (
                <MemoryCard key={m._id} memory={m} onDecide={handleDecide} deciding={deciding} />
              ))}
            </div>
          </section>
        )}

        {/* Expiring panel */}
        {expiringSoon.length > 0 && (
          <section className="panel-card" style={{ padding: '1.25rem', borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.04)' }}>
            <h2 style={{ fontWeight: 700, color: '#991b1b', marginBottom: '1rem', fontSize: '1rem' }}>⚠️ Expiring Soon</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {expiringSoon.map(m => (
                <div key={m._id} className="panel-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ color: '#374151', fontSize: '0.85rem', lineHeight: 1.6, flex: 1 }}>{m.userModifiedContent || m.content}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#991b1b' }}>
                      Expires {new Date(m.expiresAt).toLocaleDateString()}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.73rem' }}
                        onClick={() => handleDecide(m._id, 'timebox', {
                          expiresAt: (() => { const d = new Date(); d.setDate(d.getDate() + 90); return d.toISOString(); })(),
                        })}
                      >
                        Renew 90d
                      </button>
                      <button
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.73rem', borderRadius: '999px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#991b1b', cursor: 'pointer', fontFamily: 'inherit' }}
                        onClick={() => handleForgetPreview(m)}
                      >
                        Let Expire
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tabs row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {CATEGORY_TABS.map(tab => {
              const count = tab.key === 'all' ? memories.length : memories.filter(m => m.category === tab.key).length;
              const active = activeCategory === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveCategory(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.4rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    background: active ? '#1f2937' : 'rgba(255,255,255,0.6)',
                    border: active ? 'none' : '1px solid rgba(0,0,0,0.08)',
                    color: active ? '#fff' : '#374151',
                    boxShadow: active ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span style={{ background: active ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)', padding: '0 5px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700 }}>{count}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.6)', borderRadius: '0.75rem', border: '1px solid rgba(0,0,0,0.08)', padding: '0.2rem' }}>
            {VIEW_TABS.map(({ key, icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.35rem 0.85rem', borderRadius: '0.55rem', fontSize: '0.8rem', fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  background: activeView === key ? 'rgba(255,255,255,0.9)' : 'transparent',
                  border: 'none',
                  color: activeView === key ? '#111827' : '#6b7280',
                  boxShadow: activeView === key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <span>{icon}</span> {key}
              </button>
            ))}
          </div>
        </div>

        {/* Main view area */}
        <div className="panel-card" style={{ minHeight: '400px', padding: '1.5rem' }}>
          {activeView === 'Timeline' ? (
            <MemoryTimeline memories={filteredMemories} onDecide={handleDecide} />
          ) : (
            <MemoryGraph memories={filteredMemories} />
          )}

          {filteredMemories.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', textAlign: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '3rem', opacity: 0.35 }}>🧠</span>
              <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
                No {activeCategory !== 'all' ? activeCategory : ''} memories yet.
              </p>
              <Link
                to="/chat"
                className="btn-primary"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                Start Career Chat →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Forget Modal */}
      {forgetTarget && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
          onClick={() => setForgetTarget(null)}
        >
          <div
            className="panel-card"
            style={{ width: '100%', maxWidth: '440px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '1.1rem' }}>🗑 Forget Memory?</h3>
            <p style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.04)', borderRadius: '0.75rem', border: '1px solid rgba(0,0,0,0.07)', color: '#374151', fontSize: '0.85rem', lineHeight: 1.6 }}>
              "{forgetTarget.memory.userModifiedContent || forgetTarget.memory.content}"
            </p>
            <div style={{
              padding: '0.65rem 1rem', borderRadius: '0.65rem', fontSize: '0.82rem', fontWeight: 500,
              background: forgetTarget.impact?.usageCount > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
              border: `1px solid ${forgetTarget.impact?.usageCount > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
              color: forgetTarget.impact?.usageCount > 0 ? '#92400e' : '#065f46',
            }}>
              {forgetTarget.impact?.usageLabel}
            </div>
            {forgetTarget.impact?.warning && (
              <p style={{ fontSize: '0.8rem', color: '#92400e' }}>{forgetTarget.impact.warning}</p>
            )}
            <p style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
              This memory will be soft-deleted and permanently purged in 30 days.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
              <button className="btn-ghost" onClick={() => setForgetTarget(null)}>Cancel</button>
              <button
                onClick={handleForgetConfirm}
                disabled={forgetLoading}
                style={{ padding: '0.5rem 1.1rem', borderRadius: '999px', background: '#dc2626', color: '#fff', border: 'none', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', opacity: forgetLoading ? 0.6 : 1 }}
              >
                {forgetLoading ? 'Forgetting…' : '🗑 Confirm Forget'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
