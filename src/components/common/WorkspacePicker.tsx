/**
 * WorkspacePicker — compact dropdown in the header showing the current
 * workspace and allowing one-click switching. Loads workspaces via React
 * Query; persists selection in the workspace store.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, FolderKanban, Plus } from 'lucide-react';
import { Dropdown, DropdownItem, DropdownSep, DropdownLabel } from '@/components/ui/DropdownMenu';
import { listWorkspaces } from '@/services/workspace.service';
import { useWorkspaceStore } from '@/stores/workspace.store';

export const WorkspacePicker = () => {
  const nav = useNavigate();
  const current = useWorkspaceStore((s) => s.current);
  const setCurrent = useWorkspaceStore((s) => s.setCurrent);
  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  });

  // Auto-select the first workspace if nothing selected and list is loaded.
  useEffect(() => {
    if (!current && workspaces.length > 0) setCurrent(workspaces[0]);
  }, [current, workspaces]); // eslint-disable-line

  return (
    <Dropdown
      trigger={
        <button
          data-testid="header-workspace-picker"
          className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-probestack-bg px-2 text-xs text-text-primary hover:border-primary/40"
        >
          <FolderKanban className="h-3.5 w-3.5 text-primary" />
          <span className="max-w-[140px] truncate font-medium">
            {current?.name ?? 'Select workspace'}
          </span>
          <ChevronDown className="h-3 w-3 text-text-muted" />
        </button>
      }
    >
      <DropdownLabel>Workspaces</DropdownLabel>
      {workspaces.length === 0 && (
        <div className="px-3 py-1.5 text-[11px] text-text-muted">No workspaces yet</div>
      )}
      {workspaces.map((w) => (
        <DropdownItem
          key={w.id}
          icon={FolderKanban}
          onClick={() => setCurrent(w)}
        >
          <span className="flex-1 truncate">{w.name}</span>
          {current?.id === w.id && <span className="ml-2 text-primary">✓</span>}
        </DropdownItem>
      ))}
      <DropdownSep />
      <DropdownItem icon={Plus} onClick={() => nav('/project')}>
        New workspace
      </DropdownItem>
      <DropdownItem icon={FolderKanban} onClick={() => nav('/projects/manage')}>
        Manage workspaces
      </DropdownItem>
    </Dropdown>
  );
};
