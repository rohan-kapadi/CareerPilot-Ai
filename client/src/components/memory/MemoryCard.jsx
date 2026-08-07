/**
 * MemoryCard — Phase 3 (Core Innovation)
 * The negotiation card UI (PROJECT.md §7.2).
 * Renders a proposed memory with Accept / Modify / Reject / Time-box actions.
 */
import { useState } from 'react';

const TYPE_COLORS = {
  session:   '#64748b',
  temporary: '#f59e0b',
  long_term: '#10b981',
  career:    '#6366f1',
  sensitive: '#ef4444',
  hidden:    '#8b5cf6',
};

const TYPE_LABELS = {
  session:   '⏱ Session',
  temporary: '🕐 Temporary',
  long_term: '🔒 Long-term',
  career:    '💼 Career',
  sensitive: '🔴 Sensitive',
  hidden:    '🔮 Inferred',
};

const TIMEBOX_OPTIONS = [
  { label: 'This session only', days: 0 },
  { label: '30 days',           days: 30 },
  { label: '90 days',           days: 90 },
  { label: 'Long-term',         days: null },
];

export default function MemoryCard({ memory, onDecide, deciding }) {
  const [mode, setMode]         = useState('view'); // 'view' | 'modify' | 'timebox'
  const [editText, setEditText] = useState(memory.userModifiedContent || memory.content);
  const [timeboxIdx, setTimeboxIdx] = useState(1); // default 30 days

  const isSensitive = memory.type === 'sensitive';
  const confPct = Math.round((memory.confidence || 0) * 100);
  const confLabel = confPct >= 90 ? 'Explicit' : confPct >= 70 ? 'Inferred' : 'Low confidence';
  const confColor = confPct >= 90 ? '#10b981' : confPct >= 70 ? '#f59e0b' : '#ef4444';
  const typeColor = TYPE_COLORS[memory.type] || '#6366f1';
  const isDeciding = deciding === memory._id;

  function handleAccept() {
    onDecide(memory._id, 'accept');
  }

  function handleModify() {
    if (mode !== 'modify') { setMode('modify'); return; }
    onDecide(memory._id, 'modify', { content: editText });
  }

  function handleReject() {
    onDecide(memory._id, 'reject');
  }

  function handleTimebox() {
    if (mode !== 'timebox') { setMode('timebox'); return; }
    const opt = TIMEBOX_OPTIONS[timeboxIdx];
    const expiresAt = opt.days === null ? null
      : opt.days === 0 ? new Date().toISOString()
      : (() => { const d = new Date(); d.setDate(d.getDate() + opt.days); return d.toISOString(); })();
    onDecide(memory._id, 'timebox', { expiresAt });
  }

  return (
    <div className={`memory-card ${isSensitive ? 'memory-card--sensitive' : ''}`}>
      {/* Header */}
      <div className="memory-card__header">
        <span className="memory-card__icon">🧠</span>
        <div className="memory-card__titles">
          <span className="memory-card__title">New Memory Proposed</span>
          <span className="memory-card__badges">
            <span className="memory-type-badge" style={{ background: typeColor + '22', color: typeColor, borderColor: typeColor + '44' }}>
              {TYPE_LABELS[memory.type] || memory.type}
            </span>
            <span className="memory-cat-badge">
              {memory.category}
            </span>
          </span>
        </div>
      </div>

      {/* Sensitive warning */}
      {isSensitive && (
        <div className="memory-card__sensitive-warn">
          ⚠️ This contains sensitive information. I'll ask you to re-confirm this every 90 days.
        </div>
      )}

      {/* Content / Edit area */}
      <div className="memory-card__content">
        {mode === 'modify' ? (
          <textarea
            className="memory-card__edit"
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={3}
            autoFocus
          />
        ) : (
          <p className="memory-card__fact">"{memory.content}"</p>
        )}
      </div>

      {/* Confidence */}
      <div className="memory-card__meta">
        <span className="memory-conf" style={{ color: confColor }}>
          Confidence: {confPct}% ({confLabel})
        </span>
      </div>

      {/* Rationale */}
      {memory.rationale && (
        <div className="memory-card__rationale">
          <span className="memory-card__rationale-label">Why I want to remember this:</span>
          <p className="memory-card__rationale-text">→ {memory.rationale}</p>
        </div>
      )}

      {/* Timebox picker */}
      {mode === 'timebox' && (
        <div className="memory-card__timebox">
          <p className="memory-card__timebox-label">Remember for how long?</p>
          <div className="memory-card__timebox-options">
            {TIMEBOX_OPTIONS.map((opt, i) => (
              <button
                key={i}
                className={`timebox-opt ${timeboxIdx === i ? 'timebox-opt--active' : ''}`}
                onClick={() => setTimeboxIdx(i)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="memory-card__actions">
        <button
          className="memory-btn memory-btn--accept"
          onClick={handleAccept}
          disabled={isDeciding}
        >
          {isDeciding ? '…' : '✅ Accept'}
        </button>
        <button
          className={`memory-btn memory-btn--modify ${mode === 'modify' ? 'memory-btn--active' : ''}`}
          onClick={handleModify}
          disabled={isDeciding}
        >
          {mode === 'modify' ? '💾 Save Edit' : '✏️ Modify'}
        </button>
        <button
          className="memory-btn memory-btn--reject"
          onClick={handleReject}
          disabled={isDeciding}
        >
          ✕ Reject
        </button>
        <button
          className={`memory-btn memory-btn--timebox ${mode === 'timebox' ? 'memory-btn--active' : ''}`}
          onClick={handleTimebox}
          disabled={isDeciding}
        >
          {mode === 'timebox' ? `⏱ Set ${TIMEBOX_OPTIONS[timeboxIdx].label}` : '⏱ Time-box ▾'}
        </button>
      </div>
    </div>
  );
}
