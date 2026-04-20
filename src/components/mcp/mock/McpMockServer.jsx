// src/components/mcp/mock/McpMockServer.jsx
import React, { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { Server, Plus, RefreshCw, Copy, Edit3, Trash2, Check, Globe } from 'lucide-react';
import Card, { CardBody } from '../shared/Card';
import EmptyState from '../shared/EmptyState';
import { LoadingBlock } from '../shared/Spinner';
import Modal, { ModalButton } from '../shared/Modal';
import JsonEditor from '../shared/JsonEditor';
import { Button, Field, TextInput } from '../shared/Field';
import StatusBadge from '../shared/StatusBadge';
import {
  mcpListMocks, mcpCreateMock, mcpUpdateMock, mcpDeleteMock, mcpMockPublicUrl,
} from '../../../services/mcpService';

const SAMPLE_FIXTURES = JSON.stringify({
  tools: [
    { name: 'hello_world', description: 'Returns a greeting', inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }, response: { content: [{ type: 'text', text: 'Hello, {{name}}!' }] } },
  ],
  resources: [
    { uri: 'mock://readme', name: 'README', mimeType: 'text/plain', content: 'This is a mock resource.' },
  ],
  prompts: [
    { name: 'summarize', description: 'Summarize the input', arguments: [{ name: 'text', required: true }], messages: [{ role: 'user', content: { type: 'text', text: 'Summarize: {{text}}' } }] },
  ],
}, null, 2);

export default function McpMockServer({ workspaceId }) {
  const [loading, setLoading] = useState(false);
  const [mocks, setMocks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [copied, setCopied] = useState(null);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { data } = await mcpListMocks(workspaceId);
      const list = Array.isArray(data) ? data : (data?.items || []);
      setMocks(list);
    } catch (err) { toast.error('Failed to load mocks'); }
    finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  const openCreate = () => setEditing({
    isNew: true, name: '', slug: '', description: '',
    fixturesJson: SAMPLE_FIXTURES,
    enabled: true,
  });

  const openEdit = (m) => setEditing({
    id: m.id, isNew: false,
    name: m.name || '', slug: m.slug || '', description: m.description || '',
    fixturesJson: m.fixtures ? JSON.stringify(m.fixtures, null, 2) : '{}',
    enabled: m.enabled !== false,
  });

  const handleSave = async () => {
    const e = editing;
    if (!e.name.trim()) { toast.error('Name required'); return; }
    if (!e.slug.trim()) { toast.error('Slug required'); return; }
    let fixtures;
    try { fixtures = e.fixturesJson.trim() ? JSON.parse(e.fixturesJson) : {}; }
    catch { toast.error('Fixtures must be valid JSON'); return; }
    const payload = {
      workspaceId, name: e.name.trim(), slug: e.slug.trim(), description: e.description || null,
      fixtures, enabled: e.enabled,
    };
    try {
      if (e.isNew) await mcpCreateMock(payload);
      else await mcpUpdateMock(e.id, payload);
      toast.success('Mock saved');
      setEditing(null);
      refresh();
    } catch (err) { toast.error('Save failed: ' + (err.response?.data?.message || err.message)); }
  };

  const handleDelete = async (m) => {
    if (!confirm(`Delete mock "${m.name}"?`)) return;
    try { await mcpDeleteMock(m.id); toast.success('Deleted'); refresh(); }
    catch { toast.error('Delete failed'); }
  };

  const handleCopy = async (slug) => {
    const url = mcpMockPublicUrl(slug);
    await navigator.clipboard.writeText(url);
    setCopied(slug);
    toast.success('Public URL copied');
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" /> Mock MCP Servers
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Spin up zero-config fake MCP endpoints for UI demos, CI, and offline testing.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={RefreshCw} onClick={refresh}>Refresh</Button>
          <Button variant="primary" icon={Plus} onClick={openCreate}>New mock</Button>
        </div>
      </div>

      {loading && mocks.length === 0 ? <LoadingBlock label="Loading mocks…" /> :
       mocks.length === 0 ? (
        <Card><CardBody>
          <EmptyState
            icon={Server}
            title="No mocks yet"
            description="Create a fake MCP server that speaks MCP/JSON-RPC. Point Claude Desktop or your MCP client at its public URL."
            action={<Button variant="primary" icon={Plus} onClick={openCreate}>Create mock</Button>}
          />
        </CardBody></Card>
       ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {mocks.map(m => {
            const url = mcpMockPublicUrl(m.slug);
            return (
              <Card key={m.id} hoverable className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate flex items-center gap-2">
                        {m.name} <StatusBadge status={m.enabled === false ? 'unhealthy' : 'healthy'} label={m.enabled === false ? 'Disabled' : 'Live'} />
                      </h4>
                      <div className="text-[10px] text-gray-500 font-mono truncate mt-1">/{m.slug}</div>
                      {m.description && <p className="text-[11px] text-gray-400 mt-2 line-clamp-2">{m.description}</p>}
                    </div>
                  </div>
                  <div className="mt-3 rounded-md bg-dark-900/70 border border-dark-700 px-2.5 py-1.5 text-[10px] font-mono text-gray-300 truncate flex items-center gap-2">
                    <Globe className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate" title={url}>{url}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="subtle" icon={copied === m.slug ? Check : Copy} onClick={() => handleCopy(m.slug)}>
                        {copied === m.slug ? 'Copied' : 'Copy URL'}
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(m)} className="p-1.5 rounded hover:bg-dark-700 text-gray-400 hover:text-white"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(m)} className="p-1.5 rounded hover:bg-red-500/15 text-gray-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
       )
      }

      {editing && (
        <Modal
          isOpen onClose={() => setEditing(null)}
          title={editing.isNew ? 'New mock MCP server' : `Edit mock · ${editing.name}`}
          subtitle="Define fixture tools, resources and prompts that the mock will serve."
          size="2xl"
          footer={<>
            <ModalButton variant="ghost" onClick={() => setEditing(null)}>Cancel</ModalButton>
            <ModalButton variant="primary" onClick={handleSave}>Save</ModalButton>
          </>}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-3">
              <Field label="Name" required className="col-span-12 md:col-span-6">
                <TextInput value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="GitHub MCP Mock" autoFocus />
              </Field>
              <Field label="Slug (URL path)" required className="col-span-12 md:col-span-6" hint="Used in the public URL: /mock/{slug}/mcp">
                <TextInput value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value.replace(/\s+/g, '-').toLowerCase() })} placeholder="github-mock" />
              </Field>
            </div>
            <Field label="Description">
              <TextInput value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Optional" />
            </Field>
            <div className="flex items-center gap-2">
              <input id="mock-enabled" type="checkbox" checked={editing.enabled} onChange={e => setEditing({ ...editing, enabled: e.target.checked })} className="accent-primary" />
              <label htmlFor="mock-enabled" className="text-xs text-gray-300">Enabled</label>
            </div>
            <JsonEditor
              label="Fixtures (tools, resources, prompts)"
              hint='Shape: { "tools": [...], "resources": [...], "prompts": [...] }'
              value={editing.fixturesJson}
              onChange={v => setEditing({ ...editing, fixturesJson: v })}
              rows={18}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
