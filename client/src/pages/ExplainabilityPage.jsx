/**
 * ExplainabilityPage — Phase 4
 * Dedicated Deep-Dive Screen (PROJECT.md §13.9).
 * Renders full reasoning factor breakdown, confidence badge, alternatives,
 * and source highlighter for a specific match ID.
 */
import { useParams, Link } from 'react-router-dom';
import { useExplanationTrace } from '../hooks/useExplanationTrace';
import ReasoningTrace from '../components/explainability/ReasoningTrace';
import SourceHighlighter from '../components/explainability/SourceHighlighter';
import ConfidenceBadge from '../components/explainability/ConfidenceBadge';

export default function ExplainabilityPage() {
  const { matchId } = useParams();
  const { trace, match, loading, error } = useExplanationTrace(matchId);

  if (loading) {
    return <div className="page-loading">Loading explanation breakdown…</div>;
  }

  if (error || !match) {
    return (
      <div className="explain-page">
        <Link to="/dashboard" className="back-link">← Dashboard</Link>
        <div className="explain-empty">
          <p>{error || 'Match record not found.'}</p>
        </div>
      </div>
    );
  }

  const highlights = (match.categoryBreakdown?.keyword_match?.matched || []).slice(0, 8).map(k => ({
    term: k,
    label: k,
  }));

  return (
    <div className="explain-page">
      {/* ── Header ── */}
      <header className="explain-header">
        <Link to="/dashboard" className="back-link">← Dashboard</Link>
        <div className="explain-header__titles">
          <h1 className="explain-title">🔍 Explainable AI Deep-Dive</h1>
          <p className="explain-sub">
            Complete transparent reasoning breakdown for match between <span className="highlight">{match.resumeId?.originalFileName || 'Resume'}</span> and <span className="highlight">{match.jdId?.title || 'Job Description'}</span>.
          </p>
        </div>
        <div className="explain-score-pill">
          <span className="score-num">{match.overallScore}%</span>
          <span className="score-label">Overall Match</span>
        </div>
      </header>

      {/* ── Main Breakdown Grid ── */}
      <div className="explain-grid">
        {/* Left: Reasoning Trace */}
        <section className="explain-section">
          <div className="explain-section__header">
            <h2 className="explain-section__title">Evaluation Breakdown</h2>
            <ConfidenceBadge confidence={trace?.confidence} />
          </div>
          <ReasoningTrace trace={trace} compact={false} />
        </section>

        {/* Right: Source Highlighter & Category Scores */}
        <section className="explain-section">
          <h2 className="explain-section__title">Source Evidence & Highlights</h2>
          <SourceHighlighter
            text={match.jdId?.rawText || 'Job description text'}
            highlights={highlights}
            label="Job Description Source Text"
          />

          {/* Quick Wins */}
          {match.quickWins?.length > 0 && (
            <div className="quick-wins-card">
              <h4 className="quick-wins-title">⚡ Quick Wins</h4>
              <ul className="quick-wins-list">
                {match.quickWins.map((w, i) => (
                  <li key={i} className="quick-win-item">✓ {w}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
