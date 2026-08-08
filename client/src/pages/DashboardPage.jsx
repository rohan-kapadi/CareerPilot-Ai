/**
 * DashboardPage — Phase 1, finalized in Phase 8
 * Home base after login: surfaces a widget from every phase — memory summary
 * (Phase 3), pending suggestions (Phase 6), recent matches (Phase 1/4).
 */
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listJDs } from '../api/jdApi';
import { listMatches } from '../api/matchApi';
import { listSuggestions } from '../api/suggestionApi';
import { syncResumes } from '../utils/resumeStore';
import MemoryDashboardWidget from '../components/memory/MemoryDashboardWidget';

const QUICK_ACTIONS = [
  { icon: '📄', label: 'Upload Resume',          sub: 'Parse and analyze a new resume',              path: '/upload' },
  { icon: '✍️', label: 'Build with AI',           sub: 'Draft your resume section by section',        path: '/builder' },
  { icon: '🔍', label: 'Analyze Job Description', sub: 'Extract skills and match to your resume',      path: '/jd/new' },
  { icon: '👤', label: 'View Profile',            sub: 'Manage your career profile and skills',        path: '/profile' },
  { icon: '🧠', label: 'Memory Hub',              sub: 'Inspect & negotiate AI memory',               path: '/memory' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  })();

  const [resumes, setResumes]   = useState([]);
  const [jds, setJDs]           = useState([]);
  const [matches, setMatches]   = useState([]);
  const [pendingSuggestions, setPendingSuggestions] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    (async () => {
      // allSettled throughout: one failing panel must not blank the whole
      // dashboard. syncResumes already falls back to its cache internally.
      const [resumeRes, jdRes, matchRes, suggestionRes] = await Promise.allSettled([
        syncResumes(),
        listJDs(),
        listMatches(),
        listSuggestions({ status: 'pending' }),
      ]);

      if (resumeRes.status === 'fulfilled') setResumes(resumeRes.value ?? []);
      if (jdRes.status === 'fulfilled') setJDs(jdRes.value.data?.data?.jds ?? []);
      if (matchRes.status === 'fulfilled') setMatches(matchRes.value.data?.data?.matches ?? []);
      if (suggestionRes.status === 'fulfilled') {
        setPendingSuggestions(suggestionRes.value.data?.data?.suggestions ?? []);
      }
      setLoading(false);
    })();
  }, [navigate]);

  const firstName = user.name?.split(' ')[0] ?? 'there';

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Sora', system-ui, sans-serif", color: '#111827' }}>
      <main className="page-wrap py-10 space-y-10">
        {/* ── Welcome ── */}
        <section>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Welcome back, <span className="gradient-text">{firstName}</span> 👋
          </h1>
          <p style={{ color: '#6b7280', maxWidth: '560px', lineHeight: 1.7 }}>
            Your AI-powered career copilot. Everything the AI remembers about you is negotiated — nothing hidden.
          </p>
        </section>

        {/* ── Quick Actions ── */}
        <section>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {QUICK_ACTIONS.map(({ icon, label, sub, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="panel-card text-left p-5 transition-all duration-200"
                style={{ cursor: 'pointer', border: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
              >
                <span style={{ fontSize: '1.5rem', marginBottom: '0.75rem', background: 'rgba(0,0,0,0.05)', width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
                <span style={{ fontWeight: 700, color: '#111827', display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>{label}</span>
                <span style={{ color: '#9ca3af', fontSize: '0.75rem', lineHeight: 1.5 }}>{sub}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Memory Summary Widget ── */}
        <section>
          <MemoryDashboardWidget />
        </section>

        {/* ── Pending Approvals ── */}
        {pendingSuggestions.length > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontWeight: 700, color: '#111827', fontSize: '1.05rem' }}>Waiting for your approval</h2>
              <Link to="/suggestions" style={{ fontSize: '0.8rem', color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>Review all →</Link>
            </div>
            <div className="panel-card p-5" style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}>
              <p style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '0.75rem' }}>
                The AI has {pendingSuggestions.length} proposal{pendingSuggestions.length !== 1 ? 's' : ''} for you. Nothing is applied until you approve it.
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pendingSuggestions.slice(0, 3).map((s) => (
                  <li key={s._id}>
                    <Link to="/suggestions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.6)', borderRadius: '0.9rem', border: '1px solid rgba(0,0,0,0.07)', textDecoration: 'none', color: '#111827', fontSize: '0.85rem' }}>
                      <span>{s.suggestionType === 'roadmap' ? '🗺️' : s.suggestionType === 'skill_add' ? '⚡' : '✏️'}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{s.title}</span>
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem', flexShrink: 0 }}>Review →</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {pendingSuggestions.length > 3 && (
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>+{pendingSuggestions.length - 3} more in the review queue</p>
              )}
            </div>
          </section>
        )}

        {/* ── Recent Resumes ── */}
        <DataSection
          title="Recent Resumes"
          link={{ to: '/upload', label: 'Upload new →' }}
          loading={loading}
          empty={resumes.length === 0}
          emptyIcon="📭"
          emptyText={<>No resumes yet. <Link to="/upload" style={{ color: '#1d4ed8' }}>Upload your first resume →</Link></>}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {resumes.slice(0, 5).map((r, i) => (
              <ResumeCard key={r.resumeId ?? i} item={r} onClick={() => navigate(`/resume/${r.resumeId}`)} />
            ))}
          </div>
        </DataSection>

        {/* ── Saved JDs ── */}
        <DataSection
          title="Saved Job Descriptions"
          link={{ to: '/jd/new', label: 'Add new →' }}
          loading={loading}
          empty={jds.length === 0}
          emptyIcon="📋"
          emptyText={<>No job descriptions saved. <Link to="/jd/new" style={{ color: '#1d4ed8' }}>Analyze a JD →</Link></>}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {jds.slice(0, 5).map((jd) => (
              <JDCard key={jd._id} item={jd} onClick={() => navigate(`/jd/${jd._id}`)} />
            ))}
          </div>
        </DataSection>

        {/* ── Match History ── */}
        <DataSection
          title="Match History"
          loading={loading}
          empty={matches.length === 0}
          emptyIcon="🎯"
          emptyText={<>No matches yet. <Link to="/jd/new" style={{ color: '#1d4ed8' }}>Analyze a Job Description →</Link></>}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {matches.slice(0, 6).map((m) => (
              <MatchCard key={m._id} item={m} onClick={() => m.jdId?._id && navigate(`/jd/${m.jdId._id}`)} onExplain={() => navigate(`/explain/${m._id}`)} />
            ))}
          </div>
        </DataSection>
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem 1rem', color: '#9ca3af', fontSize: '0.78rem', borderTop: '1px solid rgba(0,0,0,0.07)', marginTop: '2rem' }}>
        © 2026 CareerPilot AI — Premium Intelligence Suite
      </footer>
    </div>
  );
}

/* ── Helpers ── */
function DataSection({ title, link, loading, empty, emptyIcon, emptyText, children }) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontWeight: 700, color: '#111827', fontSize: '1.05rem' }}>{title}</h2>
        {link && <Link to={link.to} style={{ fontSize: '0.8rem', color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>{link.label}</Link>}
      </div>
      {loading ? (
        <EmptyState icon="⏳" text="Loading…" />
      ) : empty ? (
        <EmptyState icon={emptyIcon} text={emptyText} />
      ) : children}
    </section>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', textAlign: 'center', gap: '0.75rem' }}>
      <span style={{ fontSize: '2.5rem', opacity: 0.4 }}>{icon}</span>
      <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{text}</p>
    </div>
  );
}

function ScoreBadge({ score }) {
  if (score == null) return null;
  const color = score >= 70 ? { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', text: '#065f46' }
             : score >= 50 ? { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: '#92400e' }
             : { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '#991b1b' };
  return (
    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: color.bg, border: `1px solid ${color.border}`, color: color.text, flexShrink: 0 }}>
      {score}%
    </span>
  );
}

function RowCard({ icon, title, sub, badge, children, onClick }) {
  return (
    <div
      className="panel-card"
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', cursor: onClick ? 'pointer' : 'default', transition: 'all 0.15s' }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)'; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
    >
      <span style={{ fontSize: '1.2rem', background: 'rgba(0,0,0,0.05)', width: '2.2rem', height: '2.2rem', borderRadius: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 600, color: '#111827', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{title}</span>
        {sub && <span style={{ color: '#9ca3af', fontSize: '0.73rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{sub}</span>}
      </div>
      {badge}
      {children}
    </div>
  );
}

function ResumeCard({ item, onClick }) {
  return <RowCard icon="📄" title={item.fileName ?? 'Resume'} sub="Click to view" badge={<ScoreBadge score={item.atsScore} />} onClick={onClick} />;
}

function JDCard({ item, onClick }) {
  const gaps = item.extracted?.skillsToImprove?.length ?? 0;
  return <RowCard icon="💼" title={item.title || 'Untitled Role'} sub={item.company || 'Company not specified'} badge={<span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#1d4ed8', flexShrink: 0 }}>{gaps} gaps</span>} onClick={onClick} />;
}

function MatchCard({ item, onClick, onExplain }) {
  return (
    <RowCard icon="🎯" title={item.jdId?.title ?? 'Job Match'} sub={item.resumeId?.originalFileName ?? 'Resume'} badge={<ScoreBadge score={item.overallScore} />} onClick={onClick}>
      <button
        onClick={(e) => { e.stopPropagation(); onExplain(); }}
        style={{ padding: '0.25rem 0.6rem', background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '0.5rem', fontSize: '0.72rem', fontWeight: 600, color: '#374151', cursor: 'pointer', flexShrink: 0 }}
      >
        🔍 Why?
      </button>
    </RowCard>
  );
}
