/**
 * BugTrackerKanban — Kanban board view of bugs grouped by status.
 *
 * Drag-drop reordering is powered by @dnd-kit/core. Dropping a card on
 * a different column issues a PATCH /bugs/{id} { status: <newCol> } so
 * the backend is the source of truth — local state is just the
 * optimistic mirror.
 *
 * Reuses the same /bugs CRUD API as `BugTrackerPage.tsx`. No backend
 * changes were needed beyond what already existed.
 */
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  AlertOctagon, ArrowUp, ArrowRight, ArrowDown, RefreshCw,
  GripVertical, Loader2, ExternalLink,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { serviceUrl } from '@/lib/env';

const BASE = `${serviceUrl('functionalTest')}/api/v1/functional-tests/bugs`;

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type Status = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'WONT_FIX';

interface Bug {
  id: string;
  title: string;
  severity: Severity;
  status: Status;
  source: string;
  assigneeEmail?: string;
  reporterEmail?: string;
  externalUrl?: string;
  createdAt: string;
  tags?: string[];
}

const COLUMNS: { id: Status; label: string; tone: string }[] = [
  { id: 'OPEN',        label: 'Open',        tone: 'border-blue-500/30 bg-blue-500/5' },
  { id: 'IN_PROGRESS', label: 'In Progress', tone: 'border-amber-500/30 bg-amber-500/5' },
  { id: 'RESOLVED',    label: 'Resolved',    tone: 'border-emerald-500/30 bg-emerald-500/5' },
  { id: 'CLOSED',      label: 'Closed',      tone: 'border-slate-500/30 bg-slate-500/5' },
  { id: 'WONT_FIX',    label: "Won't Fix",   tone: 'border-purple-500/30 bg-purple-500/5' },
];

const SEV_TONE: Record<Severity, string> = {
  CRITICAL: 'border-red-500/40 bg-red-500/15 text-red-400',
  HIGH:     'border-red-500/30 bg-red-500/10 text-red-300',
  MEDIUM:   'border-amber-500/30 bg-amber-500/10 text-amber-400',
  LOW:      'border-sky-500/30 bg-sky-500/10 text-sky-400',
};

const SEV_ICON: Record<Severity, typeof AlertOctagon> = {
  CRITICAL: AlertOctagon, HIGH: ArrowUp, MEDIUM: ArrowRight, LOW: ArrowDown,
};

export function BugTrackerKanban() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  // 4-px activation distance keeps clicks from accidentally starting a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const fetchBugs = async () => {
    setLoading(true);
    try {
      const r = await axios.get<Bug[]>(BASE);
      setBugs(r.data ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load bugs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBugs(); }, []);

  const byCol = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const visible = q
      ? bugs.filter((b) =>
          b.title.toLowerCase().includes(q) ||
          (b.assigneeEmail ?? '').toLowerCase().includes(q) ||
          (b.tags ?? []).some((t) => t.toLowerCase().includes(q)),
        )
      : bugs;
    const map: Record<Status, Bug[]> = { OPEN: [], IN_PROGRESS: [], RESOLVED: [], CLOSED: [], WONT_FIX: [] };
    for (const b of visible) map[b.status]?.push(b);
    // Sort each column by severity → date.
    const sevOrder: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    Object.values(map).forEach((col) =>
      col.sort((a, b) =>
        sevOrder[a.severity] - sevOrder[b.severity] ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    );
    return map;
  }, [bugs, filter]);

  const onDragEnd = async (e: DragEndEvent) => {
    const bugId = String(e.active.id ?? '');
    const target = e.over?.id ? String(e.over.id) : null;
    if (!target || !target.startsWith('col:')) return;
    const newStatus = target.slice(4) as Status;
    const bug = bugs.find((b) => b.id === bugId);
    if (!bug || bug.status === newStatus) return;

    // Optimistic update — flip the card immediately, revert on error.
    const prev = bugs;
    setBugs((p) => p.map((x) => (x.id === bugId ? { ...x, status: newStatus } : x)));
    setSavingId(bugId);
    try {
      await axios.patch(`${BASE}/${bugId}`, { status: newStatus });
    } catch (err: any) {
      setBugs(prev);
      setError(err?.message ?? 'Failed to update status');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="bug-kanban">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">Kanban</h2>
          <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] text-text-muted">
            {bugs.length} total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            data-testid="bug-kanban-search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter title / assignee / tag…"
            className="w-64 rounded border border-border bg-transparent px-2 py-1 text-xs"
          />
          <button
            data-testid="bug-kanban-refresh"
            onClick={fetchBugs}
            className="rounded border border-border px-2 py-1 text-xs hover:bg-hover"
          >
            <RefreshCw className={cn('inline h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-2 rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex h-0 flex-1 gap-3 overflow-x-auto p-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              col={col}
              bugs={byCol[col.id]}
              savingId={savingId}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

interface ColProps {
  col: { id: Status; label: string; tone: string };
  bugs: Bug[];
  savingId: string | null;
}

function KanbanColumn({ col, bugs, savingId }: ColProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${col.id}` });
  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-col-${col.id}`}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border bg-surface',
        col.tone,
        isOver && 'ring-2 ring-primary/50',
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-xs font-semibold">
        <span>{col.label}</span>
        <span className="rounded-full bg-elevated px-1.5 py-0 text-[10px] text-text-muted">
          {bugs.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {bugs.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-[10px] text-text-muted">
            (empty)
          </div>
        ) : (
          bugs.map((b) => <KanbanCard key={b.id} bug={b} saving={savingId === b.id} />)
        )}
      </div>
    </div>
  );
}

function KanbanCard({ bug, saving }: { bug: Bug; saving: boolean }) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({ id: bug.id });
  const SevIcon = SEV_ICON[bug.severity] ?? ArrowRight;
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      data-testid={`bug-card-${bug.id}`}
      className={cn(
        'group rounded-md border border-border bg-elevated p-2 text-xs shadow-sm transition-shadow',
        isDragging && 'opacity-50 shadow-xl ring-2 ring-primary',
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          {...listeners}
          className="mt-0.5 cursor-grab text-text-muted opacity-0 group-hover:opacity-100"
          aria-label="Drag bug"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-text-primary">{bug.title}</div>
          <div className="mt-1.5 flex items-center gap-1">
            <span className={cn('inline-flex items-center gap-0.5 rounded border px-1 py-0 text-[9px] uppercase', SEV_TONE[bug.severity])}>
              <SevIcon className="h-2.5 w-2.5" /> {bug.severity}
            </span>
            <span className="rounded border border-border bg-surface px-1 py-0 text-[9px] uppercase text-text-muted">
              {bug.source}
            </span>
            {bug.externalUrl && (
              <a
                href={bug.externalUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ml-auto text-text-muted hover:text-primary"
                title="Open external ticket"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {saving && <Loader2 className="ml-auto h-3 w-3 animate-spin text-text-muted" />}
          </div>
          {bug.assigneeEmail && (
            <div className="mt-1 truncate text-[10px] text-text-muted">
              {bug.assigneeEmail}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BugTrackerKanban;
