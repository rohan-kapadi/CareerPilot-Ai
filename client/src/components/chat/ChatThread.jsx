/**
 * ChatThread - Phase 2
 * Scrollable message list with user/assistant turns.
 * Renders agent badge, section draft cards, and auto-scrolls to bottom.
 */
import { useEffect, useRef } from 'react';

const AGENT_BADGES = {
  careerCoachAgent: { label: 'Career Coach', icon: '🎯', color: 'badge--coach' },
  resumeBuilderAgent: { label: 'Resume Builder', icon: '🛠', color: 'badge--builder' },
  default: { label: 'CareerPilot', icon: '🧭', color: 'badge--default' },
};

import ReactMarkdown from 'react-markdown';

export default function ChatThread({ turns = [], onAcceptDraft, onRejectDraft }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length]);

  if (turns.length === 0) {
    return null;
  }

  return (
    <div className="chat-thread">
      {turns.map((turn, i) => (
        <ChatBubble
          key={turn._id ?? i}
          turn={turn}
          onAcceptDraft={onAcceptDraft}
          onRejectDraft={onRejectDraft}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function ChatBubble({ turn, onAcceptDraft, onRejectDraft }) {
  const isUser = turn.role === 'user';
  const agent = AGENT_BADGES[turn.toolCall?.agentName] ?? AGENT_BADGES.default;

  return (
    <div className={`chat-bubble ${isUser ? 'chat-bubble--user' : 'chat-bubble--assistant'}`}>
      <div className={`chat-avatar ${isUser ? 'chat-avatar--user' : 'chat-avatar--ai'}`}>
        {isUser ? '👤' : agent.icon}
      </div>

      <div className="chat-bubble__body">
        {!isUser && turn.toolCall?.agentName && (
          <span className={`agent-badge ${agent.color}`}>
            {agent.icon} {agent.label}
          </span>
        )}

        <div className="chat-bubble__text">
          <ReactMarkdown>{turn.content}</ReactMarkdown>
        </div>

        {turn.sectionDraft?.draft && (
          <SectionDraftCard
            sectionDraft={turn.sectionDraft}
            onAccept={() => onAcceptDraft?.(turn.sectionDraft)}
            onReject={() => onRejectDraft?.(turn.sectionDraft)}
          />
        )}

        <span className="chat-bubble__time">
          {turn.createdAt
            ? new Date(turn.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : ''}
        </span>
      </div>
    </div>
  );
}

function SectionDraftCard({ sectionDraft, onAccept, onReject }) {
  const { section, draft } = sectionDraft;

  return (
    <div className="draft-card">
      <div className="draft-card__header">
        <span className="draft-card__label">✍️ {section?.charAt(0).toUpperCase() + section?.slice(1)} Draft</span>
        <span className="draft-card__sub">Review and accept to save to your resume</span>
      </div>

      <div className="draft-card__content">
        {section === 'summary' && (
          <p className="draft-preview">{draft?.summary}</p>
        )}
        {section === 'skills' && (
          <div className="skill-chips">
            {(draft?.skills ?? []).map((s, i) => (
              <span key={i} className="chip chip--neutral">{s}</span>
            ))}
          </div>
        )}
        {(section === 'experience' || section === 'projects' || section === 'education') && (
          <pre className="draft-json">{JSON.stringify(draft, null, 2)}</pre>
        )}
      </div>

      <div className="draft-card__actions">
        <button className="btn btn--success btn--sm" onClick={onAccept}>✅ Accept</button>
        <button className="btn btn--ghost btn--sm" onClick={onReject}>✕ Skip</button>
      </div>
    </div>
  );
}
