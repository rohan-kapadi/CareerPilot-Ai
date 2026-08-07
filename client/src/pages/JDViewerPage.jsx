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
    return (
      <div className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col gap-2 pb-6 border-b border-white/10">
          <Link to="/dashboard" className="text-sm text-blue-400 hover:text-blue-300 transition-colors w-fit">← Dashboard</Link>
          <h1 className="text-3xl font-bold text-white">Analyze Job Description</h1>
        </header>

        <form className="space-y-6 bg-white/5 p-6 md:p-8 rounded-2xl border border-white/10 shadow-xl" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Job Title <span className="text-gray-500 font-normal">(optional)</span></label>
            <input className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Software Engineer" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Company <span className="text-gray-500 font-normal">(optional)</span></label>
            <input className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Acme Corp" />
          </div>
          {storedResumes.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Match against resume <span className="text-gray-500 font-normal">(optional)</span></label>
              <select className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                <option value="">— Skip for now —</option>
                {storedResumes.map((r) => (
                  <option key={r.resumeId} value={r.resumeId}>{r.fileName}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Job Description <span className="text-red-400">*</span></label>
            <textarea
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-y"
              rows={14}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste the full job description here…"
              required
            />
          </div>
          <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed" disabled={submitting}>
            {submitting ? 'Analyzing…' : '🔍 Analyze JD'}
          </button>
        </form>
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
