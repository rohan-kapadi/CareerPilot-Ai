/**
 * SectionEditor — Phase 2
 * Inline suggestion chip: accept / edit / skip for resume builder drafts.
 *
 * Phase 6 Handoff:
 *   Currently "accept" writes directly to Resume.sections via PUT /api/resume/:id/sections.
 *   Phase 6 will formalize this into the Suggestion model + Human Approval Workflow.
 *   DO NOT build competing approval mechanisms in Phase 3/4/5.
 */
import { useState } from 'react';

export default function SectionEditor({ section, draft, resumeId, onAccepted, onSkipped }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(() => {
    if (section === 'summary') return draft?.summary ?? '';
    return JSON.stringify(draft?.[section] ?? draft ?? '', null, 2);
  });
  const [saving, setSaving] = useState(false);

  async function handleAccept() {
    setSaving(true);
    try {
      let sectionPayload;
      if (section === 'summary') {
        sectionPayload = { summary: editValue };
      } else if (section === 'skills') {
        sectionPayload = { skills: draft?.skills ?? [] };
      } else {
        sectionPayload = { [section]: draft?.[section] ?? [] };
      }
      await onAccepted?.(sectionPayload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="section-editor">
      <div className="section-editor__header">
        <span className="section-editor__title">
          {section?.charAt(0).toUpperCase() + section?.slice(1)} Suggestion
        </span>
        <button
          className="btn btn--ghost btn--xs"
          onClick={() => setEditing(!editing)}
          title="Edit before accepting"
        >
          {editing ? '↩ Cancel edit' : '✏️ Edit'}
        </button>
      </div>

      {editing ? (
        <textarea
          className="section-editor__textarea"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          rows={6}
        />
      ) : (
        <div className="section-editor__preview">
          {section === 'summary' && <p>{draft?.summary}</p>}
          {section === 'skills' && (
            <div className="skill-chips">
              {(draft?.skills ?? []).map((s, i) => <span key={i} className="chip chip--neutral">{s}</span>)}
            </div>
          )}
          {['experience', 'education', 'projects'].includes(section) && (
            <pre className="draft-json">{JSON.stringify(draft?.[section] ?? draft, null, 2)}</pre>
          )}
        </div>
      )}

      <div className="section-editor__actions">
        <button className="btn btn--success" onClick={handleAccept} disabled={saving}>
          {saving ? 'Saving…' : '✅ Accept & Save'}
        </button>
        <button className="btn btn--ghost" onClick={onSkipped}>
          Skip
        </button>
      </div>
    </div>
  );
}
