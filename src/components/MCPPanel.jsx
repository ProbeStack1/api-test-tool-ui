// src/components/mcp/MCPPanel.jsx
//
// This file is now a barrel: it re-exports the three building blocks used by
// the host layout. The previous single-component, full-screen MCPPanel has
// been decomposed into:
//
//   • MCPProvider      — wraps the layout's <main> when the MCP Test tab is
//                        active so sidebar + main content share state.
//   • MCPSidebar       — drops into the layout's existing <aside>.
//   • MCPMainContent   — drops into the layout's main <section>.
//
// Keeping the default export for backward compatibility with existing imports
// (renders sidebar + main content side-by-side as a standalone unit).

import React from 'react';
import { MCPProvider } from './mcp/MCPContext';
import MCPSidebar from './mcp/MCPSidebar';
import MCPMainContent from './mcp/MCPMainContent';

export { MCPProvider, MCPSidebar, MCPMainContent };
export { useMCP, MCP_SECTIONS } from './mcp/MCPContext';

/**
 * Standalone render (kept for drop-in callers that want the old behaviour).
 * Prefer using MCPProvider + MCPSidebar + MCPMainContent separately so both
 * panels can live inside your host layout's aside/section slots.
 */
export default function MCPPanel({ activeWorkspaceId }) {
  if (!activeWorkspaceId) return null;
  return (
    <MCPProvider workspaceId={activeWorkspaceId}>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="w-72 border-r border-dark-700 flex-shrink-0">
          <MCPSidebar />
        </aside>
        <MCPMainContent />
      </div>
    </MCPProvider>
  );
}
