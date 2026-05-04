/**
 * MockPanel — left-rail sidebar for the Mock primary tab.
 *
 * Mirrors `CollectionsPanel` exactly: a single sidebar at the top of
 * the rail with Create + Import action buttons, a search box, and a
 * list of mock servers each expandable into its endpoints. Clicking a
 * mock or an endpoint navigates to /projects/mocks/{mockId}; the
 * detail page reads the id from the URL.
 *
 * The whole MocksPage's previously-rendered internal aside is GONE —
 * this panel is now the single source of truth for the left rail.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Server, Plus, Upload, ChevronRight, ChevronDown, MoreHorizontal,
  Pencil, Trash2, Power, ExternalLink, Lock, Globe, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSep } from '@/components/ui/DropdownMenu';
import { Tooltip } from '@/components/ui/Tooltip';
import { RowConfirm } from './collections/RowConfirm';
import { SidebarShell, ActionButton, SearchInput } from './SidebarShell';
import { SidebarSkeleton } from './collections/SidebarSkeleton';
import { useWorkspaceStore } from '@/stores/workspace.store';
import {
  listMocks, deleteMock, updateMock, listEndpoints,
  type MockServer, type MockEndpoint, type MockVisibility,
} from '@/services/mock.service';
import { MockCreateModal } from '@/components/mocks/modals/MockCreateModal';
import { MockImportModal } from '@/components/mocks/modals/MockImportModal';
import { cn } from '@/utils/cn';

const MC: Record<string, string> = {
  GET: 'text-method-get', POST: 'text-method-post', PUT: 'text-method-put',
  PATCH: 'text-method-patch', DELETE: 'text-method-delete',
};

export const MockPanel = () => {
  const ws = useWorkspaceStore((s) => s.current);
  const nav = useNavigate();
  const qc = useQueryClient();
  const { id: activeMockId } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data: mocks = [], isLoading } = useQuery({
    queryKey: ['mocks', ws?.id],
    queryFn: () => listMocks(ws?.id),
    enabled: !!ws?.id,
  });

  // Auto-expand the active mock when navigating to its detail page.
  useEffect(() => {
    if (activeMockId) setOpen((s) => ({ ...s, [activeMockId]: true }));
  }, [activeMockId]);

  const filtered = mocks.filter(
    (m) => !search.trim() || m.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  return (
    <>
      <SidebarShell
        icon={Server}
        title="Mock"
        testId="mock-panel"
        actions={
          <div className="flex gap-2">
            <ActionButton icon={Plus}    label="Create" testId="mock-create-btn" onClick={() => setCreateOpen(true)} />
            <ActionButton icon={Upload}  label="Import" testId="mock-import-btn" onClick={() => setImportOpen(true)} />
          </div>
        }
        search={
          <SearchInput
            placeholder="Search mock servers"
            testId="mock-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      >
        <div className="p-1">
          {!ws && <div className="p-3 text-xs text-text-muted">Select a project first.</div>}
          {ws && isLoading && <SidebarSkeleton rows={3} />}
          {ws && !isLoading && filtered.length === 0 && (
            <button
              data-testid="mock-empty-create"
              onClick={() => setCreateOpen(true)}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs text-text-muted hover:bg-hover hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Create your first mock server
            </button>
          )}
          {ws && !isLoading && filtered.map((m) => (
            <MockNode
              key={m.id}
              mock={m}
              isActive={activeMockId === m.id}
              expanded={!!open[m.id]}
              onToggle={() => toggle(m.id)}
              onClick={() => nav(`/projects/mocks/${m.id}`)}
              onDeleted={() => {
                if (activeMockId === m.id) nav('/projects/mocks');
                qc.invalidateQueries({ queryKey: ['mocks', ws.id] });
              }}
              invalidate={() => qc.invalidateQueries({ queryKey: ['mocks', ws.id] })}
            />
          ))}
        </div>
      </SidebarShell>
      <MockCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <MockImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
};

const MockNode = ({
  mock, isActive, expanded, onToggle, onClick, invalidate, onDeleted,
}: {
  mock: MockServer; isActive: boolean; expanded: boolean;
  onToggle: () => void; onClick: () => void; invalidate: () => void;
  onDeleted: () => void;
}) => {
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(mock.name);
  const renameRef = useRef<HTMLInputElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [confirmAnchor, setConfirmAnchor] = useState<HTMLElement | null>(null);

  // When the user clicks Rename in the dropdown, focus + select-all the
  // input on the very next tick so they can just start typing. The
  // requestAnimationFrame defers until Radix has finished closing the
  // dropdown — otherwise focus is stolen back.
  useEffect(() => {
    if (editing && renameRef.current) {
      const id = requestAnimationFrame(() => {
        renameRef.current?.focus();
        renameRef.current?.select();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [editing]);

  const { data: endpoints = [] } = useQuery({
    queryKey: ['mock', mock.id, 'endpoints'],
    queryFn: () => listEndpoints(mock.id),
    enabled: expanded,
  });

  const Vis = mock.visibility === 'PUBLIC' ? Globe
            : mock.visibility === 'ORG'    ? Building2 : Lock;
  const visTone = mock.visibility === 'PUBLIC' ? 'text-emerald-400'
                : mock.visibility === 'ORG'    ? 'text-blue-400' : 'text-text-muted';

  return (
    <div>
      <div
        ref={rowRef}
        data-testid={`mock-node-${mock.id}`}
        className={cn(
          'group relative flex items-center gap-1 rounded pr-1 text-left text-xs transition-colors',
          isActive ? 'bg-primary-muted text-primary' : 'hover:bg-hover text-text-primary',
        )}
        style={{ paddingLeft: 4 }}
      >
        {isActive && <span className="absolute left-0 top-1 h-5 w-[2px] rounded-r bg-primary" />}
        <button
          onClick={onToggle}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="flex h-5 w-4 shrink-0 items-center justify-center text-text-muted"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        <Server className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-primary' : 'text-text-secondary')} />
        {editing ? (
          <input
            ref={renameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={async () => {
              setEditing(false);
              if (name.trim() && name !== mock.name) {
                await updateMock(mock.id, { name: name.trim() } as any);
                invalidate();
                toast.success('Renamed');
              } else { setName(mock.name); }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setName(mock.name); setEditing(false); }
              if (e.key === 'Enter')  { (e.target as HTMLInputElement).blur(); }
            }}
            data-testid={`mock-rename-${mock.id}`}
            className="min-w-0 flex-1 rounded border border-primary bg-surface px-1 py-0.5 text-xs text-text-primary outline-none focus:ring-1 focus:ring-primary/40"
          />
        ) : (
          <Tooltip content={`${mock.name} — ${mock.baseUrl}`} side="right">
            <button
              data-testid={`mock-${mock.id}`}
              onClick={onClick}
              onDoubleClick={() => setEditing(true)}
              className="min-w-0 flex-1 truncate py-1 text-left font-medium"
            >
              {mock.name}
            </button>
          </Tooltip>
        )}
        <Vis className={cn('h-2.5 w-2.5 shrink-0', visTone)} />
        <span className="shrink-0 rounded bg-elevated px-1 py-0.5 font-mono text-[9px] text-text-muted">
          {endpoints.length || mock.endpointCount || 0}
        </span>
        <Dropdown
          side="right"
          align="start"
          trigger={
            <button
              data-testid={`mock-menu-${mock.id}`}
              className="flex h-5 w-5 items-center justify-center rounded text-text-muted opacity-0 transition-opacity hover:bg-elevated hover:text-text-primary group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label="Mock actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          }
        >
          <DropdownLabel>Mock</DropdownLabel>
          <DropdownItem icon={ExternalLink} onClick={() => nav(`/projects/mocks/${mock.id}`)}>Open detail</DropdownItem>
          <DropdownItem icon={Pencil} onClick={() => setEditing(true)}>Rename</DropdownItem>
          <DropdownSep />
          <DropdownItem
            icon={Power}
            onClick={async () => {
              const next: MockVisibility = mock.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
              await updateMock(mock.id, { visibility: next } as any);
              invalidate();
              toast.success(`Visibility set to ${next}`);
            }}
          >
            Toggle public/private
          </DropdownItem>
          <DropdownSep />
          <DropdownItem
            icon={Trash2}
            destructive
            onClick={() => {
              // Anchor the RowConfirm popover at the row's bounding box so
              // the confirmation appears RIGHT WHERE the user clicked.
              setConfirmAnchor(rowRef.current);
            }}
          >
            Delete
          </DropdownItem>
        </Dropdown>
      </div>
      {confirmAnchor && (
        <RowConfirm
          anchor={confirmAnchor}
          title={`Delete "${mock.name}"?`}
          description="Mock and all its endpoints will be moved to trash. You can restore within 30 days."
          onCancel={() => setConfirmAnchor(null)}
          onConfirm={async () => {
            await deleteMock(mock.id);
            onDeleted();
            toast.success('Mock moved to trash');
            setConfirmAnchor(null);
          }}
        />
      )}
      {expanded && (
        <div>
          {endpoints.length === 0 && (
            <div className="px-3 py-1.5 pl-9 text-[10px] italic text-text-muted">
              No endpoints yet — open the mock to add one.
            </div>
          )}
          {endpoints.map((ep) => (
            <EndpointRow key={ep.id} mockId={mock.id} ep={ep} />
          ))}
        </div>
      )}
    </div>
  );
};

const EndpointRow = ({ mockId, ep }: { mockId: string; ep: MockEndpoint }) => {
  const nav = useNavigate();
  const status = ep.responses?.[0]?.statusCode ?? 200;
  return (
    <Tooltip content={ep.pathPattern} side="right">
      <button
        onClick={() => nav(`/projects/mocks/${mockId}?ep=${ep.id}`)}
        data-testid={`mock-endpoint-${ep.id}`}
        className={cn(
          'group flex w-full items-center gap-2 rounded px-2 py-1 pl-9 text-left text-xs hover:bg-hover',
          !ep.enabled && 'opacity-60',
        )}
      >
        <span className={cn('w-12 shrink-0 font-mono text-[10px] font-bold', MC[ep.method])}>{ep.method}</span>
        <span className="min-w-0 flex-1 truncate text-text-secondary">{ep.pathPattern}</span>
        <span className="shrink-0 font-mono text-[10px] text-text-muted">{status}</span>
      </button>
    </Tooltip>
  );
};
