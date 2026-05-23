/**
 * ToolAuditTrail — shows the last N calls of a specific tool on a specific
 * MCP server. Lets the user click any row to see the recorded response, and
 * compare the last two responses side-by-side ("Diff").
 *
 * Rendered inline below the tool header in the Inspector tab.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, GitCompare, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { historyByTool, replayHistory } from '@/services/mcp.service';
import { fmtRelative, fmtDateTime } from '@/lib/timezone';
import { JsonDiffView } from '@/components/integrations/parts/JsonDiffView';
import { cn } from '@/utils/cn';

export const ToolAuditTrail = ({ serverId, toolName }: { serverId: string; toolName: string }) => {
  const [open, setOpen] = useState(true);
  const [pickedIds, setPickedIds] = useState<string[]>([]); // 0..2 selected for diff
  const [showDiff, setShowDiff] = useState(false);

  const auditQ = useQuery({
    queryKey: ['mcp-tool-audit', serverId, toolName],
    queryFn: () => historyByTool(serverId, toolName, 0, 20),
  });

  const entries = auditQ.data?.content ?? [];

  const togglePick = (id: string) => {
    setPickedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2)   return [prev[1], id]; // keep only the last 2
      return [...prev, id];
    });
  };

  const a = entries.find((e: any) => e.id === pickedIds[0]);
  const b = entries.find((e: any) => e.id === pickedIds[1]);

  const onReplay = async (id: string) => {
    try { await replayHistory(id); } catch { /* surface via toast in caller — ignore here */ }
  };

  return (
    <div className="mt-2 rounded-md border border-border bg-surface/40" data-testid="tool-audit-trail">
      <button
        className="flex w-full items-center gap-1.5 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text-secondary"
        onClick={() => setOpen((v) => !v)}
        data-testid="tool-audit-toggle"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Audit trail · {entries.length} calls
        {pickedIds.length === 2 && (
          <Button size="sm" variant="outline" data-testid="tool-audit-diff" onClick={(ev) => { ev.stopPropagation(); setShowDiff(true); }} className="ml-auto">
            <GitCompare className="h-3 w-3" /> Compare selected
          </Button>
        )}
      </button>

      {open && (
        <div className="max-h-72 overflow-auto px-2 pb-2">
          {auditQ.isLoading ? <Skeleton className="h-20 w-full" /> :
           entries.length === 0
            ? <div className="px-2 py-3 text-xs text-text-muted">No prior calls to this tool yet.</div>
            : (
              <table className="w-full text-xs">
                <thead className="text-[11px] uppercase tracking-wide text-text-muted">
                  <tr className="border-b border-border/40">
                    <th className="w-6 px-1 py-1"></th>
                    <th className="px-1 py-1 text-left">When</th>
                    <th className="px-1 py-1 text-center">Status</th>
                    <th className="px-1 py-1 text-right">Latency</th>
                    <th className="px-1 py-1 text-left">Args excerpt</th>
                    <th className="w-12 px-1 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e: any) => {
                    const picked = pickedIds.includes(e.id);
                    return (
                      <tr key={e.id} className={cn('border-b border-border/30 hover:bg-hover/30', picked && 'bg-primary/10')} data-testid={`tool-audit-row-${e.id}`}>
                        <td className="px-1 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={picked}
                            onChange={() => togglePick(e.id)}
                            className="h-3 w-3"
                            data-testid={`tool-audit-pick-${e.id}`}
                          />
                        </td>
                        <td className="px-1 py-1 font-mono text-xs" title={fmtDateTime(e.createdAt)}>
                          {fmtRelative(e.createdAt)}
                        </td>
                        <td className="px-1 py-1 text-center">
                          {e.success ? <CheckCircle2 className="mx-auto h-3 w-3 text-success" /> : <AlertTriangle className="mx-auto h-3 w-3 text-danger" />}
                        </td>
                        <td className="px-1 py-1 text-right font-mono text-xs text-text-muted">{e.ms}ms</td>
                        <td className="px-1 py-1 font-mono text-xs">
                          <ArgsExcerpt request={e.request} />
                        </td>
                        <td className="px-1 py-1 text-right">
                          <Button size="sm" variant="ghost" data-testid={`tool-audit-replay-${e.id}`} onClick={() => onReplay(e.id)}>
                            <Play className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
        </div>
      )}

      {showDiff && a && b && (
        <JsonDiffView
          left={{ label: fmtRelative(a.createdAt),  data: a.response }}
          right={{ label: fmtRelative(b.createdAt), data: b.response }}
          onClose={() => setShowDiff(false)}
        />
      )}
    </div>
  );
};

const ArgsExcerpt = ({ request }: { request: any }) => {
  const excerpt = useMemo(() => {
    try {
      const args = request?.params?.arguments ?? request?.arguments ?? request;
      const txt = typeof args === 'string' ? args : JSON.stringify(args);
      return txt.length > 60 ? txt.substring(0, 57) + '…' : txt;
    } catch { return '—'; }
  }, [request]);
  return <span className="text-text-secondary">{excerpt}</span>;
};
