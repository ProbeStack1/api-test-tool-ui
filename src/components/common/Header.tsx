/**
 * Header — uses library's generic Header component with custom slots.
 * 
 * - Left slot: Logo (with ProbeStack/ForgeFuzz branding)
 * - Center slot: HeaderTabs (when mode === 'top') or Search button (when mode === 'left')
 * - Right slot: Theme toggle, Settings, Notification bell, ProfileMenu
 * 
 * Command palette (⌘K) and theme toggle (⌘⇧L) shortcuts work globally.
 */
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { ProfileMenu } from './ProfileMenu';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { HeaderTabs } from './HeaderTabs';
import { CommandPalette } from './CommandPalette';
import { useLayout } from '@/stores/layout.store';
import { useSettings } from '@/stores/settings.store';
import '@probestack/probestack-ui-library/style.css'; 

// ✅ Import library Header
import { Header as LibraryHeader } from '@probestack/probestack-ui-library';

export const Header = () => {
  const mode = useLayout((s) => s.sideRailMode);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);

  // ─── Keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (isCmdOrCtrl && key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

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

  // ─── Slots ────────────────────────────────────────────────────────

  // 1️⃣ Left slot – Logo is now data-driven (logoImageSrc/productName/
  // logoHref passed directly on <LibraryHeader> below). `Logo` (mark
  // variant) turned out to just be `<img src="/justlogo.png">` under a
  // wrapper, so the simple prop path fits — same pattern used in
  // probestack-forgegateway and forgesphere-api-lifecycle.

  // 2️⃣ Center slot – Search or HeaderTabs
  const centerSlot =
    mode === 'top' ? (
      <HeaderTabs />
    ) : (
      <SearchButton onOpen={() => setPaletteOpen(true)} />
    );

  // 3️⃣ Right slot – Actions
  const rightSlot = (
    <>
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

      {/* <Tooltip content="Toggle theme" shortcut="⌘⇧L">
        <span className="inline-flex">
          <ThemeToggle />
        </span>
      </Tooltip> */}

      {/* Settings moved into the ProfileMenu dropdown as a list item —
          right slot only carries the bell and the profile dropdown now. */}
      <NotificationBell />
      <ProfileMenu />
    </>
  );

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <>
    {/* `data-theme` must be applied here explicitly — the library's dark
        palette is declared directly on `.probestack-ui-library` (not just
        `[data-theme="dark"]`), so without this the header always renders
        dark regardless of the app's actual theme. Same pattern already
        used correctly in LandingNavbar.tsx. */}
    <div data-theme={theme}>
      <LibraryHeader
        logoImageSrc="/justlogo.png"
        productName="ForgeFuzz"
        logoHref="/"
        centerSlot={centerSlot}
        rightSlot={rightSlot}
        className="border-b border-border h-17"
        theme={theme}
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
    </>
  );
};

// ─── SearchButton ──────────────────────────────────────────────────
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