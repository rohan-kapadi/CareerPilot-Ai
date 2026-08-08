/**
 * RoadmapTimeline — Phase 6 (PROJECT.md §6.7)
 *
 * Learning roadmap UI. Each roadmap traces back to the skill gap that produced
 * it (problem #20: "roadmaps rarely link back to the specific skill gap that
 * triggered them"), and stays a pending Suggestion until the user starts it.
 *
 * Course links come from the ported AdaptIQ TF-IDF recommender.
 */
import ConfidenceBadge from '../explainability/ConfidenceBadge';

export default function RoadmapTimeline({ roadmaps = [], onApprove, onReject, deciding }) {
  if (roadmaps.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-2xl p-12 text-center text-sm"
        style={{ border: '1px dashed rgba(0,0,0,0.12)', background: 'rgba(0,0,0,0.02)', color: '#6b7280' }}
      >
        <span className="text-4xl opacity-40">🗺️</span>
        <p>No roadmap yet. Pick a skill gap and generate one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {roadmaps.map((item) => {
        const { roadmap = {}, sourceRef = {} } = item;
        const busy = deciding === item._id;
        const totalWeeks = (roadmap.milestones ?? []).reduce(
          (sum, m) => sum + (m.estimatedWeeks || 0),
          0
        );

        return (
          <section key={item._id} className="panel-card space-y-5 p-6">
            {/* ── Roadmap header ── */}
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold" style={{ color: '#111827' }}>{roadmap.skill}</h3>
                  <StatusChip status={item.status} />
                  {item.explanationTrace?.confidence != null && (
                    <ConfidenceBadge confidence={item.explanationTrace.confidence} />
                  )}
                </div>
                <p className="text-sm" style={{ color: '#6b7280' }}>
                  {roadmap.milestones?.length ?? 0} milestones · ~{totalWeeks} week
                  {totalWeeks !== 1 ? 's' : ''}
                  {sourceRef.skillGap && (
                    <>
                      {' · '}
                      <span style={{ color: '#9ca3af' }}>
                        from skill gap “{sourceRef.skillGap}”
                        {sourceRef.jdId?.title ? ` in ${sourceRef.jdId.title}` : ''}
                      </span>
                    </>
                  )}
                </p>
                {(roadmap.prerequisites?.length ?? 0) > 0 && (
                  <p className="text-xs text-amber-400/80">
                    Learn first: {roadmap.prerequisites.join(' → ')}
                  </p>
                )}
              </div>

              {item.status === 'pending' && onApprove && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => onReject(item._id)}
                    disabled={busy}
                    className="back-link px-3 py-2 disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => onApprove(item._id)}
                    disabled={busy}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {busy ? 'Starting…' : '▶ Start roadmap'}
                  </button>
                </div>
              )}
            </header>

            {/* ── Milestone timeline ── */}
            <ol className="relative space-y-5 pl-6" style={{ borderLeft: '1px solid rgba(0,0,0,0.1)' }}>
              {(roadmap.milestones ?? []).map((milestone, i) => (
                <li key={i} className="relative">
                  <span
                    className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${
                      item.status === 'accepted'
                        ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-700'
                        : 'border-black/10 bg-black/5 text-gray-600'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h4 className="font-medium" style={{ color: '#111827' }}>{milestone.title}</h4>
                      <span className="text-xs" style={{ color: '#9ca3af' }}>~{milestone.estimatedWeeks}w</span>
                    </div>
                    {milestone.description && (
                      <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
                        {milestone.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {/* ── Course links ── */}
            {(roadmap.courses?.length ?? 0) > 0 && (
              <div className="space-y-2 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9ca3af' }}>
                  Recommended courses
                </p>
                <ul className="space-y-2">
                  {roadmap.courses.map((course, i) => (
                    <li key={i}>
                      <a
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-black/[0.04]"
                        style={{ border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(0,0,0,0.02)' }}
                      >
                        <span className="text-lg">🎓</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium" style={{ color: '#111827' }}>
                            {course.title}
                          </span>
                          <span className="text-xs" style={{ color: '#9ca3af' }}>
                            {course.platform}
                            {course.score > 0 && ` · ${Math.round(course.score * 100)}% match`}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-blue-400">Open →</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function StatusChip({ status }) {
  const tone =
    status === 'accepted'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
      : status === 'rejected'
        ? 'border-black/10 bg-black/5 text-gray-600'
        : 'border-amber-500/20 bg-amber-500/10 text-amber-400';

  const label = status === 'accepted' ? 'In progress' : status === 'rejected' ? 'Dismissed' : 'Proposed';

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>{label}</span>;
}
