/**
 * ContractDiffTab — run a contract-diff against an upstream URL and
 * show the latest run's findings. Past runs listed below.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bug, Play, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { runContractDiff, listContractDiffRuns, type ContractDiffRun, type MockServer } from '@/services/mock.service';
import { MethodBadge } from '../parts/MethodBadge';

export const ContractDiffTab = ({ mock }: { mock: MockServer }) => {
  const qc = useQueryClient();
  const [upstream, setUpstream] = useState('https://api.example.com');
  const [activeRun, setActiveRun] = useState<ContractDiffRun | null>(null);
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['mock', mock.id, 'diff-runs'],
    queryFn: () => listContractDiffRuns(mock.id, 10),
  });
  const runMut = useMutation({
    mutationFn: () => runContractDiff(mock.id, upstream),
    onSuccess: async (run) => {
      setActiveRun(run);
      await qc.invalidateQueries({ queryKey: ['mock', mock.id, 'diff-runs'] });
      toast.success(run.driftCount === 0 ? 'No drift — contract intact' : `${run.driftCount} drift(s) detected`);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Diff run failed'),
  });

  const showRun = activeRun ?? runs[0] ?? null;

  return (
    <div className="space-y-4 p-5" data-testid="mock-diff-tab">
      <section className="rounded-md border border-border bg-surface/40 p-4">
        <header className="mb-2 flex items-center gap-2">
          <Bug className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Contract diff</h3>
        </header>
        <p className="mb-3 text-[11px] text-text-muted">
          Compare every endpoint against the same path on a real upstream. Useful before promoting a release to verify the mock still matches production behaviour.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            data-testid="diff-upstream-input"
            className="h-8 flex-1 rounded-md border border-border bg-probestack-bg px-2 font-mono text-xs"
            placeholder="https://api.real-upstream.com"
            value={upstream}
            onChange={(e) => setUpstream(e.target.value)}
          />
          <Button
            variant="primary"
            data-testid="diff-run-btn"
            disabled={runMut.isPending || !upstream.trim()}
            onClick={() => runMut.mutate()}
          >
            <Play className="h-3.5 w-3.5" /> {runMut.isPending ? 'Running…' : 'Run diff'}
          </Button>
        </div>
      </section>

      {isLoading && (
        <div className="space-y-2"><Skeleton className="h-7 w-full" /><Skeleton className="h-7 w-full" /></div>
      )}

      {showRun && (
        <section className="rounded-md border border-border" data-testid="diff-result-card">
          <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold">Run</span>
              <code className="font-mono text-text-muted">{(showRun.id ?? '').slice(0, 8)}</code>
              <span className="text-text-muted">·</span>
              <span className="font-mono text-text-muted">{showRun.upstreamUrl}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="rounded bg-success-muted px-1.5 py-0.5 font-semibold text-success">
                <CheckCircle2 className="mr-0.5 inline h-2.5 w-2.5" /> {showRun.matchedCount} OK
              </span>
              <span className={`rounded px-1.5 py-0.5 font-semibold ${showRun.driftCount === 0 ? 'bg-elevated text-text-muted' : 'bg-danger-muted text-danger'}`}>
                <AlertTriangle className="mr-0.5 inline h-2.5 w-2.5" /> {showRun.driftCount} drift
              </span>
            </div>
          </header>
          <ul className="divide-y divide-border/40">
            {showRun.findings.length === 0 && (
              <li className="px-3 py-3 text-center text-[11px] text-text-muted">
                No findings — nothing to compare.
              </li>
            )}
            {showRun.findings.map((f, i) => (
              <li key={i} data-testid={`diff-finding-${i}`} className="px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <MethodBadge method={f.method} size="xs" />
                  <span className="min-w-0 flex-1 truncate font-mono text-text-secondary">{f.path}</span>
                  {f.status === 'OK' ? (
                    <span className="rounded bg-success-muted px-1.5 py-0.5 text-[9px] font-semibold text-success">OK</span>
                  ) : (
                    <span className="rounded bg-danger-muted px-1.5 py-0.5 text-[9px] font-semibold text-danger">DRIFT</span>
                  )}
                </div>
                {f.status === 'DRIFT' && f.drifts && f.drifts.length > 0 && (
                  <ul className="mt-1.5 space-y-1 pl-7" data-testid={`diff-drift-list-${i}`}>
                    {f.drifts.map((d, j) => (
                      <li key={j} className="rounded border border-danger/30 bg-danger-muted/40 px-2 py-1 font-mono text-[10px] leading-relaxed text-text-primary">
                        <span className="font-semibold text-danger">{d.kind}</span>
                        <span className="text-text-muted"> · expected </span>
                        <code className="text-success">{JSON.stringify(d.expected)}</code>
                        <span className="text-text-muted"> · got </span>
                        <code className="text-danger">{JSON.stringify(d.actual)}</code>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {runs.length > 0 && (
        <section className="rounded-md border border-border" data-testid="diff-history">
          <header className="border-b border-border bg-surface px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Run history
          </header>
          <ul className="divide-y divide-border/40">
            {runs.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setActiveRun(r)}
                  data-testid={`diff-run-${r.id}`}
                  className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-xs transition-colors hover:bg-hover/40"
                >
                  <code className="font-mono text-text-muted">{(r.id ?? '').slice(0, 8)}</code>
                  <span className="min-w-0 flex-1 truncate font-mono text-text-secondary" title={r.upstreamUrl}>{r.upstreamUrl}</span>
                  <span className="rounded bg-success-muted px-1 text-[9px] text-success">{r.matchedCount} OK</span>
                  <span className={`rounded px-1 text-[9px] ${r.driftCount === 0 ? 'bg-elevated text-text-muted' : 'bg-danger-muted text-danger'}`}>
                    {r.driftCount} drift
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
