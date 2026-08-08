/**
 * LandingPage — public marketing page at "/".
 *
 * Deliberately rendered OUTSIDE GlobalLayout: GlobalNavbar carries authenticated
 * links and a Sign Out button, neither of which makes sense to a logged-out
 * visitor. This page ships its own minimal public header instead.
 *
 * Copy leans on the product's actual differentiator rather than generic AI
 * claims: every resume change is approval-gated, and every fact the AI learns
 * is a memory card the user can accept, edit, time-box, or reject.
 */
import { Link } from 'react-router-dom';

const CAPABILITIES = [
  'ATS scoring',
  'JD matching',
  'Cover letters',
  'Learning roadmaps',
  'Version history',
  'PII redaction',
];

const STEPS = [
  {
    n: '01',
    title: 'Upload or build',
    body:
      'Drop a PDF or DOCX and we parse it into structured sections — or build one from scratch, section by section, with an assistant that asks you questions instead of inventing facts.',
  },
  {
    n: '02',
    title: 'Match against the job',
    body:
      'Paste a job description. Get an ATS compatibility score, the exact skills you match, the ones you are missing, and a factor-by-factor breakdown of why the score is what it is.',
  },
  {
    n: '03',
    title: 'Approve what changes',
    body:
      'Every suggestion lands in a review queue as a before/after diff. Approve, edit, or reject it. Nothing is written to your resume until you say so — and every version is restorable.',
  },
];

const FEATURES = [
  {
    icon: '📄',
    title: 'Resume parsing',
    body: 'PDF and DOCX in, clean structured sections out — experience, education, skills, projects.',
  },
  {
    icon: '🎯',
    title: 'ATS scoring',
    body: 'Score any resume against any role, with matched and missing skills called out individually.',
  },
  {
    icon: '✍️',
    title: 'Guided AI builder',
    body: 'Draft a resume one section at a time, accepting or editing each piece before it lands.',
  },
  {
    icon: '🧠',
    title: 'Negotiated memory',
    body: 'Every fact the AI learns about you is a card you accept, edit, time-box, or forget entirely.',
  },
  {
    icon: '🔍',
    title: 'Explainable results',
    body: 'Each score traces back to weighted factors and the evidence behind them. No black box.',
  },
  {
    icon: '🗺️',
    title: 'Learning roadmaps',
    body: 'Turn a detected skill gap into sequenced milestones, with prerequisites mapped out.',
  },
];

const PILLARS = [
  {
    icon: '✅',
    title: 'Approval-gated by default',
    body: 'No agent writes to your resume directly. Changes arrive as diffs in a review queue you control.',
  },
  {
    icon: '⏳',
    title: 'Memory with an expiry date',
    body: 'Time-box what the AI remembers to a session, 30 days, 90 days — or revoke it whenever you want.',
  },
  {
    icon: '🔒',
    title: 'Portable and deletable',
    body: 'Export or delete your data by category, and redact detected PII before any file leaves the app.',
  },
];

export default function LandingPage() {
  return (
    <div className="lp">
      {/* ── Public header ── */}
      <header className="lp-nav">
        <div className="page-wrap flex h-16 items-center gap-3">
          <a href="#top" className="lp-brand" aria-label="CareerPilot AI home" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo.svg" alt="CareerPilot Logo" className="h-9 w-9 rounded-xl object-contain" />
            <span className="lp-brand__name" style={{ marginLeft: '6px' }}>CareerPilot AI</span>
          </a>

          <nav className="lp-nav__links" aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#trust">Trust</a>
          </nav>

          <div className="ml-auto flex flex-shrink-0 items-center gap-2">
            <Link to="/login" className="btn-secondary lp-nav__signin">
              Sign in
            </Link>
            <Link to="/login" state={{ register: true }} className="btn-primary lp-nav__cta">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ── Hero ── */}
        <section className="page-wrap lp-hero">
          <div className="lp-hero__copy">
            <span className="section-kicker">Consent-first career AI</span>

            <h1 className="lp-h1">
              Your resume, tuned to the job.{' '}
              <span className="gradient-text">Your data, on your terms.</span>
            </h1>

            <p className="lp-lede">
              CareerPilot AI parses your resume, scores it against any job description, and drafts
              the improvements — but it never changes a word, or remembers a thing about you,
              without your explicit approval.
            </p>

            <div className="lp-cta-row">
              <Link to="/login" state={{ register: true }} className="btn-primary lp-cta">
                Get started free
              </Link>
              <a href="#how" className="btn-secondary lp-cta">
                See how it works
              </a>
            </div>

            <p className="lp-microtrust">
              Free to start · Nothing applied without your approval · Delete your data anytime
            </p>
          </div>

          {/* Hero visual — built from the app's real components so it reads as
              a genuine preview rather than stock marketing art. */}
          <div className="lp-hero__visual" aria-hidden="true">
            <div className="lp-mock lp-mock--score panel-card">
              <div className="lp-mock__head">
                <span className="lp-mock__label">ATS Match</span>
                <span className="lp-mock__role">Senior Frontend Engineer</span>
              </div>
              <div className="lp-score">
                <span className="lp-score__num">82</span>
                <span className="lp-score__den">/100</span>
              </div>
              <div className="lp-bar">
                <span className="lp-bar__fill" style={{ width: '82%' }} />
              </div>
              <div className="lp-chips">
                <span className="chip chip--green">React</span>
                <span className="chip chip--green">TypeScript</span>
                <span className="chip chip--green">Testing</span>
                <span className="chip chip--red">GraphQL</span>
              </div>
            </div>

            <div className="lp-mock lp-mock--memory">
              <div className="memory-card">
                <div className="memory-card__header">
                  <span className="memory-card__icon">🧠</span>
                  <div className="memory-card__titles">
                    <span className="memory-card__title">New Memory Proposed</span>
                    <span className="memory-card__badges">
                      <span
                        className="memory-type-badge"
                        style={{
                          background: '#10b98122',
                          color: '#10b981',
                          borderColor: '#10b98144',
                        }}
                      >
                        🔒 Long-term
                      </span>
                      <span className="memory-cat-badge">goals</span>
                    </span>
                  </div>
                </div>
                <div className="memory-card__content">
                  <p className="memory-card__fact">
                    "Targeting senior frontend roles at product-led companies."
                  </p>
                </div>
                <div className="memory-card__actions">
                  <button type="button" className="memory-btn memory-btn--accept" tabIndex={-1}>
                    ✅ Accept
                  </button>
                  <button type="button" className="memory-btn" tabIndex={-1}>
                    ✏️ Modify
                  </button>
                  <button type="button" className="memory-btn memory-btn--reject" tabIndex={-1}>
                    ✕ Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Capability strip ── */}
        <section className="page-wrap lp-strip" aria-label="Capabilities">
          {CAPABILITIES.map((c) => (
            <span key={c} className="lp-strip__item">
              {c}
            </span>
          ))}
        </section>

        {/* ── How it works ── */}
        <section id="how" className="page-wrap lp-section">
          <div className="lp-section__head">
            <span className="section-kicker">How it works</span>
            <h2 className="lp-h2">Three steps, and you stay in the loop for all of them.</h2>
          </div>

          <ol className="lp-steps">
            {STEPS.map((s) => (
              <li key={s.n} className="lp-step panel-card">
                <span className="lp-step__n">{s.n}</span>
                <h3 className="lp-step__title">{s.title}</h3>
                <p className="lp-step__body">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Features ── */}
        <section id="features" className="page-wrap lp-section">
          <div className="lp-section__head">
            <span className="section-kicker">Features</span>
            <h2 className="lp-h2">Everything the job search actually asks of you.</h2>
          </div>

          <div className="lp-grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="lp-card panel-card">
                <span className="lp-card__icon">{f.icon}</span>
                <h3 className="lp-card__title">{f.title}</h3>
                <p className="lp-card__body">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Trust ── */}
        <section id="trust" className="page-wrap lp-section">
          <div className="lp-trust panel-card-strong">
            <div className="lp-trust__copy">
              <span className="section-kicker">Why it's different</span>
              <h2 className="lp-h2">Nothing happens behind your back.</h2>
              <p className="lp-lede lp-lede--tight">
                Most AI tools rewrite your resume and quietly build a profile of you. This one asks
                first — every single time — and shows its reasoning when it does.
              </p>

              <ul className="lp-pillars">
                {PILLARS.map((p) => (
                  <li key={p.title} className="lp-pillar">
                    <span className="lp-pillar__icon">{p.icon}</span>
                    <div>
                      <h3 className="lp-pillar__title">{p.title}</h3>
                      <p className="lp-pillar__body">{p.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="page-wrap lp-section">
          <div className="lp-final">
            <h2 className="lp-h2 lp-final__title">Ready when you are.</h2>
            <p className="lp-lede lp-lede--tight lp-final__sub">
              Upload a resume, paste a job description, and see where you actually stand.
            </p>
            <Link to="/login" state={{ register: true }} className="btn-primary lp-cta">
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="page-wrap lp-footer__inner">
          <span className="lp-footer__brand">
            <img src="/logo.svg" alt="CareerPilot Logo" className="h-7 w-7 rounded-lg object-contain" />
            CareerPilot AI
          </span>
          <span className="lp-footer__note">© 2026 CareerPilot AI — Premium Intelligence Suite</span>
        </div>
      </footer>

      <style>{`
        .lp { min-height: 100vh; color: var(--text-primary); }

        /* ── Public header ── */
        .lp-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(245,237,224,0.82);
          border-bottom: 1px solid rgba(0,0,0,0.07);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .lp-brand {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          text-decoration: none;
          flex-shrink: 0;
        }
        .lp-brand__name {
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-primary);
          white-space: nowrap;
        }
        .lp-nav__links {
          display: none;
          align-items: center;
          gap: 0.25rem;
          margin-left: 1rem;
        }
        .lp-nav__links a {
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--text-secondary);
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .lp-nav__links a:hover {
          background: rgba(0,0,0,0.06);
          color: var(--text-primary);
        }
        .lp-nav__signin { padding: 0.45rem 1rem; font-size: 0.82rem; }
        .lp-nav__cta { padding: 0.5rem 1.1rem; font-size: 0.82rem; }
        @media (min-width: 860px) { .lp-nav__links { display: flex; } }
        @media (max-width: 480px) { .lp-nav__signin { display: none; } }

        /* ── Hero ── */
        .lp-hero {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3rem;
          align-items: center;
          padding-top: 4rem;
          padding-bottom: 3.5rem;
        }
        @media (min-width: 1024px) {
          .lp-hero {
            grid-template-columns: 1.05fr 0.95fr;
            padding-top: 5.5rem;
            padding-bottom: 5rem;
            gap: 3.5rem;
          }
        }
        .lp-hero__copy { min-width: 0; }

        .lp-h1 {
          margin-top: 1.25rem;
          font-family: 'Outfit', 'Sora', system-ui, sans-serif;
          font-size: clamp(2.35rem, 6vw, 3.9rem);
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -0.035em;
          color: var(--text-primary);
        }
        .lp-lede {
          margin-top: 1.35rem;
          max-width: 34rem;
          font-size: 1.03rem;
          line-height: 1.75;
          color: var(--text-muted);
        }
        .lp-lede--tight { margin-top: 1rem; font-size: 0.95rem; }

        .lp-cta-row {
          margin-top: 2rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .lp-cta {
          padding: 0.85rem 1.6rem;
          font-size: 0.92rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .lp-microtrust {
          margin-top: 1.25rem;
          font-size: 0.78rem;
          color: var(--text-faint);
        }

        /* ── Hero visual ── */
        .lp-hero__visual {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          min-width: 0;
        }
        @media (min-width: 1024px) {
          .lp-hero__visual { padding-left: 1.5rem; }
        }
        .lp-mock { animation: lp-float 7s ease-in-out infinite; }
        .lp-mock--score { padding: 1.4rem 1.5rem; }
        .lp-mock--memory {
          animation-delay: -3.5s;
          max-width: 25rem;
          align-self: flex-end;
          width: 100%;
        }

        .lp-mock__head {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          margin-bottom: 0.9rem;
        }
        .lp-mock__label {
          font-size: 0.66rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--text-faint);
        }
        .lp-mock__role {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .lp-score { display: flex; align-items: baseline; gap: 0.3rem; }
        .lp-score__num {
          font-family: 'Outfit', 'Sora', system-ui, sans-serif;
          font-size: 3rem;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.04em;
          color: #059669;
        }
        .lp-score__den { font-size: 0.9rem; font-weight: 600; color: var(--text-faint); }
        .lp-bar {
          margin-top: 0.9rem;
          height: 7px;
          width: 100%;
          border-radius: 999px;
          background: rgba(0,0,0,0.07);
          overflow: hidden;
        }
        .lp-bar__fill {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #34d399, #059669);
        }
        .lp-chips { margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.4rem; }

        @keyframes lp-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-9px); }
        }

        /* ── Capability strip ── */
        .lp-strip {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem 1.75rem;
          padding-top: 0.5rem;
          padding-bottom: 3.5rem;
        }
        .lp-strip__item {
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--text-faint);
        }

        /* ── Shared section shell ── */
        .lp-section { padding-top: 3.5rem; padding-bottom: 3.5rem; }
        .lp-section__head { max-width: 42rem; margin-bottom: 2.25rem; }
        .lp-h2 {
          margin-top: 1rem;
          font-family: 'Outfit', 'Sora', system-ui, sans-serif;
          font-size: clamp(1.65rem, 3.4vw, 2.35rem);
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.028em;
          color: var(--text-primary);
        }

        /* ── Steps ── */
        .lp-steps {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.15rem;
          list-style: none;
          padding: 0;
          margin: 0;
        }
        @media (min-width: 820px) {
          .lp-steps { grid-template-columns: repeat(3, 1fr); }
        }
        .lp-step { padding: 1.6rem; }
        .lp-step__n {
          font-family: 'Outfit', 'Sora', system-ui, sans-serif;
          font-size: 0.82rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #d97706;
        }
        .lp-step__title {
          margin-top: 0.65rem;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .lp-step__body {
          margin-top: 0.5rem;
          font-size: 0.87rem;
          line-height: 1.7;
          color: var(--text-muted);
        }

        /* ── Feature grid ── */
        .lp-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.15rem;
        }
        @media (min-width: 640px) { .lp-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .lp-grid { grid-template-columns: repeat(3, 1fr); } }

        .lp-card {
          padding: 1.6rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .lp-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 42px rgba(0,0,0,0.1);
        }
        .lp-card__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.6rem;
          height: 2.6rem;
          border-radius: 0.85rem;
          background: rgba(0,0,0,0.05);
          font-size: 1.3rem;
        }
        .lp-card__title {
          margin-top: 0.9rem;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .lp-card__body {
          margin-top: 0.4rem;
          font-size: 0.86rem;
          line-height: 1.7;
          color: var(--text-muted);
        }

        /* ── Trust ── */
        .lp-trust { padding: 2.25rem; }
        @media (min-width: 900px) { .lp-trust { padding: 3rem; } }
        .lp-trust__copy { max-width: 46rem; }

        .lp-pillars {
          margin-top: 2rem;
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
          list-style: none;
          padding: 0;
        }
        @media (min-width: 780px) {
          .lp-pillars { grid-template-columns: repeat(3, 1fr); gap: 1.75rem; }
        }
        .lp-pillar { display: flex; gap: 0.8rem; align-items: flex-start; }
        .lp-pillar__icon { font-size: 1.15rem; line-height: 1.4; flex-shrink: 0; }
        .lp-pillar__title {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .lp-pillar__body {
          margin-top: 0.3rem;
          font-size: 0.83rem;
          line-height: 1.65;
          color: var(--text-muted);
        }

        /* ── Final CTA ── */
        .lp-final { text-align: center; padding: 1rem 0 2rem; }
        .lp-final__title { margin-top: 0; }
        .lp-final__sub { margin-left: auto; margin-right: auto; }
        .lp-final .lp-cta { margin-top: 1.75rem; }

        /* ── Footer ── */
        .lp-footer {
          border-top: 1px solid rgba(0,0,0,0.07);
          margin-top: 1.5rem;
        }
        .lp-footer__inner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding-top: 1.75rem;
          padding-bottom: 1.75rem;
        }
        .lp-footer__brand {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-secondary);
        }
        .lp-footer__note { font-size: 0.78rem; color: var(--text-faint); }

        /* ── Focus visibility (matches the app's input focus ring) ── */
        .lp a:focus-visible,
        .lp button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.35);
          border-radius: 999px;
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-mock { animation: none; }
          .lp-card { transition: none; }
          .lp-card:hover { transform: none; }
        }
      `}</style>
    </div>
  );
}
