/**
 * AllCasesPage — workspace-wide entry point for browsing test cases.
 *
 * Single URL design (no React-Router params). Picks any spec from the
 * dropdown and reuses `SpecCasesTab` for the chosen spec.
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ListChecks, Inbox, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { NoProjectEmpty } from '@/components/common/NoProjectEmpty';
import { Button } from '@/components/ui/Button';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useTestingStore } from '@/stores/testing.store';
import { listTestSpecs, getTestSpec } from '@/services/testSpec.service';
import { SpecCasesTab } from '../specs/tabs/SpecCasesTab';
import { FormatBadge } from '../shared/Badges';

export const AllCasesPage = ({ workspaceId }: { workspaceId: string }) => {
  const ws = useWorkspaceStore((s) => s.current);
  const openSpec = useTestingStore((s) => s.openSpec);
  const setSection = useTestingStore((s) => s.setSection);
  const [activeSpecId, setActiveSpecId] = useState<string>('');

  const specsQ = useQuery({
    queryKey: ['testSpec', 'list', ws?.id, 'ACTIVE', ''],
    queryFn: () => listTestSpecs(ws!.id, { status: 'ACTIVE', size: 100 }),
    enabled: !!ws?.id,
  });

  const specs = specsQ.data?.content ?? [];

  useEffect(() => {
    if (!activeSpecId && specs.length > 0) setActiveSpecId(specs[0].testSpecId);
  }, [activeSpecId, specs]);

  const specQ = useQuery({
    queryKey: ['testSpec', 'detail', activeSpecId],
    queryFn: () => getTestSpec(activeSpecId),
    enabled: !!activeSpecId,
  });

  if (!ws) {
    return (
      <NoProjectEmpty testId="cases-no-workspace" icon="testing" surface="test cases" />
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="cases-page">
      <header className="border-b border-border bg-surface/30 px-6 py-3">
        <div className="flex items-center gap-2">
          <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <ListChecks className="h-4 w-4 text-primary" /> Test cases
          </h1>
          {specs.length > 0 && (
            <select
              data-testid="cases-spec-selector"
              value={activeSpecId}
              onChange={(e) => setActiveSpecId(e.target.value)}
              className="ml-3 h-7 rounded border border-border bg-probestack-bg px-2 text-xs"
            >
              {specs.map((s) => (
                <option key={s.testSpecId} value={s.testSpecId}>
                  {s.name} ({s.testCaseCount})
                </option>
              ))}
            </select>
          )}
          {specQ.data && (
            <span className="ml-2 flex items-center gap-2">
              <FormatBadge format={specQ.data.format} />
              <Button
                size="sm"
                variant="ghost"
                data-testid="cases-open-spec"
                onClick={() => openSpec(specQ.data!.testSpecId)}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open spec
              </Button>
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {specsQ.isLoading ? (
          <div className="space-y-2 p-6"><Skeleton className="h-32 w-full" /><Skeleton className="h-48 w-full" /></div>
        ) : specs.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6" data-testid="cases-empty">
            <div className="w-full max-w-md rounded-xl border border-dashed border-border bg-surface/40 p-10 text-center">
              <Inbox className="mx-auto mb-3 h-8 w-8 text-text-muted" />
              <p className="text-sm font-medium">No specs yet</p>
              <p className="mt-1 text-xs text-text-muted">
                Create a spec under <strong>Specs</strong> first — generated cases will appear here.
              </p>
              <Button size="sm" variant="primary" className="mt-4" onClick={() => setSection('specs')}>
                Go to Specs
              </Button>
            </div>
          </div>
        ) : specQ.data ? (
          <SpecCasesTab spec={specQ.data} />
        ) : null}
      </div>
    </div>
  );
};
