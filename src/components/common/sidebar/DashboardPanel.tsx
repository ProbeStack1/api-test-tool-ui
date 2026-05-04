import { LayoutDashboard, TrendingUp, Bell, FileText, Bug, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SidebarShell } from './SidebarShell';

const LINKS = [
  { to: '/projects/dashboard', icon: TrendingUp, label: 'Overview' },
  { to: '/projects/monitors', icon: Bell, label: 'Monitors' },
  { to: '/projects/api-docs', icon: FileText, label: 'API Docs' },
  { to: '/projects/bug-tracker', icon: Bug, label: 'Bug Tracker' },
  { to: '/projects/manage', icon: Users, label: 'Project settings' },
];

export const DashboardPanel = () => (
  <SidebarShell icon={LayoutDashboard} title="Dashboard" testId="dashboard-panel">
    <nav className="flex flex-col gap-0.5 p-1">
      {LINKS.map(({ to, icon: Icon, label }) => (
        <Link
          key={to}
          to={to}
          data-testid={`dashboard-link-${label.toLowerCase().replace(/\s+/g, '-')}`}
          className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-text-primary transition-colors hover:bg-hover"
        >
          <Icon className="h-3.5 w-3.5 text-primary" /> {label}
        </Link>
      ))}
    </nav>
  </SidebarShell>
);
