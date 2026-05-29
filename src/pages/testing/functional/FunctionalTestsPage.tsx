/**
 * FunctionalTestsPage — section content for `useTestingStore.section === 'functional'`.
 *
 * Internal tab strip:
 *   • Dashboard — KPI tiles + inline run config + recent runs
 *   • Runs       — full paginated runs list
 *   • Schedules  — list + create cron-driven jobs
 *   • Analytics  — flaky report + trend chart
 *
 * Tab state is read/written from `useTestingStore` so the URL stays
 * stable (`/projects/testing` only) yet the user lands back on the
 * same tab after navigation.
 */
import { Beaker, LayoutDashboard, ListTree, CalendarClock, LineChart, PlayCircle } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { NoProjectEmpty } from '@/components/common/NoProjectEmpty';
import { useTestingStore } from '@/stores/testing.store';
import { useRunsTracker } from '@/stores/runsTracker.store';
import { cn } from '@/utils/cn';
import { DashboardTab } from './tabs/DashboardTab';
import { RunnerTab } from './tabs/RunnerTab';
import { RunsTab } from './tabs/RunsTab';
import { SchedulesTab } from './tabs/SchedulesTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';

const TABS: { key: 'runner' | 'runs' | 'dashboard' | 'schedules' | 'analytics'; label: string; icon: any; testId: string }[] = [
  { key: 'runner',     label: 'Runner',     icon: PlayCircle,      testId: 'functional-tab-runner' },
  { key: 'runs',       label: 'Runs',       icon: ListTree,        testId: 'functional-tab-runs' },
  { key: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard, testId: 'functional-tab-dashboard' },
  { key: 'schedules',  label: 'Schedules',  icon: CalendarClock,   testId: 'functional-tab-schedules' },
  { key: 'analytics',  label: 'Analytics',  icon: LineChart,       testId: 'functional-tab-analytics' },
];

export const FunctionalTestsPage = ({ workspaceId }: { workspaceId: string }) => {
  const ws = useWorkspaceStore((s) => s.current);
  const tab = useTestingStore((s) => s.functionalTab);
  const setTab = useTestingStore((s) => s.setFunctionalTab);
  const trackedCount = useRunsTracker((s) => Object.keys(s.runs).length);

  if (!ws) {
    return <NoProjectEmpty testId="functional-no-workspace" icon="functional-test" surface="functional tests" />;
  }

  return (
    <div className="flex h-full flex-col" data-testid="functional-tests-page">
      <header className="border-b border-border bg-surface/30 px-6 pt-3">
        <div className="flex items-center gap-2">
          <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Beaker className="h-4 w-4 text-primary" /> Functional Tests
          </h1>
          <span className="text-[11px] text-text-muted">
            · Run your specs against real environments — assertions, parallel execution, retries, schedules.
          </span>
          {trackedCount > 0 && (
            <span
              data-testid="functional-tracked-count"
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              {trackedCount} run{trackedCount > 1 ? 's' : ''} in flight
            </span>
          )}
        </div>
        <nav role="tablist" className="-mb-px mt-3 flex gap-1" data-testid="functional-tabs">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={isActive}
                data-testid={t.testId}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-primary text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary',
                )}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="flex-1 overflow-hidden">
        {tab === 'runner'     && <RunnerTab     workspaceId={ws.id} />}
        {tab === 'runs'       && <RunsTab       workspaceId={ws.id} />}
        {tab === 'dashboard'  && <DashboardTab  workspaceId={ws.id} />}
        {tab === 'schedules'  && <SchedulesTab  workspaceId={ws.id} />}
        {tab === 'analytics'  && <AnalyticsTab  workspaceId={ws.id} />}
      </div>
    </div>
  );
};
