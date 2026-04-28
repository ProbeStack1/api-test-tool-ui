import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot, Send, Sparkles, Paperclip, Mic, MessagesSquare, Plus, Trash2,
  Loader2, AlertCircle, X, ArrowRight,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import {
  fetchAiProviders,
  fetchAiConfig,
  listAiSessions,
  createAiSession,
  getAiSessionMessages,
  deleteAiSession,
  aiChatSingle,
} from '../services/userSettingService';

/**
 * AIAssisted page — real AI with PER-SUBMODEL animated progress + manual switch popover.
 *
 * Flow:
 *   1. User submits → status line shows rotating "fancy" verbs ("Tightening some screws…")
 *      AND a fixed line "Trying generation through {Provider Label}…".
 *   2. If the chosen sub-model fails, the line updates to:
 *      "Switching to {nextSubmodel} as {prevSubmodel} is busy…"
 *      and we attempt the next sub-model of the SAME provider.
 *   3. If ALL sub-models of the provider fail, a popover appears just below the model
 *      dropdown (top-right) saying "Switch model? gemini overloaded — try Groq".
 *      Clicking the Switch button picks the next provider, updates the dropdowns,
 *      and AUTO-RESUMES the original prompt.
 *   4. Successful reply is appended to the chat & persisted in DB (server stores it
 *      because we always pass sessionId).
 */

/* Cute, slightly playful animation phrases — rotates every 1.6s while busy. */
const FANCY_PHRASES = [
  'Setting things up',
  'Warming up the engines',
  'Tightening a few screws',
  'Brewing the response',
  'Calibrating tokens',
  'Polishing the answer',
  'Aligning the stars',
  'Almost there',
];

const AIAssisted = () => {
  /* ------- providers & saved config ------- */
  const [providers, setProviders] = useState([]);
  const [currentProvider, setCurrentProvider] = useState('');
  const [currentModel, setCurrentModel] = useState('');

  /* ------- sessions ------- */
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  /* ------- chat ------- */
  const [messages, setMessages] = useState([
    {
      id: 1, role: 'assistant',
      content: "Hi! I'm your AI test assistant. Let's create comprehensive API test cases together. Describe the API endpoint you want to test, or paste your API specification to get started.",
      timestamp: stamp(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  /* ------- progress + popover ------- */
  const [statusLine, setStatusLine] = useState(null);   // string | null
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [popover, setPopover] = useState(null);          // { fromProviderLabel, toProviderLabel, attempted, pendingPrompt, pendingMessages, pendingSessionId, nextProvider, nextModel } | null

  /* ------- delete confirm popover (positioned at click coords like CollectionsPanel) ------- */
  // { sessionId, title, x, y } | null
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const deleteConfirmRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!deleteConfirm) return undefined;
    const onMouseDown = (e) => {
      if (deleteConfirmRef.current && !deleteConfirmRef.current.contains(e.target)) {
        setDeleteConfirm(null);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [deleteConfirm]);

  const scrollRef = useRef(null);

  /* ============ bootstrap ============ */
  useEffect(() => {
    (async () => {
      try {
        const [provRes, confRes, listRes] = await Promise.all([
          fetchAiProviders(), fetchAiConfig(), listAiSessions(0, 30),
        ]);
        const provs = provRes.data || [];
        setProviders(provs);
        const conf = confRes.data || {};
        setCurrentProvider(conf.provider || provs[0]?.id || '');
        setCurrentModel(conf.model || provs[0]?.models?.[0]?.id || '');
        setSessions(listRes.data?.items || []);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load AI assistant');
      }
    })();
  }, []);

  /* rotate fancy phrases while sending */
  useEffect(() => {
    if (!sending) return undefined;
    const t = setInterval(() => setPhraseIdx(i => (i + 1) % FANCY_PHRASES.length), 1600);
    return () => clearInterval(t);
  }, [sending]);

  /* auto-scroll on new message */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  /* ============ helpers ============ */
  const availableModels = useMemo(
    () => providers.find(p => p.id === currentProvider)?.models || [],
    [providers, currentProvider]
  );

  function stamp() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function providerLabel(pid) {
    return providers.find(p => p.id === pid)?.label || pid;
  }
  function modelLabel(pid, mid) {
    const m = providers.find(p => p.id === pid)?.models?.find(x => x.id === mid);
    return m?.label || mid;
  }
  function ordinal(n) {
    return ['1st','2nd','3rd','4th','5th'][n] || `${n + 1}th`;
  }

  /* ============ session ops ============ */
  const ensureSession = async () => {
    if (activeSessionId) return activeSessionId;
    const { data } = await createAiSession({
      provider: currentProvider,
      model: currentModel,
    });
    setSessions(prev => [data, ...prev]);
    setActiveSessionId(data.sessionId);
    return data.sessionId;
  };

  const loadSession = async (sid) => {
    try {
      const { data } = await getAiSessionMessages(sid);
      setActiveSessionId(sid);
      if (!data || data.length === 0) {
        setMessages([{
          id: 1, role: 'assistant',
          content: 'Empty session. Ask me anything to get started.',
          timestamp: stamp(),
        }]);
      } else {
        setMessages(data.map((m, idx) => ({
          id: idx + 1, role: m.role, content: m.content, timestamp: stamp(),
        })));
      }
    } catch { toast.error('Could not load session'); }
  };

  const handleNewChat = async () => {
    try {
      const { data } = await createAiSession({ provider: currentProvider, model: currentModel });
      setSessions(prev => [data, ...prev]);
      setActiveSessionId(data.sessionId);
      setMessages([{
        id: 1, role: 'assistant',
        content: "New chat started. What API would you like to test today?",
        timestamp: stamp(),
      }]);
    } catch { toast.error('Could not create new chat'); }
  };

  const handleDeleteSession = (sid, title, e) => {
    e.stopPropagation();
    // Position popover just to the LEFT of the trash icon so it doesn't overflow the panel.
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 220;
    const x = Math.max(8, rect.left - popoverWidth - 8);
    const y = rect.top - 4;
    setDeleteConfirm({ sessionId: sid, title: title || 'New Chat', x, y });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const sid = deleteConfirm.sessionId;
    setDeleteConfirm(null);
    try {
      await deleteAiSession(sid);
      setSessions(prev => prev.filter(s => s.sessionId !== sid));
      if (activeSessionId === sid) {
        setActiveSessionId(null);
        setMessages([{
          id: 1, role: 'assistant',
          content: "Hi! I'm your AI test assistant. What would you like to work on?",
          timestamp: stamp(),
        }]);
      }
    } catch {
      toast.error('Could not delete chat');
    }
  };

  /* ============ THE BIG ONE: per-submodel send ============ */

  /**
   * Attempts each sub-model of `providerId` sequentially with progress updates.
   * Returns the assistant text on success or throws { kind:'all_failed', attempted } when all fail.
   */
  async function attemptProvider({ providerId, startModelId, sessionId, apiMessages }) {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) throw new Error('Unknown provider: ' + providerId);

    const subModels = provider.models.map(m => m.id);
    const startIdx = Math.max(0, subModels.indexOf(startModelId));
    const ordered = [...subModels.slice(startIdx), ...subModels.slice(0, startIdx)];

    const attempted = [];
    let prevModelLabel = null;

    for (let i = 0; i < ordered.length; i++) {
      const mid = ordered[i];
      attempted.push(mid);
      const isFirst = i === 0;

      // status line
      if (isFirst) {
        setStatusLine(`Trying generation through ${provider.label} · ${ordinal(i)} sub-model (${modelLabel(providerId, mid)})…`);
      } else {
        setStatusLine(`Switching to ${modelLabel(providerId, mid)} as ${prevModelLabel} is busy or under heavy traffic…`);
      }
      prevModelLabel = modelLabel(providerId, mid);

      try {
        const { data } = await aiChatSingle({
          provider: providerId,
          model: mid,
          sessionId,
          mode: 'chat',
          messages: apiMessages,
        });
        // Success — sync UI selection so the dropdown shows the model that actually replied
        setCurrentProvider(providerId);
        setCurrentModel(mid);
        return data;
      } catch (err) {
        // continue to next sub-model
        // eslint-disable-next-line no-console
        console.warn('Sub-model failed', mid, err?.response?.data);
      }
    }
    // eslint-disable-next-line no-throw-literal
    throw { kind: 'all_failed', providerId, attempted };
  }

  const runChat = async ({ promptText, providerId, modelId, sessionId, baseMessages }) => {
    setSending(true);
    setPopover(null);
    setPhraseIdx(0);

    try {
      const apiMessages = [...baseMessages, { role: 'user', content: promptText }]
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const data = await attemptProvider({
        providerId, startModelId: modelId, sessionId, apiMessages,
      });

      // success
      setMessages(prev => [...prev, {
        id: prev.length + 1, role: 'assistant', content: data.content, timestamp: stamp(),
      }]);
      setStatusLine(null);
      setSessions(prev => prev.map(s =>
        s.sessionId === sessionId
          ? { ...s,
              messageCount: (s.messageCount || 0) + 2,
              title: s.title === 'New Chat' ? promptText.slice(0, 60) : s.title }
          : s
      ));
    } catch (err) {
      if (err?.kind === 'all_failed') {
        // Decide which provider to suggest next
        const remaining = providers.filter(p => p.id !== err.providerId);
        const nextProvider = remaining[0];
        if (!nextProvider) {
          toast.error('All providers seem unavailable right now.');
          setStatusLine(null);
          return;
        }
        setPopover({
          fromProviderLabel: providerLabel(err.providerId),
          toProviderLabel: nextProvider.label,
          attempted: err.attempted,
          // Stash everything needed for auto-resume on Switch click:
          pendingPrompt: promptText,
          pendingBaseMessages: baseMessages,
          pendingSessionId: sessionId,
          nextProvider: nextProvider.id,
          nextModel: nextProvider.models[0]?.id,
        });
        setStatusLine(`All ${providerLabel(err.providerId)} sub-models are busy. Switch suggested →`);
      } else {
        console.error(err);
        toast.error('AI call failed');
        setStatusLine(null);
      }
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || sending) return;

    const promptText = input.trim();
    setInput('');

    // Optimistically add user message + ensure session
    const userMsg = { id: messages.length + 1, role: 'user', content: promptText, timestamp: stamp() };
    setMessages(prev => [...prev, userMsg]);

    let sid;
    try { sid = await ensureSession(); }
    catch { toast.error('Session create failed'); return; }

    await runChat({
      promptText,
      providerId: currentProvider,
      modelId: currentModel,
      sessionId: sid,
      baseMessages: messages, // history before this user message
    });
  };

  /** "Switch" button click in the popover — auto-resume prompt. */
  const handleSwitchAndResume = async () => {
    if (!popover || sending) return;
    const { pendingPrompt, pendingBaseMessages, pendingSessionId, nextProvider, nextModel } = popover;

    // Update dropdowns to the new provider/model so user sees the change visually
    setCurrentProvider(nextProvider);
    setCurrentModel(nextModel);
    setPopover(null);

    // Auto-resume same prompt with the new provider — runs through its sub-models
    await runChat({
      promptText: pendingPrompt,
      providerId: nextProvider,
      modelId: nextModel,
      sessionId: pendingSessionId,
      baseMessages: pendingBaseMessages,
    });
  };

  /* ============ render ============ */
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-probestack-bg text-white min-h-0">
      {/* Header — original styling + inline provider/model switcher on the right */}
      <div className="px-6 py-4 border-b border-dark-700 bg-dark-800/50 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">AI-Assisted Test Generation</h2>
            <p className="text-sm text-gray-400 mt-1">
              Create API test cases with conversational AI assistance.
            </p>
          </div>
          <div className="relative flex items-center gap-2">
            <select
              data-testid="ai-inline-provider"
              value={currentProvider}
              onChange={(e) => {
                const pid = e.target.value;
                setCurrentProvider(pid);
                setCurrentModel(providers.find(p => p.id === pid)?.models?.[0]?.id || '');
              }}
              disabled={sending}
              className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50 disabled:opacity-60"
            >
              {providers.map(p => <option key={p.id} value={p.id} className="bg-dark-800">{p.label}</option>)}
            </select>
            <select
              data-testid="ai-inline-model"
              value={currentModel}
              onChange={(e) => setCurrentModel(e.target.value)}
              disabled={sending}
              className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50 disabled:opacity-60"
            >
              {availableModels.map(m => <option key={m.id} value={m.id} className="bg-dark-800">{m.label}</option>)}
            </select>

            {/* Switch-model popover — anchored just below dropdowns */}
            {popover && (
              <div
                data-testid="switch-model-popover"
                className="absolute right-0 top-full mt-2 w-80 z-30 rounded-xl border border-yellow-500/40 bg-dark-800 shadow-2xl shadow-yellow-500/10 overflow-hidden animate-fade-in"
              >
                <div className="p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-white">
                      All {popover.fromProviderLabel} sub-models are busy
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Tried: {popover.attempted.join(', ')}
                    </div>
                    <div className="text-[11px] text-gray-300 mt-1">
                      Switch to <span className="text-primary font-semibold">{popover.toProviderLabel}</span> and resume your prompt automatically?
                    </div>
                  </div>
                  <button onClick={() => setPopover(null)} className="text-gray-500 hover:text-white shrink-0" title="Dismiss">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-end gap-2 p-2 border-t border-dark-700 bg-dark-900/40">
                  <button onClick={() => setPopover(null)}
                          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">
                    Not now
                  </button>
                  <button data-testid="popover-switch-btn"
                          onClick={handleSwitchAndResume}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-white text-xs font-medium">
                    Switch & Resume <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main grid (col-8 chat | col-4 sidebar) */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-12 gap-6 h-full min-h-[600px]">

          {/* ============ Chat ============ */}
          <div className="col-span-12 lg:col-span-8 flex flex-col rounded-xl overflow-hidden bg-dark-800/60 border border-dark-700 shadow-xl">
            <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
              {messages.map((message) => (
                <div key={message.id}
                     className={clsx('flex gap-4 items-start',
                       message.role === 'user' ? 'justify-end' : 'max-w-[85%]')}>
                  {message.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary ring-1 ring-primary/30">
                      <Bot className="w-5 h-5" />
                    </div>
                  )}
                  <div className={clsx('flex flex-col gap-1.5',
                    message.role === 'user' ? 'items-end max-w-[85%]' : '')}>
                    <div className={clsx(
                      'p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                      message.role === 'user'
                        ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/20'
                        : 'bg-dark-700/50 text-gray-100 rounded-tl-none border border-dark-600'
                    )}>
                      {renderMarkdownBold(message.content)}
                    </div>
                    <span className="text-[10px] text-gray-500 px-1">{message.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Composer — with status line ABOVE the textarea */}
            <div className="p-6 border-t border-dark-700 bg-dark-800/30">
              {/* PROGRESS / STATUS LINE */}
              {(sending || statusLine) && (
                <div data-testid="ai-status-line"
                     className="mb-3 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-2 text-[12px] text-primary/90">
                  {sending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span className="truncate">
                        <span className="text-white">{FANCY_PHRASES[phraseIdx]}…</span>
                        {statusLine && <span className="text-gray-400 ml-2">— {statusLine}</span>}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-yellow-300" />
                      <span className="truncate text-yellow-200">{statusLine}</span>
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {['Generate test for GET /api/users', 'Create assertions for status 200',
                  'Add JSON schema validation', 'Export test collection'].map((action, index) => (
                  <button key={index}
                          onClick={() => setInput(action)}
                          disabled={sending}
                          className="px-3 py-1.5 bg-dark-700/50 rounded-lg text-xs font-medium border border-dark-600 hover:border-primary/50 hover:bg-primary/5 transition-all text-gray-300 disabled:opacity-50">
                    {action}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSend} className="relative group">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(e); }}
                  disabled={sending}
                  className="w-full bg-[var(--color-input-bg)] border border-dark-600 rounded-2xl p-4 pr-16 text-sm text-white focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all placeholder-gray-500 resize-none disabled:opacity-50"
                  placeholder="Describe your API test requirements (e.g., 'Create tests for user authentication endpoints' or 'Generate assertions for JSON response validation')..."
                  rows="2"
                />
                <button type="submit"
                        disabled={sending || !input.trim()}
                        className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-primary/30 group-hover:scale-105 active:scale-95">
                  <Send className="w-5 h-5" />
                </button>
              </form>

              <div className="flex justify-between items-center mt-3">
                <div className="flex items-center gap-4">
                  <button type="button" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors">
                    <Paperclip className="w-4 h-4" /> Attach Spec
                  </button>
                  <button type="button" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors">
                    <Mic className="w-4 h-4" /> Voice Input
                  </button>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">Press Cmd + Enter to send</span>
              </div>
            </div>
          </div>

          {/* ============ Right Sidebar (history + tips) ============ */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <section className="bg-dark-800/60 border border-dark-700 rounded-xl p-6 shadow-lg flex flex-col h-[360px]">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <MessagesSquare className="w-5 h-5 text-primary" />
                  Chat History
                </h3>
                <button data-testid="new-chat-btn"
                        onClick={handleNewChat}
                        className="p-1.5 rounded-md bg-primary/20 hover:bg-primary/30 text-primary"
                        title="New chat">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {sessions.length === 0 ? (
                  <div className="text-[11px] text-gray-500 py-8 text-center">
                    No chats yet. Start typing — your conversations will appear here.
                  </div>
                ) : sessions.map(s => (
                  <div key={s.sessionId}
                       onClick={() => loadSession(s.sessionId)}
                       data-testid={`session-${s.sessionId}`}
                       className={clsx(
                         'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs transition-all',
                         activeSessionId === s.sessionId
                           ? 'bg-primary/20 border border-primary/30 text-white'
                           : 'hover:bg-dark-700/50 border border-transparent text-gray-300'
                       )}>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{s.title || 'New Chat'}</div>
                      <div className="text-[10px] text-gray-500 truncate">
                        {s.provider} · {s.model} · {s.messageCount || 0} msgs
                      </div>
                    </div>
                    <button onClick={(e) => handleDeleteSession(s.sessionId, s.title, e)}
                            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-1"
                            title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-dark-800/60 border border-dark-700 rounded-xl p-6 shadow-lg relative overflow-hidden">
              <div className="absolute -bottom-6 -right-6 opacity-5">
                <Sparkles className="w-32 h-32 text-primary" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Test Assistant Tips
              </h3>
              <ul className="space-y-4">
                {[
                  'Be specific about HTTP methods and endpoint paths for accurate test generation.',
                  'Mention expected response codes (200, 404, 500) for comprehensive test coverage.',
                  'Describe your data models clearly to ensure correct validation rules.',
                  'Include authentication requirements early for proper test scaffolding.',
                  'Use natural language to ask for complex logic like pagination or error handling tests.',
                ].map((tip, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="text-primary text-xl leading-none">•</span>
                    <p className="text-xs text-gray-400 leading-relaxed">{tip}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>

      {/* ===== Delete Confirmation Popover (small, positioned next to trash icon) ===== */}
      {deleteConfirm && (
        <div
          ref={deleteConfirmRef}
          className="fixed z-50 w-[220px] p-3 rounded-lg border border-dark-700 bg-dark-800 shadow-xl"
          style={{ left: deleteConfirm.x, top: deleteConfirm.y }}
        >
          <p className="text-xs text-gray-300 mb-3">
            Delete <span className="font-medium text-white">{deleteConfirm.title}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-dark-700 hover:bg-dark-600 rounded"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function renderMarkdownBold(text) {
  if (!text) return null;
  const parts = text.split('**');
  return parts.map((part, idx) =>
    idx % 2 === 1
      ? <strong key={idx} className="font-semibold text-white">{part}</strong>
      : <React.Fragment key={idx}>{part}</React.Fragment>
  );
}

export default AIAssisted;
