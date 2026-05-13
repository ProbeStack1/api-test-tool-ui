/**
 * CommandPalette — "Search or jump to…" dropdown that anchors directly
 * below the header search bar. No backdrop dim, no blur — just a crisp
 * floating panel. Cmd/Ctrl+K toggles; ArrowUp/Down / Enter / Esc navigate.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft } from 'lucide-react';
import {
  FolderOpen, History, Variable, Boxes, Server, TestTube2, LayoutDashboard,
  Sparkles, Activity, Plug, FileText, Share2, ShieldCheck, ShieldAlert,
  ClipboardList, Trash2, HeartPulse, Mail, Bug, User, Settings as SettingsIcon,
  Home as HomeIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

type Group = 'Workspace' | 'Testing' | 'Ops' | 'Account';

interface Entry {
  label: string;
  hint: string;
  route: string;
  icon: LucideIcon;
  group: Group;
  keywords?: string;
}

const ENTRIES: Entry[] = [
  { group: 'Workspace', label: 'Collections',  hint: 'Browse & run requests', route: '/projects/collections',  icon: FolderOpen },
  { group: 'Workspace', label: 'History',      hint: 'Past responses',        route: '/projects/collections',  icon: History, keywords: 'log' },
  { group: 'Workspace', label: 'Variables',    hint: 'Global / env',          route: '/projects/variables',    icon: Variable },
  { group: 'Workspace', label: 'Dashboard',    hint: 'Overview',              route: '/projects/dashboard',    icon: LayoutDashboard },
  { group: 'Workspace', label: 'Home',         hint: 'Discovery',             route: '/home',                  icon: HomeIcon },
  { group: 'Testing',   label: 'MCP Studio',   hint: 'Model-context servers', route: '/projects/mcp',          icon: Boxes, keywords: 'llm ai tools' },
  { group: 'Testing',   label: 'Mocks',        hint: 'Mock servers',          route: '/projects/mocks',        icon: Server },
  { group: 'Testing',   label: 'Testing',      hint: 'Specs / cases / load',  route: '/projects/testing',      icon: TestTube2, keywords: 'functional spec' },
  { group: 'Testing',   label: 'Monitors',     hint: 'Scheduled checks',      route: '/projects/monitors',     icon: Activity, keywords: 'uptime' },
  { group: 'Testing',   label: 'Security Scan',hint: 'Vulnerability checks',  route: '/projects/security',     icon: ShieldAlert, keywords: 'owasp' },
  { group: 'Ops',       label: 'AI Assistant', hint: 'Chat with ForgeQ AI',   route: '/projects/ai-assisted',  icon: Sparkles, keywords: 'chatbot gpt' },
  { group: 'Ops',       label: 'Integrations', hint: 'Connect services',      route: '/projects/integrations', icon: Plug },
  { group: 'Ops',       label: 'API Docs',     hint: 'OpenAPI docs',          route: '/projects/api-docs',     icon: FileText, keywords: 'openapi swagger' },
  { group: 'Ops',       label: 'Governance',   hint: 'Policy & compliance',   route: '/home/governance',       icon: ShieldCheck },
  { group: 'Ops',       label: 'Audit',        hint: 'Activity log',          route: '/projects/audit',        icon: ClipboardList },
  { group: 'Ops',       label: 'Trash',        hint: 'Deleted items',         route: '/projects/trash',        icon: Trash2 },
  { group: 'Ops',       label: 'Heartbeats',   hint: 'Service pings',         route: '/projects/heartbeats',   icon: HeartPulse },
  { group: 'Ops',       label: 'Digests',      hint: 'Email summaries',       route: '/projects/digests',      icon: Mail },
  { group: 'Ops',       label: 'Bug Tracker',  hint: 'Issues & tickets',      route: '/projects/bug-tracker',  icon: Bug },
  { group: 'Account',   label: 'Profile',      hint: 'Your account',          route: '/projects/profile',      icon: User },
  { group: 'Account',   label: 'Settings',     hint: 'Preferences',           route: '/projects/settings',     icon: SettingsIcon },
];

const GROUP_ORDER: Group[] = ['Workspace', 'Testing', 'Ops', 'Account'];

interface Props {
  open: boolean;
  onClose: () => void;
  /** DOM rect of the anchor element (search button). Dropdown aligns to it. */
  anchorRect?: DOMRect | null;
}

export const CommandPalette = ({ open, onClose, anchorRect }: Props) => {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ENTRIES;
    return ENTRIES.filter((e) =>
      e.label.toLowerCase().includes(t) ||
      e.hint.toLowerCase().includes(t) ||
      (e.keywords ?? '').toLowerCase().includes(t) ||
      e.route.toLowerCase().includes(t),
    );
  }, [q]);

  const grouped = useMemo(() => {
    const by: Record<Group, Entry[]> = { Workspace: [], Testing: [], Ops: [], Account: [] };
    for (const e of matches) by[e.group].push(e);
    const flat: Entry[] = [];
    GROUP_ORDER.forEach((g) => by[g].forEach((e) => flat.push(e)));
    return { by, flat };
  }, [matches]);

  useEffect(() => { setIdx(0); }, [q, open]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 10); }, [open]);
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [idx]);

  // Outside click closes the dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (panelRef.current && !panelRef.current.contains(t)) onClose();
    };
    // Defer to next tick so the click that opened it doesn't immediately close.
    const id = window.setTimeout(() => window.addEventListener('mousedown', onDown), 0);
    return () => { window.clearTimeout(id); window.removeEventListener('mousedown', onDown); };
  }, [open, onClose]);

  if (!open) return null;

  const pick = (e: Entry) => { nav(e.route); onClose(); setQ(''); };

  // Position: below the anchor, aligned to its left edge; width matches anchor
  // with a min/max clamp for readability. Falls back to top-center if no rect.
  const width = Math.max(420, Math.min(560, anchorRect?.width ?? 480));
  const top = (anchorRect?.bottom ?? 48) + 6;
  const left = anchorRect
    ? Math.max(8, Math.min(window.innerWidth - width - 8, anchorRect.left + anchorRect.width / 2 - width / 2))
    : Math.max(8, (window.innerWidth - width) / 2);

  let running = 0;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      data-testid="command-palette"
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      }}
      style={{
        position: 'fixed',
        top,
        left,
        width,
        zIndex: 50,
        animation: 'cmdk-in 120ms ease-out',
      }}
      className="overflow-hidden rounded-lg border border-border bg-elevated shadow-xl"
    >
      <style>{`@keyframes cmdk-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Input row */}
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="h-3.5 w-3.5 text-text-muted" />
        <input
          ref={inputRef}
          data-testid="command-palette-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(grouped.flat.length - 1, i + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
            else if (e.key === 'Enter') { e.preventDefault(); if (grouped.flat[idx]) pick(grouped.flat[idx]); }
            else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
          }}
          placeholder="Search or jump to…"
          className="h-9 flex-1 bg-transparent text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <kbd className="rounded border border-border bg-probestack-bg px-1.5 py-0.5 font-mono text-[9px] text-text-muted">ESC</kbd>
      </div>

      {/* Results */}
      <div ref={listRef} className="max-h-[320px] overflow-auto py-1">
        {grouped.flat.length === 0 ? (
          <div data-testid="command-palette-empty" className="px-3 py-6 text-center text-xs text-text-muted">
            No matches for <span className="text-text-primary">&ldquo;{q}&rdquo;</span>
          </div>
        ) : GROUP_ORDER.map((g) => {
          const items = grouped.by[g];
          if (!items.length) return null;
          return (
            <div key={g} className="pb-1">
              <div className="px-3 pb-0.5 pt-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-text-muted/80">
                {g}
              </div>
              {items.map((e) => {
                const i = running++;
                const Icon = e.icon;
                const active = i === idx;
                return (
                  <button
                    key={e.route + e.label}
                    data-idx={i}
                    data-testid={`command-palette-item-${e.label.toLowerCase().replace(/\s+/g, '-')}`}
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => pick(e)}
                    className={cn(
                      'group mx-1 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors',
                      active ? 'bg-primary-muted text-primary' : 'text-text-primary hover:bg-hover',
                    )}
                    style={{ width: 'calc(100% - 0.5rem)' }}
                  >
                    <div className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded',
                      active ? 'bg-primary/15 text-primary' : 'bg-probestack-bg text-text-muted group-hover:text-text-primary',
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-medium leading-tight">{e.label}</div>
                      <div className="truncate text-[10.5px] text-text-muted">{e.hint}</div>
                    </div>
                    {active && <CornerDownLeft className="h-3 w-3 text-primary" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border bg-probestack-bg/50 px-3 py-1.5 text-[10px] text-text-muted">
        <span>{grouped.flat.length} {grouped.flat.length === 1 ? 'result' : 'results'}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface px-1 font-mono text-[9px]">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface px-1 font-mono text-[9px]">↵</kbd>
            open
          </span>
        </span>
      </div>
    </div>
  );
};
