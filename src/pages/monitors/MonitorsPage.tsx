/**
 * MonitorsPage — Single-source-of-truth Monitor Hub at `/projects/monitors`.
 *
 * Layout: Postman-style left subnav (Monitors / Heartbeats / Digests) — same
 * pattern as IntegrationsPage, so the visual rhythm of the app stays
 * consistent across every "tool" hub.
 *
 *   ┌──────────────┬────────────────────────────────────┐
 *   │ Monitor hub  │                                    │
 *   │ • Monitors   │      <active pane content>         │
 *   │ • Heartbeats │                                    │
 *   │ • Digests    │                                    │
 *   └──────────────┴────────────────────────────────────┘
 *
 * The active monitors list & detail surfaces are reused from
 * `pages/testing/monitors/` via direct component import — no fork.
 * Heartbeats and Digests panels are reused from this same folder.
 */
import { useState } from 'react';
import { MonitorsPage as TestingMonitorsList } from '@/pages/testing/monitors/MonitorsPage';
import { MonitorDetailPage } from '@/pages/testing/monitors/MonitorDetailPage';
import { useTestingStore } from '@/stores/testing.store';
import { AppIcon, type IconName } from '@/components/icons/AppIcons';
import { HeartbeatsPanel } from './HeartbeatsPanel';
import { DigestsPanel } from './DigestsPanel';
import { cn } from '@/utils/cn';

type MonitorTab = 'monitors' | 'heartbeats' | 'digests';

const NAV: { key: MonitorTab; label: string; icon: IconName; testId: string; hint: string }[] = [
  { key: 'monitors',   label: 'Monitors',   icon: 'monitor',   testId: 'monitor-tab-monitors',
    hint: 'Scheduled health probes — runs at an interval, asserts response, alerts on failure.' },
  { key: 'heartbeats', label: 'Heartbeats', icon: 'heartbeat', testId: 'monitor-tab-heartbeats',
    hint: 'Push monitors — your cron / pipeline pings a unique URL; we alert if a ping is missed.' },
  { key: 'digests',    label: 'Digests',    icon: 'digest',    testId: 'monitor-tab-digests',
    hint: 'Daily / weekly uptime summary emails for the on-call team.' },
];

export const MonitorsPage = () => {
  const [tab, setTab] = useState<MonitorTab>('monitors');
  const selectedMonitorId = useTestingStore((s) => s.selectedMonitorId);

  return (
    <div className="flex h-full" data-testid="monitor-hub">
      <aside data-testid="monitor-subnav" className="flex w-52 shrink-0 flex-col border-r border-border bg-surface/40">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <AppIcon name="monitor" animated className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight">Monitors</h2>
        </header>
        <nav className="flex-1 overflow-auto p-2">
          <ul className="space-y-0.5">
            {NAV.map(({ key, label, icon, testId, hint }) => (
              <li key={key}>
                <button
                  data-testid={testId}
                  onClick={() => setTab(key)}
                  title={hint}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors',
                    tab === key
                      ? 'bg-primary-muted text-primary'
                      : 'text-text-secondary hover:bg-hover hover:text-text-primary',
                  )}
                >
                  <AppIcon name={icon} animated className="h-3.5 w-3.5" /> {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0 flex-1 overflow-hidden">
        {tab === 'monitors'   && (selectedMonitorId ? <MonitorDetailPage /> : <TestingMonitorsList />)}
        {tab === 'heartbeats' && <HeartbeatsPanel />}
        {tab === 'digests'    && <DigestsPanel />}
      </div>
    </div>
  );
};

export default MonitorsPage;
