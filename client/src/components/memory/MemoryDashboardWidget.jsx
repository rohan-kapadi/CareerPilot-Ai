/**
 * MemoryDashboardWidget — Phase 3
 * Compact summary widget for DashboardPage.jsx.
 * Shows memory counts by category + expiring-soon alert.
 */
import { Link } from 'react-router-dom';
import { useMemory } from '../../context/MemoryContext';

const CAT_ICONS = {
  skills:      '⚡',
  experience:  '💼',
  goals:       '🎯',
  preferences: '⚙️',
  constraints: '📍',
  sensitive:   '🔴',
  inferred:    '🔮',
};

export default function MemoryDashboardWidget() {
  const { memories, proposed } = useMemory();

  // Count accepted/modified by category
  const counts = memories.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {});

  // Expiring within 7 days
  const expiringSoon = memories.filter(m => {
    if (!m.expiresAt) return false;
    const diff = new Date(m.expiresAt) - new Date();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="memory-widget">
      <div className="memory-widget__header">
        <span className="memory-widget__icon">🧠</span>
        <h3 className="memory-widget__title">Memory</h3>
        <Link to="/memory" className="memory-widget__link">View all →</Link>
      </div>

      <div className="memory-widget__stats">
        <div className="memory-stat">
          <span className="memory-stat__num">{memories.length}</span>
          <span className="memory-stat__label">Active</span>
        </div>
        <div className="memory-stat">
          <span className="memory-stat__num memory-stat__num--pending">{proposed.length}</span>
          <span className="memory-stat__label">Pending</span>
        </div>
        <div className="memory-stat">
          <span className="memory-stat__num memory-stat__num--warn">{expiringSoon.length}</span>
          <span className="memory-stat__label">Expiring</span>
        </div>
      </div>

      {/* Category breakdown */}
      {Object.keys(counts).length > 0 && (
        <div className="memory-widget__cats">
          {Object.entries(counts).map(([cat, count]) => (
            <span key={cat} className="memory-cat-chip">
              {CAT_ICONS[cat] || '🔹'} {cat} <strong>{count}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Expiring-soon alert */}
      {expiringSoon.length > 0 && (
        <div className="memory-widget__expiry-alert">
          ⚠️ {expiringSoon.length} {expiringSoon.length === 1 ? 'memory expires' : 'memories expire'} within 7 days.
          <Link to="/memory?filter=expiring" className="expiry-link"> Review →</Link>
        </div>
      )}

      {/* Pending cards CTA */}
      {proposed.length > 0 && (
        <div className="memory-widget__pending">
          🧠 {proposed.length} new {proposed.length === 1 ? 'Memory Card' : 'Memory Cards'} waiting for your decision.
          <Link to="/chat" className="pending-link"> Review in chat →</Link>
        </div>
      )}

      {memories.length === 0 && proposed.length === 0 && (
        <p className="memory-widget__empty">No memories yet. Start a career chat!</p>
      )}
    </div>
  );
}
