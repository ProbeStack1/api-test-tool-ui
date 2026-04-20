// src/components/mcp/MCPMainContent.jsx
//
// Drops into the layout's main <section> when the MCP Test tab is active.
// Renders the section selected in the sidebar — no tabs, no header strip
// (those live in <MCPSidebar />).

import React from 'react';
import { useMCP } from './MCPContext';

import ServerRegistry   from './servers/ServerRegistry';
import Inspector        from './inspector/Inspector';
import McpCollections   from './collections/McpCollections';
import McpMockServer    from './mock/McpMockServer';
import McpBridge        from './bridge/McpBridge';
import AiTestGenerator  from './ai/AiTestGenerator';
import McpHistory       from './history/McpHistory';

export default function MCPMainContent() {
  const mcp = useMCP();
  const {
    section, setSection,
    servers, activeId, setActiveId, workspaceId,
    loading, refresh,
    createServer, updateServer, deleteServer, probeServer,
  } = mcp;

  const goToServers = () => setSection('servers');

  return (
    <div
      className="relative flex-1 min-h-0 flex flex-col bg-probestack-bg text-white overflow-hidden"
      data-testid={`mcp-main-${section}`}
    >
      <GridBackdrop />
      <div className="relative z-10 flex-1 min-h-0 overflow-auto custom-scrollbar p-4 animate-[fadeInUp_220ms_ease-out]">
        {section === 'servers' && (
          <ServerRegistry
            servers={servers}
            loading={loading}
            activeId={activeId}
            setActiveId={setActiveId}
            createServer={createServer}
            updateServer={updateServer}
            deleteServer={deleteServer}
            probeServer={probeServer}
            refresh={refresh}
            workspaceId={workspaceId}
          />
        )}
        {section === 'inspector' && (
          <Inspector
            servers={servers}
            activeId={activeId}
            setActiveId={setActiveId}
            workspaceId={workspaceId}
            onManageServers={goToServers}
          />
        )}
        {section === 'collections' && (
          <McpCollections
            servers={servers}
            activeId={activeId}
            setActiveId={setActiveId}
            workspaceId={workspaceId}
            onManageServers={goToServers}
          />
        )}
        {section === 'mock'   && <McpMockServer workspaceId={workspaceId} />}
        {section === 'bridge' && (
          <McpBridge
            servers={servers}
            activeId={activeId}
            setActiveId={setActiveId}
            workspaceId={workspaceId}
            onManageServers={goToServers}
          />
        )}
        {section === 'ai' && (
          <AiTestGenerator
            servers={servers}
            activeId={activeId}
            setActiveId={setActiveId}
            workspaceId={workspaceId}
            onManageServers={goToServers}
          />
        )}
        {section === 'history' && <McpHistory workspaceId={workspaceId} servers={servers} />}
      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

/* ───── Decorative backdrop (very subtle grid + radial glow) ───── */
function GridBackdrop() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,91,31,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,91,31,0.06) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse 70% 55% at 50% 0%, #000 35%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 55% at 50% 0%, #000 35%, transparent 80%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[680px] h-[180px] rounded-full blur-3xl opacity-25"
        style={{ background: 'radial-gradient(closest-side, rgba(255,91,31,0.45), transparent 70%)' }}
      />
    </>
  );
}
