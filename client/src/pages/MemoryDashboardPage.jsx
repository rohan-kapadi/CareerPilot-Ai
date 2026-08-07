/**
 * MemoryDashboardPage — Phase 3
 * Full Memory Hub (PROJECT.md §13.7):
 * - Category tabs (Skills / Experience / Goals / Sensitive / Inferred)
 * - Memory Timeline feed
 * - D3 Memory Graph visualization
 * - Expiring-soon panel with Renew/Let-Expire
 * - Forget Flow with impact preview modal
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useMemory } from '../context/MemoryContext';
import { decideMemory, forgetMemory, listMemories } from '../api/memoryApi';
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

const VIEW_TABS = ['Timeline', 'Graph'];

export default function MemoryDashboardPage() {
  const { memories, proposed, refreshMemories } = useMemory();

  const [activeCategory, setActiveCategory] = useState('all');
  const [activeView, setActiveView]         = useState('Timeline');
  const [deciding, setDeciding]             = useState(null);
  const [forgetTarget, setForgetTarget]     = useState(null);  // { memory, impact }
  const [forgetLoading, setForgetLoading]   = useState(false);

  // Filter memories by category
  const filteredMemories = activeCategory === 'all'
    ? memories
    : memories.filter(m => m.category === activeCategory);

  // Expiring within 7 days
  const expiringSoon = memories.filter(m => {
    if (!m.expiresAt) return false;
    const diff = new Date(m.expiresAt) - new Date();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  });

  // ── Handlers ──────────────────────────────────────────────
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
      const impact = res.data?.data;
      setForgetTarget({ memory, impact });
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

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto space-y-12">
      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-4">
          <Link to="/dashboard" className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 w-fit">← Dashboard</Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">🧠 Memory Dashboard</h1>
            <p className="text-gray-400 mt-2 max-w-xl">
              Everything CareerPilot AI remembers about you — negotiated, visible, and revocable.
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <StatBadge label="Active" count={memories.length} color="text-emerald-400" border="border-emerald-500/20" bg="bg-emerald-500/5" />
          <StatBadge label="Pending" count={proposed.length} color="text-amber-400" border="border-amber-500/20" bg="bg-amber-500/5" />
          <StatBadge label="Expiring" count={expiringSoon.length} color="text-red-400" border="border-red-500/20" bg="bg-red-500/5" />
        </div>
      </header>

      {/* ── Pending Memory Cards ── */}
      {proposed.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-white/90">⏳ Awaiting Your Decision</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {proposed.map(m => (
              <MemoryCard
                key={m._id}
                memory={m}
                onDecide={handleDecide}
                deciding={deciding}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Expiring Soon Panel ── */}
      {expiringSoon.length > 0 && (
        <section className="space-y-4 p-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
          <h2 className="text-xl font-semibold text-red-400 flex items-center gap-2">⚠️ Expiring Soon</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expiringSoon.map(m => (
              <div key={m._id} className="flex flex-col p-4 bg-black/20 rounded-xl border border-red-500/10">
                <p className="text-gray-300 mb-2 flex-1">{m.userModifiedContent || m.content}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs font-medium text-red-400/70">
                    Expires {new Date(m.expiresAt).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white transition-colors"
                      onClick={() => handleDecide(m._id, 'timebox', {
                        expiresAt: (() => { const d = new Date(); d.setDate(d.getDate() + 90); return d.toISOString(); })(),
                      })}
                    >
                      Renew 90d
                    </button>
                    <button
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs font-medium text-red-400 transition-colors"
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

      {/* ── Category Tabs ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.key}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCategory === tab.key 
                  ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
              }`}
              onClick={() => setActiveCategory(tab.key)}
            >
              <span>{tab.icon}</span> <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeCategory === tab.key ? 'bg-white/20' : 'bg-white/10'}`}>
                {tab.key === 'all'
                  ? memories.length
                  : memories.filter(m => m.category === tab.key).length}
              </span>
            </button>
          ))}
        </div>

        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 shrink-0">
          {VIEW_TABS.map(v => (
            <button
              key={v}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeView === v 
                  ? 'bg-white/10 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveView(v)}
            >
              <span>{v === 'Timeline' ? '📅' : '🕸'}</span> {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main View ── */}
      <main className="min-h-[400px] bg-white/[0.02] border border-white/5 rounded-3xl p-6 lg:p-8">
        {activeView === 'Timeline' ? (
          <>
            <MemoryTimeline
              memories={filteredMemories}
              onDecide={handleDecide}
            />
            {/* Per-memory forget buttons (just rendering hidden if required by old code) */}
            {filteredMemories.filter(m => m.status === 'accepted' || m.status === 'modified').map(m => (
              <div key={`forget-${m._id}`} style={{ display: 'none' }} />
            ))}
          </>
        ) : (
          <MemoryGraph memories={filteredMemories} />
        )}

        {filteredMemories.length === 0 && (
          <div className="flex flex-col items-center justify-center p-16 border border-white/10 border-dashed rounded-2xl text-gray-400 space-y-4">
            <span className="text-5xl opacity-40 mb-2">🧠</span>
            <p className="text-lg">No {activeCategory !== 'all' ? activeCategory : ''} memories yet.</p>
            <Link to="/chat" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20">Start Career Chat →</Link>
          </div>
        )}
      </main>

      {/* ── Forget Impact Preview Modal ── */}
      {forgetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setForgetTarget(null)}>
          <div className="w-full max-w-md p-6 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-white">🗑 Forget Memory?</h3>
            <p className="p-4 bg-black/40 rounded-xl text-gray-300 border border-white/5 text-sm">
              "{forgetTarget.memory.userModifiedContent || forgetTarget.memory.content}"
            </p>
            
            <div className={`p-3 rounded-lg text-sm ${forgetTarget.impact?.usageCount > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {forgetTarget.impact?.usageLabel}
            </div>
            
            {forgetTarget.impact?.warning && (
              <p className="text-sm text-amber-400">{forgetTarget.impact.warning}</p>
            )}
            
            <p className="text-xs text-gray-500">
              This memory will be soft-deleted and permanently purged in 30 days.
            </p>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button 
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors" 
                onClick={() => setForgetTarget(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
                onClick={handleForgetConfirm}
                disabled={forgetLoading}
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

function StatBadge({ label, count, color, border, bg }) {
  return (
    <div className={`flex flex-col items-center justify-center px-4 py-2 border rounded-xl min-w-[80px] ${border} ${bg}`}>
      <span className={`text-2xl font-bold leading-none ${color}`}>{count}</span>
      <span className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-wider">{label}</span>
    </div>
  );
}
