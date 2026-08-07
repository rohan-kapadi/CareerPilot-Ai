/**
 * MemoryTimeline — Phase 3
 * Chronological feed of all memory lifecycle events (PROJECT.md §7.3).
 * Each entry is clickable → links to originating conversation turn.
 */
import { Link } from 'react-router-dom';

const STATUS_META = {
  proposed:  { icon: '⏳', label: 'Proposed',  color: '#f59e0b' },
  accepted:  { icon: '✅', label: 'Accepted',  color: '#10b981' },
  modified:  { icon: '✏️', label: 'Modified',  color: '#6366f1' },
  rejected:  { icon: '✕',  label: 'Rejected',  color: '#ef4444' },
  expired:   { icon: '🕐', label: 'Expired',   color: '#64748b' },
  forgotten: { icon: '🗑',  label: 'Forgotten', color: '#374151' },
};

const TYPE_COLORS = {
  session:   '#64748b',
  temporary: '#f59e0b',
  long_term: '#10b981',
  career:    '#6366f1',
  sensitive: '#ef4444',
  hidden:    '#8b5cf6',
};

export default function MemoryTimeline({ memories = [], onDecide }) {
  if (memories.length === 0) {
    return (
      <div className="timeline-empty">
        <span className="timeline-empty__icon">🧠</span>
        <p>No memory events yet. Start a career chat — I'll begin learning about you.</p>
      </div>
    );
  }

  // Group by date
  const grouped = memories.reduce((acc, m) => {
    const date = new Date(m.updatedAt || m.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(m);
    return acc;
  }, {});

  return (
    <div className="memory-timeline">
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="timeline-group">
          <div className="timeline-date">{date}</div>
          {items.map(m => (
            <TimelineEntry key={m._id} memory={m} onDecide={onDecide} />
          ))}
        </div>
      ))}
    </div>
  );
}

function TimelineEntry({ memory, onDecide }) {
  const meta = STATUS_META[memory.status] || STATUS_META.proposed;
  const typeColor = TYPE_COLORS[memory.type] || '#6366f1';
  const time = new Date(memory.updatedAt || memory.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });

  // Expiry warning
  const isExpiringSoon = memory.expiresAt && (() => {
    const diff = new Date(memory.expiresAt) - new Date();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // within 7 days
  })();

  return (
    <div className={`timeline-entry ${isExpiringSoon ? 'timeline-entry--expiring' : ''}`}>
      {/* Status icon */}
      <div className="timeline-entry__dot" style={{ color: meta.color }}>
        {meta.icon}
      </div>

      <div className="timeline-entry__body">
        {/* Status + type */}
        <div className="timeline-entry__header">
          <span className="timeline-status" style={{ color: meta.color }}>{meta.label}</span>
          <span className="timeline-type" style={{ color: typeColor }}>· {memory.type}</span>
          <span className="timeline-cat">· {memory.category}</span>
          <span className="timeline-time">{time}</span>
        </div>

        {/* Content */}
        <p className="timeline-content">
          {memory.userModifiedContent ? (
            <>
              <span className="timeline-original">{memory.content}</span>
              {' → '}
              <span className="timeline-modified">{memory.userModifiedContent}</span>
            </>
          ) : memory.content}
        </p>

        {/* Confidence */}
        <span className="timeline-conf">
          Confidence: {Math.round((memory.confidence || 0) * 100)}%
        </span>

        {/* Source link */}
        {memory.sourceRef?.conversationId && (
          <Link
            to={`/chat/${memory.sourceRef.conversationId}`}
            className="timeline-source-link"
          >
            View source conversation →
          </Link>
        )}

        {/* Expiring soon actions */}
        {isExpiringSoon && memory.status === 'accepted' && (
          <div className="timeline-expiry-actions">
            <span className="expiry-warning">
              ⚠️ Expires {new Date(memory.expiresAt).toLocaleDateString()}
            </span>
            {onDecide && (
              <>
                <button
                  className="btn btn--xs btn--primary"
                  onClick={() => onDecide(memory._id, 'timebox', { expiresAt: (() => { const d = new Date(); d.setDate(d.getDate() + 90); return d.toISOString(); })() })}
                >
                  Renew 90d
                </button>
                <button
                  className="btn btn--xs btn--ghost"
                  onClick={() => {/* let expire — do nothing */}}
                >
                  Let Expire
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
