/**
 * RoadmapPage — Phase 6
 *
 * Hosts the Learning Roadmap for a skill gap (PROJECT.md §6.7). Reached from a
 * skill-gap chip in the match results, so the roadmap always has a traceable
 * origin rather than appearing out of nowhere.
 *
 * :skillGapId is a JobDescription id or a URL-encoded skill name — the server
 * resolves both (see roadmapController).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getRoadmap, generateRoadmap } from '../api/roadmapApi';
import { approveSuggestion, rejectSuggestion } from '../api/suggestionApi';
import RoadmapTimeline from '../components/resume/RoadmapTimeline';
import SkillDependencyGraph from '../components/resume/SkillDependencyGraph';

const VIEWS = ['Timeline', 'Dependency Graph'];

export default function RoadmapPage() {
  const { skillGapId } = useParams();
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deciding, setDeciding] = useState(null);
  const [view, setView] = useState('Timeline');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRoadmap(skillGapId);
      setRoadmaps(res.data?.data?.roadmaps ?? []);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to load roadmap');
    } finally {
      setLoading(false);
    }
  }, [skillGapId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await generateRoadmap(skillGapId);
      toast.success(res.data?.message ?? 'Roadmap proposed');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not generate a roadmap');
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove(id) {
    setDeciding(id);
    try {
      const res = await approveSuggestion(id);
      toast.success(res.data?.message ?? 'Roadmap started');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to start roadmap');
    } finally {
      setDeciding(null);
    }
  }

  async function handleReject(id) {
    setDeciding(id);
    try {
      await rejectSuggestion(id);
      toast.success('Roadmap dismissed');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to dismiss roadmap');
    } finally {
      setDeciding(null);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl space-y-8 p-6 md:p-12">
      <header className="space-y-4 border-b border-white/10 pb-6">
        <Link
          to="/dashboard"
          className="flex w-fit items-center gap-1 text-sm text-blue-400 transition-colors hover:text-blue-300"
        >
          ← Dashboard
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
              🗺️ Learning Roadmap
            </h1>
            <p className="mt-2 max-w-xl text-gray-400">
              Every milestone links back to the skill gap that triggered it. Nothing starts until you
              approve it.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {generating ? 'Building…' : roadmaps.length ? '↻ Regenerate' : '✨ Build roadmap'}
          </button>
        </div>
      </header>

      {roadmaps.length > 1 && (
        <div className="flex w-fit rounded-xl border border-white/10 bg-white/5 p-1">
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                view === v ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {v === 'Timeline' ? '📅' : '🕸'} {v}
            </button>
          ))}
        </div>
      )}

      <main className="min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/10 p-16 text-gray-400">
            Loading roadmap…
          </div>
        ) : view === 'Timeline' || roadmaps.length <= 1 ? (
          <RoadmapTimeline
            roadmaps={roadmaps}
            onApprove={handleApprove}
            onReject={handleReject}
            deciding={deciding}
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <SkillDependencyGraph roadmaps={roadmaps} />
          </div>
        )}
      </main>
    </div>
  );
}
