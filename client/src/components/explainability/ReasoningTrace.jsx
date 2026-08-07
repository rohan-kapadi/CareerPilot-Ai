/**
 * ReasoningTrace — Phase 4
 *
 * Expandable factor list displaying weights, scores, evidence chips, and
 * alternative improvement paths for an ExplanationTrace.
 */
import { useState } from 'react';
import ConfidenceBadge from './ConfidenceBadge';

export default function ReasoningTrace({ trace, compact = false }) {
  const [expanded, setExpanded] = useState(!compact);

  if (!trace || !Array.isArray(trace.reasoning)) {
    return (
      <div className="reasoning-trace reasoning-trace--empty">
        <p className="reasoning-trace__text">No detailed reasoning trace available for this score.</p>
      </div>
    );
  }

  const { output, reasoning, confidence, alternatives = [], sources = [], criticFlagsCount } = trace;

  return (
    <div className="reasoning-trace">
      {/* Header / Summary */}
      <div className="reasoning-trace__header" onClick={() => setExpanded(!expanded)}>
        <div className="reasoning-trace__summary">
          <span className="reasoning-trace__icon">🔍</span>
          <span className="reasoning-trace__title">{output || 'Explanation Breakdown'}</span>
          <ConfidenceBadge confidence={confidence} />
          {criticFlagsCount > 0 && (
            <span className="critic-flag-chip" title="Critic Agent downgraded unverified claims">
              ⚠️ Reviewed by Critic
            </span>
          )}
        </div>
        <button className="reasoning-trace__toggle">
          {expanded ? '▼ Hide Reasoning' : '▶ Why? (View Breakdown)'}
        </button>
      </div>

      {/* Factor breakdown details */}
      {expanded && (
        <div className="reasoning-trace__details">
          <h4 className="reasoning-trace__sub-title">Evaluation Factors & Weights</h4>

          <div className="reasoning-factors-list">
            {reasoning.map((r, i) => {
              const weightPct = Math.round((r.weight || 0.25) * 100);
              const scorePct  = Math.round((r.score || 0.75) * 100);
              const scoreColor = scorePct >= 80 ? '#10b981' : scorePct >= 60 ? '#f59e0b' : '#ef4444';

              return (
                <div key={i} className="reasoning-factor-card">
                  <div className="factor-header">
                    <span className="factor-name">{r.factor}</span>
                    <span className="factor-weight">Weight: {weightPct}%</span>
                    <span className="factor-score" style={{ color: scoreColor }}>
                      Score: {scorePct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="factor-bar-track">
                    <div
                      className="factor-bar-fill"
                      style={{ width: `${scorePct}%`, background: scoreColor }}
                    />
                  </div>

                  {/* Evidence text */}
                  {r.evidence && (
                    <p className="factor-evidence">
                      <span className="evidence-label">Evidence:</span> {r.evidence}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actionable Alternatives */}
          {alternatives.length > 0 && (
            <div className="reasoning-trace__alternatives">
              <h4 className="reasoning-trace__sub-title">💡 How to Improve This Outcome</h4>
              <ul className="alternatives-list">
                {alternatives.map((alt, i) => (
                  <li key={i} className="alternative-item">→ {alt}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Source citations */}
          {sources.length > 0 && (
            <div className="reasoning-trace__sources">
              <span className="sources-label">Sources:</span>
              <div className="sources-chips">
                {sources.map((src, i) => (
                  <span key={i} className="chip chip--neutral">{src}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
