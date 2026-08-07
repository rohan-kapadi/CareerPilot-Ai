/**
 * SplitDiffView — Phase 7 (PROJECT.md §6.10)
 *
 * Side-by-side comparison of two resume versions. The diff is computed
 * server-side against the structured sections, so what's highlighted here is a
 * real field-level change, not a text-similarity guess.
 */
const TYPE_META = {
  added: { label: 'Added', tone: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' },
  removed: { label: 'Removed', tone: 'border-red-500/20 bg-red-500/5 text-red-400' },
  changed: { label: 'Changed', tone: 'border-amber-500/20 bg-amber-500/5 text-amber-400' },
};

/** Render any diff value (string, array, object) as readable text. */
function renderValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ');
  return JSON.stringify(value, null, 2);
}

export default function SplitDiffView({ comparison, onClose }) {
  if (!comparison) return null;

  const { left, right, changes = [], summary } = comparison;

  return (
    <div className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
      {/* ── Header ── */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Comparing v{left.versionNumber} → v{right.versionNumber}
          </h3>
          <p className="mt-1 text-sm text-gray-400">{summary}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
          >
            ✕ Close
          </button>
        )}
      </header>

      {/* ── Version metadata ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <VersionHeader version={left} side="Before" />
        <VersionHeader version={right} side="After" />
      </div>

      {/* ── Field-level changes ── */}
      {changes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-gray-400">
          These two versions are identical.
        </p>
      ) : (
        <div className="space-y-4">
          {changes.map((change, i) => {
            const meta = TYPE_META[change.type] ?? TYPE_META.changed;
            return (
              <div key={i} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${meta.tone}`}>
                    {meta.label}
                  </span>
                  <span className="font-mono text-xs text-gray-500">{change.path}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="diff-block diff-block--before">{renderValue(change.before)}</div>
                  <div className="diff-block diff-block--after">{renderValue(change.after)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VersionHeader({ version, side }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{side}</p>
      <p className="mt-1 font-medium text-white">v{version.versionNumber}</p>
      <p className="text-xs text-gray-500">{new Date(version.createdAt).toLocaleString()}</p>
      {version.diffSummary && (
        <p className="mt-1 text-xs text-gray-400">{version.diffSummary}</p>
      )}
    </div>
  );
}
