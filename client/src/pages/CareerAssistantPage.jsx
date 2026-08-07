/**
 * CareerAssistantPage - Phase 2
 * Full persistent chat UI for Career Coach and Resume Builder modes.
 * Supports conversation history, agent badges, section draft accept/reject.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { sendMessage, getConversation, listConversations } from '../api/chatApi';
import { updateSections } from '../services/api';
import ChatThread from '../components/chat/ChatThread';
import MemoryCard from '../components/memory/MemoryCard';
import { useMemoryCards } from '../hooks/useMemoryCards';

const MODE_META = {
  coach: {
    label: 'Career Coach',
    icon: '🎯',
    color: '#7c3aed',
    hint: 'Ask about interviews, salary, job search strategy, offers, or career pivots.',
  },
  builder: {
    label: 'Resume Builder',
    icon: '🛠',
    color: '#10b981',
    hint: 'Refine summaries, experience bullets, skills, projects, and resume structure.',
  },
  analyzer: {
    label: 'Job Analyzer',
    icon: '📊',
    color: '#f59e0b',
    hint: 'Paste a job description and get a sharper fit analysis against your profile.',
  },
};

export default function CareerAssistantPage() {
  const { conversationId: paramId } = useParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(paramId || null);
  const [turns, setTurns] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState('coach');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingConv, setLoadingConv] = useState(false);
  const inputRef = useRef(null);

  const { cards: proposedMemoryCards, decide: decideMemoryCard, deciding: memoryDeciding } = useMemoryCards(activeConvId);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  const storedResumes = (() => {
    try {
      return JSON.parse(localStorage.getItem('resumes') || '[]');
    } catch {
      return [];
    }
  })();

  useEffect(() => {
    listConversations()
      .then((r) => setConversations(r.data?.data?.conversations ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeConvId) {
      setTurns([]);
      setActiveConv(null);
      return;
    }

    setLoadingConv(true);
    getConversation(activeConvId)
      .then((r) => {
        setActiveConv(r.data?.data?.conversation ?? null);
        setTurns(r.data?.data?.turns ?? []);
        setMode(r.data?.data?.conversation?.mode ?? 'coach');
      })
      .catch(() => toast.error('Failed to load conversation'))
      .finally(() => setLoadingConv(false));
  }, [activeConvId]);

  useEffect(() => {
    if (activeConvId && activeConvId !== paramId) {
      navigate(`/chat/${activeConvId}`, { replace: true });
    }
  }, [activeConvId, navigate, paramId]);

  async function handleSend(e) {
    e?.preventDefault();
    const msg = input.trim();
    if (!msg || sending) return;

    const tempTurn = {
      _id: `tmp-${Date.now()}`,
      role: 'user',
      content: msg,
      createdAt: new Date().toISOString(),
    };

    setTurns((prev) => [...prev, tempTurn]);
    setInput('');
    setSending(true);
    inputRef.current?.focus();

    try {
      const payload = {
        message: msg,
        conversationId: activeConvId || undefined,
        mode: activeConvId ? undefined : mode,
      };
      const res = await sendMessage(payload);
      const data = res.data?.data;

      if (!activeConvId) {
        setActiveConvId(data.conversationId);
        setConversations((prev) => [
          { _id: data.conversationId, title: msg.slice(0, 60), mode: data.mode },
          ...prev,
        ]);
      }

      const assistantTurn = {
        _id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply.content,
        sectionDraft: data.reply.sectionDraft || null,
        toolCall: {
          agentName: data.reply.intent === 'builder' ? 'resumeBuilderAgent' : 'careerCoachAgent',
          intent: data.reply.intent,
        },
        createdAt: new Date().toISOString(),
      };
      setTurns((prev) => [...prev, assistantTurn]);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to send message');
      setTurns((prev) => prev.filter((t) => t._id !== tempTurn._id));
    } finally {
      setSending(false);
    }
  }

  async function handleAcceptDraft(sectionDraft) {
    const resumeId = activeConv?.resumeId ?? storedResumes[0]?.resumeId;
    if (!resumeId) {
      toast.error('No resume linked. Upload a resume first.');
      return;
    }

    try {
      await updateSections(resumeId, sectionDraft.draft);
      toast.success(`${sectionDraft.section} saved to resume ✅`);
    } catch {
      toast.error('Failed to save section');
    }
  }

  function handleRejectDraft() {
    toast('Draft skipped. Keep chatting to refine it.', { icon: '↩' });
  }

  function startNewConversation() {
    setActiveConvId(null);
    setTurns([]);
    setActiveConv(null);
    navigate('/chat', { replace: true });
  }

  const currentMode = activeConv?.mode ?? mode;
  const modeMeta = MODE_META[currentMode] ?? MODE_META.coach;

  return (
    <div className="chat-page">
      <aside className={`chat-sidebar ${sidebarOpen ? 'chat-sidebar--open' : ''}`}>
        <div className="chat-sidebar__header">
          <Link to="/dashboard" className="back-link back-link--sm">← Dashboard</Link>
          <button className="btn btn--primary btn--sm" onClick={startNewConversation}>+ New Chat</button>
        </div>

        {!activeConvId && (
          <div className="mode-selector">
            <p className="mode-selector__label">Start as</p>
            {Object.entries(MODE_META).map(([key, meta]) => (
              <button
                key={key}
                className={`mode-btn ${mode === key ? 'mode-btn--active' : ''}`}
                onClick={() => setMode(key)}
              >
                <span className="mode-btn__icon">{meta.icon}</span>
                <span className="mode-btn__label">{meta.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="conv-list">
          {conversations.map((c) => (
            <button
              key={c._id}
              className={`conv-item ${activeConvId === c._id ? 'conv-item--active' : ''}`}
              onClick={() => setActiveConvId(c._id)}
            >
              <span className="conv-item__icon">{MODE_META[c.mode]?.icon ?? '🧭'}</span>
              <span className="conv-item__title">{c.title || 'New conversation'}</span>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="conv-empty">No conversations yet. Start one to build momentum.</p>
          )}
        </div>
      </aside>

      <main className="chat-main">
        <header className="chat-header">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((p) => !p)}
            aria-label="Toggle conversation sidebar"
          >
            ☰
          </button>
          <div className="chat-header__info">
            <span className="mode-indicator" style={{ color: modeMeta.color }}>
              {modeMeta.icon} {modeMeta.label}
            </span>
            {activeConv?.title && <span className="chat-header__title">{activeConv.title}</span>}
          </div>
        </header>

        <div className="chat-thread-wrapper">
          {loadingConv ? (
            <div className="page-loading">Loading conversation...</div>
          ) : (
            <ChatThread
              turns={turns}
              onAcceptDraft={handleAcceptDraft}
              onRejectDraft={handleRejectDraft}
            />
          )}
        </div>

        {proposedMemoryCards.length > 0 && (
          <div className="proposed-memory-cards-container">
            {proposedMemoryCards.map((card) => (
              <MemoryCard
                key={card._id}
                memory={card}
                onDecide={decideMemoryCard}
                deciding={memoryDeciding}
              />
            ))}
          </div>
        )}

        {!activeConvId && turns.length === 0 && (
          <div className="chat-greeting">
            <p className="chat-greeting__eyebrow">AI career workspace</p>
            <h2 className="chat-greeting__title">
              Hi {user.name?.split(' ')[0] ?? 'there'} {modeMeta.icon}
            </h2>
            <p className="chat-greeting__hint">{modeMeta.hint}</p>
          </div>
        )}

        <form className="chat-input-form" onSubmit={handleSend}>
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder={sending ? 'Thinking...' : 'Ask for strategy, resume help, or job analysis...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            disabled={sending}
          />
          <button type="submit" className="chat-send-btn" disabled={sending || !input.trim()}>
            {sending ? '⌛' : '➜'}
          </button>
        </form>
      </main>
    </div>
  );
}
