/**
 * Header — brand + adaptive center (search in 'left' mode, tabs in 'top' mode).
 * Search button + Cmd/Ctrl+K shortcut open the CommandPalette (jump-to nav).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { Logo } from './Logo';
import { ProfileMenu } from './ProfileMenu';
import { NotificationsBell } from './NotificationsBell';
import { ThemeToggle } from './ThemeToggle';
import { HeaderTabs } from './HeaderTabs';
import { CommandPalette } from './CommandPalette';
import { useLayout } from '@/stores/layout.store';

export const Header = () => {
  const mode = useLayout((s) => s.sideRailMode);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Cmd/Ctrl+K opens the palette; also supports '/' when not typing in an input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isCmdK) { e.preventDefault(); setPaletteOpen(true); return; }
      if (e.key === 'Escape' && paletteOpen) { setPaletteOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen]);

  return (
    <header
      data-testid="app-header"
      className="grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-surface px-3"
    >
      {/* Left — brand */}
      <Link
              to="/"
              data-testid="app-header-logo"
              className="flex items-center gap-1"
            >
              <Logo variant="mark" className="h-12 w-10" />
              <div className="text-left">
                <div className="text-[0.8rem] text-text-secondary tracking-normal leading-tight mb-[-2px]">
                  probestack
                </div>
                <div className="font-bold  text-2xl tracking-normal leading-tight gradient-text">
                  ForgeFuzz
                </div>
              </div>
            </Link>

      {/* Center — depends on mode */}
      {mode === 'top' ? <HeaderTabs /> : <SearchButton onOpen={() => setPaletteOpen(true)} />}

      {/* Right — actions */}
      <div className="flex items-center justify-end gap-1">
        {mode === 'top' && (
          <Tooltip content="Search" shortcut="⌘K">
            <Button
              variant="ghost"
              size="icon"
              data-testid="header-search-icon"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>
          </Tooltip>
        )}
        <ThemeToggle />
        <NotificationsBell />
        <Tooltip content="Settings" shortcut="⌘,">
          <Button asChild variant="ghost" size="icon" data-testid="header-settings-btn">
            <Link to="/projects/settings" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </Tooltip>
        <div className="mx-1 h-6 w-px bg-border" />
        <ProfileMenu />
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
};

const SearchButton = ({ onOpen }: { onOpen: () => void }) => (
  <button
    data-testid="header-search"
    onClick={onOpen}
    className="flex h-8 min-w-[380px] items-center gap-2 rounded-md border border-border bg-probestack-bg px-3 text-sm text-text-secondary transition-colors hover:border-primary/40 hover:text-text-primary"
  >
    <Search className="h-4 w-4" />
    <span>Search or jump to…</span>
    <span className="ml-auto rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">⌘K</span>
  </button>
);
