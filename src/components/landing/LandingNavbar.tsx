/**
 * LandingNavbar — auto-hide on scroll down, shows on scroll up.
 * Uses the library's generic Header component with custom slots.
 * Theme toggle is now inside ProfileDropdown (works with store sync).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import '@probestack/probestack-ui-library/style.css'; 
import {
  LogOut,
  Rocket,
  Menu,
  X,
  LogIn,
  ChevronDown,
  Zap,
  Activity,
  Bot,
  Server,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  FolderOpen,
  Settings,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { useAuth } from "@/stores/auth.store";
import { useSettings } from "@/stores/settings.store";

// ✅ Import library components
import { Header as LibraryHeader } from "@probestack/probestack-ui-library";
import { ProfileDropdown } from "@probestack/probestack-ui-library";
import type { ProfileDropdownItem } from "@probestack/probestack-ui-library";

/* ---------- Solutions registry (unchanged) ---------- */
type Solution = {
  id: string;
  label: string;
  to: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const SOLUTIONS: Solution[] = [
  {
    id: "request",
    label: "Collection & Request Builder",
    to: "/capabilities/request-builder",
    desc: "Create collections, test & debug API requests with variables.",
    icon: Zap,
    accent: "text-sky-400",
  },
  {
    id: "load",
    label: "Load & Functional Testing",
    to: "/capabilities/load-functional-testing",
    desc: "Simulate traffic, validate performance & correctness.",
    icon: Activity,
    accent: "text-emerald-400",
  },
  {
    id: "ai",
    label: "Agentic AI & LLM Testing",
    to: "/capabilities/ai-llm-testing",
    desc: "Test LLM integrations, prompt injection & agents.",
    icon: Bot,
    accent: "text-fuchsia-400",
  },
  {
    id: "mock",
    label: "Mock Sandbox",
    to: "/capabilities/mock-sandbox",
    desc: "Spin up instant API mocks without infra.",
    icon: Server,
    accent: "text-amber-400",
  },
];

/* ---------- Component ---------- */
export const LandingNavbar = () => {
  const nav = useNavigate();
  const loc = useLocation();
  const isAuthed = useAuth((s) => s.isAuthenticated());
  const user = useAuth((s) => s.user);
  const clear = useAuth((s) => s.clear);
  const email = user?.email ?? null;
  const displayName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || user.email
    : "Guest";

  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);

  const [isVisible, setIsVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const lastScrollY = useRef(0);
  const closeTimer = useRef<number | null>(null);

  const activeSolution = useMemo(
    () => SOLUTIONS.find((s) => loc.pathname.startsWith(s.to)) ?? null,
    [loc.pathname],
  );
  const isSolutionsActive = !!activeSolution;

  // ─── Scroll hide (unchanged) ──────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (y > lastScrollY.current && y > 50) {
        setIsVisible(false);
        setMobileOpen(false);
      } else if (y < lastScrollY.current) setIsVisible(true);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ─── Solutions dropdown handlers ──────────────────────────
  const openSolutions = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setSolutionsOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setSolutionsOpen(false), 140);
  };

  const handleGoToApp = () => {
    window.scrollTo({ top: 0, behavior: "instant" });
    nav(isAuthed ? "/projects" : "/login?mode=signup");
  };
  const handleLogout = async () => {
    await clear();
    nav("/login");
  };

  // ─── Slots ──────────────────────────────────────────────────

  const logoSlot = (
    <Link to="/" data-testid="app-header-logo" className="flex items-center gap-1">
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
  );

  const navLinkCls = (active: boolean) =>
    `px-3 py-1.5 text-[14px] font-medium transition-colors ${
      active ? "text-primary" : ""
    }`;

  const centerSlot = (
    <nav className="hidden md:flex items-center gap-1">
      {/* ... navigation links (unchanged) ... */}
      <NavLink to="/" end className={({ isActive }) => navLinkCls(isActive)}>
        Home
      </NavLink>

      {/* Solutions trigger (unchanged) */}
      <div
        className="relative"
        onMouseEnter={openSolutions}
        onMouseLeave={scheduleClose}
      >
        <button
          type="button"
          onClick={() => setSolutionsOpen((o) => !o)}
          className={`inline-flex items-center gap-1 px-3 py-1.5 text-[14px] font-medium transition-colors ${
            isSolutionsActive || solutionsOpen
              ? "text-primary"
              : "hover:text-primary"
          }`}
          aria-expanded={solutionsOpen}
        >
          Capabilities
          {isSolutionsActive && (
            <motion.span
              layoutId="solutions-dot"
              className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary"
            />
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${solutionsOpen ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {solutionsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="absolute left-1/2 top-full z-50 mt-2 w-[520px] -translate-x-1/2"
              onMouseEnter={openSolutions}
              onMouseLeave={scheduleClose}
            >
              {/* ... solutions dropdown content (unchanged) ... */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <NavLink to="/features" className={({ isActive }) => navLinkCls(isActive)}>
        Features
      </NavLink>
      <NavLink to="/how-it-works" className={({ isActive }) => navLinkCls(isActive)}>
        How It Works
      </NavLink>
      <NavLink to="/pricing" className={({ isActive }) => navLinkCls(isActive)}>
        Pricing
      </NavLink>
      <NavLink to="/api-hub" className={({ isActive }) => navLinkCls(isActive)}>
        Marketplace
      </NavLink>
      <NavLink to="/blog" className={({ isActive }) => navLinkCls(isActive)}>
        Blog
      </NavLink>
    </nav>
  );

  // ─── Right slot with ProfileDropdown/Sign-in + hamburger ──────────
  // Order matters: the auth control renders BEFORE the hamburger so it
  // sits to its left. On mobile, ProfileDropdown's own default trigger
  // already collapses to avatar-only (`hidden lg:block` on the name/email
  // text, baked into the library component) — no extra work needed there.
  const rightSlot = (
    <div className="flex items-center gap-2">
      {!isAuthed ? (
        <Link
          to="/login"
          className="landing-signin-link items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-semibold"
        >
          <LogIn className="h-4 w-4" /> Sign in
        </Link>
      ) : (
        // ✅ Removed key={theme} so dropdown stays open on theme change
        <ProfileDropdown
          user={{
            name: displayName,
            email: email || "",
            accountType: "starter",
          }}
          items={[
            {
              label: "Dashboard",
              icon: <LayoutDashboard size={16} />,
              onClick: () => nav("/projects/dashboard"),
            },
            {
              label: "Open Collections",
              icon: <FolderOpen size={16} />,
              onClick: () => nav("/projects/collections"),
            },
            {
              label: "Manage Projects",
              icon: <Settings size={16} />,
              onClick: () => nav("/projects/manage"),
            },
          ]}
          theme={theme}
          onThemeChange={setTheme}
          onSignOut={handleLogout}
          onProfileClick={() => nav("/projects/profile")}
        />
      )}

      {/* Hamburger – hidden on large screens via custom CSS class, inline styles for theme colors */}
      <button
        className="hamburger-large-hide h-9 w-9 items-center justify-center rounded-md border"
        style={{
          backgroundColor: theme === 'dark' ? '#1a1a1c' : '#ffffff',
          borderColor: theme === 'dark' ? '#333338' : '#e5e7eb',
          color: theme === 'dark' ? '#f9fafb' : '#1f2937',
        }}
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────
  return (
    <div
      className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 probestack-ui-library ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      } bg-probestack-bg/70 backdrop-blur border-b border-border`}
      data-theme={theme}
    > 
      <LibraryHeader
        logo={logoSlot}
        centerSlot={centerSlot}
        rightSlot={rightSlot}
        className="border-none bg-transparent px-6 sm:px-10 lg:px-10 h-17"
        theme={theme}
      />

      {/* Mobile drawer — expands top-to-bottom below the bar, all nav
          links stacked, Sign in at the bottom when logged out. When
          logged in, the avatar (left of the hamburger, in rightSlot
          above) already gives dropdown access, so the drawer here is
          just navigation. */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border bg-background"
          >
            <nav className="flex flex-col gap-1 px-6 py-4">
              <div className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Solutions
              </div>
              {SOLUTIONS.map((s) => (
                <NavLink
                  key={s.id}
                  to={s.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-2 py-2 text-sm ${
                      isActive ? "text-primary" : "text-text-secondary"
                    }`
                  }
                >
                  <s.icon className={`h-4 w-4 ${s.accent}`} />
                  {s.label}
                </NavLink>
              ))}

              <div className="my-2 border-t border-border" />

              <NavLink
                to="/features"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => navLinkCls(isActive) + " px-2 py-2"}
              >
                Features
              </NavLink>
              <NavLink
                to="/how-it-works"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => navLinkCls(isActive) + " px-2 py-2"}
              >
                How It Works
              </NavLink>
              <NavLink
                to="/pricing"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => navLinkCls(isActive) + " px-2 py-2"}
              >
                Pricing
              </NavLink>
              <NavLink
                to="/api-hub"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => navLinkCls(isActive) + " px-2 py-2"}
              >
                Marketplace
              </NavLink>
              <NavLink
                to="/blog"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => navLinkCls(isActive) + " px-2 py-2"}
              >
                Blog
              </NavLink>

              {!isAuthed && (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold"
                >
                  <LogIn className="h-4 w-4" /> Sign in
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingNavbar;