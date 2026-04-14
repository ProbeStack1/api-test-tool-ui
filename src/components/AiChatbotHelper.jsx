/**
 * AiChatbotHelper.jsx
 * 
 * Always-visible draggable AI chatbot popup.
 * - Minimized: draggable bubble (defaults to bottom-right)
 * - Expanded: draggable panel with Guide Mode / Chat Mode / Error Mode
 * - Auto-expands on API errors (4xx/5xx/network) and JS errors
 * - Smooth transitions between minimize/expand/resize states
 * - Panel always opens from bubble position, minimize returns to bottom-right
 * 
 * PROPS (backward compatible):
 * - currentPath {string}: hides chatbot on "/" home page
 * - isVisible {boolean}: legacy visibility control
 * - onClose {function}: legacy close callback
 * - error {Object}: error from parent
 * - response {Object}: response from parent  
 * - requestInfo {Object}: request info from parent
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
  Bot, X, Minimize2, Maximize2, Send, AlertCircle, 
  Loader2, MessageSquare, Sparkles, ChevronRight, ChevronLeft,
  BookOpen, MessageCircle, HelpCircle
} from 'lucide-react';
import clsx from 'clsx';
import GUIDE_CATEGORIES from './chatbot/chatbotGuideData';
import {
  generateErrorAnalysis,
  analyzeJSError,
  generateFollowUpResponse
} from './chatbot/ErrorAnalyzer';

/* ====== SUB-COMPONENTS (unchanged theme) ====== */

const ChatMessage = ({ msg, index }) => (
  <div key={index} data-testid={`chat-message-${index}`} className={clsx("flex gap-3", msg.type === 'user' && "flex-row-reverse")}>
    <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", msg.type === 'bot' ? "bg-primary/20 border border-primary/20" : "bg-dark-700")}>
      {msg.type === 'bot' ? <Bot className="w-4 h-4 text-primary" /> : <MessageSquare className="w-4 h-4 text-gray-400" />}
    </div>
    <div className={clsx("flex-1 px-4 py-3 rounded-xl text-sm max-w-[85%]", msg.type === 'bot' ? "bg-dark-800 border border-dark-700" : "bg-primary/10 border border-primary/20 ml-auto")}>
      {msg.isLoading ? (
        <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /><span className="animate-pulse">Analyzing error...</span></div>
      ) : (
        <div className="whitespace-pre-wrap text-xs leading-relaxed text-gray-200">
          {msg.content.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part)}
        </div>
      )}
    </div>
  </div>
);

const TypingIndicator = () => (
  <div className="flex gap-3" data-testid="typing-indicator">
    <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-primary" /></div>
    <div className="px-4 py-3 rounded-xl bg-dark-800 border border-dark-700">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

const ChatInputBar = ({ userInput, setUserInput, onSend, isProcessing, placeholder }) => (
  <div className="p-3 border-t border-dark-700 bg-dark-800/50" data-testid="chat-input-bar">
    <div className="flex items-center gap-2">
      <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()} placeholder={placeholder || "Ask a follow-up question..."} className="flex-1 bg-dark-900/60 border border-dark-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" disabled={isProcessing} data-testid="chat-input-field" />
      <button onClick={onSend} disabled={!userInput.trim() || isProcessing} className="p-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95" data-testid="chat-send-button"><Send className="w-4 h-4" /></button>
    </div>
  </div>
);

const HelpOfferScreen = ({ response, error, requestInfo, onAccept, onClose }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4" data-testid="help-offer-screen">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center mb-4 border border-red-500/20"><AlertCircle className="w-8 h-8 text-red-400" /></div>
    <h4 className="text-base font-semibold text-white mb-2">Facing an issue?</h4>
    <p className="text-sm text-gray-400 mb-6">I detected an error in your API response. Want me to help analyze it?</p>
    <div className="w-full p-3 rounded-xl bg-red-500/5 border border-red-500/20 mb-6">
      <div className="flex items-center gap-2 text-red-400 text-xs mb-1"><AlertCircle className="w-3.5 h-3.5" /><span className="font-medium">{response?.status || error?.status || 'Error'} {response?.statusText || error?.message || 'Request Failed'}</span></div>
      <p className="text-xs text-gray-500 truncate">{requestInfo?.method || 'GET'} {requestInfo?.url || 'Unknown endpoint'}</p>
    </div>
    <button onClick={onAccept} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium text-sm transition-all active:scale-95 shadow-lg shadow-primary/25" data-testid="accept-help-button"><Sparkles className="w-4 h-4" /> Yes, help me out!</button>
    <button onClick={onClose} className="mt-3 text-xs text-gray-500 hover:text-gray-400 transition-colors" data-testid="dismiss-help-button">No thanks, I'll figure it out</button>
  </div>
);

/* ====== GUIDE MODE ====== */
const GuideMode = () => {
  const [selCat, setSelCat] = useState(null);
  const [selSub, setSelSub] = useState(null);
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }, [selCat, selSub]);
  const cat = GUIDE_CATEGORIES.find(c => c.id === selCat);
  const sub = cat?.subCategories.find(s => s.id === selSub);
  const goBack = () => { if (selSub) setSelSub(null); else if (selCat) setSelCat(null); };
  const goLink = (tc, ts) => { setSelCat(tc); setSelSub(ts); };

  return (
    <div className="flex flex-col h-full" data-testid="guide-mode">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" ref={scrollRef}>
        {(selCat || selSub) && (<button onClick={goBack} className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors mb-2" data-testid="guide-back-button"><ChevronLeft className="w-3 h-3" /> Back</button>)}
        {!selCat && (
          <>
            <div className="text-center mb-4"><div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3"><BookOpen className="w-7 h-7 text-primary" /></div><h4 className="text-base font-semibold text-white">Guide Mode</h4><p className="text-xs text-gray-400 mt-1">Select a category for step-by-step guidance</p></div>
            <div className="space-y-2">{GUIDE_CATEGORIES.map(c => { const I = c.icon; return (<button key={c.id} onClick={() => setSelCat(c.id)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-800/50 border border-dark-700 hover:bg-dark-700 hover:border-primary/30 transition-all text-left group" data-testid={`guide-category-${c.id}`}><div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0"><I className="w-4 h-4 text-primary" /></div><div className="flex-1 min-w-0"><span className="text-sm text-gray-200 font-medium block">{c.title}</span><span className="text-[10px] text-gray-500 block truncate">{c.description}</span></div><ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-primary shrink-0" /></button>); })}</div>
          </>
        )}
        {selCat && !selSub && cat && (
          <><div className="mb-3"><div className="flex items-center gap-2 mb-2"><cat.icon className="w-5 h-5 text-primary" /><h4 className="text-sm font-semibold text-white">{cat.title}</h4></div><p className="text-xs text-gray-400">{cat.description}</p></div><div className="space-y-2">{cat.subCategories.map(s => (<button key={s.id} onClick={() => setSelSub(s.id)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-800/50 border border-dark-700 hover:bg-dark-700 hover:border-primary/30 transition-all text-left group" data-testid={`guide-sub-${s.id}`}><HelpCircle className="w-4 h-4 text-primary/70 group-hover:text-primary shrink-0" /><span className="text-sm text-gray-200 flex-1">{s.title}</span><ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-primary shrink-0" /></button>))}</div></>
        )}
        {selSub && sub && (
          <div data-testid={`guide-detail-${selSub}`}>
            <h4 className="text-sm font-semibold text-white mb-3">{sub.title}</h4>
            <div className="space-y-2">{sub.steps.map((st, i) => (<div key={i} className="flex gap-3 items-start">{!st.startsWith('  ') ? (<span className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 text-[10px] text-primary font-bold mt-0.5">{i+1}</span>) : (<span className="w-6 h-6 shrink-0" />)}<p className={clsx("text-xs leading-relaxed", st.startsWith('  ') ? "text-gray-400 ml-1" : "text-gray-200")}>{st.trim()}</p></div>))}</div>
            {sub.note && (<div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20"><p className="text-[11px] text-primary/80 leading-relaxed">{sub.note}</p></div>)}
            {sub.links?.length > 0 && (<div className="mt-4 space-y-2"><p className="text-[10px] text-gray-500 uppercase tracking-wider">Related Guides:</p>{sub.links.map((l, i) => (<button key={i} onClick={() => goLink(l.targetCategory, l.targetSub)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-dark-800/30 border border-dark-700/50 hover:bg-dark-700 hover:border-primary/30 transition-all text-left text-xs text-primary" data-testid={`guide-link-${l.targetSub}`}><ChevronRight className="w-3 h-3" />{l.label}</button>))}</div>)}
          </div>
        )}
      </div>
    </div>
  );
};

/* ====== CHAT MODE ====== */
const ChatInteractionMode = () => {
  const [msgs, setMsgs] = useState([{ type: 'bot', content: '**Welcome!** I\'m your AI Assistant.\n\nReal-time AI is coming soon! For now:\n• Use Guide Mode for step-by-step instructions\n• Errors are analyzed automatically\n\nFeel free to type a question!' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [msgs]);
  const send = () => { if (!input.trim() || busy) return; const m = input.trim(); setMsgs(p => [...p, { type: 'user', content: m }]); setInput(''); setBusy(true); setTimeout(() => { setMsgs(p => [...p, { type: 'bot', content: generateFollowUpResponse(m, 'general') }]); setBusy(false); }, 1200); };
  return (
    <div className="flex flex-col h-full" data-testid="chat-interaction-mode">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={ref}>{msgs.map((m, i) => <ChatMessage key={i} msg={m} index={i} />)}{busy && <TypingIndicator />}</div>
      <ChatInputBar userInput={input} setUserInput={setInput} onSend={send} isProcessing={busy} placeholder="Type your question..." />
    </div>
  );
};

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
const BUBBLE_SIZE = 56;  // bubble diameter in px
const MARGIN = 20;       // margin from viewport edges

const AIChatbotHelper = ({ isVisible, onClose, error, response, requestInfo, currentPath }) => {
  // UI
  const [isMinimized, setIsMinimized] = useState(true);
  const [size, setSize] = useState('small');
  const [activeTab, setActiveTab] = useState('guide');

  // Error
  const [isErrorMode, setIsErrorMode] = useState(false);
  const [hasAcceptedHelp, setHasAcceptedHelp] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [intError, setIntError] = useState(null);
  const [intResponse, setIntResponse] = useState(null);
  const [intReqInfo, setIntReqInfo] = useState(null);
  const activeError = intError || error;
  const activeResponse = intResponse || response;
  const activeRequestInfo = intReqInfo || requestInfo;

  // Dimensions
  const dims = { small: { w: 320, h: 420 }, medium: { w: 420, h: 540 } };
  const cur = dims[size];

  // ---- Bubble position (left, top) - draggable ----
  const getDefaultBubblePos = () => ({
    x: (typeof window !== 'undefined' ? window.innerWidth : 1920) - BUBBLE_SIZE - MARGIN,
    y: (typeof window !== 'undefined' ? window.innerHeight : 800) - BUBBLE_SIZE - MARGIN,
  });
  const [bubblePos, setBubblePos] = useState(getDefaultBubblePos);
  const [isBubbleDrag, setIsBubbleDrag] = useState(false);
  const bubbleOffset = useRef({ x: 0, y: 0 });
  const bubbleMoved = useRef(false);

  // ---- Panel position (left, top) - draggable ----
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const [isPanelDrag, setIsPanelDrag] = useState(false);
  const panelOffset = useRef({ x: 0, y: 0 });

  // Clamp utility
  const clamp = useCallback((x, y, w, h) => ({
    x: Math.max(0, Math.min(x, window.innerWidth - w - MARGIN)),
    y: Math.max(0, Math.min(y, window.innerHeight - h - MARGIN)),
  }), []);

  // Compute panel position from bubble position (panel's bottom-right aligns with bubble)
  const panelFromBubble = useCallback((bx, by, w, h) => clamp(
    bx + BUBBLE_SIZE - w,   // align right edges
    by + BUBBLE_SIZE - h,   // align bottom edges
    w, h
  ), [clamp]);

  // ---- Window resize: keep both in bounds ----
  useEffect(() => {
    const onResize = () => {
      setBubblePos(prev => ({ x: Math.min(prev.x, window.innerWidth - BUBBLE_SIZE - MARGIN), y: Math.min(prev.y, window.innerHeight - BUBBLE_SIZE - MARGIN) }));
      if (!isMinimized) setPanelPos(prev => clamp(prev.x, prev.y, cur.w, cur.h));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isMinimized, cur, clamp]);

  /* ========== BUBBLE DRAG ========== */
  const onBubbleDown = useCallback((e) => {
    e.preventDefault();
    setIsBubbleDrag(true);
    bubbleMoved.current = false;
    bubbleOffset.current = { x: e.clientX - bubblePos.x, y: e.clientY - bubblePos.y };
  }, [bubblePos]);

  const onBubbleMove = useCallback((e) => {
    if (!isBubbleDrag) return;
    bubbleMoved.current = true;
    setBubblePos({
      x: Math.max(0, Math.min(e.clientX - bubbleOffset.current.x, window.innerWidth - BUBBLE_SIZE)),
      y: Math.max(0, Math.min(e.clientY - bubbleOffset.current.y, window.innerHeight - BUBBLE_SIZE)),
    });
  }, [isBubbleDrag]);

  const onBubbleUp = useCallback(() => setIsBubbleDrag(false), []);

  useEffect(() => {
    if (isBubbleDrag) {
      document.addEventListener('mousemove', onBubbleMove);
      document.addEventListener('mouseup', onBubbleUp);
      return () => { document.removeEventListener('mousemove', onBubbleMove); document.removeEventListener('mouseup', onBubbleUp); };
    }
  }, [isBubbleDrag, onBubbleMove, onBubbleUp]);

  /* ========== PANEL DRAG ========== */
  const onPanelDown = useCallback((e) => {
    if (e.target.closest('.chatbot-drag-handle') && !e.target.closest('button')) {
      setIsPanelDrag(true);
      panelOffset.current = { x: e.clientX - panelPos.x, y: e.clientY - panelPos.y };
      e.preventDefault();
    }
  }, [panelPos]);

  const onPanelMove = useCallback((e) => {
    if (!isPanelDrag) return;
    setPanelPos(clamp(e.clientX - panelOffset.current.x, e.clientY - panelOffset.current.y, cur.w, cur.h));
  }, [isPanelDrag, cur, clamp]);

  const onPanelUp = useCallback(() => setIsPanelDrag(false), []);

  useEffect(() => {
    if (isPanelDrag) {
      document.addEventListener('mousemove', onPanelMove);
      document.addEventListener('mouseup', onPanelUp);
      return () => { document.removeEventListener('mousemove', onPanelMove); document.removeEventListener('mouseup', onPanelUp); };
    }
  }, [isPanelDrag, onPanelMove, onPanelUp]);

  /* ========== EXPAND (bubble -> panel) ========== */
  const handleExpand = useCallback(() => {
    // Calculate panel position from current bubble position
    setPanelPos(panelFromBubble(bubblePos.x, bubblePos.y, cur.w, cur.h));
    setIsMinimized(false);
  }, [bubblePos, cur, panelFromBubble]);

  /* ========== MINIMIZE (panel -> bubble at bottom-right) ========== */
  const handleMinimize = useCallback((e) => {
    if (e) e.stopPropagation();
    // Always reset bubble to bottom-right corner
    setBubblePos(getDefaultBubblePos());
    setIsMinimized(true);
  }, []);

  /* ========== SIZE TOGGLE (panel stays anchored at bottom-right corner) ========== */
  const handleSizeToggle = useCallback((e) => {
    e.stopPropagation();
    const ns = size === 'small' ? 'medium' : 'small';
    const nd = dims[ns];
    setSize(ns);
    // Keep bottom-right corner fixed: adjust x and y
    setPanelPos(prev => clamp(
      prev.x + (cur.w - nd.w),  // shift left/right to keep right edge
      prev.y + (cur.h - nd.h),  // shift up/down to keep bottom edge
      nd.w, nd.h
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, cur, clamp]);

  // Bubble click = expand (only if not dragged)
  const handleBubbleClick = useCallback(() => {
    if (!bubbleMoved.current) handleExpand();
  }, [handleExpand]);

  /* ========== FORCE EXPAND (for errors) ========== */
  const forceExpand = useCallback(() => {
    setIsErrorMode(true);
    setHasAcceptedHelp(false);
    setChatMessages([]);
    setErrorCount(prev => prev + 1);
    const bx = (typeof window !== 'undefined' ? window.innerWidth : 1920) - BUBBLE_SIZE - MARGIN;
    const by = (typeof window !== 'undefined' ? window.innerHeight : 800) - BUBBLE_SIZE - MARGIN;
    setBubblePos({ x: bx, y: by });
    setPanelPos(panelFromBubble(bx, by, dims.small.w, dims.small.h));
    setSize('small');
    setIsMinimized(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelFromBubble]);

  /* ========== ERROR DETECTION ========== */
  // 1. Props-based
  useEffect(() => {
    if (!error && !response) return;
    const sc = response?.status || error?.status || 0;
    if ((sc >= 400 && sc < 600) || (error && !sc)) { setIntError(null); setIntResponse(null); setIntReqInfo(null); forceExpand(); }
  }, [error, response, forceExpand]);

  // Legacy isVisible
  useEffect(() => {
    if (isVisible && isMinimized && !isErrorMode) handleExpand();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  // 2. Custom event
  useEffect(() => {
    const h = (ev) => {
      const { error: e, response: r, requestInfo: ri } = ev.detail || {};
      const sc = r?.status || e?.status || 0;
      if ((sc >= 400 && sc < 600) || (e && !sc)) { setIntError(e); setIntResponse(r); setIntReqInfo(ri); forceExpand(); }
    };
    window.addEventListener('chatbot-api-error', h);
    return () => window.removeEventListener('chatbot-api-error', h);
  }, [forceExpand]);

  // 3. JS errors
  useEffect(() => {
    const onErr = (msg, src, ln, col, err) => {
      if (src && src.includes('chatbot')) return;
      setIntError({ message: typeof msg === 'string' ? msg : err?.message || 'JS error', status: 0 });
      setIntResponse({ status: 0, statusText: 'JavaScript Error' });
      setIntReqInfo({ method: '', url: src || '' });
      forceExpand();
    };
    const onRej = (ev) => {
      const e = ev.reason;
      setIntError({ message: e?.message || String(e), status: 0 });
      setIntResponse({ status: 0, statusText: 'Unhandled Promise Rejection' });
      setIntReqInfo({ method: '', url: '' });
      forceExpand();
    };
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    return () => { window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onRej); };
  }, [forceExpand]);

  /* ========== ERROR MODE ACTIONS ========== */
  const handleAcceptHelp = useCallback(async () => {
    setHasAcceptedHelp(true);
    setChatMessages([{ type: 'user', content: 'Yes, please help me understand this error.' }]);
    setIsProcessing(true);
    setChatMessages(prev => [...prev, { type: 'bot', content: 'Analyzing your error...', isLoading: true }]);
    await new Promise(r => setTimeout(r, 2000));
    const a = generateErrorAnalysis(activeResponse, activeError, activeRequestInfo);
    setChatMessages(prev => { const u = [...prev]; u[u.length-1] = { type: 'bot', content: a, isLoading: false }; return u; });
    setIsProcessing(false);
  }, [activeError, activeResponse, activeRequestInfo]);

  const handleSendMessage = () => {
    if (!userInput.trim() || isProcessing) return;
    const m = userInput.trim();
    setChatMessages(prev => [...prev, { type: 'user', content: m }]);
    setUserInput(''); setIsProcessing(true);
    setTimeout(() => { setChatMessages(prev => [...prev, { type: 'bot', content: generateFollowUpResponse(m, isErrorMode ? 'error' : 'general') }]); setIsProcessing(false); }, 1500);
  };

  const handleDismissError = () => {
    setIsErrorMode(false); setHasAcceptedHelp(false); setChatMessages([]); setErrorCount(0);
    setIntError(null); setIntResponse(null); setIntReqInfo(null);
  };

  const chatScrollRef = useRef(null);
  useEffect(() => { if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; }, [chatMessages]);

  /* ========== VISIBILITY ========== */
  if (currentPath === '/' || currentPath === '') return null;

  /* ========== RENDER: BUBBLE ========== */
  if (isMinimized) {
    return ReactDOM.createPortal(
      <div
        className={clsx("fixed z-[200]", isBubbleDrag ? "cursor-grabbing" : "cursor-grab")}
        style={{
          left: bubblePos.x,
          top: bubblePos.y,
          width: BUBBLE_SIZE,
          height: BUBBLE_SIZE,
          transition: isBubbleDrag ? 'none' : 'left 0.35s cubic-bezier(0.4,0,0.2,1), top 0.35s cubic-bezier(0.4,0,0.2,1)',
          touchAction: 'none',
        }}
        onMouseDown={onBubbleDown}
        data-testid="chatbot-bubble"
      >
        {/* Ping rings */}
        <div className="absolute inset-0 rounded-full animate-ping opacity-70 bg-primary/40" style={{ animationDuration: '1.5s' }} />
        <div className="absolute inset-0 rounded-full animate-ping opacity-40 bg-primary/20" style={{ animationDuration: '1.5s', animationDelay: '0.5s' }} />
        {/* Button */}
        <button
          onClick={handleBubbleClick}
          className="relative w-full h-full rounded-full shadow-2xl transition-transform duration-200 hover:scale-110 bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center"
          data-testid="chatbot-bubble-button"
        >
          <Bot className="w-6 h-6 text-white" />
          {(errorCount > 0 || activeError || (activeResponse?.status >= 400)) && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center animate-pulse font-bold">
              {errorCount > 9 ? '9+' : errorCount || '!'}
            </span>
          )}
        </button>
      </div>,
      document.body
    );
  }

  /* ========== RENDER: PANEL ========== */
  return ReactDOM.createPortal(
    <div
      className={clsx(
        "fixed z-[200] flex flex-col rounded-2xl shadow-2xl overflow-hidden",
        "bg-gradient-to-b from-dark-800 to-dark-900 border border-dark-600/50",
        isPanelDrag && "cursor-grabbing select-none opacity-90",
      )}
      style={{
        left: panelPos.x,
        top: panelPos.y,
        width: cur.w,
        height: cur.h,
        transition: isPanelDrag
          ? 'none'
          : 'left 0.35s cubic-bezier(0.4,0,0.2,1), top 0.35s cubic-bezier(0.4,0,0.2,1), width 0.25s ease-out, height 0.25s ease-out',
      }}
      onMouseDown={onPanelDown}
      data-testid="chatbot-panel"
    >
      {/* HEADER */}
      <div className="chatbot-drag-handle flex items-center justify-between px-4 py-3 bg-dark-800/90 border-b border-dark-700 cursor-grab active:cursor-grabbing select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20"><Bot className="w-5 h-5 text-primary" /></div>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full animate-pulse shadow-lg shadow-primary/50" />
          </div>
          <div><h3 className="text-sm font-semibold text-white">AI Assistant</h3><p className="text-[10px] text-gray-400">{isErrorMode ? 'Error Analysis Helper' : activeTab === 'guide' ? 'Guide Mode' : 'Chat Mode'}</p></div>
        </div>
        <div className="flex items-center gap-1">
          {isErrorMode && (<button onClick={handleDismissError} className="p-1.5 rounded-lg text-yellow-400 hover:text-yellow-300 hover:bg-dark-700 transition-colors" title="Dismiss error" data-testid="dismiss-error-button"><AlertCircle className="w-4 h-4" /></button>)}
          <button onClick={handleSizeToggle} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors" title={size === 'small' ? 'Expand' : 'Shrink'} data-testid="size-toggle-button">{size === 'small' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}</button>
          <button onClick={handleMinimize} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors" title="Minimize" data-testid="minimize-button"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* TABS */}
      {(!isErrorMode || hasAcceptedHelp) && (
        <div className="flex border-b border-dark-700 shrink-0">
          {isErrorMode && hasAcceptedHelp ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-2 text-xs text-red-400 bg-red-500/5"><AlertCircle className="w-3.5 h-3.5" /><span>Error Analysis Active</span></div>
          ) : (
            <>
              <button onClick={() => setActiveTab('guide')} className={clsx("flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-all", activeTab === 'guide' ? "text-primary border-b-2 border-primary bg-primary/5" : "text-gray-400 hover:text-white hover:bg-dark-800")} data-testid="tab-guide-mode"><BookOpen className="w-3.5 h-3.5" /> Guide</button>
              <button onClick={() => setActiveTab('chat')} className={clsx("flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-all", activeTab === 'chat' ? "text-primary border-b-2 border-primary bg-primary/5" : "text-gray-400 hover:text-white hover:bg-dark-800")} data-testid="tab-chat-mode"><MessageCircle className="w-3.5 h-3.5" /> Chat</button>
            </>
          )}
        </div>
      )}

      {/* CONTENT */}
      <div className="flex-1 overflow-hidden">
        {isErrorMode ? (
          !hasAcceptedHelp ? (
            <HelpOfferScreen response={activeResponse} error={activeError} requestInfo={activeRequestInfo} onAccept={handleAcceptHelp} onClose={handleMinimize} />
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={chatScrollRef}>{chatMessages.map((m, i) => <ChatMessage key={i} msg={m} index={i} />)}{isProcessing && chatMessages.length > 0 && !chatMessages[chatMessages.length-1]?.isLoading && <TypingIndicator />}</div>
              <ChatInputBar userInput={userInput} setUserInput={setUserInput} onSend={handleSendMessage} isProcessing={isProcessing} />
            </div>
          )
        ) : (
          activeTab === 'guide' ? <GuideMode /> : <ChatInteractionMode />
        )}
      </div>
    </div>,
    document.body
  );
};

/* ====== EXPORTS ====== */
export const dispatchChatbotError = (error, response, requestInfo) => {
  window.dispatchEvent(new CustomEvent('chatbot-api-error', { detail: { error, response, requestInfo } }));
};

export const useShouldShowChatbot = (response, error) => {
  const [shouldShow, setShouldShow] = useState(false);
  useEffect(() => {
    const sc = response?.status || 0;
    const he = error !== null && error !== undefined;
    if ((sc >= 400) || (he && !sc)) { const t = setTimeout(() => setShouldShow(true), 500); return () => clearTimeout(t); }
    else setShouldShow(false);
  }, [response, error]);
  return [shouldShow, setShouldShow];
};

export default AIChatbotHelper;
