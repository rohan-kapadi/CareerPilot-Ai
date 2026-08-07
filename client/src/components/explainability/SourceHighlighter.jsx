/**
 * SourceHighlighter — Phase 4
 *
 * Hover-to-highlight component that visually links an explanation factor
 * to its source text snippet in the resume or job description.
 */
import { useState } from 'react';

export default function SourceHighlighter({ text = '', highlights = [], label }) {
  const [activeHighlight, setActiveHighlight] = useState(null);

  if (!text) {
    return <div className="source-highlighter source-highlighter--empty">No source text available.</div>;
  }

  return (
    <div className="source-highlighter">
      {label && <h4 className="source-highlighter__label">{label}</h4>}

      {/* Highlight trigger chips */}
      {highlights.length > 0 && (
        <div className="highlight-triggers">
          <span className="triggers-prompt">Hover to highlight sources:</span>
          {highlights.map((h, i) => (
            <button
              key={i}
              className={`trigger-chip ${activeHighlight === h.term ? 'trigger-chip--active' : ''}`}
              onMouseEnter={() => setActiveHighlight(h.term?.toLowerCase())}
              onMouseLeave={() => setActiveHighlight(null)}
            >
              {h.label || h.term}
            </button>
          ))}
        </div>
      )}

      {/* Render text with inline highlighting */}
      <div className="source-text-box">
        {renderHighlightedText(text, activeHighlight)}
      </div>
    </div>
  );
}

function renderHighlightedText(text, activeTerm) {
  if (!activeTerm) return <p className="source-prose">{text}</p>;

  const regex = new RegExp(`(${escapeRegExp(activeTerm)})`, 'gi');
  const parts = text.split(regex);

  return (
    <p className="source-prose">
      {parts.map((part, i) =>
        part.toLowerCase() === activeTerm ? (
          <mark key={i} className="source-mark">{part}</mark>
        ) : (
          part
        )
      )}
    </p>
  );
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
