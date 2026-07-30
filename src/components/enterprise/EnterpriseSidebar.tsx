import { NavLink } from 'react-router-dom';
import { Building2, FolderOpen, Layers } from 'lucide-react';
import { cn } from '@/utils/cn';

export const EnterpriseSidebar = () => {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">ProbeStack Enterprise</h2>
        <p className="text-[11px] text-text-muted">Business units, projects & applications</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        <NavLink
          to="/onboarding/bu"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-primary-muted text-primary'
                : 'text-text-secondary hover:bg-hover hover:text-text-primary'
            )
          }
        >
          <Building2 className="h-4 w-4 shrink-0" />
          Business Units
        </NavLink>
        <NavLink
          to="/onboarding/project"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-primary-muted text-primary'
                : 'text-text-secondary hover:bg-hover hover:text-text-primary'
            )
          }
        >
          <FolderOpen className="h-4 w-4 shrink-0" />
          Projects
        </NavLink>
        <NavLink
          to="/onboarding/application"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-primary-muted text-primary'
                : 'text-text-secondary hover:bg-hover hover:text-text-primary'
            )
          }
        >
          <Layers className="h-4 w-4 shrink-0" />
          Applications
        </NavLink>
      </nav>
      {/* <div className="border-t border-border p-3 text-[10px] text-text-muted">
        ProbeStack Enterprise
      </div> */}
    </aside>
  );
};