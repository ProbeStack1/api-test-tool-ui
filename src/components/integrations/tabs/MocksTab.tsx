/**
 * MocksTab — manage mock MCP servers. A mock is a fake MCP server with
 * user-defined tools. Useful for parallel client development before the
 * real upstream is ready. Once created, the mock shows up in the
 * Servers list and the Inspector talks to it natively.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Boxes, Plus, Trash2, Loader2, Activity, CheckCircle2, Wrench, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Tooltip } from '@/components/ui/Tooltip';
import { MonacoEditor as CodeEditor } from '@/components/editor/MonacoEditor';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useMcpStudioStore } from '@/stores/mcp-studio.store';
import {
  listMocks, createMock, deleteMock,
  type McpServer, type McpMockTool,
} from '@/services/mcp.service';
import { cn } from '@/utils/cn';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export const MocksTab = () => {
  const confirm = useConfirm();
  const ws = useWorkspaceStore((s) => s.current);
  const setActiveServer = useMcpStudioStore((s) => s.setActiveServer);
  const setTab = useMcpStudioStore((s) => s.setTab);
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: mocks = [], isLoading } = useQuery({
    queryKey: ['mcp-mocks', ws?.id], queryFn: () => listMocks(ws?.id),
  });

  const useAsActive = (s: McpServer) => {
    setActiveServer(s.id); setTab('inspector');
    toast.success(`Active: ${s.name}`);
  };

  const rm = useMutation({
    mutationFn: (id: string) => deleteMock(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['mcp-mocks'] });
      await qc.invalidateQueries({ queryKey: ['mcp-servers'] });
      toast.success('Mock deleted');
    },
  });

  return (
    <div className="space-y-3 p-4" data-testid="mcp-mocks-tab">
      <header className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Boxes className="h-3.5 w-3.5 text-primary" /> Mock MCP Servers
          <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-muted">{mocks.length}</span>
        </h3>
        <Button variant="primary" data-testid="mocks-add" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> New mock
        </Button>
      </header>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : mocks.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface/30 p-12 text-center" data-testid="mocks-empty">
          <Boxes className="mx-auto mb-2 h-10 w-10 text-text-muted" />
          <h4 className="text-sm font-semibold">No mocks yet</h4>
          <p className="mx-auto mt-1 max-w-sm text-xs text-text-muted">
            Spin up a fake MCP server with custom tools — perfect for parallel client
            development before the real upstream is ready.
          </p>
          <Button variant="primary" className="mt-3" data-testid="mocks-empty-cta" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" /> Create your first mock
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="mocks-grid">
          {mocks.map((m) => (
            <div key={m.id} data-testid={`mock-card-${m.id}`} className="flex flex-col rounded-lg border border-border bg-surface/50 p-3 transition-colors hover:border-primary/40">
              <div className="flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-warning-muted">
                  <Boxes className="h-4 w-4 text-warning" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{m.name}</span>
                    <span className="rounded bg-warning-muted px-1 font-mono text-[9px] text-warning">MOCK</span>
                  </div>
                  <div className="truncate text-[10px] text-text-muted">{m.description}</div>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] text-text-secondary">
                {(m as any).mockTools?.length ?? 0} tools · {m.serverUrl}
              </p>
              <div className="mt-3 flex items-center gap-1">
                <Button variant="primary" data-testid={`mock-use-${m.id}`} onClick={() => useAsActive(m)} className="flex-1">
                  <Activity className="h-3.5 w-3.5" /> Open in Inspector
                </Button>
                <Tooltip content="Delete">
                  <button data-testid={`mock-del-${m.id}`} disabled={rm.isPending}
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Delete mock server?',
                              description: `Mock "${m.name}" and its tool definitions will be removed.`,
                              tone: 'danger',
                              confirmText: 'Delete',
                              testId: `confirm-mock-del-${m.id}`,
                            });
                            if (ok) rm.mutate(m.id);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-danger disabled:opacity-50">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <CreateMockModal
          workspaceId={ws?.id}
          onClose={() => setCreating(false)}
          onCreated={async (s) => {
            await qc.invalidateQueries({ queryKey: ['mcp-mocks'] });
            await qc.invalidateQueries({ queryKey: ['mcp-servers'] });
            setCreating(false);
            useAsActive(s);
          }}
        />
      )}
    </div>
  );
};

/* ───── Create-mock modal ──────────────────────────────────────────── */

const STARTER_TOOLS: McpMockTool[] = [
  { name: 'echo', description: 'Echo back the input',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'ping', description: 'Always returns pong',
    inputSchema: { type: 'object' } },
];

const CreateMockModal = ({ workspaceId, onClose, onCreated }: {
  workspaceId?: string; onClose: () => void; onCreated: (s: McpServer) => void;
}) => {
  const [name, setName] = useState('My Mock');
  const [description, setDescription] = useState('Mock MCP server for local dev');
  const [toolsJson, setToolsJson] = useState(JSON.stringify(STARTER_TOOLS, null, 2));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    let tools: McpMockTool[] = [];
    try { tools = JSON.parse(toolsJson); } catch { toast.error('Tools must be valid JSON'); return; }
    setBusy(true);
    try {
      const s = await createMock({ name: name.trim(), description, workspaceId, tools });
      toast.success(`Mock "${s.name}" created`);
      onCreated(s);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Create failed');
    } finally { setBusy(false); }
  };

  return (
    <Modal
      open onClose={onClose} icon={Boxes}
      title="New mock MCP server" size="lg" testId="mock-create-modal"
      footer={
        <>
          <Button variant="outline" data-testid="mock-create-cancel" onClick={onClose}>Cancel</Button>
          <Button variant="primary" data-testid="mock-create-submit" disabled={!name.trim() || busy} onClick={submit}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Create mock
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name *">
          <input data-testid="mock-create-name" className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
                 value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description">
          <input data-testid="mock-create-description" className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
                 value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Tools (JSON array of { name, description?, inputSchema? })">
          <div className="flex h-56 overflow-hidden rounded border border-border">
            <CodeEditor value={toolsJson} onChange={setToolsJson} language="json" testId="mock-create-tools" />
          </div>
          <p className="mt-1 flex items-center gap-1 text-[10px] text-text-muted">
            <Wrench className="h-3 w-3" /> The Inspector will list these and respond with deterministic samples.
          </p>
        </Field>
      </div>
    </Modal>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">{label}</div>
    {children}
  </div>
);

// quiet unused-variable lint when these icons are temporarily removed
void Pencil; void cn;
