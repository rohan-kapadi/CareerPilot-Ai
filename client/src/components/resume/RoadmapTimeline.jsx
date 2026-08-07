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
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 p-12 text-center text-gray-400">
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
          <section
            key={item._id}
            className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            {/* ── Roadmap header ── */}
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">{roadmap.skill}</h3>
                  <StatusChip status={item.status} />
                  {item.explanationTrace?.confidence != null && (
                    <ConfidenceBadge confidence={item.explanationTrace.confidence} />
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  {roadmap.milestones?.length ?? 0} milestones · ~{totalWeeks} week
                  {totalWeeks !== 1 ? 's' : ''}
                  {sourceRef.skillGap && (
                    <>
                      {' · '}
                      <span className="text-gray-500">
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
                    className="px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-white disabled:opacity-50"
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
            <ol className="relative space-y-5 border-l border-white/10 pl-6">
              {(roadmap.milestones ?? []).map((milestone, i) => (
                <li key={i} className="relative">
                  <span
                    className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${
                      item.status === 'accepted'
                        ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                        : 'border-white/20 bg-slate-800 text-gray-400'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h4 className="font-medium text-white">{milestone.title}</h4>
                      <span className="text-xs text-gray-500">~{milestone.estimatedWeeks}w</span>
                    </div>
                    {milestone.description && (
                      <p className="text-sm leading-relaxed text-gray-400">
                        {milestone.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {/* ── Course links ── */}
            {(roadmap.courses?.length ?? 0) > 0 && (
              <div className="space-y-2 border-t border-white/10 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Recommended courses
                </p>
                <ul className="space-y-2">
                  {roadmap.courses.map((course, i) => (
                    <li key={i}>
                      <a
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 p-3 transition-colors hover:border-white/15 hover:bg-black/30"
                      >
                        <span className="text-lg">🎓</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-white">
                            {course.title}
                          </span>
                          <span className="text-xs text-gray-500">
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
        ? 'border-white/10 bg-white/5 text-gray-400'
        : 'border-amber-500/20 bg-amber-500/10 text-amber-400';

  const label = status === 'accepted' ? 'In progress' : status === 'rejected' ? 'Dismissed' : 'Proposed';

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>{label}</span>;
}
