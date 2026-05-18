/**
 * CollectionsTab — MCP collection runner.
 *
 * Each collection: a server + N tool calls with optional `expect.contains`
 * assertions. Run executes them sequentially; pass/fail summary appears
 * in a side drawer with per-call timing and result snippet.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FolderOpen, Plus, Play, Trash2, CheckCircle2, AlertTriangle, Loader2,
  ChevronRight, Server,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Tooltip } from '@/components/ui/Tooltip';
import { MonacoEditor as CodeEditor } from '@/components/editor/MonacoEditor';
import {
  listCollections, createCollection, updateCollection, deleteCollection, runCollection,
  listServers, listTools, type McpCollection, type McpServer, type McpTool,
} from '@/services/mcp.service';
import { useMcpStudioStore } from '@/stores/mcp-studio.store';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { cn } from '@/utils/cn';

export const CollectionsTab = () => {
  const confirm = useConfirm();
  const qc = useQueryClient();
  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['mcp-collections'], queryFn: () => listCollections(),
  });
  const { data: servers = [] } = useQuery({ queryKey: ['mcp-servers'], queryFn: () => listServers() });
  const [editing, setEditing] = useState<McpCollection | null>(null);
  const [creating, setCreating] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<any>(null);

  const setActiveServer = useMcpStudioStore((s) => s.setActiveServer);
  const setTab = useMcpStudioStore((s) => s.setTab);

  const run = async (id: string) => {
    setRunningId(id);
    try {
      const r = await runCollection(id);
      setLastRun(r);
      const total = r.callCount ?? 0;
      const pass = r.passCount ?? 0;
      const fail = r.failCount ?? 0;
      if (total === 0) {
        toast.warning('Collection has no steps — nothing to run. Edit the collection and add at least one step.');
      } else {
        toast[fail === 0 ? 'success' : 'error'](`${pass}/${total} passed${fail > 0 ? ` · ${fail} failed` : ''}`);
      }
      await qc.invalidateQueries({ queryKey: ['mcp-collections'] });
    } catch (e: any) { toast.error(e?.message ?? 'Run failed'); }
    finally { setRunningId(null); }
  };

  const serverOf = (id: string) => servers.find((s) => s.id === id);

  return (
    <div className="grid h-full grid-cols-[1fr_400px] divide-x divide-border" data-testid="mcp-collections-tab">
      <div className="space-y-3 p-4">
        <header className="flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <FolderOpen className="h-3.5 w-3.5 text-primary" /> Collections
            <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-text-muted">{collections.length}</span>
          </h3>
          <Button variant="primary" data-testid="collections-add" onClick={() => setCreating(true)} disabled={servers.length === 0}>
            <Plus className="h-3.5 w-3.5" /> New collection
          </Button>
        </header>

        {servers.length === 0 ? (
          <EmptyHint
            title="Add a server first"
            text="Collections run against an MCP server. Register one from the Servers tab."
            cta="Browse servers"
            onCta={() => setTab('servers')}
          />
        ) : isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : collections.length === 0 ? (
          <EmptyHint
            title="No collections yet"
            text="Create a collection to batch-run tool calls with assertions."
            cta="Create one"
            onCta={() => setCreating(true)}
          />
        ) : (
          <div className="overflow-hidden rounded-md border border-border" data-testid="collections-list">
            {collections.map((c) => (
              <div key={c.id} data-testid={`collection-row-${c.id}`} className="flex items-center gap-2 border-b border-border/60 px-3 py-2 last:border-b-0 hover:bg-hover/30">
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="flex items-center gap-1 text-[10px] text-text-muted">
                    <span className="rounded bg-elevated px-1 font-mono">{((c as any).calls ?? (c as any).steps ?? []).length} calls</span>
                    {c.serverId && (
                      <span className="truncate">· {serverOf(c.serverId)?.name ?? 'unknown server'}</span>
                    )}
                    {c.lastRunStatus && (
                      <span className={cn('rounded px-1 font-bold',
                        c.lastRunStatus === 'OK' ? 'bg-success-muted text-success' : 'bg-warning-muted text-warning')}>
                        {c.lastRunStatus}
                      </span>
                    )}
                  </div>
                </div>
                <Tooltip content="Run">
                  <button data-testid={`collection-run-${c.id}`} onClick={() => run(c.id)}
                          disabled={runningId === c.id}
                          className="rounded p-1 text-text-muted hover:bg-hover hover:text-success disabled:opacity-50">
                    {runningId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  </button>
                </Tooltip>
                <Tooltip content="Edit">
                  <button data-testid={`collection-edit-${c.id}`} onClick={() => setEditing(c)}
                          className="rounded p-1 text-text-muted hover:bg-hover hover:text-primary">
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </Tooltip>
                <Tooltip content="Delete">
                  <button data-testid={`collection-del-${c.id}`} onClick={async () => {
                    const ok = await confirm({
                      title: 'Delete collection?',
                      description: `"${c.name}" and all its tool calls will be permanently removed.`,
                      tone: 'danger',
                      confirmText: 'Delete',
                      testId: `confirm-collection-del-${c.id}`,
                    });
                    if (!ok) return;
                    await deleteCollection(c.id);
                    await qc.invalidateQueries({ queryKey: ['mcp-collections'] });
                    toast.success('Collection deleted');
                  }} className="rounded p-1 text-text-muted hover:bg-hover hover:text-danger">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right rail — last run summary */}
      <aside className="overflow-y-auto bg-surface/30 p-4" data-testid="collections-run-rail">
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
          <Server className="h-3 w-3 text-primary" /> Last run
        </h4>
        {!lastRun ? (
          <div className="rounded border border-dashed border-border bg-surface/40 p-4 text-center text-[11px] text-text-muted">
            Run a collection to see per-call results here.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px]">
              <span className={cn('rounded px-1.5 py-0.5 font-bold',
                lastRun.failCount === 0 ? 'bg-success-muted text-success' : 'bg-warning-muted text-warning')}>
                {lastRun.passCount}/{lastRun.callCount} pass
              </span>
              <span className="font-mono text-[10px] text-text-muted">{lastRun.status}</span>
            </div>
            {lastRun.results.map((r: any, i: number) => (
              <details key={i} className="rounded border border-border bg-surface/50 p-2 text-[11px]">
                <summary className="flex cursor-pointer items-center gap-1.5">
                  {r.success
                    ? <CheckCircle2 className="h-3 w-3 text-success" />
                    : <AlertTriangle className="h-3 w-3 text-danger" />}
                  <span className="min-w-0 flex-1 truncate font-mono">{r.toolName}</span>
                  <span className="font-mono text-[10px] text-text-muted">{r.ms}ms</span>
                </summary>
                <pre className="mt-1.5 max-h-40 overflow-auto rounded bg-elevated/40 p-2 font-mono text-[10px]">
                  {JSON.stringify(r.result, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        )}
      </aside>

      {(creating || editing) && (
        <CollectionEditModal
          initial={editing ?? undefined}
          servers={servers}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={async () => {
            await qc.invalidateQueries({ queryKey: ['mcp-collections'] });
            setCreating(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
};

const EmptyHint = ({ title, text, cta, onCta }: { title: string; text: string; cta: string; onCta: () => void }) => (
  <div className="rounded-md border border-dashed border-border bg-surface/30 p-12 text-center" data-testid="collections-empty">
    <FolderOpen className="mx-auto mb-2 h-10 w-10 text-text-muted" />
    <h4 className="text-sm font-semibold">{title}</h4>
    <p className="mx-auto mt-1 max-w-sm text-xs text-text-muted">{text}</p>
    <Button variant="primary" className="mt-3" data-testid="collections-empty-cta" onClick={onCta}>
      {cta} <ChevronRight className="h-3.5 w-3.5" />
    </Button>
  </div>
);

/* ───── Edit modal ──────────────────────────────────────────────────── */

const CollectionEditModal = ({
  initial, servers, onClose, onSaved,
}: {
  initial?: McpCollection; servers: McpServer[];
  onClose: () => void; onSaved: () => Promise<void>;
}) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [serverId, setServerId] = useState(initial?.serverId ?? servers[0]?.id ?? '');
  const [calls, setCalls] = useState<{ toolName: string; arguments: string; expect?: string }[]>(() => {
    /* Normalise whatever shape we got from the list endpoint — legacy
     * UI stored `calls`; the backend canonical shape is `steps`. Map
     * steps→calls on edit so the modal opens with the already-saved
     * invocations instead of an empty list. */
    const initAny = initial as any;
    const fromSteps = Array.isArray(initAny?.steps) ? initAny.steps.map((s: any) => ({
      toolName: s.target ?? s.tool_name ?? s.toolName ?? '',
      arguments: JSON.stringify(s.arguments ?? {}, null, 2),
      expect: (s.assertions ?? []).find((a: any) => a.type === 'contains')?.expected,
    })) : null;
    const fromCalls = Array.isArray(initAny?.calls) ? initAny.calls.map((c: any) => ({
      toolName: c.toolName,
      arguments: JSON.stringify(c.arguments, null, 2),
      expect: c.expect?.contains,
    })) : [];
    return fromSteps && fromSteps.length ? fromSteps : fromCalls;
  });
  const [busy, setBusy] = useState(false);
  const [tools, setTools] = useState<McpTool[]>([]);

  const ref = useMemo(() => ({ serverId }), [serverId]);

  // Load tools whenever the picked server changes.
  useMemo(() => {
    if (!serverId) return;
    listTools(ref).then((r) => setTools(r.tools)).catch(() => setTools([]));
  }, [serverId]); // eslint-disable-line react-hooks/exhaustive-deps

  const valid = name.trim() && serverId && calls.length > 0 && calls.every((c) => c.toolName);

  const submit = async () => {
    setBusy(true);
    try {
      const body = {
        name: name.trim(), serverId,
        calls: calls.map((c) => ({
          toolName: c.toolName,
          arguments: c.arguments.trim() ? JSON.parse(c.arguments) : {},
          ...(c.expect ? { expect: { contains: c.expect } } : {}),
        })),
      };
      if (initial) await updateCollection(initial.id, body);
      else await createCollection(body);
      toast.success(initial ? 'Collection updated' : 'Collection created');
      await onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Save failed');
    } finally { setBusy(false); }
  };

  return (
    <Modal
      open onClose={onClose}
      icon={FolderOpen}
      title={initial ? `Edit ${initial.name}` : 'New collection'}
      size="lg" testId="collection-edit-modal"
      footer={
        <>
          <Button variant="outline" data-testid="collection-edit-cancel" onClick={onClose}>Cancel</Button>
          <Button variant="primary" data-testid="collection-edit-save" disabled={!valid || busy} onClick={submit}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {initial ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name *">
            <input data-testid="collection-name" className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs"
                   value={name} onChange={(e) => setName(e.target.value)} placeholder="Smoke test suite" />
          </Field>
          <Field label="Server *">
            <select value={serverId} onChange={(e) => setServerId(e.target.value)}
                    data-testid="collection-server"
                    className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs">
              {servers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label={`Calls (${calls.length})`}>
          <div className="space-y-2" data-testid="collection-calls">
            {calls.map((c, i) => (
              <div key={i} className="rounded border border-border bg-surface/40 p-2">
                <div className="grid gap-2 sm:grid-cols-[1fr_24px]">
                  <select value={c.toolName} onChange={(e) => {
                    const next = calls.slice(); next[i] = { ...c, toolName: e.target.value };
                    setCalls(next);
                  }} data-testid={`collection-call-tool-${i}`}
                          className="h-7 rounded border border-border bg-probestack-bg px-2 font-mono text-[11px]">
                    <option value="">— pick a tool —</option>
                    {tools.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                  <button onClick={() => setCalls(calls.filter((_, j) => j !== i))}
                          data-testid={`collection-call-rm-${i}`}
                          className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-hover hover:text-danger">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-1.5 h-24 overflow-hidden rounded border border-border">
                  <CodeEditor value={c.arguments} onChange={(v) => {
                    const next = calls.slice(); next[i] = { ...c, arguments: v };
                    setCalls(next);
                  }} language="json" testId={`collection-call-args-${i}`} />
                </div>
                <input value={c.expect ?? ''} onChange={(e) => {
                  const next = calls.slice(); next[i] = { ...c, expect: e.target.value };
                  setCalls(next);
                }} placeholder="Optional: response must contain…"
                       className="mt-1.5 h-7 w-full rounded border border-border bg-probestack-bg px-2 text-[11px]" />
              </div>
            ))}
            <button onClick={() => setCalls([...calls, { toolName: '', arguments: '{\n  \n}' }])}
                    data-testid="collection-add-call" className="text-[10px] text-primary hover:underline">+ Add call</button>
          </div>
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
