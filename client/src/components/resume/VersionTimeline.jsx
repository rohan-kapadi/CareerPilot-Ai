/**
 * VersionTimeline — Phase 7 (PROJECT.md §6.9)
 *
 * Every entry traces to what caused it: an approved Suggestion, the original
 * upload, or a restore. Restoring is append-only — nothing is ever deleted, so
 * the timeline stays a complete record.
 */
import { useState } from 'react';

const ORIGIN_META = {
  baseline: { icon: '📄', label: 'Original upload', tone: 'text-gray-400' },
  suggestion: { icon: '✅', label: 'Approved suggestion', tone: 'text-emerald-400' },
  restore: { icon: '↩️', label: 'Restored', tone: 'text-amber-400' },
};

export default function VersionTimeline({
  versions = [],
  currentVersion,
  onRestore,
  onCompare,
  restoring,
}) {
  const [compareFrom, setCompareFrom] = useState(null);

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 p-12 text-center text-gray-400">
        <span className="text-4xl opacity-40">🕐</span>
        <p>No version history yet. Approving a suggestion creates the first entry.</p>
      </div>
    );
  }

  function handleCompareClick(versionNumber) {
    if (compareFrom === null) {
      setCompareFrom(versionNumber);
      return;
    }
    if (compareFrom === versionNumber) {
      setCompareFrom(null);
      return;
    }
    // Always compare older → newer so the diff reads left-to-right in time
    const [older, newer] = [compareFrom, versionNumber].sort((a, b) => a - b);
    onCompare?.(older, newer);
    setCompareFrom(null);
  }

  return (
    <div className="space-y-4">
      {compareFrom !== null && (
        <p className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
          Comparing from <strong>v{compareFrom}</strong> — pick a second version, or tap v
          {compareFrom} again to cancel.
        </p>
      )}

      <ol className="relative space-y-4 border-l border-white/10 pl-6">
        {versions.map((version) => {
          const meta = ORIGIN_META[version.origin] ?? ORIGIN_META.suggestion;
          const isCurrent = version.versionNumber === currentVersion;
          const isCompareSource = compareFrom === version.versionNumber;

          return (
            <li key={version._id} className="relative">
              <span
                className={`absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                  isCurrent
                    ? 'border-emerald-500/40 bg-emerald-500/20'
                    : 'border-white/15 bg-slate-800'
                }`}
              >
                {meta.icon}
              </span>

              <div
                className={`rounded-xl border p-4 transition-colors ${
                  isCompareSource
                    ? 'border-blue-500/40 bg-blue-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">v{version.versionNumber}</span>
                  {isCurrent && (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                      Current
                    </span>
                  )}
                  <span className={`text-xs ${meta.tone}`}>{meta.label}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {new Date(version.createdAt).toLocaleString()}
                  </span>
                </div>

                <p className="mt-2 text-sm text-gray-300">{version.diffSummary}</p>

                {version.suggestionId?.title && (
                  <p className="mt-1 text-xs text-gray-500">
                    From suggestion: “{version.suggestionId.title}”
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCompareClick(version.versionNumber)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {isCompareSource ? 'Cancel compare' : '⇄ Compare'}
                  </button>
                  {!isCurrent && (
                    <button
                      onClick={() => onRestore?.(version.versionNumber)}
                      disabled={restoring === version.versionNumber}
                      className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      {restoring === version.versionNumber ? 'Restoring…' : '↩ Restore this'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
