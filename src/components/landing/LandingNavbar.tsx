/**
 * LandingNavbar — auto-hide navbar on scroll down, shows on scroll up.
 * Logo left, right items right, full-width, no extra gaps.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Rocket, User } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSep } from '@/components/ui/DropdownMenu';

export const LandingNavbar = () => {
  const nav = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        // Scrolling down & past 50px -> hide navbar
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        // Scrolling up -> show navbar
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGoToApp = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    nav('/projects/collections');
  };

  return (
    <nav
      data-testid="landing-navbar"
      className={`fixed inset-x-0 top-0 z-40 backdrop-blur-md border-b border-border/40 bg-background/80 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Logo - left */}
        <Link
          to="/"
          data-testid="app-header-logo"
          className="flex items-center gap-0.5"
        >
          <Logo variant="mark" className="h-9 w-8" />
          <div className="text-left">
            <div className="text-xs text-muted-foreground font-semibold tracking-tight leading-tight mb-[-8px]">
              probestack
            </div>
            <div className="font-semibold text-xl tracking-tight leading-tight gradient-text">
              ForgeQ
            </div>
          </div>
        </Link>

        {/* Right side items */}
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <button
            data-testid="landing-goto-app"
            onClick={handleGoToApp}
            className="group flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[12px] font-medium text-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
          >
            <Rocket className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
            Go to ProbeStack
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

      {/* Gradient border bottom */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
    </nav>
  );
};