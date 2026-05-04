/**
 * SchedulesTab — list cron-driven schedules + create/pause/resume/trigger/delete.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock, Plus, Pause, Play, Trash2, Zap, Loader2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  listSchedules, createSchedule, pauseSchedule, resumeSchedule,
  triggerSchedule, deleteSchedule, type Schedule,
} from '@/services/functionalTest.service';
import { listTestSpecs } from '@/services/testSpec.service';
import { listEnvironments } from '@/services/environment.service';
import { listCollections } from '@/services/collection.service';
import { formatRelative } from '../../shared/Badges';
import { cn } from '@/utils/cn';

interface Props { workspaceId: string }

export const SchedulesTab = ({ workspaceId }: Props) => {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);

  const q = useQuery({
    queryKey: ['functionalTest', 'schedules', workspaceId],
    queryFn: () => listSchedules(workspaceId, { size: 50 }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['functionalTest', 'schedules', workspaceId] });

  const pauseMut   = useMutation({ mutationFn: (id: string) => pauseSchedule(id),   onSuccess: invalidate });
  const resumeMut  = useMutation({ mutationFn: (id: string) => resumeSchedule(id),  onSuccess: invalidate });
  const triggerMut = useMutation({ mutationFn: (id: string) => triggerSchedule(id), onSuccess: invalidate });
  const deleteMut  = useMutation({ mutationFn: (id: string) => deleteSchedule(id),  onSuccess: invalidate });

  const items = q.data?.content ?? [];

  return (
    <div className="flex h-full flex-col p-6" data-testid="functional-schedules-tab">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <CalendarClock className="h-4 w-4 text-primary" /> Schedules
          <span className="rounded-full bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-secondary">
            {items.length}
          </span>
        </h2>
        <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)} data-testid="schedules-create-btn" className="ml-auto">
          <Plus className="h-3.5 w-3.5" /> New schedule
        </Button>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-border">
        {q.isLoading ? (
          <div className="space-y-1 p-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-10 text-center" data-testid="schedules-empty">
            <CalendarClock className="mb-2 h-8 w-8 text-text-muted" />
            <p className="text-sm font-medium">No schedules yet</p>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              Create a cron-driven schedule to run your spec continuously and get alerted on regression.
            </p>
            <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)} className="mt-4" data-testid="schedules-empty-create">
              <Plus className="h-3.5 w-3.5" /> Create your first schedule
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((s) => <ScheduleRow key={s.scheduleId} sched={s}
              onPause={() => pauseMut.mutate(s.scheduleId)}
              onResume={() => resumeMut.mutate(s.scheduleId)}
              onTrigger={() => triggerMut.mutate(s.scheduleId)}
              onDelete={() => setDeleteTarget(s)}
              busy={pauseMut.isPending || resumeMut.isPending || triggerMut.isPending}
            />)}
          </ul>
        )}
      </div>

      <CreateScheduleModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        workspaceId={workspaceId}
        onCreated={() => { setCreateOpen(false); invalidate(); }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Delete schedule?"
        description={deleteTarget ? `"${deleteTarget.name ?? deleteTarget.scheduleId}" will be permanently deleted. This cannot be undone.` : ''}
        confirmText="Delete"
        tone="danger"
        onConfirm={async () => { if (deleteTarget) await deleteMut.mutateAsync(deleteTarget.scheduleId); }}
      />
    </div>
  );
};

const ScheduleRow = ({ sched, onPause, onResume, onTrigger, onDelete, busy }: {
  sched: Schedule; onPause: () => void; onResume: () => void; onTrigger: () => void; onDelete: () => void; busy: boolean;
}) => {
  const isPaused = sched.status === 'PAUSED';
  return (
    <li data-testid={`schedule-row-${sched.scheduleId}`} className="flex items-center gap-3 px-4 py-3 text-xs">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{sched.name || sched.scheduleId.slice(0, 8)}</span>
          <span className={cn(
            'rounded border px-1 py-px text-[9px] font-semibold uppercase tracking-wider',
            isPaused
              ? 'border-warning/30 bg-warning/10 text-warning'
              : 'border-success/30 bg-success/10 text-success',
          )}>
            {sched.status ?? 'ACTIVE'}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-text-muted">
          <code className="rounded bg-elevated px-1.5 py-0.5 font-mono">{sched.cron}</code>
          {sched.timezone && <span>{sched.timezone}</span>}
          {sched.testSpecId && <span>· Spec {sched.testSpecId.slice(0, 8)}</span>}
          {sched.collectionId && <span>· Collection {sched.collectionId.slice(0, 8)}</span>}
          {sched.lastRunStatus && <span>· last: {sched.lastRunStatus}</span>}
          {sched.nextRunAt && (
            <span>· next {formatRelative(typeof sched.nextRunAt === 'string' ? sched.nextRunAt : '')}</span>
          )}
        </div>
      </div>
      <Button size="sm" variant="ghost" onClick={onTrigger} disabled={busy} aria-label="Trigger now" data-testid={`schedule-trigger-${sched.scheduleId}`}>
        <Zap className="h-3.5 w-3.5" />
      </Button>
      {isPaused ? (
        <Button size="sm" variant="ghost" onClick={onResume} disabled={busy} aria-label="Resume" data-testid={`schedule-resume-${sched.scheduleId}`}>
          <Play className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={onPause} disabled={busy} aria-label="Pause" data-testid={`schedule-pause-${sched.scheduleId}`}>
          <Pause className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete" data-testid={`schedule-delete-${sched.scheduleId}`}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
};

/* ------- create schedule modal ------- */
const CreateScheduleModal = ({
  open, onClose, workspaceId, onCreated,
}: { open: boolean; onClose: () => void; workspaceId: string; onCreated: () => void }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState<'spec' | 'collection'>('spec');
  const [testSpecId, setTestSpecId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [environmentId, setEnvironmentId] = useState('');
  const [cron, setCron] = useState('0 */15 * * * *');     // every 15 min default
  const [timezone, setTimezone] = useState('UTC');
  const [error, setError] = useState<string | null>(null);

  const specsQ = useQuery({
    queryKey: ['testSpec', 'list', workspaceId, 'ACTIVE', ''],
    queryFn: () => listTestSpecs(workspaceId, { status: 'ACTIVE', size: 100 }),
    enabled: open,
  });
  const collectionsQ = useQuery({
    queryKey: ['collection', 'list', workspaceId],
    queryFn: () => listCollections(workspaceId),
    enabled: open,
  });
  const envsQ = useQuery({
    queryKey: ['environment', 'list', workspaceId],
    queryFn: () => listEnvironments(workspaceId),
    enabled: open,
  });

  const mut = useMutation({
    mutationFn: () => createSchedule({
      workspaceId,
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      // Send EITHER testSpecId OR collectionId based on the selected source.
      // The backend honours whichever is non-null and runs the cases under
      // it; this matches Postman's "schedule a collection or a spec".
      testSpecId:   source === 'spec'       && testSpecId   ? testSpecId   : undefined,
      collectionId: source === 'collection' && collectionId ? collectionId : undefined,
      environmentId: environmentId || undefined,
      cron: cron.trim(),
      timezone: timezone.trim() || undefined,
    }),
    onSuccess: () => onCreated(),
    onError: (e: any) => setError(e?.message ?? 'Failed to create schedule'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New schedule"
      icon={CalendarClock}
      size="md"
      testId="schedule-create-modal"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} data-testid="schedule-create-cancel">Cancel</Button>
          <Button
            variant="primary"
            onClick={() => mut.mutate()}
            disabled={
              (source === 'spec' && !testSpecId) ||
              (source === 'collection' && !collectionId) ||
              !cron.trim() || mut.isPending
            }
            data-testid="schedule-create-submit"
          >
            {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create
          </Button>
        </>
      }
    >
      {error && (
        <div data-testid="schedule-create-error" className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}
      <div className="space-y-3">
        <Field label="Name">
          <input data-testid="schedule-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nightly smoke" className={cls()} />
        </Field>
        <Field label="Description">
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="optional" className={cls()} />
        </Field>
        <Field label="Run source" required>
          <div className="flex gap-2 text-[11px]" data-testid="schedule-source">
            <label className={cn('flex items-center gap-1.5 rounded border px-2 py-1 cursor-pointer', source === 'spec' ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>
              <input type="radio" className="hidden" checked={source === 'spec'} onChange={() => setSource('spec')} data-testid="schedule-source-spec" />
              Test Spec
            </label>
            <label className={cn('flex items-center gap-1.5 rounded border px-2 py-1 cursor-pointer', source === 'collection' ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>
              <input type="radio" className="hidden" checked={source === 'collection'} onChange={() => setSource('collection')} data-testid="schedule-source-collection" />
              Collection
            </label>
          </div>
        </Field>
        {source === 'spec' && (
          <Field label="Test spec" required>
            <select data-testid="schedule-spec" value={testSpecId} onChange={(e) => setTestSpecId(e.target.value)} className={cls()}>
              <option value="">— select a spec —</option>
              {specsQ.data?.content.map((s) => (
                <option key={s.testSpecId} value={s.testSpecId}>{s.name} · {s.testCaseCount} cases</option>
              ))}
            </select>
          </Field>
        )}
        {source === 'collection' && (
          <Field label="Collection" required>
            <select data-testid="schedule-collection" value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className={cls()}>
              <option value="">— select a collection —</option>
              {(collectionsQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Environment">
          <select data-testid="schedule-env" value={environmentId} onChange={(e) => setEnvironmentId(e.target.value)} className={cls()}>
            <option value="">— none —</option>
            {(envsQ.data ?? []).map((e: any) => {
              const scope = String(e.scope ?? 'ENVIRONMENT').toUpperCase();
              return (
                <option key={e.id ?? e.environmentId} value={e.id ?? e.environmentId}>{e.name} ({scope})</option>
              );
            })}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Schedule" required>
            <select
              data-testid="schedule-cron-preset"
              value={CRON_PRESETS.some((p) => p.value === cron) ? cron : '__custom__'}
              onChange={(e) => { if (e.target.value !== '__custom__') setCron(e.target.value); }}
              className={cls()}
            >
              {CRON_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              <option value="__custom__">Custom (enter cron below)</option>
            </select>
          </Field>
          <Field label={<>Custom cron <code className="text-text-muted">(6-field)</code></>}>
            <input data-testid="schedule-cron" value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 */15 * * * *" className={`${cls()} font-mono`} />
          </Field>
          <Field label="Timezone">
            <select data-testid="schedule-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} className={cls()}>
              {TZ_PRESETS.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>
        </div>
        <p className="rounded-md bg-elevated/40 px-3 py-2 text-[10px] text-text-muted">
          Pick a preset above, or type a Spring 6-field cron to override. Examples:
          <code className="mx-1">0 0 * * * *</code> hourly ·
          <code className="mx-1">0 0 9 * * MON-FRI</code> weekday mornings.
        </p>
      </div>
    </Modal>
  );
};

/** Common cron presets — covers 95% of what Postman users schedule
 *  (Every N min / Hourly / Daily / Weekly / Weekdays). Selecting one
 *  populates the cron field so users never have to hand-write a cron. */
const CRON_PRESETS: { label: string; value: string }[] = [
  { label: 'Every 5 minutes',         value: '0 */5 * * * *'       },
  { label: 'Every 15 minutes',        value: '0 */15 * * * *'      },
  { label: 'Every 30 minutes',        value: '0 */30 * * * *'      },
  { label: 'Hourly (on the hour)',    value: '0 0 * * * *'         },
  { label: 'Every 6 hours',           value: '0 0 */6 * * *'       },
  { label: 'Daily at 09:00',          value: '0 0 9 * * *'         },
  { label: 'Daily at midnight',       value: '0 0 0 * * *'         },
  { label: 'Weekdays at 09:00',       value: '0 0 9 * * MON-FRI'   },
  { label: 'Weekly Monday 09:00',     value: '0 0 9 * * MON'       },
  { label: 'Monthly 1st at 00:00',    value: '0 0 0 1 * *'         },
];

/** Hand-curated subset of IANA zones — covers most business regions
 *  without overwhelming the user. `UTC` stays default to keep audit
 *  timestamps predictable across hosts. */
const TZ_PRESETS: string[] = [
  'UTC',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
];

const cls = () => 'h-8 w-full rounded border border-border bg-probestack-bg px-2 text-xs';
const Field = ({ label, children, required }: { label: React.ReactNode; children: React.ReactNode; required?: boolean }) => (
  <label className="block text-xs">
    <span className="mb-1 block font-medium text-text-secondary">{label} {required && <span className="text-danger">*</span>}</span>
    {children}
  </label>
);
