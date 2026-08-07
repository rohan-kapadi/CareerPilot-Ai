/**
 * JDViewerPage — Phase 1
 * Two-mode page:
 *  - /jd/new    → paste JD form, calls createJD, redirects to /jd/:id
 *  - /jd/:id    → structured view of persisted JD with 4-field skill-gap breakdown
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createJD, getJD } from '../api/jdApi';
import { matchResumeToJD } from '../api/matchApi';
import { Briefcase, Building, FileText, Sparkles, Zap, BarChart3, Mail } from 'lucide-react';

export default function JDViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  // Form state (new mode)
  const [rawText, setRawText]   = useState('');
  const [title, setTitle]       = useState('');
  const [company, setCompany]   = useState('');
  const [resumeId, setResumeId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // View state (existing mode)
  const [jd, setJd]       = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [matching, setMatching] = useState(false);

  // Stored resumes for the dropdown
  const storedResumes = (() => {
    try { return JSON.parse(localStorage.getItem('resumes') || '[]'); } catch { return []; }
  })();

  useEffect(() => {
    if (!isNew) {
      getJD(id)
        .then((res) => setJd(res.data?.data?.jd ?? null))
        .catch(() => toast.error('Failed to load job description'))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rawText.trim()) { toast.error('Please paste a job description'); return; }
    setSubmitting(true);
    try {
      const res = await createJD({ rawText, title, company, resumeId: resumeId || undefined });
      const saved = res.data?.data?.jd;
      toast.success('Job description analyzed!');
      navigate(`/jd/${saved._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to analyze JD');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMatch() {
    if (!resumeId) { toast.error('Select a resume to match against'); return; }
    setMatching(true);
    try {
      const res = await matchResumeToJD(resumeId, jd._id);
      const match = res.data?.data?.match;
      toast.success(`Match complete! Score: ${match.overallScore}%`);
      navigate(`/resume/${resumeId}`);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Matching failed');
    } finally {
      setMatching(false);
    }
  }

  /* ── New JD form ── */
  if (isNew) {
    const isEnabled = rawText.length >= 100;
    return (
      <div className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto space-y-8 animate-slide-up">
        <header className="flex flex-col gap-2 pb-6 border-b border-dark-700/50">
          <Link to="/dashboard" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors w-fit">← Dashboard</Link>
        </header>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-300 text-dark-950 font-bold text-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="font-display text-3xl font-semibold text-dark-50">Match Role Intelligence</h2>
          </div>
          <p className="text-dark-400 max-w-3xl mb-8">
            Paste the job description you're targeting. We'll run a deep ATS analysis, suggest specific wording improvements, 
            and draft a tailored cover letter based on your matched skills.
          </p>
          
          <div className="bg-dark-900/40 rounded-[2rem] border border-dark-700/50 p-1">
            <form className="panel-card rounded-[1.5rem] p-5 shadow-lg space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 text-sm font-medium text-dark-300 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> Job Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 text-sm font-medium text-dark-300 flex items-center gap-2">
                    <Building className="h-4 w-4" /> Company
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Stripe"
                    className="input-field w-full"
                  />
                </div>
              </div>

              {storedResumes.length > 0 && (
                <div>
                  <label className="mb-1 text-sm font-medium text-dark-300 flex items-center gap-2">
                    Match against resume (optional)
                  </label>
                  <select
                    className="input-field w-full appearance-none"
                    value={resumeId}
                    onChange={(e) => setResumeId(e.target.value)}
                  >
                    <option value="">— Skip for now —</option>
                    {storedResumes.map((r) => (
                      <option key={r.resumeId} value={r.resumeId}>{r.fileName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-dark-300 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Job Description
                  </label>
                  <span className={`text-xs ${rawText.length < 100 && rawText.length > 0 ? 'text-amber-400' : 'text-dark-400'}`}>
                    {rawText.length} chars
                  </span>
                </div>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste the full job description here... (Minimum 100 characters)"
                  rows={8}
                  className="input-field w-full resize-y p-4"
                  required
                />
                {rawText.length > 0 && rawText.length < 100 && (
                  <p className="mt-1 text-xs text-amber-400">Please enter at least 100 characters.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!isEnabled || submitting}
                className={`w-full rounded-2xl py-3 font-medium flex items-center justify-center gap-2 transition-all mt-4 ${
                  !isEnabled || submitting
                    ? 'bg-dark-700 text-dark-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-300 via-orange-300 to-teal-300 text-dark-950 shadow-[0_16px_28px_-14px_rgba(251,146,60,0.72)] hover:-translate-y-0.5'
                }`}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-dark-950 border-t-transparent animate-spin"></span>
                    Analyzing Job...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Analyze JD <Sparkles className="h-4 w-4" />
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* ── Mock Empty Dashboard State ── */}
          <div className="panel-card flex min-h-[400px] flex-col rounded-[1.5rem] p-5">
            <div className="mb-5 flex w-full items-center gap-2 overflow-x-auto border-b border-dark-700 pb-4">
              <div className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all bg-dark-800/50 text-dark-300 opacity-70">
                <BarChart3 className="h-4 w-4" />
                ATS Score
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all text-dark-500">
                <Sparkles className="h-4 w-4" />
                Enhancements
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all text-dark-500">
                <Mail className="h-4 w-4" />
                Cover Letter
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center text-center animate-pulse">
              <Zap className="h-10 w-10 text-dark-500 mb-4" />
              <p className="text-dark-300">Paste a job description to unlock ATS compatibility score.</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  /* ── View existing JD ── */
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading job description…</div>;
  if (!jd) return <div className="min-h-screen flex items-center justify-center text-gray-400">Job description not found. <Link to="/dashboard" className="text-blue-400 ml-2">Go back</Link></div>;

  const { extracted } = jd;

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-4">
          <Link to="/dashboard" className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 w-fit">← Dashboard</Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">{jd.title || 'Job Description'}</h1>
            {jd.company && <p className="text-xl text-gray-400 mt-1">{jd.company}</p>}
          </div>
        </div>
      </header>

      {/* ── Match action bar ── */}
      {storedResumes.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl shadow-lg">
          <select className="w-full sm:flex-1 px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-all appearance-none" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
            <option value="">Select resume to match…</option>
            {storedResumes.map((r) => (
              <option key={r.resumeId} value={r.resumeId}>{r.fileName}</option>
            ))}
          </select>
          <button className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap" onClick={handleMatch} disabled={matching || !resumeId}>
            {matching ? 'Matching…' : '🎯 Run ATS Match'}
          </button>
        </div>
      )}

      {/* ── Phase 6: turn detected gaps into an approval-gated roadmap / suggestions ── */}
      {(extracted?.skillsToImprove?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-200/90">
            {extracted.skillsToImprove.length} skill gap
            {extracted.skillsToImprove.length !== 1 ? 's' : ''} detected for this role.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/suggestions?jdId=${jd._id}${resumeId ? `&resumeId=${resumeId}` : ''}`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              🛠️ Improve resume
            </Link>
            <Link
              to={`/roadmap/${jd._id}`}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500"
            >
              🗺️ Build learning roadmap
            </Link>
          </div>
        </div>
      )}

      {/* ── Seniority badge ── */}
      {extracted?.seniority && extracted.seniority !== 'unspecified' && (
        <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl text-sm font-medium">
          Level: <strong className="ml-1 text-purple-300">{extracted.seniority}</strong>
        </div>
      )}

      {/* ── 4-field breakdown ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SkillSection
          title="Skills Required"
          icon="📋"
          skills={extracted?.skillsRequiredInJob ?? []}
          variant="neutral"
        />
        <SkillSection
          title="Matching Skills"
          icon="✅"
          skills={extracted?.matchingSkills ?? []}
          variant="green"
          empty="Run match against a resume to see matches"
        />
        <SkillSection
          title="Skills to Improve"
          icon="🎯"
          skills={extracted?.skillsToImprove ?? []}
          variant="amber"
          empty="No gaps detected"
        />
        <SkillSection
          title="Your Resume Skills"
          icon="👤"
          skills={extracted?.skillsFromResume ?? []}
          variant="blue"
          empty="Analyze with a resume for this breakdown"
        />
      </div>

      {/* Must-have / Nice-to-have */}
      {(extracted?.mustHave?.length > 0 || extracted?.niceToHave?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
          {extracted?.mustHave?.length > 0 && (
            <SkillSection title="Must Have" icon="🔴" skills={extracted.mustHave} variant="red" />
          )}
          {extracted?.niceToHave?.length > 0 && (
            <SkillSection title="Nice to Have" icon="🟡" skills={extracted.niceToHave} variant="amber" />
          )}
        </div>
      )}
    </div>
  );
}

function SkillSection({ title, icon, skills, variant, empty = 'None identified' }) {
  const styles = {
    neutral: 'bg-white/5 border-white/10 text-gray-200 chip-bg-white/10 chip-text-gray-300',
    green:   'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 chip-bg-emerald-500/10 chip-text-emerald-300',
    amber:   'bg-amber-500/5 border-amber-500/20 text-amber-400 chip-bg-amber-500/10 chip-text-amber-300',
    blue:    'bg-blue-500/5 border-blue-500/20 text-blue-400 chip-bg-blue-500/10 chip-text-blue-300',
    red:     'bg-red-500/5 border-red-500/20 text-red-400 chip-bg-red-500/10 chip-text-red-300',
  };

  const style = styles[variant];
  const [bgStyle, borderStyle, titleStyle, chipBg, chipText] = style.split(' ');

  return (
    <div className={`flex flex-col p-6 rounded-2xl border ${bgStyle} ${borderStyle}`}>
      <h3 className={`text-lg font-semibold flex items-center gap-2 mb-4 ${titleStyle}`}>
        {icon} {title} <span className="opacity-60 text-sm">({skills.length})</span>
      </h3>
      {skills.length === 0 ? (
        <p className="text-sm opacity-50 italic">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map((s, i) => (
            <span key={i} className={`px-3 py-1.5 rounded-lg text-xs font-medium border border-current/10 ${chipBg.replace('chip-', '')} ${chipText.replace('chip-', '')}`}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
