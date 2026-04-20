// src/components/mcp/MCPContext.jsx
//
// Shared state for the whole MCP Studio. Both `<MCPSidebar />` (rendered in
// the layout's left <aside>) and `<MCPMainContent />` (rendered in the main
// <section>) read and mutate state through this single provider.
//
// Nothing else in the app depends on this — wrap ONLY when the MCP tab is
// actually active so we don't run useless polls elsewhere.

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import useMcpServers from './hooks/useMcpServers';
import { mcpStatus, mcpBreakerState } from '../../services/mcpService';

const MCPContext = createContext(null);

export const MCP_SECTIONS = [
  'servers',
  'inspector',
  'collections',
  'mock',
  'bridge',
  'ai',
  'history',
];

export function MCPProvider({ workspaceId, children, initialSection = 'servers' }) {
  const [section, setSection] = useState(initialSection);
  const servers = useMcpServers(workspaceId);

  const [svcStatus, setSvcStatus] = useState(null);
  const [svcUp, setSvcUp]         = useState(null);
  const [breaker, setBreaker]     = useState(null);
  const lastBreakerState          = useRef(null);

  // Live request snapshot published by the Bridge tab so the right-sidebar
  // CodeSnippetPanel (</>) can render a cURL / JS / Python / Java / etc.
  // snippet for the current Bridge call. Null when we're not on Bridge or
  // there's nothing to publish.
  const [bridgeRequest, setBridgeRequest] = useState(null);

  const refreshStatus = useCallback(async () => {
    try {
      const { data } = await mcpStatus();
      setSvcStatus(data);
      // Any 2xx response means the service answered — treat as UP unless it
      // explicitly says otherwise. Covers all shapes: {status:"UP"}, {ok:true},
      // {state:"running"}, plain string "ok", etc.
      const explicitDown =
        (data?.status && /^(DOWN|FAIL|ERROR)$/i.test(data.status)) ||
        data?.ok === false;
      setSvcUp(!explicitDown);
    } catch {
      setSvcStatus({ status: 'unknown' });
      setSvcUp(false);
    }
  }, []);

  const refreshBreaker = useCallback(async () => {
    if (!servers.activeServer) {
      setBreaker(null);
      lastBreakerState.current = null;
      return;
    }
    try {
      const { data } = await mcpBreakerState({
        serverId: servers.activeId,
        serverUrl: servers.activeServer.serverUrl,
      });
      setBreaker(data);

      // Notify the user on meaningful breaker state transitions. Values come
      // from Resilience4J: CLOSED | OPEN | HALF_OPEN (+ DISABLED/FORCED_* we
      // can ignore).
      const next = (data?.state || '').toUpperCase();
      const prev = lastBreakerState.current;
      if (prev && next && prev !== next) {
        if (next === 'OPEN') {
          toast.error('Circuit breaker OPEN — server failing. Cooling down ~60s.', { duration: 6000 });
        } else if (next === 'HALF_OPEN') {
          toast('Breaker half-open — probing server recovery…', { duration: 4000 });
        } else if (next === 'CLOSED' && (prev === 'OPEN' || prev === 'HALF_OPEN')) {
          toast.success('Breaker closed — traffic flowing again.', { duration: 4000 });
        }
      }
      lastBreakerState.current = next || null;
    } catch { setBreaker(null); }
  }, [servers.activeId, servers.activeServer]);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);
  useEffect(() => { refreshBreaker(); }, [refreshBreaker]);
  useEffect(() => {
    const id = setInterval(() => { refreshStatus(); refreshBreaker(); }, 30000);
    return () => clearInterval(id);
  }, [refreshStatus, refreshBreaker]);

  const value = {
    workspaceId,
    section,
    setSection,
    // server registry state (list, active, CRUD, publish)
    ...servers,
    // live signals
    svcStatus,
    svcUp,
    breaker,
    refreshStatus,
    refreshBreaker,
    // Bridge → right-sidebar CodeSnippetPanel bridge
    bridgeRequest,
    setBridgeRequest,
  };

  return <MCPContext.Provider value={value}>{children}</MCPContext.Provider>;
}

export function useMCP() {
  const ctx = useContext(MCPContext);
  if (!ctx) throw new Error('useMCP must be used inside <MCPProvider>');
  return ctx;
}
