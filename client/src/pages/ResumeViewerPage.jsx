/**
 * ResumeViewerPage — Phase 1, extended in Phase 7
 * Read-only structured view of a parsed resume with score overlay,
 * plus version history, side-by-side comparison and export (§6.8–§6.10).
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getResume } from '../services/api';
import { listVersions, restoreVersion, compareVersions } from '../api/versionApi';
import VersionTimeline from '../components/resume/VersionTimeline';
import SplitDiffView from '../components/resume/SplitDiffView';
import ExportModal from '../components/common/ExportModal';

export default function ResumeViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Phase 7 state ──
  const [versions, setVersions] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [showExport, setShowExport] = useState(false);

  const loadResume = useCallback(
    () =>
      getResume(id)
        .then((res) => setResume(res.data?.data ?? null))
        .catch(() => toast.error('Failed to load resume')),
    [id]
  );

  const loadVersions = useCallback(async () => {
    try {
      const res = await listVersions(id);
      setVersions(res.data?.data?.versions ?? []);
      setCurrentVersion(res.data?.data?.currentVersion ?? null);
    } catch {
      // Version history is supplementary — a failure here shouldn't block the page
      setVersions([]);
    }
  }, [id]);

  useEffect(() => {
    Promise.all([loadResume(), loadVersions()]).finally(() => setLoading(false));
  }, [loadResume, loadVersions]);

  async function handleRestore(versionNumber) {
    setRestoring(versionNumber);
    try {
      const res = await restoreVersion(id, versionNumber);
      toast.success(res.data?.message ?? 'Version restored');
      setComparison(null);
      await Promise.all([loadResume(), loadVersions()]);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to restore version');
    } finally {
      setRestoring(null);
    }
  }

  async function handleCompare(v1, v2) {
    try {
      const res = await compareVersions(id, v1, v2);
      setComparison(res.data?.data ?? null);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to compare versions');
    }
  }

  if (loading) return <div className="page-loading">Loading resume…</div>;
  if (!resume) return (
    <div className="page-error">Resume not found. <Link to="/dashboard">Go back</Link></div>
  );

  const { sections, atsScore, matchedSkills = [], missingSkills = [], originalFileName } = resume;
  const { personalInfo, summary, experience = [], education = [], skills = [], projects = [], certifications = [] } = sections ?? {};

  return (
    <div>
      <header className="bg-white/75 backdrop-blur-md border-b border-black/5 z-40 py-2">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 overflow-x-auto">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3 flex-shrink-0">
            <button onClick={() => navigate('/dashboard')} className="btn-ghost flex items-center gap-2 px-3 py-2">
              <span className="hidden sm:inline">← Dashboard</span>
            </button>
            <span className="font-display text-base font-semibold" style={{ color: '#111827' }}>📄 Resume</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="btn btn--ghost" onClick={() => navigate(`/editor/${id}`)}>✏️ Edit</button>
            <button className="btn btn--ghost" onClick={() => navigate(`/suggestions?resumeId=${id}`)}>🛠️ Suggestions</button>
            <button className="btn btn--ghost" onClick={() => setShowExport(true)}>⬇️ Export</button>
            <button className="btn btn--primary" onClick={() => navigate('/jd/new')}>🔍 Analyze JD</button>
          </div>
        </div>
      </header>

      <div className="resume-viewer">
      {/* ── Score overlay ── */}
      {atsScore != null && (
        <div className={`score-overlay ${atsScore >= 70 ? 'score--green' : atsScore >= 50 ? 'score--amber' : 'score--red'}`}>
          <div className="score-overlay__main">
            <span className="score-number">{atsScore}</span>
            <span className="score-label">/100 ATS Score</span>
          </div>
          {matchedSkills.length > 0 && (
            <div className="score-overlay__detail">
              <span className="score-detail-item score-detail--green">✅ {matchedSkills.length} matched skills</span>
              <span className="score-detail-item score-detail--red">❌ {missingSkills.length} missing skills</span>
            </div>
          )}
          {/* Phase 4 placeholder — Why? button */}
          <button className="btn btn--ghost btn--sm why-btn" disabled title="Detailed explanation coming in Phase 4">
            Why this score? (Phase 4)
          </button>
        </div>
      )}

      {/* ── Resume content ── */}
      <div className="resume-content">
        <div className="resume-doc">
          {/* Personal Info */}
          <section className="resume-section resume-section--header">
            <h1 className="resume-name">{personalInfo?.name || 'Name not parsed'}</h1>
            <div className="resume-contact">
              {personalInfo?.email && <span>✉️ {personalInfo.email}</span>}
              {personalInfo?.phone && <span>📞 {personalInfo.phone}</span>}
              {personalInfo?.location && <span>📍 {personalInfo.location}</span>}
              {personalInfo?.linkedin && (
                <a href={personalInfo.linkedin} target="_blank" rel="noreferrer">🔗 LinkedIn</a>
              )}
              {personalInfo?.github && (
                <a href={personalInfo.github} target="_blank" rel="noreferrer">💻 GitHub</a>
              )}
            </div>
          </section>

          {/* Summary */}
          {summary && (
            <section className="resume-section">
              <h2 className="resume-section-title">Summary</h2>
              <p className="resume-summary">{summary}</p>
            </section>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <section className="resume-section">
              <h2 className="resume-section-title">Experience</h2>
              {experience.map((exp, i) => (
                <div key={i} className="resume-exp-item">
                  <div className="resume-exp-header">
                    <span className="resume-exp-role">{exp.role}</span>
                    <span className="resume-exp-duration">{exp.duration}</span>
                  </div>
                  <span className="resume-exp-company">{exp.company}</span>
                  <ul className="resume-bullets">
                    {(exp.bullets ?? []).map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {/* Education */}
          {education.length > 0 && (
            <section className="resume-section">
              <h2 className="resume-section-title">Education</h2>
              {education.map((edu, i) => (
                <div key={i} className="resume-edu-item">
                  <span className="resume-edu-institution">{edu.institution}</span>
                  <span className="resume-edu-degree">{edu.degree} {edu.year && `(${edu.year})`}</span>
                  {edu.gpa && <span className="resume-edu-gpa">GPA: {edu.gpa}</span>}
                </div>
              ))}
            </section>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <section className="resume-section">
              <h2 className="resume-section-title">Skills</h2>
              <div className="skill-chips">
                {skills.map((s, i) => (
                  <span
                    key={i}
                    className={`chip ${matchedSkills.includes(s) ? 'chip--green' : missingSkills.includes(s) ? 'chip--red' : 'chip--neutral'}`}
                    title={matchedSkills.includes(s) ? 'JD match' : missingSkills.includes(s) ? 'JD requires this' : ''}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <section className="resume-section">
              <h2 className="resume-section-title">Projects</h2>
              {projects.map((p, i) => (
                <div key={i} className="resume-project-item">
                  <div className="resume-project-header">
                    <span className="resume-project-name">{p.name}</span>
                    {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="resume-project-link">🔗</a>}
                  </div>
                  {p.description && <p className="resume-project-desc">{p.description}</p>}
                  {p.techStack?.length > 0 && (
                    <div className="skill-chips skill-chips--sm">
                      {p.techStack.map((t, j) => <span key={j} className="chip chip--blue">{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <section className="resume-section">
              <h2 className="resume-section-title">Certifications</h2>
              <ul className="resume-certs">
                {certifications.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* ── Phase 7: Version history & comparison ── */}
      <div className="mx-auto mt-4 max-w-4xl space-y-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: '#111827' }}>🕐 Version History</h2>
            <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
              Every approved change is recorded. Select two versions to compare them.
            </p>
          </div>
          {currentVersion != null && (
            <span className="pill">
              Current: v{currentVersion}
            </span>
          )}
        </div>

        {comparison && (
          <SplitDiffView comparison={comparison} onClose={() => setComparison(null)} />
        )}

        <VersionTimeline
          versions={versions}
          currentVersion={currentVersion}
          onRestore={handleRestore}
          onCompare={handleCompare}
          restoring={restoring}
        />
      </div>

      {/* ── Phase 7: Export ── */}
      {showExport && (
        <ExportModal
          resumeId={id}
          resumeName={personalInfo?.name || originalFileName || 'Resume'}
          onClose={() => setShowExport(false)}
        />
      )}
      </div>
    </div>
  );
}
