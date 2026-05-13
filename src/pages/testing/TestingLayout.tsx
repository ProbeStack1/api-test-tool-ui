/**
 * TestingLayout — the *single* page mounted at `/projects/testing`.
 *
 *   • URL never changes — Specs · Cases · Library · Functional · Load
 *     · Monitors switch via `useTestingStore.section`.
 *   • Internal deep-views (Spec Detail, Run Detail) replace the
 *     section content via `selectedSpecId` / `selectedRunId`, again
 *     keeping the URL stable.
 *   • Left sub-rail is just a button group that mutates the store.
 */
import {
  FileText, ListChecks, Library, Beaker, Gauge, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { AppIcon, type IconName } from '@/components/icons/AppIcons';
import { cn } from '@/utils/cn';
import { useTestingStore, type TestingSection } from '@/stores/testing.store';

import { SpecsListPage }    from './specs/SpecsListPage';
import { SpecDetailPage }   from './specs/SpecDetailPage';
import { AllCasesPage }     from './cases/AllCasesPage';
import { LibraryPage }      from './library/LibraryPage';
import { FunctionalTestsPage } from './functional/FunctionalTestsPage';
import { RunDetailPage }    from './functional/RunDetailPage';
import { LoadTestsPage }    from './load/LoadTestsPage';
import { LoadRunDetailPage } from './load/LoadRunDetailPage';
import { MonitorsPage }      from './monitors/MonitorsPage';
import { MonitorDetailPage } from './monitors/MonitorDetailPage';
import { SecurityScanPage }  from '../Security/SecurityScanPage';
import { ComingSoon }       from './ComingSoon';

interface NavItem {
  key: TestingSection;
  label: string;
  icon: LucideIcon;
  testId: string;
  hint?: string;
  pending?: boolean;
}

interface NavItem {
  key: TestingSection;
  label: string;
  icon: LucideIcon;
  iconName?: IconName;
  testId: string;
  hint?: string;
  pending?: boolean;
}

const NAV: NavItem[] = [
  { key: 'specs',      label: 'Specs',            icon: FileText,    iconName: 'spec',            testId: 'testing-nav-specs',      hint: 'OpenAPI / Postman / HAR / cURL' },
  { key: 'cases',      label: 'Test Cases',       icon: ListChecks,  iconName: 'testing',         testId: 'testing-nav-cases',      hint: 'Generated assertions' },
  { key: 'library',    label: 'Spec Library',     icon: Library,     iconName: 'apidoc',          testId: 'testing-nav-library',    hint: 'Org-wide reusable specs' },
  { key: 'functional', label: 'Functional Tests', icon: Beaker,      iconName: 'functional-test', testId: 'testing-nav-functional', hint: 'Run suites, assertions' },
  { key: 'load',       label: 'Load Tests',       icon: Gauge,       iconName: 'load-test',       testId: 'testing-nav-load',       hint: 'Throughput & p95' },
  { key: 'security',   label: 'Security Test',    icon: ShieldCheck, iconName: 'shield',          testId: 'testing-nav-security',   hint: 'OWASP probes · PII · rate limit' },
];

export const TestingLayout = () => {
  const section = useTestingStore((s) => s.section);
  const setSection = useTestingStore((s) => s.setSection);
  const selectedSpecId = useTestingStore((s) => s.selectedSpecId);
  const selectedRunId = useTestingStore((s) => s.selectedRunId);
  const selectedLoadRunId = useTestingStore((s) => s.selectedLoadRunId);
  const selectedMonitorId = useTestingStore((s) => s.selectedMonitorId);

  return (
    <div className="flex h-full w-full" data-testid="testing-layout">
      <aside
        className="flex w-56 shrink-0 flex-col border-r border-border bg-surface/40"
        data-testid="testing-subnav"
      >
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Testing
          </h2>
          <p className="mt-0.5 text-[10px] text-text-muted">
            Specs · Cases · Suites · Monitors
          </p>
        </div>
        <nav className="flex-1 overflow-auto p-2">
          {NAV.map((n) => {
            const isActive = section === n.key;
            return (
              <button
                key={n.key}
                data-testid={n.testId}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setSection(n.key)}
                className={cn(
                  'group relative flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors duration-150',
                  isActive
                    ? 'bg-primary/[0.08] text-text-primary'
                    : 'text-text-secondary hover:bg-hover hover:text-text-primary',
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-primary" />
                )}
                <span className={cn('mt-0.5 shrink-0', isActive ? 'text-primary' : 'text-text-muted group-hover:text-primary')}>
                  {n.iconName
                    ? <AppIcon name={n.iconName} animated className="h-4 w-4" />
                    : <n.icon className="h-4 w-4" />}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-1.5 text-[13px] font-medium leading-tight">
                    {n.label}
                    {n.pending && (
                      <span className="rounded-sm border border-warning/30 bg-warning/10 px-1 py-px text-[8px] font-semibold uppercase tracking-wide text-warning">
                        soon
                      </span>
                    )}
                  </span>
                  {n.hint && (
                    <span className="truncate text-[10px] text-text-muted">{n.hint}</span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="border-t border-border px-3 py-2 text-[10px] text-text-muted">
          Single-page testing · no URL navigation
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden bg-probestack-bg">
        {section === 'specs' && (selectedSpecId ? <SpecDetailPage /> : <SpecsListPage />)}
        {section === 'cases' && <AllCasesPage />}
        {section === 'library' && <LibraryPage />}
        {section === 'functional' && (selectedRunId ? <RunDetailPage /> : <FunctionalTestsPage />)}
        {section === 'load' && (selectedLoadRunId ? <LoadRunDetailPage /> : <LoadTestsPage />)}
        {section === 'security' && <SecurityScanPage />}
        {section === 'monitors' && (selectedMonitorId ? <MonitorDetailPage /> : <MonitorsPage />)}
        {/* `monitors` lives here only as a deep-link target; the primary surface
            now lives at /projects/monitors (Monitors / Heartbeats / Digests hub). */}
      </main>
    </div>
  );
};
