/**
 * Header — brand + adaptive center (search in 'left' mode, tabs in 'top' mode).
 * Search button + Cmd/Ctrl+K shortcut open the CommandPalette (jump-to nav).
 * Cmd/Ctrl+Shift+L toggles theme (no browser conflict).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { Logo } from './Logo';
import { ProfileMenu } from './ProfileMenu';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { HeaderTabs } from './HeaderTabs';
import { CommandPalette } from './CommandPalette';
import { useLayout } from '@/stores/layout.store';
import { useSettings } from '@/stores/settings.store';

export const Header = () => {
  const mode = useLayout((s) => s.sideRailMode);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Cmd/Ctrl+K -> command palette
      if (isCmdOrCtrl && key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      // Cmd/Ctrl+Shift+L -> toggle theme (conflict-free)
      if (isCmdOrCtrl && e.shiftKey && key === 'l') {
        e.preventDefault();
        setTheme(theme === 'dark' ? 'light' : 'dark');
        return;
      }

      if (key === 'escape' && paletteOpen) {
        setPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paletteOpen, theme, setTheme]);

  return (
    <header
      data-testid="app-header"
      className="grid h-17 grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-surface px-3"
    >
      <Link to="/" data-testid="app-header-logo" className="flex items-center w-40 gap-1">
        <Logo variant="mark" className="h-12 w-10" />
        <div className="text-left">
          <div className="text-[0.8rem] text-text-secondary tracking-normal leading-tight mb-[-2px]">
            ProbeStack
          </div>
          <div className="font-bold text-2xl tracking-normal leading-tight gradient-text">
            ForgeFuzz
          </div>
        </div>
      </Link>

      {mode === 'top' ? <HeaderTabs /> : <SearchButton onOpen={() => setPaletteOpen(true)} />}

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

        <Tooltip content="Toggle theme" shortcut="⌘⇧L">
          <span className="inline-flex">
            <ThemeToggle />
          </span>
        </Tooltip>

        <Tooltip content="Settings" shortcut="⌘,">
          <Button asChild variant="ghost" size="icon" data-testid="header-settings-btn">
            <Link to="/projects/settings" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </Tooltip>
        <div className="mx-1 h-6 w-px bg-border" />
        <NotificationBell />
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