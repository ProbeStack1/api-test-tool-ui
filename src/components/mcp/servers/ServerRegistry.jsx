// src/components/mcp/servers/ServerRegistry.jsx
import React, { useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import {
  Server, Plus, RefreshCw, Radio, Trash2, Edit3, Download, Copy, CheckCircle2, Radar,
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../shared/Card';
import StatusBadge from '../shared/StatusBadge';
import EmptyState from '../shared/EmptyState';
import { LoadingBlock } from '../shared/Spinner';
import Modal, { ModalButton } from '../shared/Modal';
import { Field, TextInput, Select, Button } from '../shared/Field';
import { mcpExportClaudeConfig, mcpExportWorkspaceClaudeConfig } from '../../../services/mcpService';

const TRANSPORTS = [
  { id: 'STREAMABLE_HTTP', label: 'Streamable HTTP (recommended)' },
  { id: 'SSE',             label: 'Server-Sent Events (legacy)' },
  { id: 'STDIO',           label: 'STDIO (local process)' },
];

const emptyDraft = { name: '', serverUrl: '', transport: 'STREAMABLE_HTTP', description: '', authHeadersJson: '' };

export default function ServerRegistry({
  servers, loading, activeId, setActiveId,
  createServer, updateServer, deleteServer, probeServer, refresh,
  workspaceId,
}) {
  const [editing, setEditing]   = useState(null);    // server being edited
  const [creating, setCreating] = useState(false);
  const [probingId, setProbingId] = useState(null);

  const [draft, setDraft] = useState(emptyDraft);
  const [errors, setErrors] = useState({});

  const openCreate = () => { setDraft(emptyDraft); setErrors({}); setCreating(true); };
  const openEdit   = (s) => {
    setDraft({
      name: s.name || '',
      serverUrl: s.serverUrl || s.url || '',
      transport: s.transport || 'STREAMABLE_HTTP',
      description: s.description || '',
      authHeadersJson: s.authHeaders ? JSON.stringify(s.authHeaders, null, 2) : '',
    });
    setErrors({});
    setEditing(s);
  };
  const close = () => { setCreating(false); setEditing(null); };

  const validate = () => {
    const errs = {};
    if (!draft.name.trim()) errs.name = 'Required';
    if (draft.transport !== 'STDIO' && !draft.serverUrl.trim()) errs.serverUrl = 'Required for HTTP/SSE';
    if (draft.authHeadersJson.trim()) {
      try { JSON.parse(draft.authHeadersJson); }
      catch { errs.authHeadersJson = 'Must be valid JSON object'; }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = () => ({
    name: draft.name.trim(),
    serverUrl: draft.serverUrl.trim() || null,
    transport: draft.transport,
    description: draft.description.trim() || null,
    authHeaders: draft.authHeadersJson.trim() ? JSON.parse(draft.authHeadersJson) : null,
  });

  const handleSave = async () => {
    if (!validate()) return;
    if (editing) {
      await updateServer(editing.id || editing.serverId, buildPayload());
    } else {
      await createServer(buildPayload());
    }
    close();
  };

  const handleProbe = async (id) => {
    setProbingId(id);
    try { await probeServer(id); toast.success('Probe complete'); }
    finally { setProbingId(null); }
  };

  const handleDownloadClaude = async (id) => {
    try {
      const { data } = await mcpExportClaudeConfig(id, false);
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast.success('Claude Desktop config copied to clipboard');
    } catch (err) { toast.error('Export failed'); }
  };

  const handleDownloadWorkspaceClaude = async () => {
    try {
      const { data } = await mcpExportWorkspaceClaudeConfig(workspaceId, false);
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast.success('Full workspace Claude config copied');
    } catch (err) { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Radar className="w-4 h-4 text-primary" /> MCP Server Registry
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Register and monitor every MCP server your workspace talks to.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="subtle" icon={Download} onClick={handleDownloadWorkspaceClaude}>Claude Config</Button>
          <Button variant="outline" icon={RefreshCw} onClick={refresh}>Refresh</Button>
          <Button variant="primary" icon={Plus} onClick={openCreate}>Register Server</Button>
        </div>
      </div>

      {loading && servers.length === 0 ? (
        <LoadingBlock label="Loading servers…" />
      ) : servers.length === 0 ? (
        <Card><CardBody>
          <EmptyState
            icon={Server}
            title="No MCP servers yet"
            description="Register your first MCP server to start inspecting tools, resources and prompts."
            action={<Button variant="primary" icon={Plus} onClick={openCreate}>Register Server</Button>}
          />
        </CardBody></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {servers.map(s => {
            const id = s.id || s.serverId;
            const isActive = id === activeId;
            const status = (s.healthStatus || 'unknown').toLowerCase();
            return (
              <Card key={id} hoverable glow={isActive} className={clsx('overflow-hidden', isActive && 'ring-1 ring-primary/40')}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
                      <Server className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-white truncate">{s.name}</h4>
                        <StatusBadge status={status} pulse={status === 'connecting'} />
                        {isActive && <span className="px-1.5 py-0.5 text-[9px] rounded bg-primary/20 text-primary uppercase tracking-wider font-semibold">Active</span>}
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono truncate mt-1">{s.serverUrl || s.url || 'no URL'}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        <span className="px-1.5 py-0.5 rounded bg-dark-700 mr-1">{s.transport || '—'}</span>
                        {s.protocolVersion && <span className="text-gray-500">v{s.protocolVersion}</span>}
                      </p>
                      {s.description && <p className="text-[11px] text-gray-400 mt-2 line-clamp-2">{s.description}</p>}
                      {s.lastProbeLatencyMs != null && (
                        <p className="text-[10px] text-gray-500 mt-2 font-mono">
                          Last ping: {s.lastProbeLatencyMs}ms
                          {s.lastProbedAt && <> · {new Date(s.lastProbedAt).toLocaleTimeString()}</>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1 px-3 py-2 border-t border-dark-700/60 bg-dark-900/30">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={isActive ? 'success' : 'subtle'}
                      icon={CheckCircle2}
                      onClick={() => setActiveId(id)}
                    >
                      {isActive ? 'Selected' : 'Use'}
                    </Button>
                    <Button size="sm" variant="ghost" icon={Radio} loading={probingId === id} onClick={() => handleProbe(id)}>
                      Probe
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDownloadClaude(id)} className="p-1.5 rounded hover:bg-dark-700 text-gray-400 hover:text-primary" title="Copy Claude Desktop config">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-dark-700 text-gray-400 hover:text-white" title="Edit">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (confirm(`Delete "${s.name}"?`)) deleteServer(id); }} className="p-1.5 rounded hover:bg-red-500/15 text-gray-400 hover:text-red-400" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={creating || !!editing}
        onClose={close}
        title={editing ? 'Edit MCP Server' : 'Register MCP Server'}
        subtitle="Saved servers are shared across Inspector, Collections, Mocks and Bridge."
        size="lg"
        footer={
          <>
            <ModalButton variant="ghost" onClick={close}>Cancel</ModalButton>
            <ModalButton variant="primary" onClick={handleSave}>{editing ? 'Save changes' : 'Register'}</ModalButton>
          </>
        }
      >
        <div className="space-y-3.5">
          <Field label="Name" required error={errors.name}>
            <TextInput value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. GitHub MCP" autoFocus />
          </Field>
          <Field label="Transport" required>
            <Select value={draft.transport} onChange={e => setDraft({ ...draft, transport: e.target.value })}>
              {TRANSPORTS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </Field>
          {draft.transport !== 'STDIO' && (
            <Field label="Server URL" required error={errors.serverUrl} hint="e.g. https://api.example.com/mcp">
              <TextInput value={draft.serverUrl} onChange={e => setDraft({ ...draft, serverUrl: e.target.value })} placeholder="https://…/mcp" />
            </Field>
          )}
          <Field label="Description" hint="Optional — shown in cards.">
            <TextInput value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Short description" />
          </Field>
          <Field label="Auth headers (JSON)" error={errors.authHeadersJson} hint='e.g. {"Authorization": "Bearer …"}'>
            <textarea
              value={draft.authHeadersJson}
              onChange={e => setDraft({ ...draft, authHeadersJson: e.target.value })}
              rows={4}
              spellCheck={false}
              placeholder='{"Authorization": "Bearer …"}'
              className="w-full rounded-md  border border-dark-700 px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 custom-scrollbar"
              style={{ tabSize: 2 }}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
