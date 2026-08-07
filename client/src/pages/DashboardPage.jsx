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
import { clearSession } from '../utils/auth';
import MemoryDashboardWidget from '../components/memory/MemoryDashboardWidget';

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

  function handleLogout() {
    clearSession();
    toast.success('Logged out');
    navigate('/login');
  }

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto space-y-12">
      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧭</span>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">CareerPilot AI</span>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          <Link to="/upload" className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors font-medium text-sm">Upload Resume</Link>
          <Link to="/jd/new" className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors font-medium text-sm">Analyze JD</Link>
          <Link to="/chat" className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors font-medium text-sm">Career Chat</Link>
          <Link to="/memory" className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors font-medium text-sm">Memory</Link>
          <Link to="/suggestions" className="relative px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors font-medium text-sm">
            Suggestions
            {pendingSuggestions.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/30">
                {pendingSuggestions.length}
              </span>
            )}
          </Link>
          <Link to="/privacy" className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors font-medium text-sm">Privacy</Link>
          <Link to="/profile" className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors font-medium text-sm">Profile</Link>
          <Link to="/settings" className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors font-medium text-sm">Settings</Link>
          <button onClick={handleLogout} className="px-4 py-2 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 transition-colors font-medium text-sm border border-red-500/30">Logout</button>
        </nav>
      </header>

      <main className="space-y-12">
        {/* ── Welcome ── */}
        <section className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">{user.name?.split(' ')[0] ?? 'there'}</span> 👋
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">
            Your AI-powered career copilot. Everything the AI remembers about you is negotiated — nothing hidden.
          </p>
        </section>

        {/* ── Quick Actions ── */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-white/90">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex flex-col items-start p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all text-left group" onClick={() => navigate('/upload')}>
              <span className="text-2xl mb-4 bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">📄</span>
              <span className="font-semibold text-white mb-1">Upload Resume</span>
              <span className="text-sm text-gray-400">Parse and analyze a new resume</span>
            </button>
            <button className="flex flex-col items-start p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all text-left group" onClick={() => navigate('/builder')}>
              <span className="text-2xl mb-4 bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">✍️</span>
              <span className="font-semibold text-white mb-1">Build with AI</span>
              <span className="text-sm text-gray-400">Draft your resume section by section</span>
            </button>
            <button className="flex flex-col items-start p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all text-left group" onClick={() => navigate('/jd/new')}>
              <span className="text-2xl mb-4 bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">🔍</span>
              <span className="font-semibold text-white mb-1">Analyze Job Description</span>
              <span className="text-sm text-gray-400">Extract skills and match to your resume</span>
            </button>
            <button className="flex flex-col items-start p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all text-left group" onClick={() => navigate('/profile')}>
              <span className="text-2xl mb-4 bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">👤</span>
              <span className="font-semibold text-white mb-1">View Profile</span>
              <span className="text-sm text-gray-400">Manage your career profile and skills</span>
            </button>
            <button className="flex flex-col items-start p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all text-left group" onClick={() => navigate('/memory')}>
              <span className="text-2xl mb-4 bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">🧠</span>
              <span className="font-semibold text-white mb-1">Memory Hub</span>
              <span className="text-sm text-gray-400">Inspect & negotiate AI memory</span>
            </button>
          </div>
        </section>

        {/* ── Memory Dashboard Summary Widget ── */}
        <section className="space-y-6">
          <MemoryDashboardWidget />
        </section>

        {/* ── Pending Approvals (Phase 6) ── */}
        {pendingSuggestions.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white/90">Waiting for your approval</h2>
              <Link to="/suggestions" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">Review all &rarr;</Link>
            </div>
            <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-4">
              <p className="text-sm text-amber-200/90">
                The AI has {pendingSuggestions.length} proposal{pendingSuggestions.length !== 1 ? 's' : ''} for you.
                Nothing is applied to your resume until you approve it.
              </p>
              <ul className="space-y-2">
                {pendingSuggestions.slice(0, 3).map((s) => (
                  <li key={s._id}>
                    <Link to="/suggestions" className="flex items-center gap-3 p-3 bg-black/20 border border-white/5 rounded-xl hover:bg-black/30 transition-colors">
                      <span className="text-lg shrink-0">
                        {s.suggestionType === 'roadmap' ? '🗺️' : s.suggestionType === 'skill_add' ? '⚡' : '✏️'}
                      </span>
                      <span className="flex-1 min-w-0 text-sm text-white truncate">{s.title}</span>
                      <span className="shrink-0 text-xs text-gray-500">Review &rarr;</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {pendingSuggestions.length > 3 && (
                <p className="text-xs text-gray-400">+{pendingSuggestions.length - 3} more in the review queue</p>
              )}
            </div>
          </section>
        )}

        {/* ── Recent Resumes ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white/90">Recent Resumes</h2>
            <Link to="/upload" className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">Upload new &rarr;</Link>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 border-dashed rounded-2xl text-gray-400 space-y-4">Loading…</div>
          ) : resumes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 border-dashed rounded-2xl text-gray-400 space-y-4">
              <span className="text-4xl opacity-50 mb-2">📭</span>
              <p>No resumes yet. <Link to="/upload" className="text-blue-400 hover:underline">Upload your first resume &rarr;</Link></p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumes.slice(0, 5).map((r, i) => (
                <div key={r.resumeId ?? i} className="flex items-center p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer gap-4 group" onClick={() => navigate(`/resume/${r.resumeId}`)}>
                  <span className="text-2xl bg-white/10 w-10 h-10 rounded-lg flex items-center justify-center shrink-0">📄</span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-white truncate">{r.fileName ?? 'Resume'}</span>
                    <span className="text-xs text-gray-400 truncate">Click to view</span>
                  </div>
                  {r.atsScore != null && (
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${r.atsScore >= 70 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : r.atsScore >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {r.atsScore}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Recent JDs ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white/90">Saved Job Descriptions</h2>
            <Link to="/jd/new" className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">Add new &rarr;</Link>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 border-dashed rounded-2xl text-gray-400 space-y-4">Loading…</div>
          ) : jds.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 border-dashed rounded-2xl text-gray-400 space-y-4">
              <span className="text-4xl opacity-50 mb-2">📋</span>
              <p>No job descriptions saved. <Link to="/jd/new" className="text-blue-400 hover:underline">Analyze a JD &rarr;</Link></p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jds.slice(0, 5).map((jd) => (
                <div key={jd._id} className="flex items-center p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer gap-4 group" onClick={() => navigate(`/jd/${jd._id}`)}>
                  <span className="text-2xl bg-white/10 w-10 h-10 rounded-lg flex items-center justify-center shrink-0">💼</span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-white truncate">{jd.title || 'Untitled Role'}</span>
                    <span className="text-xs text-gray-400 truncate">{jd.company || 'Company not specified'}</span>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full shrink-0 bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {jd.extracted?.skillsToImprove?.length ?? 0} gaps
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Match History ── */}
        {matches.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white/90">Match History</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.slice(0, 5).map((m) => (
                <div key={m._id} className="flex items-center p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer gap-4 group">
                  <span className="text-2xl bg-white/10 w-10 h-10 rounded-lg flex items-center justify-center shrink-0">🎯</span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-white truncate">{m.jdId?.title ?? 'Job Match'}</span>
                    <span className="text-xs text-gray-400 truncate">{m.resumeId?.originalFileName ?? 'Resume'}</span>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${m.overallScore >= 70 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : m.overallScore >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {m.overallScore}%
                  </span>
                  <button
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-gray-300 border border-white/10 transition-colors"
                    onClick={(e) => { e.stopPropagation(); navigate(`/explain/${m._id}`); }}
                    title="View explainable AI breakdown"
                  >
                    🔍 Why?
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
