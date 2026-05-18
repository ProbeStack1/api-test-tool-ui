/**
 * LandingNavbar — auto-hide on scroll down, shows on scroll up.
 * Re-aligned to `LANDING_PAGE_SPEC.md`:
 *   Logo · [Product · Solutions · Pricing · Docs · Changelog] · ThemeToggle · Profile · [Get Started →]
 *
 * The middle group collapses to a hamburger on screens < md.
 * Theme tokens (background, primary, text-*) untouched — only structure
 * and copy refreshed.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Rocket, User, Menu, X } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSep } from '@/components/ui/DropdownMenu';

type NavItem = { label: string; to: string; isHash?: boolean };

const NAV: NavItem[] = [
  { label: 'Product',   to: '/#pillars', isHash: true },
  { label: 'Solutions', to: '/solutions' },
  { label: 'Pricing',   to: '/pricing' },
  { label: 'Docs',      to: '/api-hub' },
  // { label: 'Changelog', to: '/changelog' },
];

export const LandingNavbar = () => {
  const nav = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsVisible(false);
        setMobileOpen(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGoToApp = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    nav('/login');
  };

  return (
    <nav
      data-testid="landing-navbar"
      className={`fixed inset-x-0 top-0 z-40 backdrop-blur-md border-b border-border/40 bg-background/80 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="flex h-14 items-center justify-between px-6 sm:px-10 lg:px-16 xl:px-24">
        {/* Logo - left */}
        <Link to="/" data-testid="auth-logo-link" className="inline-flex items-center gap-2">
            <Logo variant="mark" className="h-12 w-10" />
            <div>
              <div className="text-[0.75rem] uppercase tracking-[0.18em] text-text-secondary">
                probestack
              </div>
              <div className="bg-gradient-to-r from-[#ff5b1f] via-[#ffb400] to-[#1fbf9a] bg-clip-text text-2xl font-bold leading-tight text-transparent">
                ForgeFuzz
              </div>
            </div>
          </Link>

        {/* Center nav (md+) */}
        <div className="hidden md:flex items-center gap-1">
          {NAV.map((item) =>
            item.isHash ? (
              <a
                key={item.label}
                href={item.to}
                data-testid={`nav-link-${item.label.toLowerCase()}`}
                className="px-3 py-1.5 text-[13px] font-medium text-text-secondary hover:text-primary transition-colors"
              >
                {item.label}
              </a>
            ) : (
              <NavLink
                key={item.label}
                to={item.to}
                data-testid={`nav-link-${item.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    isActive ? 'text-primary' : 'text-text-secondary hover:text-primary'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ),
          )}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1.5">
          <button
            data-testid="nav-mobile-toggle"
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary hover:text-primary"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <ThemeToggle />
          <button
            data-testid="landing-goto-app"
            onClick={handleGoToApp}
            className="hidden sm:inline-flex group h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-semibold text-white transition-all hover:opacity-90"
          >
            <Rocket className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
            Get Started →
          </button>
          <Dropdown
            align="end"
            trigger={
              <button
                data-testid="landing-navbar-profile"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#1fbf9a] text-[11px] font-bold text-white transition-transform hover:scale-105"
                aria-label="Profile"
              >
                <User className="h-4 w-4" />
              </button>
            }
          >
            <DropdownLabel>My account</DropdownLabel>
            <DropdownItem icon={User} onClick={() => nav('/projects/profile')}>
              Profile
            </DropdownItem>
            <DropdownSep />
            <DropdownItem icon={LogOut} destructive onClick={() => nav('/login')}>
              Logout
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          data-testid="nav-mobile-drawer"
          className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-md"
        >
          <div className="px-4 py-3 flex flex-col gap-1">
            {NAV.map((item) =>
              item.isHash ? (
                <a
                  key={item.label}
                  href={item.to}
                  className="px-3 py-2 rounded-md text-sm text-text-secondary hover:text-primary hover:bg-surface/60"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  to={item.to}
                  className="px-3 py-2 rounded-md text-sm text-text-secondary hover:text-primary hover:bg-surface/60"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ),
            )}
            <button
              onClick={handleGoToApp}
              className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white"
            >
              <Rocket className="h-3.5 w-3.5" /> Get Started →
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
    </nav>
  );
};
