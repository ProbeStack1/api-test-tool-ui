/**
 * AiGenTab — derive an assertion suite from any MCP tool's inputSchema.
 * Pick a server + tool, click Generate, get a list of suggested calls
 * (happy path + missing-required + wrong-type) you can save as a
 * Collection in one click. Deterministic, no LLM call required.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, Server, Wrench, ArrowRight, Loader2, FolderPlus, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  listServers, listTools, generateAigenSuite, createCollection,
  type McpServer, type McpTool, type McpAigenCall,
} from '@/services/mcp.service';
import { useMcpStudioStore } from '@/stores/mcp-studio.store';
import { cn } from '@/utils/cn';

export const AiGenTab = () => {
  const setTab = useMcpStudioStore((s) => s.setTab);
  const activeServerId = useMcpStudioStore((s) => s.activeServerId);
  const setActiveServer = useMcpStudioStore((s) => s.setActiveServer);
  const qc = useQueryClient();

  const { data: servers = [] } = useQuery({ queryKey: ['mcp-servers'], queryFn: () => listServers() });
  const server = servers.find((s) => s.id === activeServerId) ?? servers[0];

  const [pickedTool, setPickedTool] = useState<string>('');
  const [tools, setTools] = useState<McpTool[]>([]);
  const [suite, setSuite] = useState<McpAigenCall[]>([]);

  useEffect(() => {
    if (!server) return;
    setTools([]); setPickedTool(''); setSuite([]);
    listTools({ serverId: server.id }).then((r) => {
      const safe = Array.isArray(r?.tools) ? r.tools : [];
      setTools(safe);
      if (safe[0]) setPickedTool(safe[0].name);
    }).catch(() => { setTools([]); });
  }, [server?.id]);

  const tool = tools.find((t) => t.name === pickedTool) ?? null;

  const gen = useMutation({
    mutationFn: () => generateAigenSuite(tool!),
    onSuccess: (r) => { setSuite(r.suite); toast.success(`${r.count} assertions drafted`); },
  });

  const save = useMutation({
    mutationFn: () =>
      createCollection({
        name: `AI Gen · ${tool?.name}`,
        serverId: server?.id,
        calls: suite.map((c) => ({
          toolName: c.toolName,
          arguments: c.arguments,
          ...(c.expect?.contains ? { expect: { contains: c.expect.contains } } : {}),
        })),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['mcp-collections'] });
      toast.success('Saved as Collection');
      setTab('collections');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Save failed'),
  });

  if (!server) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-center" data-testid="aigen-no-server">
        <div className="max-w-md">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-text-muted" />
          <h4 className="text-sm font-semibold">Pick a server</h4>
          <p className="mt-1 text-xs text-text-muted">
            AI Test Gen drafts assertions from your tool's inputSchema. Pick a server first.
          </p>
          <Button variant="primary" className="mt-3" onClick={() => setTab('servers')}>
            <ArrowRight className="h-3.5 w-3.5" /> Browse servers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4" data-testid="mcp-aigen-tab">
      <header className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Test Generator
        </h3>
        <p className="text-[11px] text-text-muted">Auto-draft an assertion suite from a tool's schema.</p>
      </header>

      <div className="grid gap-3 rounded-md border border-border bg-surface/30 p-3 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="Server" icon={Server}>
          <select data-testid="aigen-server"
                  value={server.id}
                  onChange={(e) => setActiveServer(e.target.value)}
                  className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs">
            {servers.map((s: McpServer) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Tool" icon={Wrench}>
          <select data-testid="aigen-tool"
                  value={pickedTool}
                  onChange={(e) => setPickedTool(e.target.value)}
                  className="h-8 w-full rounded border border-border bg-probestack-bg px-2 font-mono text-xs"
                  disabled={tools.length === 0}>
            {tools.length === 0 && <option value="">Loading tools…</option>}
            {tools.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </Field>
        <div className="flex items-end gap-2">
          <Button variant="primary" data-testid="aigen-generate"
                  onClick={() => gen.mutate()}
                  disabled={!tool || gen.isPending}>
            {gen.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate
          </Button>
          {suite.length > 0 && (
            <Button variant="outline" data-testid="aigen-save"
                    onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
              Save as Collection
            </Button>
          )}
        </div>
      </div>

      {gen.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : suite.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface/30 p-12 text-center text-xs text-text-muted" data-testid="aigen-empty">
          {tool ? 'Click Generate to draft an assertion suite.' : 'Pick a tool first.'}
        </div>
      ) : (
        <div className="space-y-2" data-testid="aigen-suite">
          {suite.map((c, i) => {
            const failure = !!c.expect?.errorContains;
            return (
              <div key={i} data-testid={`aigen-call-${i}`} className="rounded-md border border-border bg-surface/40 p-3">
                <div className="flex items-center gap-2">
                  {failure
                    ? <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                    : <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                  <span className="font-mono text-[12px] font-semibold">{c.title}</span>
                  <span className={cn(
                    'ml-auto rounded px-1.5 py-0.5 text-[10px] font-bold',
                    failure ? 'bg-warning-muted text-warning' : 'bg-success-muted text-success',
                  )}>
                    {failure ? 'should error' : 'should pass'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-text-muted">{c.rationale}</p>
                <pre className="mt-1.5 overflow-auto rounded bg-elevated/40 p-2 font-mono text-[10px]">{JSON.stringify(c.arguments, null, 2)}</pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Field = ({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) => (
  <div>
    <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
      <Icon className="h-3 w-3" /> {label}
    </div>
    {children}
  </div>
);
