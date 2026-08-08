/**
 * RoadmapPage — Phase 6
 * Hosts the Learning Roadmap for a skill gap. Reached from a skill-gap chip
 * in the match results, so the roadmap always has a traceable origin.
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
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deciding, setDeciding] = useState(null);
  const [view, setView]         = useState('Timeline');

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

  useEffect(() => { load(); }, [load]);

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
    } finally { setDeciding(null); }
  }

  async function handleReject(id) {
    setDeciding(id);
    try {
      await rejectSuggestion(id);
      toast.success('Roadmap dismissed');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to dismiss roadmap');
    } finally { setDeciding(null); }
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Sora', system-ui, sans-serif", color: '#111827' }}>
      <main className="page-wrap py-10 space-y-8" style={{ maxWidth: '900px' }}>
        {/* Header */}
        <section style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Learning Roadmap</h1>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.7, maxWidth: '480px' }}>
              Every milestone links back to the skill gap that triggered it. Nothing starts until you approve it.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary"
            style={{ opacity: generating ? 0.6 : 1 }}
          >
            {generating ? 'Building…' : roadmaps.length ? '↻ Regenerate' : '✨ Build roadmap'}
          </button>
        </section>

        {/* View switcher */}
        {roadmaps.length > 1 && (
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.6)', borderRadius: '0.75rem', border: '1px solid rgba(0,0,0,0.08)', padding: '0.2rem', width: 'fit-content' }}>
            {VIEWS.map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.35rem 0.85rem', borderRadius: '0.55rem', fontSize: '0.8rem', fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  background: view === v ? 'rgba(255,255,255,0.9)' : 'transparent',
                  border: 'none',
                  color: view === v ? '#111827' : '#6b7280',
                  boxShadow: view === v ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {v === 'Timeline' ? '📅' : '🕸'} {v}
              </button>
            ))}
          </div>
        )}

        {/* Main content */}
        {loading ? (
          <div className="panel-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#9ca3af', fontSize: '0.9rem' }}>
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
          <div className="panel-card" style={{ padding: '1.5rem' }}>
            <SkillDependencyGraph roadmaps={roadmaps} />
          </div>
        )}
      </main>
    </div>
  );
}
