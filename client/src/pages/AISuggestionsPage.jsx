/**
 * AISuggestionsPage — Phase 6 (PROJECT.md §13.6)
 *
 * The central review queue for every pending AI proposal. Nothing an agent
 * writes reaches a resume without passing through this screen (or the builder's
 * inline chip, which posts to the same Suggestion model).
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import useApprovalQueue from '../hooks/useApprovalQueue';
import SuggestionDiffCard from '../components/suggestions/SuggestionDiffCard';
import BulkApprovalBar from '../components/suggestions/BulkApprovalBar';
import { generateSuggestions } from '../api/suggestionApi';
import { listJDs } from '../api/jdApi';

const STATUS_TABS = [
  { key: 'pending', label: 'Pending', icon: '⏳' },
  { key: 'accepted', label: 'Approved', icon: '✅' },
  { key: 'rejected', label: 'Rejected', icon: '🚫' },
  { key: 'all', label: 'All', icon: '📋' },
];

export default function AISuggestionsPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('pending');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [conflict, setConflict] = useState(null); // { id, message, data }

  const { suggestions, loading, error, deciding, refresh, approve, reject, bulkApprove } =
    useApprovalQueue({ status });

  // ── Generate panel state ──
  const [resumes, setResumes] = useState([]);
  const [jds, setJDs] = useState([]);
  const [resumeId, setResumeId] = useState(searchParams.get('resumeId') ?? '');
  const [jdId, setJdId] = useState(searchParams.get('jdId') ?? '');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('resumes') || '[]');
      setResumes(stored);
      if (!resumeId && stored[0]?.resumeId) setResumeId(stored[0].resumeId);
    } catch {
      setResumes([]);
    }

    listJDs()
      .then((res) => setJDs(res.data?.data?.jds ?? []))
      .catch(() => setJDs([]));
    // Intentionally run once on mount — resumeId seeds from the URL or storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = useMemo(() => suggestions.filter((s) => s.status === 'pending'), [suggestions]);

  // Drop selections that are no longer pending (e.g. after a refresh)
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => pending.some((s) => s._id === id)));
  }, [pending]);

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleApprove(id, { force = false } = {}) {
    const result = await approve(id, { force });
    if (result.ok) {
      toast.success(result.message ?? 'Applied to your resume');
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      setConflict(null);
      return;
    }
    if (result.stale) {
      setConflict({ id, message: result.message, data: result.data });
      return;
    }
    toast.error(result.message);
  }

  async function handleReject(id) {
    const result = await reject(id);
    if (result.ok) {
      toast.success(result.message ?? 'Suggestion rejected');
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } else {
      toast.error(result.message);
    }
  }

  async function handleBulkApprove(ids) {
    setBulkBusy(true);
    const result = await bulkApprove(ids);
    setBulkBusy(false);
    if (result.ok) {
      toast.success(result.message);
      if (result.data?.skippedCount > 0) {
        toast(`${result.data.skippedCount} skipped — your resume changed since they were written.`, {
          icon: '⚠️',
        });
      }
      setSelectedIds([]);
    } else {
      toast.error(result.message);
    }
  }

  async function handleGenerate() {
    if (!resumeId) {
      toast.error('Pick a resume first');
      return;
    }
    setGenerating(true);
    try {
      const res = await generateSuggestions({ resumeId, jdId: jdId || null });
      toast.success(res.data?.message ?? 'Suggestions ready');
      setStatus('pending');
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not generate suggestions');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl space-y-10 p-6 md:p-12">
      {/* ── Header ── */}
      <header className="space-y-4 border-b border-white/10 pb-6">
        <Link
          to="/dashboard"
          className="flex w-fit items-center gap-1 text-sm text-blue-400 transition-colors hover:text-blue-300"
        >
          ← Dashboard
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
            🛠️ AI Suggestions
          </h1>
          <p className="mt-2 max-w-xl text-gray-400">
            Every AI-proposed change waits here. Nothing is applied to your resume until you approve it.
          </p>
        </div>
      </header>

      {/* ── Generate panel ── */}
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold text-white/90">Generate new suggestions</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={resumeId}
            onChange={(e) => setResumeId(e.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
          >
            <option value="">Select a resume…</option>
            {resumes.map((r, i) => (
              <option key={r.resumeId ?? i} value={r.resumeId}>
                {r.fileName ?? `Resume ${i + 1}`}
              </option>
            ))}
          </select>

          <select
            value={jdId}
            onChange={(e) => setJdId(e.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
          >
            <option value="">Target job (optional)…</option>
            {jds.map((jd) => (
              <option key={jd._id} value={jd._id}>
                {jd.title || 'Untitled'} {jd.company ? `— ${jd.company}` : ''}
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerate}
            disabled={generating || !resumeId}
            className="shrink-0 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {generating ? 'Thinking…' : '✨ Suggest improvements'}
          </button>
        </div>
        {resumes.length === 0 && (
          <p className="text-sm text-gray-500">
            No resumes yet.{' '}
            <Link to="/upload" className="text-blue-400 hover:underline">
              Upload one first →
            </Link>
          </p>
        )}
      </section>

      {/* ── Status tabs ── */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              status === tab.key
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                : 'border border-white/5 bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* ── Bulk bar (pending only) ── */}
      {status === 'pending' && pending.length > 0 && (
        <BulkApprovalBar
          selectedIds={selectedIds}
          totalPending={pending.length}
          busy={bulkBusy}
          onBulkApprove={handleBulkApprove}
          onSelectAll={() => setSelectedIds(pending.map((s) => s._id))}
          onClearSelection={() => setSelectedIds([])}
        />
      )}

      {/* ── Queue ── */}
      <main className="space-y-4">
        {loading ? (
          <EmptyState icon="⏳">Loading suggestions…</EmptyState>
        ) : error ? (
          <EmptyState icon="⚠️">{error}</EmptyState>
        ) : suggestions.length === 0 ? (
          <EmptyState icon="🎉">
            {status === 'pending'
              ? 'No pending suggestions. Generate some above, or match a resume to a job description.'
              : `No ${status} suggestions yet.`}
          </EmptyState>
        ) : (
          suggestions.map((suggestion) => (
            <SuggestionDiffCard
              key={suggestion._id}
              suggestion={suggestion}
              deciding={deciding}
              selected={selectedIds.includes(suggestion._id)}
              onToggleSelect={suggestion.status === 'pending' ? toggleSelect : undefined}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        )}
      </main>

      {/* ── Stale-diff conflict modal ── */}
      {conflict && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setConflict(null)}
        >
          <div
            className="w-full max-w-lg space-y-4 rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-white">⚠️ Your resume changed</h3>
            <p className="text-sm text-gray-300">{conflict.message}</p>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                What the suggestion expected
              </p>
              <div className="diff-block diff-block--before">
                {String(conflict.data?.expected ?? '—')}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                What your resume says now
              </p>
              <div className="diff-block diff-block--after">
                {String(conflict.data?.current ?? '—')}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
              <button
                onClick={() => setConflict(null)}
                className="px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:text-white"
              >
                Keep my version
              </button>
              <button
                onClick={() => handleApprove(conflict.id, { force: true })}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500"
              >
                Apply the suggestion anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 p-16 text-center text-gray-400">
      <span className="text-4xl opacity-50">{icon}</span>
      <p className="max-w-md">{children}</p>
    </div>
  );
}
