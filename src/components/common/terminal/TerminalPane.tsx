/**
 * TerminalPane — line-based in-browser terminal.
 *
 * Highlights:
 *   • Prompt mirrors a real shell: {@code forgefuzz:user@workspace/collection$ }.
 *     Auto-refreshes whenever workspace or collection context changes.
 *   • ↑/↓ scrolls command history (persists in localStorage)
 *   • Tab triggers server-side autocomplete (commands / collection
 *     names / request names — context-aware)
 *   • Ctrl+C cancels in-flight command, Ctrl+L clears scrollback
 *   • Unknown / failing commands surface a clear error AND auto-pop
 *     the AI chatbot so the user can hit "analyze this" without
 *     leaving the terminal.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Terminal,
  RotateCcw,
  Trash2,
  MessageCircleQuestion,
  ArrowRightSquare,
  ArrowDownSquare,
  X,
} from "lucide-react";
import {
  execTerminal,
  fetchHelp,
  fetchPrompt,
  fetchSuggest,
  type TerminalLine,
} from "@/services/terminal.service";
import { useTerminal, type TerminalScrollLine } from "@/stores/terminal.store";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { useChatbot } from "@/stores/chatbot.store";
import { cn } from "@/utils/cn";

interface ScrollLine {
  prompt?: string;
  level?: string;
  text: string;
  /** When set, renders an inline "Ask AI" CTA after the line. */
  actionable?: { kind: string; raw: string; suggestion?: string };
  data?: Record<string, unknown>;
}

const LEVEL_CLASS: Record<string, string> = {
  info: "text-text-primary",
  success: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-red-400",
  dim: "text-text-muted",
  raw: "text-text-secondary",
};

export const TerminalPane = () => {
  const lines = useTerminal((s) => s.lines);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("forgefuzz$ ");
  const abortRef = useRef<{ abort: () => void } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const history = useTerminal((s) => s.history);
  const pushHistory = useTerminal((s) => s.pushHistory);
  const clearHistory = useTerminal((s) => s.clearHistory);
  const position = useTerminal((s) => s.position);
  const setPosition = useTerminal((s) => s.setPosition);
  const setOpen = useTerminal((s) => s.setOpen);
  const setLines = useTerminal((s) => s.setLines);
  const appendLine = useTerminal((s) => s.appendLine);
  const clearLines = useTerminal((s) => s.clearLines);

  // Workspace context — REACTIVE. Whenever the user switches workspaces
  // in the app, the prompt auto-refreshes + current-collection inside
  // the terminal is reset (collections are workspace-scoped).
  const workspaceId = useWorkspaceStore((s) => s.current?.id);
  const workspaceName = useWorkspaceStore((s) => s.current?.name);

  // Auto-detect collection from URL on first mount, then let `cd` switch.
  const loc = useLocation();
  const urlCollectionId = useMemo(() => {
    const m = loc.pathname.match(/\/collections\/([0-9a-f-]{36})/i);
    return m?.[1];
  }, [loc.pathname]);
  const [ctxCollectionId, setCtxCollectionId] = useState<string | undefined>(
    undefined,
  );
  const [ctxCollectionName, setCtxCollectionName] = useState<
    string | undefined
  >(undefined);

  // Sync from URL
  useEffect(() => {
    setCtxCollectionId(urlCollectionId);
  }, [urlCollectionId]);
  // Reset collection when workspace switches (collections are workspace-scoped).
  useEffect(() => {
    setCtxCollectionId(undefined);
    setCtxCollectionName(undefined);
  }, [workspaceId]);

  // Chatbot — opened on errors so user can ask AI to analyse.
  const triggerError = useChatbot((s) => s.triggerError);

  // One-time greet + initial prompt
  useEffect(() => {
    if (lines.length > 0) return;
    let cancel = false;
    Promise.all([
      fetchHelp().catch(() => null),
      fetchPrompt(workspaceId, ctxCollectionId).catch(() => "forgefuzz$ "),
    ]).then(([c, p]) => {
      if (cancel) return;
      setPrompt(p || c?.prompt || "forgefuzz$ ");
      setLines([
        {
          level: "info",
          text: "ForgeFuzz Terminal · session " + sessionId.slice(0, 8),
        },
        {
          level: "dim",
          text: 'Type "help" to list commands. ↑/↓ history · Tab autocomplete · Ctrl+L clear · Ctrl+C cancel.',
        },
        { level: "dim", text: "" },
      ]);
    });
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length]);

  // Refresh prompt whenever workspace or collection context changes.
  useEffect(() => {
    fetchPrompt(workspaceId, ctxCollectionId)
      .then((p) => p && setPrompt(p))
      .catch(() => {});
  }, [workspaceId, ctxCollectionId]);

  // Auto-scroll on new lines
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const append = useCallback((ln: ScrollLine) => appendLine(ln), [appendLine]);

  const askAiAbout = useCallback(
    (rawLine: string, errText: string) => {
      triggerError({
        method: "TERMINAL",
        url: rawLine,
        statusText: errText,
        errorMessage: errText,
        location: "terminal",
      });
    },
    [triggerError],
  );

  const runLine = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      if (busy) return;
      pushHistory(trimmed);
      setHistoryCursor(null);
      append({ prompt, text: trimmed });

      if (trimmed === "clear") {
        clearLines();
        return;
      }

      setBusy(true);
      let lastErrorText: string | null = null;
      const ctl = execTerminal(
        {
          line: trimmed,
          sessionId,
          currentCollectionId: ctxCollectionId,
          currentWorkspaceId: workspaceId,
        },
        (event, payload) => {
          if (event === "done") {
            setBusy(false);
            return;
          }
          const ln = payload as TerminalLine;
          // Server side channels
          if (ln.level === "__ctx__") {
            if (ln.data && typeof ln.data.collectionId === "string")
              setCtxCollectionId(ln.data.collectionId);
            if (ln.data && typeof ln.data.collectionName === "string")
              setCtxCollectionName(ln.data.collectionName);
            append({ level: "success", text: ln.text });
            return;
          }
          if (ln.level === "__clear__") {
            clearLines();
            return;
          }
          if (ln.level === "__result__") {
            return;
          }
          if (ln.level === "__error__") {
            // surface inline CTA so the user can ask the chatbot
            const kind = (ln.data?.kind as string) ?? "unknown";
            append({
              level: "error",
              text: "",
              actionable: {
                kind,
                raw: trimmed,
                suggestion: (ln.data?.suggestion as string) || undefined,
              },
            });
            lastErrorText = ln.text || lastErrorText;
            return;
          }
          if (ln.level === "error") lastErrorText = ln.text;
          append({ level: ln.level, text: ln.text, data: ln.data });
        },
      );
      abortRef.current = ctl;
      ctl.done.finally(() => {
        setBusy(false);
        abortRef.current = null;
        inputRef.current?.focus();
        // Auto-pop the chatbot on hard failure so the user has 1-click
        // "analyze this" handy. Only fires on errors so success runs
        // don't pollute the chat UI.
        if (lastErrorText) {
          askAiAbout(trimmed, lastErrorText);
        }
      });
    },
    [
      append,
      askAiAbout,
      busy,
      ctxCollectionId,
      prompt,
      pushHistory,
      sessionId,
      workspaceId,
    ],
  );

  /* ── Tab autocomplete ──────────────────────────────────────────── */
  const completeNow = useCallback(async () => {
    if (busy) return;
    const before = input;
    const suggestions = await fetchSuggest(
      before,
      workspaceId,
      ctxCollectionId,
    );
    if (suggestions.length === 0) return;
    if (suggestions.length === 1) {
      // Replace the trailing token (or append, if line ends with space).
      const trailingSpace = before.endsWith(" ");
      if (trailingSpace) {
        setInput(before + suggestions[0] + " ");
      } else {
        const lastSp = before.lastIndexOf(" ");
        const prefix = lastSp === -1 ? "" : before.slice(0, lastSp + 1);
        setInput(prefix + suggestions[0] + " ");
      }
      return;
    }
    // Multiple options — list them, terminal-style.
    append({ prompt, text: before });
    append({ level: "dim", text: suggestions.join("   ") });
  }, [append, busy, ctxCollectionId, input, prompt, workspaceId]);

  // Keyboard handling
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      runLine(input);
      setInput("");
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      void completeNow();
      return;
    }
    if (e.ctrlKey && (e.key === "l" || e.key === "L")) {
      e.preventDefault();
      clearLines();
      return;
    }
    if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      if (abortRef.current) {
        abortRef.current.abort();
        append({ level: "warn", text: "^C — cancelled" });
      }
      setInput("");
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next =
        historyCursor == null
          ? history.length - 1
          : Math.max(0, historyCursor - 1);
      setHistoryCursor(next);
      setInput(history[next]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyCursor == null) return;
      const next = historyCursor + 1;
      if (next >= history.length) {
        setHistoryCursor(null);
        setInput("");
      } else {
        setHistoryCursor(next);
        setInput(history[next]);
      }
      return;
    }
  };

  return (
    <div
      className="flex h-full flex-col bg-surface"
      data-testid="terminal-pane"
    >
      <header className="flex h-8 shrink-0 z-9 items-center justify-between border-b border-border bg-elevated px-3 text-[11px] text-text-secondary">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-text-primary">Terminal</span>
          {workspaceName && (
            <span className="text-text-muted">
              · {workspaceName}
              {ctxCollectionName ? ` / ${ctxCollectionName}` : ""}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            data-testid="terminal-clear"
            onClick={() => clearLines()}
            className="rounded p-1 hover:bg-hover"
            title="Clear screen (Ctrl+L)"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            data-testid="terminal-history-clear"
            onClick={clearHistory}
            className="rounded p-1 hover:bg-hover"
            title="Clear command history"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setPosition(position === "bottom" ? "right" : "bottom")
            }
            className="rounded p-1 hover:bg-hover"
            title={position === "bottom" ? "Dock to right" : "Dock to bottom"}
          >
            {position === "bottom" ? (
              <ArrowRightSquare className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownSquare className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            data-testid="terminal-close"
            onClick={() => setOpen(false)}
            className="rounded p-1 hover:bg-hover"
            title="Close terminal (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        data-testid="terminal-scroll"
        className="group relative flex-1 overflow-auto bg-elevated px-3 py-3 font-mono text-[12px] leading-[1.6] text-text-primary"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((l, i) => (
          <div
            key={i}
            className={cn(
              "whitespace-pre-wrap",
              l.level
                ? (LEVEL_CLASS[l.level] ?? LEVEL_CLASS.raw)
                : LEVEL_CLASS.raw,
            )}
          >
            {l.prompt && <span className="text-emerald-400">{l.prompt}</span>}
            {l.text}
            {l.actionable && (
              <span className="ml-2 inline-flex items-center gap-1">
                {l.actionable.suggestion && (
                  <button
                    type="button"
                    data-testid="terminal-apply-suggestion"
                    onClick={() => setInput(l.actionable!.suggestion!)}
                    className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/20"
                  >
                    Use “{l.actionable.suggestion}”
                  </button>
                )}
                <button
                  type="button"
                  data-testid="terminal-ask-ai"
                  onClick={() =>
                    askAiAbout(l.actionable!.raw, l.text || "Command failed")
                  }
                  className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-1.5 text-[10px] font-semibold text-primary hover:bg-primary/20"
                >
                  <MessageCircleQuestion className="h-2.5 w-2.5" /> Ask AI
                </button>
              </span>
            )}
          </div>
        ))}

        <div className="flex items-center gap-2 pt-2 text-text-primary">
          <span className="text-emerald-400">{prompt}</span>
          <span className="flex-1 whitespace-pre-wrap break-words">
            {input}
            <span className="inline-block h-4 w-[1px] bg-text-primary align-text-bottom animate-pulse" />
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        data-testid="terminal-input"
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={busy}
        spellCheck={false}
        autoComplete="off"
        className="sr-only"
      />
    </div>
  );
};
