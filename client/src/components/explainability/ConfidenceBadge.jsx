/**
 * ConfidenceBadge — Phase 4
 *
 * Visual indicator showing AI confidence:
 * - High Confidence (≥ 85%): Green
 * - Medium Confidence (70–84%): Amber
 * - Low Confidence (< 70%): Red / Unconfirmed Inference
 */
export default function ConfidenceBadge({ confidence = 0.85, label }) {
  const pct = Math.round((confidence || 0) * 100);
  const color = pct >= 85 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444';
  const tagLabel = label || (pct >= 85 ? 'High Confidence' : pct >= 70 ? 'Medium Confidence' : 'Unconfirmed Inference');

  return (
    <span
      className="confidence-badge"
      style={{
        background: color + '1a',
        color,
        borderColor: color + '44',
      }}
      title={`Confidence score: ${pct}%`}
    >
      <span className="confidence-badge__dot" style={{ background: color }} />
      {tagLabel} ({pct}%)
    </span>
  );
}
