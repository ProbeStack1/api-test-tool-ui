/**
 * RestBridgeTab — expose any MCP tool as a flat REST URL so users can
 * call it from Postman / curl / bash. Tab-style picker (server + tool)
 * → renders the synthesized URL + sample curl + body. Copy-to-clipboard
 * everywhere.
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Repeat, Copy, Loader2, ArrowRight, Server, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { MonacoEditor as CodeEditor } from '@/components/editor/MonacoEditor';
import {
  listServers, listTools, buildRestBridge,
  type McpServer, type McpTool,
} from '@/services/mcp.service';
import { useMcpStudioStore } from '@/stores/mcp-studio.store';
import { cn } from '@/utils/cn';

export const RestBridgeTab = () => {
  const setTab = useMcpStudioStore((s) => s.setTab);
  const activeServerId = useMcpStudioStore((s) => s.activeServerId);
  const setActiveServer = useMcpStudioStore((s) => s.setActiveServer);

  const { data: servers = [] } = useQuery({ queryKey: ['mcp-servers'], queryFn: () => listServers() });
  const server = servers.find((s) => s.id === activeServerId) ?? servers[0];

  const [pickedTool, setPickedTool] = useState<string>('');
  const [tools, setTools] = useState<McpTool[]>([]);
  const [bridge, setBridge] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // load tools whenever the server changes
  useEffect(() => {
    if (!server) return;
    setTools([]); setPickedTool(''); setBridge(null);
    listTools({ serverId: server.id }).then((r) => {
      // Defensive — `listTools` can return an error envelope where
      // `r.tools` is undefined (happens when the server couldn't be
      // reached, e.g. STDIO transport not registered). Without the
      // fallback `setTools(undefined)` would crash the next render at
      // `tools.length === 0` on the <select disabled> prop.
      const safe = Array.isArray(r?.tools) ? r.tools : [];
      setTools(safe);
      if (safe[0]) setPickedTool(safe[0].name);
    }).catch(() => { setTools([]); });
  }, [server?.id]);

  // rebuild bridge whenever the tool changes
  useEffect(() => {
    if (!server || !pickedTool) return;
    setLoading(true);
    buildRestBridge(server.id, pickedTool)
      .then(setBridge)
      .finally(() => setLoading(false));
  }, [server?.id, pickedTool]);

  if (!server) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-center" data-testid="rest-no-server">
        <div className="max-w-md">
          <Repeat className="mx-auto mb-3 h-10 w-10 text-text-muted" />
          <h4 className="text-sm font-semibold">Pick a server</h4>
          <p className="mt-1 text-xs text-text-muted">
            Register or pick a server first — the bridge URL is server + tool specific.
          </p>
          <Button variant="primary" className="mt-3" onClick={() => setTab('servers')}>
            <ArrowRight className="h-3.5 w-3.5" /> Browse servers
          </Button>
        </div>
      </div>
    );
  }

  const copy = async (s: string, label: string) => {
    await navigator.clipboard.writeText(s);
    toast.success(`${label} copied`);
  };

  return (
    <div className="space-y-3 p-4" data-testid="mcp-rest-tab">
      <header className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Repeat className="h-3.5 w-3.5 text-primary" /> MCP ↔ REST Bridge
        </h3>
        <p className="text-[11px] text-text-muted">Call MCP tools over plain HTTP — Postman / curl / scripts.</p>
      </header>

      {/* server + tool picker */}
      <div className="grid gap-3 rounded-md border border-border bg-surface/30 p-3 sm:grid-cols-2">
        <Field label="Server" icon={Server}>
          <select data-testid="rest-server"
                  value={server.id}
                  onChange={(e) => setActiveServer(e.target.value)}
                  className="h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs">
            {servers.map((s: McpServer) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Tool" icon={Wrench}>
          <select data-testid="rest-tool"
                  value={pickedTool}
                  onChange={(e) => setPickedTool(e.target.value)}
                  className="h-8 w-full rounded border border-border bg-probestack-bg px-2 font-mono text-xs"
                  disabled={tools.length === 0}>
            {tools.length === 0 && <option value="">Loading tools…</option>}
            {tools.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </Field>
      </div>

      {/* bridge view */}
      {loading ? (
        <Skeleton className="h-56 w-full" />
      ) : !bridge ? (
        <div className="rounded-md border border-dashed border-border bg-surface/30 p-12 text-center text-xs text-text-muted">
          Pick a server + tool to generate the REST bridge.
        </div>
      ) : (
        <div className="space-y-3" data-testid="rest-bridge-view">
          <Row label="Method">
            <span className="rounded bg-success-muted px-2 py-0.5 font-mono text-[11px] font-bold text-success">{bridge.method}</span>
          </Row>
          <Row label="URL">
            <div className="flex w-full items-center gap-1">
              <code data-testid="rest-bridge-url" className="flex-1 truncate rounded border border-border bg-probestack-bg px-2 py-1 font-mono text-[11px]">{bridge.url}</code>
              <Button variant="outline" data-testid="rest-bridge-copy-url" onClick={() => copy(bridge.url, 'URL')}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </Row>
          <Row label="Headers">
            <pre className="w-full rounded border border-border bg-probestack-bg p-2 font-mono text-[10px]">
{Object.entries(bridge.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}
            </pre>
          </Row>
          <Row label="Sample body">
            <div className="flex h-40 w-full overflow-hidden rounded border border-border">
              <CodeEditor value={JSON.stringify(bridge.sampleBody, null, 2)} onChange={() => {}} language="json" readOnly testId="rest-bridge-body" />
            </div>
          </Row>
          <Row label="curl">
            <div className="w-full">
              <pre data-testid="rest-bridge-curl" className="overflow-x-auto rounded border border-border bg-probestack-bg p-2 font-mono text-[10px] leading-relaxed">{bridge.curl}</pre>
              <Button variant="outline" className="mt-1.5" data-testid="rest-bridge-copy-curl" onClick={() => copy(bridge.curl, 'curl')}>
                <Copy className="h-3 w-3" /> Copy curl
              </Button>
            </div>
          </Row>
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

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className={cn('grid grid-cols-[100px_1fr] items-start gap-3')}>
    <span className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</span>
    <div>{children}</div>
  </div>
);
