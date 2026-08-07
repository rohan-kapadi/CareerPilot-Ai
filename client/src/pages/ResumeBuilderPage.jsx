/**
 * ResumeBuilderPage — Phase 2
 * Guided section-by-section resume builder via conversational AI.
 * Sidebar shows section progress; main area shows chat thread + current draft.
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { sendMessage } from '../api/chatApi';
import { updateSections, getResume } from '../services/api';
import SectionEditor from '../components/resume/SectionEditor';

const SECTIONS = [
  { key: 'summary',    label: 'Summary',    icon: '📝' },
  { key: 'experience', label: 'Experience',  icon: '💼' },
  { key: 'education',  label: 'Education',   icon: '🎓' },
  { key: 'skills',     label: 'Skills',      icon: '⚡' },
  { key: 'projects',   label: 'Projects',    icon: '🚀' },
];

export default function ResumeBuilderPage() {
  const { resumeId } = useParams();
  const navigate = useNavigate();

  const [resume, setResume]               = useState(null);
  const [activeSection, setActiveSection] = useState('summary');
  const [convId, setConvId]               = useState(null);
  const [turns, setTurns]                 = useState([]);
  const [input, setInput]                 = useState('');
  const [sending, setSending]             = useState(false);
  const [currentDraft, setCurrentDraft]   = useState(null);
  const [completedSections, setCompleted] = useState(new Set());
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load resume if resumeId provided
  useEffect(() => {
    if (!resumeId) return;
    getResume(resumeId)
      .then(r => setResume(r.data?.data ?? null))
      .catch(() => {});
  }, [resumeId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length]);

  // Auto-open with opening question on section change
  useEffect(() => {
    if (convId) return; // only for new conversations
    const OPENING = {
      summary:    "Let's start with your professional summary. Tell me about yourself — your current role, top skills, and what kind of opportunities you're targeting.",
      experience: "Tell me about your most recent or most relevant job — company, role, and what you worked on.",
      education:  "What degree did you study, from which institution, and when did you graduate?",
      skills:     "List out your top technical and professional skills — don't worry about formatting.",
      projects:   "Describe a project you're proud of — what it does, tech used, and any results or links.",
    };
    const openingMsg = {
      _id: `open-${activeSection}`,
      role: 'assistant',
      content: OPENING[activeSection],
      createdAt: new Date().toISOString(),
    };
    setTurns([openingMsg]);
    setCurrentDraft(null);
  }, [activeSection]);

  async function handleSend(e) {
    e?.preventDefault();
    const msg = input.trim();
    if (!msg || sending) return;

    const tempTurn = { _id: `tmp-${Date.now()}`, role: 'user', content: msg, createdAt: new Date().toISOString() };
    setTurns(prev => [...prev, tempTurn]);
    setInput('');
    setSending(true);

    try {
      const res = await sendMessage({
        message: msg,
        conversationId: convId || undefined,
        mode: 'builder',
        section: activeSection,
        resumeId: resumeId || undefined,
      });
      const data = res.data?.data;

      if (!convId) setConvId(data.conversationId);

      const draft = data.reply.sectionDraft;
      if (draft?.draft) setCurrentDraft(draft);

      const assistantTurn = {
        _id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply.content,
        sectionDraft: draft || null,
        toolCall: { agentName: 'resumeBuilderAgent' },
        createdAt: new Date().toISOString(),
      };
      setTurns(prev => [...prev, assistantTurn]);
    } catch (err) {
      toast.error('Failed to get AI response');
      setTurns(prev => prev.filter(t => t._id !== tempTurn._id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleAccept(sectionPayload) {
    if (!resumeId) {
      toast.error('No resume linked to this builder session. Upload a resume first.');
      return;
    }
    try {
      await updateSections(resumeId, sectionPayload);
      toast.success(`${activeSection} saved! ✅`);
      setCompleted(prev => new Set([...prev, activeSection]));
      setCurrentDraft(null);

      // Auto-advance to next section
      const idx = SECTIONS.findIndex(s => s.key === activeSection);
      if (idx < SECTIONS.length - 1) {
        setActiveSection(SECTIONS[idx + 1].key);
        setConvId(null); // fresh conversation for new section
      } else {
        toast.success('Resume complete! 🎉');
        navigate(resumeId ? `/resume/${resumeId}` : '/dashboard');
      }
    } catch {
      toast.error('Failed to save section');
    }
  }

  function handleSkip() {
    setCurrentDraft(null);
    const idx = SECTIONS.findIndex(s => s.key === activeSection);
    if (idx < SECTIONS.length - 1) {
      setActiveSection(SECTIONS[idx + 1].key);
      setConvId(null);
    } else {
      navigate(resumeId ? `/resume/${resumeId}` : '/dashboard');
    }
  }

  return (
    <div className="builder-page">
      {/* ── Section progress sidebar ── */}
      <aside className="builder-sidebar">
        <Link to="/dashboard" className="back-link back-link--sm">← Dashboard</Link>
        <h2 className="builder-sidebar__title">Resume Builder</h2>
        {resumeId && resume && (
          <p className="builder-sidebar__sub">{resume.originalFileName}</p>
        )}

        <nav className="section-nav">
          {SECTIONS.map((s, i) => (
            <button
              key={s.key}
              className={`section-nav-item 
                ${activeSection === s.key ? 'section-nav-item--active' : ''} 
                ${completedSections.has(s.key) ? 'section-nav-item--done' : ''}`}
              onClick={() => { setActiveSection(s.key); setConvId(null); }}
            >
              <span className="section-nav-item__icon">
                {completedSections.has(s.key) ? '✅' : s.icon}
              </span>
              <span className="section-nav-item__label">{s.label}</span>
              {i < SECTIONS.length - 1 && <span className="section-nav-item__connector" />}
            </button>
          ))}
        </nav>

        <div className="builder-sidebar__footer">
          <p className="builder-tip">
            💡 Accept drafts section-by-section. You can always edit later in the Resume Editor.
          </p>
        </div>
      </aside>

      {/* ── Main builder area ── */}
      <main className="builder-main">
        <header className="builder-header">
          <h1 className="builder-header__title">
            {SECTIONS.find(s => s.key === activeSection)?.icon} Building: <span className="highlight">
              {SECTIONS.find(s => s.key === activeSection)?.label}
            </span>
          </h1>
        </header>

        {/* Chat thread */}
        <div className="builder-thread">
          {turns.map((turn, i) => (
            <div key={turn._id ?? i} className={`chat-bubble ${turn.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--assistant'}`}>
              <div className={`chat-avatar ${turn.role === 'user' ? 'chat-avatar--user' : 'chat-avatar--ai'}`}>
                {turn.role === 'user' ? '👤' : '🔨'}
              </div>
              <div className="chat-bubble__body">
                <p className="chat-bubble__text">{turn.content}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Current draft card */}
        {currentDraft?.draft && (
          <div className="builder-draft-area">
            <SectionEditor
              section={currentDraft.section}
              draft={currentDraft.draft}
              resumeId={resumeId}
              onAccepted={handleAccept}
              onSkipped={handleSkip}
            />
          </div>
        )}

        {/* Input */}
        <form className="chat-input-form" onSubmit={handleSend}>
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder={sending ? 'AI is drafting…' : `Tell the AI about your ${activeSection}…`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows={2}
            disabled={sending}
          />
          <button type="submit" className="chat-send-btn" disabled={sending || !input.trim()}>
            {sending ? '⏳' : '➤'}
          </button>
        </form>
      </main>
    </div>
  );
}
