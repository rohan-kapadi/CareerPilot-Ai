/**
 * SuggestionDiffCard — Phase 6
 *
 * Diff-style accept/reject card for a single pending Suggestion (§13.6).
 * Nothing here mutates the resume — approving posts to /api/suggestions/:id/approve,
 * which is the only path AI content takes into Resume.sections.
 */
import { useState } from 'react';
import ReasoningTrace from '../explainability/ReasoningTrace';
import ConfidenceBadge from '../explainability/ConfidenceBadge';

const TYPE_META = {
  edit: { icon: '✏️', label: 'Resume Edit', tone: 'text-blue-400 border-blue-500/20 bg-blue-500/5' },
  skill_add: { icon: '⚡', label: 'Skill Addition', tone: 'text-teal-400 border-teal-500/20 bg-teal-500/5' },
  roadmap: { icon: '🗺️', label: 'Learning Roadmap', tone: 'text-purple-400 border-purple-500/20 bg-purple-500/5' },
};

export default function SuggestionDiffCard({
  suggestion,
  onApprove,
  onReject,
  deciding,
  selected = false,
  onToggleSelect,
}) {
  const [showWhy, setShowWhy] = useState(false);
  const meta = TYPE_META[suggestion.suggestionType] ?? TYPE_META.edit;
  const busy = deciding === suggestion._id;
  const { diff, explanationTrace, roadmap } = suggestion;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-white/20">
      {/* ── Header ── */}
      <header className="flex items-start gap-3">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(suggestion._id)}
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-blue-500"
            aria-label={`Select suggestion: ${suggestion.title}`}
          />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${meta.tone}`}>
              {meta.icon} {meta.label}
            </span>
            {explanationTrace?.confidence != null && (
              <ConfidenceBadge confidence={explanationTrace.confidence} />
            )}
          </div>
          <h3 className="font-semibold leading-snug text-white">{suggestion.title}</h3>
          {diff?.path && suggestion.suggestionType !== 'roadmap' && (
            <p className="font-mono text-xs text-gray-500">{diff.path}</p>
          )}
        </div>
      </header>

      {/* ── The proposed change ── */}
      {suggestion.suggestionType === 'edit' && (
        <div className="space-y-2">
          <DiffLabel>Current</DiffLabel>
          <div className="diff-block diff-block--before">{String(diff?.before ?? '—')}</div>
          <DiffLabel>Proposed</DiffLabel>
          <div className="diff-block diff-block--after">{String(diff?.after ?? '—')}</div>
        </div>
      )}

      {suggestion.suggestionType === 'skill_add' && (
        <div className="space-y-2">
          <DiffLabel>Skills to add</DiffLabel>
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(diff?.after) ? diff.after : []).map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300"
              >
                + {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {suggestion.suggestionType === 'roadmap' && (
        <div className="space-y-3">
          <DiffLabel>
            {roadmap?.milestones?.length ?? 0} milestone
            {(roadmap?.milestones?.length ?? 0) !== 1 ? 's' : ''} for {roadmap?.skill}
          </DiffLabel>
          <ol className="space-y-1.5">
            {(roadmap?.milestones ?? []).slice(0, 4).map((m, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="shrink-0 font-mono text-xs text-purple-400">{i + 1}.</span>
                <span>
                  {m.title}
                  <span className="ml-2 text-xs text-gray-500">~{m.estimatedWeeks}w</span>
                </span>
              </li>
            ))}
          </ol>
          {(roadmap?.courses?.length ?? 0) > 0 && (
            <p className="text-xs text-gray-500">
              Includes {roadmap.courses.length} recommended course
              {roadmap.courses.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* ── Explainability ── */}
      <div>
        <button
          onClick={() => setShowWhy((v) => !v)}
          className="text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
        >
          {showWhy ? '▼ Hide reasoning' : '🔍 Why this suggestion?'}
        </button>
        {showWhy && (
          <div className="mt-3">
            <ReasoningTrace trace={explanationTrace} />
          </div>
        )}
      </div>

      {/* ── Decision ── */}
      <footer className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
        <button
          onClick={() => onReject(suggestion._id)}
          disabled={busy}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-white disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={() => onApprove(suggestion._id)}
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? 'Applying…' : '✓ Approve'}
        </button>
      </footer>
    </article>
  );
}

function DiffLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{children}</p>
  );
}
