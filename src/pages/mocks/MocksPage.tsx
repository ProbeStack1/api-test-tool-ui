/**
 * MocksPage — landing page for `/projects/mocks`.
 *
 * The internal sidebar that previously lived here is GONE. The left
 * rail is now the single source of truth (see `MockPanel.tsx`); this
 * page just shows a welcome panel that explains:
 *
 *   • What a mock server is
 *   • How to create / import one (links to the rail buttons)
 *   • Where to test endpoints once a mock is created
 *
 * If at least one mock exists, we auto-route to its detail page so
 * the user lands somewhere productive.
 */
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Server, Plus, Upload, Sparkles, ListTree, Activity, Bug, ArrowRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { listMocks } from '@/services/mock.service';

export const MocksPage = () => {
  const ws = useWorkspaceStore((s) => s.current);
  const nav = useNavigate();
  const { data: mocks = [], isLoading } = useQuery({
    queryKey: ['mocks', ws?.id],
    queryFn: () => listMocks(ws?.id),
    enabled: !!ws?.id,
  });

  // NO auto-route. User must click a mock from the rail to open it.

  return (
    <div className="flex h-full items-center justify-center p-8" data-testid="mocks-welcome-page">
      <div className="w-full max-w-3xl">
        {isLoading && !ws ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="rounded-xl border border-border bg-surface/40 p-10">
            {/* HERO illustration — large, centered */}
            <div className="mb-6 flex flex-col items-center text-center" data-testid="mocks-welcome-hero">
              <div className="relative mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-primary/[0.06]">
                <div className="absolute inset-0 animate-pulse rounded-full bg-primary/[0.04]" />
                <Server className="h-14 w-14 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Mock servers</h1>
              <p className="mt-2 max-w-md text-sm text-text-secondary">
                Hosted fake APIs — define endpoint rules, validation, chaos and serve them at a public URL.
                Perfect for parallel front-end development, contract testing, and demos.
              </p>
            </div>

            {/* Two CTA cards mirroring the rail buttons */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <CtaCard
                icon={Plus}
                title="Create a mock server"
                tip="Start blank, build from a collection, or clone an existing mock."
                hint="Use the 'Create' button at the top of the left rail."
                testId="mocks-welcome-create-cta"
              />
              <CtaCard
                icon={Upload}
                title="Import a spec"
                tip="Drop a Postman collection, OpenAPI spec or ForgeQ export and we'll seed every endpoint."
                hint="Use the 'Import' button at the top of the left rail."
                testId="mocks-welcome-import-cta"
              />
            </div>

            {/* Feature highlights */}
            <div className="mt-5 rounded-lg border border-dashed border-border bg-elevated/20 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> What a mock can do here
              </h3>
              <ul className="space-y-1.5 text-[11px] text-text-secondary">
                <Bullet icon={ListTree}>Define rules: <code className="rounded bg-elevated px-1 font-mono">method + pathPattern + response</code> — supports query / header / JSONPath matchers.</Bullet>
                <Bullet icon={Activity}>Real-server-grade <strong>validation</strong>: auth, content-type, JSON Schema, JSONPath asserts.</Bullet>
                <Bullet icon={Bug}>Inject <strong>chaos</strong> (error rate, latency spikes), set active windows, return one of multiple response variants.</Bullet>
                <Bullet icon={ArrowRight}>Hit endpoints at <code className="rounded bg-elevated px-1 font-mono">http://localhost:8085/api/v1/mocks/{`{slug}`}/...</code></Bullet>
              </ul>
            </div>

            {!ws && (
              <p className="mt-4 text-[11px] text-warning">
                Pick a project from the right rail to start creating mocks.
              </p>
            )}

            {/* Recent mocks list — quick access without forcing auto-route */}
            {ws && mocks.length > 0 && (
              <div className="mt-5 rounded-lg border border-border bg-surface/40 p-4" data-testid="mocks-recent-list">
                <h3 className="mb-2 flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-primary" /> Recent mocks ({mocks.length})</span>
                  <span className="text-[10px] font-normal text-text-muted">Click to open</span>
                </h3>
                <ul className="divide-y divide-border/40">
                  {mocks.slice(0, 6).map((m) => (
                    <li key={m.id}>
                      <button
                        data-testid={`mocks-recent-${m.id}`}
                        onClick={() => nav(`/projects/mocks/${m.id}`)}
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors hover:bg-hover/40"
                      >
                        <Server className="h-3 w-3 shrink-0 text-text-muted" />
                        <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
                        <span className="shrink-0 font-mono text-[10px] text-text-muted">{m.endpointCount} eps</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const CtaCard = ({
  icon: Icon, title, tip, hint, testId,
}: { icon: any; title: string; tip: string; hint: string; testId: string }) => (
  <div data-testid={testId} className="rounded-lg border border-border bg-probestack-bg p-4">
    <div className="mb-1.5 flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-semibold">{title}</span>
    </div>
    <p className="text-[11px] text-text-secondary">{tip}</p>
    <p className="mt-2 text-[10px] italic text-text-muted">{hint}</p>
  </div>
);

const Bullet = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
  <li className="flex items-start gap-1.5">
    <Icon className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
    <span>{children}</span>
  </li>
);
