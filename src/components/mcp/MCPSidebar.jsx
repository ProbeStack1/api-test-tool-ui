// src/components/mcp/MCPSidebar.jsx
//
// Sidebar content for the MCP Test tab. Drops into the host layout's
// existing <aside> (same slot where `CollectionsPanel` renders for other
// tabs). Drives the active section + shows live service health.

import React from 'react';
import clsx from 'clsx';
import {
  Cpu, Radar, Wrench, Layers, Server, Network, Sparkles, History as HistoryIcon,
  ChevronRight, Zap,
} from 'lucide-react';
import { useMCP } from './MCPContext';
import StatusBadge from './shared/StatusBadge';

const NAV = [
  { id: 'servers',     label: 'Servers',        icon: Radar,       hint: 'Saved MCP servers & health probes' },
  { id: 'inspector',   label: 'Inspector',      icon: Wrench,      hint: 'Tools · Resources · Prompts · Benchmark' },
  { id: 'collections', label: 'Collections',    icon: Layers,      hint: 'Batch runs with assertions' },
  { id: 'mock',        label: 'Mock Servers',   icon: Server,      hint: 'Fake MCP servers for demos / CI' },
  { id: 'bridge',      label: 'MCP ↔ REST',     icon: Network,     hint: 'Call MCP tools over plain HTTP' },
  { id: 'ai',          label: 'AI Test Gen',    icon: Sparkles,    hint: 'Gemini-drafted test suites' },
  { id: 'history',     label: 'History',        icon: HistoryIcon, hint: 'Every MCP call & run, logged' },
];

export default function MCPSidebar() {
  const { section, setSection, servers, activeServer, svcStatus, svcUp: svcUpFlag, breaker } = useMCP();

  const svcUp = svcUpFlag !== null
    ? svcUpFlag
    : (svcStatus?.status === 'UP' || svcStatus?.status === 'ok' || svcStatus?.ok === true);
  const breakerState = (breaker?.state || '').toLowerCase();

  return (
    <div className="flex flex-col h-full min-h-0 bg-dark-800/40" data-testid="mcp-sidebar">
      {/* Hero */}
      <div className="px-3 py-3 border-b border-dark-700/60">
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md" />
            <div className="relative w-9 h-9 rounded-lg border border-primary/40 bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white leading-tight flex items-center gap-1.5">
              MCP Studio
              <span className="text-xs px-1 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-wider font-bold">Beta</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5 leading-tight">Inspect · orchestrate · mock · bridge</div>
          </div>
        </div>

        {/* live status strip */}
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
          <StatusBadge
            status={svcUp ? 'healthy' : 'unhealthy'}
            label={svcUp ? `Up${svcStatus?.version ? ' · v' + svcStatus.version : ''}` : 'Down'}
            size="xs"
          />
          {activeServer && (
            <StatusBadge
              status={
                breakerState === 'open' ? 'open'
                : breakerState === 'half_open' ? 'halfOpen'
                : breakerState === 'closed' ? 'closed'
                : 'unknown'
              }
              label={
                breakerState === 'open' ? 'Breaker open'
                : breakerState === 'half_open' ? 'Half-open'
                : breakerState === 'closed' ? 'Breaker OK'
                : 'Breaker ?'
              }
              size="xs"
            />
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-2 px-1.5 space-y-0.5" role="tablist">
        {NAV.map(item => {
          const Icon = item.icon;
          const active = item.id === section;
          const count = item.id === 'servers' ? servers.length : undefined;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`mcp-nav-${item.id}`}
              onClick={() => setSection(item.id)}
              title={item.hint}
              className={clsx(
                'group w-full flex items-center gap-2.5 pl-2.5 pr-2 py-2 rounded-md transition-all duration-150 text-left',
                active
                  ? 'bg-gradient-to-r from-primary/15 to-transparent text-white ring-1 ring-primary/30 shadow-[inset_2px_0_0_0_var(--color-primary,#ff5b1f)]'
                  : 'text-gray-400 hover:text-white hover:bg-dark-700/50'
              )}
            >
              <span className={clsx(
                'shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors',
                active
                  ? 'bg-primary/20 text-primary'
                  : 'bg-dark-700/60 text-gray-500 group-hover:text-gray-200'
              )}>
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-semibold truncate">{item.label}</span>
                <span className={clsx('block text-xs truncate', active ? 'text-primary/70' : 'text-gray-500')}>
                  {item.hint}
                </span>
              </span>
              {typeof count === 'number' && count > 0 && (
                <span className={clsx(
                  'shrink-0 px-1.5 py-0.5 rounded-full text-[11px] font-mono font-semibold',
                  active ? 'bg-primary/25 text-primary' : 'bg-dark-700 text-gray-400'
                )}>
                  {count}
                </span>
              )}
              <ChevronRight className={clsx('w-3 h-3 shrink-0 transition-transform', active ? 'text-primary translate-x-0.5' : 'text-gray-600 opacity-0 group-hover:opacity-100')} />
            </button>
          );
        })}
      </nav>

      {/* Active server pill (footer) */}
      <div className="border-t border-dark-700/60 px-3 py-2.5 bg-probestack-bg">
        <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Active server</div>
        {activeServer ? (
          <div className="flex items-center gap-2">
            <div className="shrink-0 w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-gray-100 truncate">{activeServer.name}</div>
              <div className="text-xs text-gray-500 font-mono truncate">{activeServer.serverUrl || activeServer.transport || '—'}</div>
            </div>
            <button
              onClick={() => setSection('servers')}
              className="text-[12px] text-primary hover:underline shrink-0"
              title="Switch server"
            >
              switch
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSection('servers')}
            className="w-full text-left text-[11px] text-gray-500 hover:text-primary italic"
          >
            No server selected — pick one →
          </button>
        )}
      </div>
    </div>
  );
}
