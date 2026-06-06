/**
 * LandingNavbar — auto-hide on scroll down, shows on scroll up.
 *
 * Auth gating (strict):
 *   • Logged OUT  → "Sign in" + "Get started" buttons. NO profile icon.
 *   • Logged IN   → Profile dropdown with email · Profile · Logout.
 *                   "Get started" → /projects (not /login).
 *
 * Solutions: large animated mega-grid dropdown with smooth selected
 * indicator that follows the active solution. The "Solutions" nav
 * trigger also reflects active-state when on any sub-route.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LogOut,
  Rocket,
  User,
  Menu,
  X,
  LogIn,
  ChevronDown,
  Zap,
  Activity,
  Bot,
  Server,
  ShieldCheck,
  GitCompare,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSep,
} from "@/components/ui/DropdownMenu";
import { useAuth } from "@/stores/auth.store";

/* ---------- Solutions registry ---------- */

type Solution = {
  id: string;
  label: string;
  to: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string; // tailwind text color used for icon glow
};

const SOLUTIONS: Solution[] = [
  {
    id: "request",
    label: "Request Builder",
    to: "/solutions/request-builder",
    desc: "Create, test & debug API requests with variables.",
    icon: Zap,
    accent: "text-sky-400",
  },
  {
    id: "load",
    label: "Load & Functional Testing",
    to: "/solutions/load-functional-testing",
    desc: "Simulate traffic, validate performance & correctness.",
    icon: Activity,
    accent: "text-emerald-400",
  },
  {
    id: "ai",
    label: "AI Agents & LLM Testing",
    to: "/solutions/ai-llm-testing",
    desc: "Test LLM integrations, prompt injection & agents.",
    icon: Bot,
    accent: "text-fuchsia-400",
  },
  {
    id: "mock",
    label: "Mock Sandbox",
    to: "/solutions/mock-sandbox",
    desc: "Spin up instant API mocks without infra.",
    icon: Server,
    accent: "text-amber-400",
  },
  // { id: 'fuzz',     label: 'API Fuzzing & Security',   to: '/solutions/api-fuzzing',      desc: 'OWASP API:2023 probes with severity scoring.',      icon: ShieldCheck, accent: 'text-rose-400' },
  // { id: 'contract', label: 'Contract Verification',    to: '/solutions/contract-testing', desc: 'Catch breaking schema changes before they ship.',   icon: GitCompare,  accent: 'text-violet-400' },
];

/* ---------- Animated icon wrapper (lordicon-style) ---------- */

const AnimatedIcon = ({
  Icon,
  active,
  hovered,
  accent,
}: {
  Icon: Solution["icon"];
  active: boolean;
  hovered: boolean;
  accent: string;
}) => {
  const play = active || hovered;
  return (
    <motion.span
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-surface/60 ${accent}`}
      animate={
        play
          ? { rotate: [0, -8, 8, -4, 4, 0], scale: [1, 1.08, 1] }
          : { rotate: 0, scale: 1 }
      }
      transition={{ duration: 0.9, ease: "easeInOut" }}
    >
      {play && (
        <motion.span
          className="absolute inset-0 rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.35, 0], scale: [0.8, 1.25, 1.4] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
          style={{
            background:
              "radial-gradient(closest-side, currentColor, transparent 70%)",
          }}
        />
      )}
      <Icon className="relative h-5 w-5" />
    </motion.span>
  );
};

/* ---------- Component ---------- */

export const LandingNavbar = () => {
  const nav = useNavigate();
  const loc = useLocation();
  const isAuthed = useAuth((s) => s.isAuthenticated());
  const user = useAuth((s) => s.user);
  const clear = useAuth((s) => s.clear);
  const email = user?.email ?? null;

  const [isVisible, setIsVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const lastScrollY = useRef(0);
  const closeTimer = useRef<number | null>(null);

  // active solution by route match
  const activeSolution = useMemo(
    () => SOLUTIONS.find((s) => loc.pathname.startsWith(s.to)) ?? null,
    [loc.pathname],
  );
  const isSolutionsActive = !!activeSolution;

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
    nav(isAuthed ? "/projects" : "/login");
  };
  const handleLogout = () => {
    clear();
    nav("/login");
  };
  const initial = email ? email.charAt(0).toUpperCase() : "U";

  const navLinkCls = (active: boolean) =>
    `px-3 py-1.5 text-[14px] font-medium transition-colors ${
      active ? "text-primary" : "hover:text-primary"
    }`;

  // Pointer for the selected indicator inside the grid
  const selectedId = hoveredId ?? activeSolution?.id ?? null;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 bg-probestack-bg/70 backdrop-blur border-b border-border`}
    >
      <div className="flex h-17 items-center justify-between px-6 sm:px-10 lg:px-16 xl:px-24">
        <Link
          to="/"
          data-testid="app-header-logo"
          className="flex items-center gap-1"
        >
          <Logo variant="mark" className="h-12 w-10" />
          <div className="text-left">
            <div className="text-[0.8rem] text-text-secondary tracking-normal leading-tight mb-[-2px]">
              ProbeStack
            </div>
            <div className="font-bold  text-2xl tracking-normal leading-tight gradient-text">
              ForgeFuzz
            </div>
          </div>
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1 ">
          <NavLink
            to="/"
            end
            className={({ isActive }) => navLinkCls(isActive)}
          >
            Home
          </NavLink>

          {/* Solutions trigger */}
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
              Solutions
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
                  <div className="absolute -top-2 left-0 right-0 h-2" />
                  <div className="relative overflow-hidden rounded-md bg-elevated border border-border bg-background/95 shadow-xl backdrop-blur-xl">
                    {/* <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" /> */}
                    <div className="grid grid-cols-2 gap-1 p-2">
                      {SOLUTIONS.map((s) => {
                        const isActive = activeSolution?.id === s.id;
                        const isHovered = hoveredId === s.id;
                        const isSelected = selectedId === s.id;
                        return (
                          <Link
                            key={s.id}
                            to={s.to}
                            onClick={() => setSolutionsOpen(false)}
                            onMouseEnter={() => setHoveredId(s.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            className="group relative flex items-start gap-2 rounded-lg px-2 py-2"
                          >
                            {isSelected && (
                              <motion.span
                                layoutId="solution-selected"
                                className="absolute inset-0 rounded-lg border border-primary/40 bg-primary/[0.08]"
                                transition={{
                                  type: "spring",
                                  stiffness: 420,
                                  damping: 34,
                                }}
                              />
                            )}
                            <motion.span
                              className={`relative inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-border/60 bg-surface/60 ${s.accent}`}
                              animate={
                                isActive || isHovered
                                  ? {
                                      rotate: [0, -8, 8, -4, 4, 0],
                                      scale: [1, 1.08, 1],
                                    }
                                  : { rotate: 0, scale: 1 }
                              }
                              transition={{ duration: 0.8, ease: "easeInOut" }}
                            >
                              <s.icon className="h-4 w-4" />
                            </motion.span>
                            <div className="relative min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`truncate text-[12.5px] font-semibold ${isActive ? "text-primary" : ""}`}
                                >
                                  {s.label}
                                </span>
                                {isActive && (
                                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-primary">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-text-secondary">
                                {s.desc}
                              </p>
                            </div>
                          </Link>
                        );
                      })}

                      <Link
                        to="/solutions"
                        onClick={() => setSolutionsOpen(false)}
                        onMouseEnter={() => setHoveredId("__all")}
                        onMouseLeave={() => setHoveredId(null)}
                        className="group relative col-span-2 mt-1 flex items-center justify-center gap-2 rounded-lg border-t border-border/60 px-2 py-2"
                      >
                        {selectedId === "__all" && (
                          <motion.span
                            layoutId="solution-selected"
                            className="absolute inset-0 rounded-lg border border-primary/40 bg-primary/[0.08]"
                            transition={{
                              type: "spring",
                              stiffness: 420,
                              damping: 34,
                            }}
                          />
                        )}
                        <motion.span
                          className="relative inline-flex h-6 w-6 items-center justify-center rounded-md text-primary"
                          animate={
                            hoveredId === "__all"
                              ? {
                                  rotate: [0, -8, 8, -4, 4, 0],
                                  scale: [1, 1.08, 1],
                                }
                              : { rotate: 0, scale: 1 }
                          }
                          transition={{ duration: 0.8, ease: "easeInOut" }}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </motion.span>
                        <span className="relative text-[12.5px] font-semibold text-primary">
                          View all solutions
                        </span>
                        <ArrowRight className="relative h-3.5 w-3.5 text-primary transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <NavLink
            to="/features"
            className={({ isActive }) => navLinkCls(isActive)}
          >
            Features
          </NavLink>
          <NavLink
            to="/how-it-works"
            className={({ isActive }) => navLinkCls(isActive)}
          >
            How It Works
          </NavLink>
          <NavLink
            to="/pricing"
            className={({ isActive }) => navLinkCls(isActive)}
          >
            Pricing
          </NavLink>
          <NavLink
            to="/api-hub"
            className={({ isActive }) => navLinkCls(isActive)}
          >
            Marketplace
          </NavLink>
          <NavLink
            to="/blog"
            className={({ isActive }) => navLinkCls(isActive)}
          >
            Blog
          </NavLink>
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <button
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
          <ThemeToggle />

          {!isAuthed ? (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-semibold"
              >
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
              <button
                onClick={handleGoToApp}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              >
                <Rocket className="h-4 w-4" /> Get started →
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleGoToApp}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              >
                <Rocket className="h-4 w-4" /> Open app →
              </button>
              <Dropdown
                trigger={
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold">
                    {initial}
                  </span>
                }
              >
                <DropdownLabel>{email ?? "Signed in"}</DropdownLabel>
                <DropdownItem onClick={() => nav("/projects/dashboard")}>
                  Dashboard
                </DropdownItem>
                <DropdownItem onClick={() => nav("/projects/collections")}>
                  Open Collections
                </DropdownItem>
                <DropdownItem onClick={() => nav("/projects/manage")}>
                  Manage Projects
                </DropdownItem>
                <DropdownSep />
                <DropdownItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownItem>
              </Dropdown>
            </>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden border-t border-border bg-background"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="px-2 py-2 text-sm"
              >
                Home
              </Link>

              <div className="mt-1 rounded-lg border border-border bg-surface/40 p-2">
                <div
                  className={`px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] ${isSolutionsActive ? "text-primary" : "text-text-secondary"}`}
                >
                  Solutions {isSolutionsActive && "•"}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {SOLUTIONS.map((s) => {
                    const Icon = s.icon;
                    const isActive = activeSolution?.id === s.id;
                    return (
                      <Link
                        key={s.id}
                        to={s.to}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2 rounded-md px-2 py-2 text-[12.5px] ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-text-primary hover:bg-surface"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${s.accent}`} />
                        <span className="truncate">{s.label}</span>
                      </Link>
                    );
                  })}
                </div>
                <Link
                  to="/solutions"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 flex items-center justify-center gap-1 rounded-md bg-primary/10 px-2 py-1.5 text-[12px] font-semibold text-primary"
                >
                  View all solutions <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <Link
                to="/features"
                onClick={() => setMobileOpen(false)}
                className="px-2 py-2 text-sm"
              >
                Features
              </Link>
              <Link
                to="/how-it-works"
                onClick={() => setMobileOpen(false)}
                className="px-2 py-2 text-sm"
              >
                How It Works
              </Link>
              <Link
                to="/pricing"
                onClick={() => setMobileOpen(false)}
                className="px-2 py-2 text-sm"
              >
                Pricing
              </Link>
              <Link
                to="/marketplace"
                onClick={() => setMobileOpen(false)}
                className="px-2 py-2 text-sm"
              >
                Marketplace
              </Link>
              <Link
                to="/blog"
                onClick={() => setMobileOpen(false)}
                className="px-2 py-2 text-sm"
              >
                Blog
              </Link>

              {!isAuthed ? (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold"
                  >
                    <LogIn className="h-4 w-4" /> Sign in
                  </Link>
                  <button
                    onClick={handleGoToApp}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white"
                  >
                    <Rocket className="h-4 w-4" /> Get started →
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleGoToApp}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white"
                  >
                    <Rocket className="h-4 w-4" /> Open app →
                  </button>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default LandingNavbar;
