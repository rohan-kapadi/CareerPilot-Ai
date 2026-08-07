/**
 * ResumeViewerPage — Phase 1
 * Read-only structured view of a parsed resume with score overlay.
 * Score breakdown and explanation trace UI are added in Phase 4.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getResume } from '../services/api';

export default function ResumeViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResume(id)
      .then((res) => setResume(res.data?.data ?? null))
      .catch(() => toast.error('Failed to load resume'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-loading">Loading resume…</div>;
  if (!resume) return (
    <div className="page-error">Resume not found. <Link to="/dashboard">Go back</Link></div>
  );

  const { sections, atsScore, matchedSkills = [], missingSkills = [], originalFileName } = resume;
  const { personalInfo, summary, experience = [], education = [], skills = [], projects = [], certifications = [] } = sections ?? {};

  return (
    <div className="resume-viewer">
      {/* ── Header ── */}
      <header className="page-header">
        <Link to="/dashboard" className="back-link">← Dashboard</Link>
        <div className="page-header__actions">
          <button className="btn btn--ghost" onClick={() => navigate(`/editor/${id}`)}>✏️ Edit</button>
          <button className="btn btn--ghost" onClick={() => navigate(`/download/${id}`)}>⬇️ Export</button>
          <button className="btn btn--primary" onClick={() => navigate('/jd/new')}>🔍 Analyze JD</button>
        </div>
      </header>

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
    </div>
  );
}
