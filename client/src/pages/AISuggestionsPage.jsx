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
    <div style={{ minHeight: '100vh', fontFamily: "'Sora', system-ui, sans-serif", color: '#111827' }}>
      <div className="page-wrap py-10 space-y-8">
        {/* Headline */}
        <section style={{ paddingBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>AI Suggestions</h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.7 }}>
            Every AI-proposed change waits here. Nothing is applied to your resume until you approve it.
          </p>
        </section>

        {/* ── Generate panel ── */}
        <section className="panel-card" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, color: '#111827', marginBottom: '0.85rem', fontSize: '0.95rem' }}>Generate new suggestions</h2>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="input-field"
              style={{ flex: 1, minWidth: '200px' }}
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
              className="input-field"
              style={{ flex: 1, minWidth: '200px' }}
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
              className="btn-primary"
              style={{ flexShrink: 0, opacity: generating || !resumeId ? 0.5 : 1 }}
            >
              {generating ? 'Thinking…' : '✨ Suggest improvements'}
            </button>
          </div>
          {resumes.length === 0 && (
            <p style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: '#9ca3af' }}>
              No resumes yet.{' '}
              <Link to="/upload" style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>
                Upload one first →
              </Link>
            </p>
          )}
        </section>

        {/* ── Status tabs ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {STATUS_TABS.map((tab) => {
            const active = status === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatus(tab.key)}
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
                <span>{tab.icon}</span> {tab.label}
              </button>
            );
          })}
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
        <main style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', padding: '1rem', backdropFilter: 'blur(4px)' }}
            onClick={() => setConflict(null)}
          >
            <div
              className="panel-card"
              style={{ width: '100%', maxWidth: '520px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '1.1rem' }}>⚠️ Your resume changed</h3>
              <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6 }}>{conflict.message}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af' }}>
                  What the suggestion expected
                </p>
                <div className="diff-block diff-block--before">{String(conflict.data?.expected ?? '—')}</div>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af' }}>
                  What your resume says now
                </p>
                <div className="diff-block diff-block--after">{String(conflict.data?.current ?? '—')}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
                <button onClick={() => setConflict(null)} className="btn-ghost">
                  Keep my version
                </button>
                <button
                  onClick={() => handleApprove(conflict.id, { force: true })}
                  style={{ padding: '0.5rem 1.1rem', borderRadius: '999px', background: '#d97706', color: '#fff', border: 'none', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Apply anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, children }) {
  return (
    <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '4rem', textAlign: 'center', border: '1px dashed rgba(0,0,0,0.12)' }}>
      <span style={{ fontSize: '2.5rem', opacity: 0.4 }}>{icon}</span>
      <p style={{ color: '#9ca3af', maxWidth: '360px', fontSize: '0.88rem', lineHeight: 1.6 }}>{children}</p>
    </div>
  );
}
