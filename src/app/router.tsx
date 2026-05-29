/**
 * Router.
 *   /                       → landing (with own navbar, no app chrome)
 *   /home                   → Home Intro (Postman-style sidebar placeholder)
 *   /login, /accept-invitation
 *   /project                → standalone create/manage project page (hidden app chrome)
 *   /projects               → redirect to /projects/collections
 *   /projects/*             → main AppShell with nested feature routes
 *
 * Performance tactic — every feature module is wrapped in `l()` which
 * memoizes a `lazy()` import AND exports a `prefetch()` so the sidebar
 * can warm the chunk on `pointerenter`. Combined with React Query's
 * `keepPreviousData`, page switches feel instant after the first visit.
 */
import { createBrowserRouter, Navigate, RouterProvider, useParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { RouteFallback } from '@/components/skeletons/RouteFallback';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { RequireAuth } from './RequireAuth';

type LazyWithPrefetch<T = any> = React.LazyExoticComponent<React.ComponentType<T>> & {
  prefetch: () => Promise<unknown>;
};

const l = <T extends object>(load: () => Promise<T>, pick: (m: T) => React.ComponentType): LazyWithPrefetch => {
  let promise: Promise<T> | null = null;
  const ensure = () => (promise ??= load());
  const Comp = lazy(() => ensure().then((m) => ({ default: pick(m) }))) as LazyWithPrefetch;
  Comp.prefetch = ensure;
  return Comp;
};

const LandingPage = l(() => import('@/pages/landing'), (m: any) => m.LandingPage);
const SolutionsPage = l(() => import('@/pages/landing'), (m: any) => m.SolutionsPage);
const PricingPage = l(() => import('@/pages/landing'), (m: any) => m.PricingPage);
const HomeIntroPage = l(() => import('@/pages/home-intro'), (m: any) => m.HomeIntroPage);
const HomeShell = l(() => import('@/layouts/HomeShell'), (m: any) => m.HomeShell);
const ApiCatalogPage = l(() => import('@/pages/api-catalog'), (m: any) => m.ApiCatalogPage);
const ReportsPlaceholder = l(() => import('@/pages/home-intro/ReportsPlaceholder'), (m: any) => m.ReportsPlaceholder);
const LoginPage = l(() => import('@/pages/auth'), (m: any) => m.LoginPage);
const AcceptInvitationPage = l(() => import('@/pages/auth'), (m: any) => m.AcceptInvitationPage);
const VerifyEmailPage = l(() => import('@/pages/auth'), (m: any) => m.VerifyEmailPage);
const NotificationsPage = l(() => import('@/pages/notifications/NotificationsPage'), (m: any) => m.NotificationsPage);
const StatusPagePublic = l(() => import('@/pages/testing/monitors/PublicStatusPagePreview'), (m: any) => m.StatusPagePublicView);
const PublicHubPage = l(() => import('@/pages/api-hub'), (m: any) => m.PublicHubPage);
const PublicDocViewerPage = l(() => import('@/pages/api-hub'), (m: any) => m.PublicDocViewerPage);

const AppShell = l(() => import('@/layouts/AppShell'), (m: any) => m.AppShell);
const ProjectStandaloneLayout = l(() => import('@/layouts/ProjectStandaloneLayout'), (m: any) => m.ProjectStandaloneLayout);
const ProjectWorkspacePage = l(() => import('@/pages/project-standalone'), (m: any) => m.ProjectWorkspacePage);

const RequestBuilderPage = l(() => import('@/pages/request-builder'), (m: any) => m.RequestBuilderPage);
const DashboardPage = l(() => import('@/pages/workspace/WorkspaceDashboardPage'), (m: any) => m.WorkspaceDashboardPage);
const ProjectManagementPage = l(() => import('@/pages/workspace'), (m: any) => m.ProjectManagementPage);
const EnvironmentsPage = l(() => import('@/pages/environments'), (m: any) => m.EnvironmentsPage);
const VariablesWorkspacePage = l(() => import('@/pages/variables'), (m: any) => m.VariablesWorkspacePage);
const McpPage = l(() => import('@/pages/integrations'), (m: any) => m.McpStudioPage);
const MocksPage = l(() => import('@/pages/mocks'), (m: any) => m.MocksPage);
const MockDetailPage = l(() => import('@/pages/mocks'), (m: any) => m.MockDetailPage);
const TestingPage = l(() => import('@/pages/testing'), (m: any) => m.TestingPage);
const MonitorsPage = l(() => import('@/pages/monitors'), (m: any) => m.MonitorsPage);
const IntegrationsPage = l(() => import('@/pages/integrations'), (m: any) => m.IntegrationsPage);
const ApiDocsPage = l(() => import('@/pages/api-docs'), (m: any) => m.ApiDocsPage);
const SecurityScanPage = l(() => import('../pages/Security/SecurityScanPage'), (m: any) => m.SecurityScanPage);
const EscalationRulesPage = l(() => import('../pages/Security/EscalationRulesPage'), (m: any) => m.EscalationRulesPage);
const GovernancePage = l(() => import('@/pages/governance/GovernancePage'), (m: any) => m.GovernancePage);
const AuditPage = l(() => import('@/pages/audit'), (m: any) => m.AuditPage);
const TrashPage = l(() => import('@/pages/trash'), (m: any) => m.TrashPage);
const HeartbeatsPage = l(() => import('@/pages/heartbeats'), (m: any) => m.HeartbeatsPage);
const DigestsPage = l(() => import('@/pages/digests'), (m: any) => m.DigestsPage);
const BugTrackerPage = l(() => import('@/pages/bug-tracker'), (m: any) => m.BugTrackerPage);
const AiAssistedPage = l(() => import('@/pages/ai-assistant'), (m: any) => m.AiAssistedPage);
const AiTestingPage  = l(() => import('@/pages/ai-testing'), (m: any) => m.AiTestingPage);
const ProfilePage = l(() => import('@/pages/profile'), (m: any) => m.ProfilePage);
const SupportPage = l(() => import('@/pages/profile'), (m: any) => m.SupportPage);
const SupportTicketPage = l(() => import('@/pages/profile'), (m: any) => m.SupportTicketPage);
const SettingsPage = l(() => import('@/pages/settings'), (m: any) => m.SettingsPage);
const HistoryPage = l(() => import('@/pages/history'), (m: any) => m.HistoryPage);
const SharedEntityPage = l(() => import('@/pages/collab/SharedEntityPage'), (m: any) => m.SharedEntityPage);

/** Public prefetch map keyed by sidebar nav `to` path. Sidebar `<Link>`s
 *  call `prefetchRoute(to)` on `pointerenter` to warm the chunk. */
export const ROUTE_PREFETCH: Record<string, () => Promise<unknown>> = {
  '/projects/collections':  () => RequestBuilderPage.prefetch(),
  '/projects/dashboard':    () => DashboardPage.prefetch(),
  '/projects/manage':       () => ProjectManagementPage.prefetch(),
  '/projects/variables':    () => VariablesWorkspacePage.prefetch(),
  '/projects/mcp':          () => McpPage.prefetch(),
  '/projects/mocks':        () => MocksPage.prefetch(),
  '/projects/testing':      () => TestingPage.prefetch(),
  '/projects/monitors':     () => MonitorsPage.prefetch(),
  '/projects/integrations': () => IntegrationsPage.prefetch(),
  '/projects/api-docs':     () => ApiDocsPage.prefetch(),
  '/projects/audit':        () => AuditPage.prefetch(),
  '/projects/trash':        () => TrashPage.prefetch(),
  '/projects/bug-tracker':  () => BugTrackerPage.prefetch(),
  '/projects/ai-assisted':  () => AiAssistedPage.prefetch(),
  '/projects/ai-testing':   () => AiTestingPage.prefetch(),
  '/projects/profile':      () => ProfilePage.prefetch(),
  '/projects/settings':     () => SettingsPage.prefetch(),
};
export const prefetchRoute = (to: string): void => {
  const fn = ROUTE_PREFETCH[to.split('?')[0].replace(/\/$/, '')];
  if (fn) void fn();
};

const r = (el: React.ReactNode) => <Suspense fallback={<RouteFallback />}>{el}</Suspense>;

/** Tiny adapter so the public status route can read the slug param. */
const StatusPagePublicSlugRoute = () => {
  const { slug } = useParams<{ slug: string }>();
  return <StatusPagePublic slug={slug ?? ''} />;
};

const router = createBrowserRouter([
  { path: '/', element: r(<LandingPage />), errorElement: <RouteErrorBoundary /> },
  { path: '/solutions', element: r(<SolutionsPage />), errorElement: <RouteErrorBoundary /> },
  { path: '/pricing', element: r(<PricingPage />), errorElement: <RouteErrorBoundary /> },
  // Home shell — Postman-style left rail (Home / Workspaces /
  // Integrations / API Catalog / Reports + Private/Public API Network).
  // Nested children render inside `HomeShell`'s `<Outlet/>`.
  {
    path: '/home',
    element: r(<HomeShell />),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: r(<HomeIntroPage />) },
      { path: 'api-catalog', element: <Navigate to="/home/api-catalog/public" replace /> },
      { path: 'api-catalog/:variant', element: r(<ApiCatalogPage />) },
      { path: 'governance', element: r(<GovernancePage />) },
      { path: 'reports', element: r(<ReportsPlaceholder />) },
    ],
  },
  { path: '/login', element: r(<LoginPage />), errorElement: <RouteErrorBoundary /> },
  // Register is the same component with mode=signup pre-selected, so existing
  // bookmark or marketing links don't 404. The query string already controls mode.
  { path: '/register', element: r(<LoginPage />), errorElement: <RouteErrorBoundary /> },
  { path: '/accept-invitation', element: r(<AcceptInvitationPage />), errorElement: <RouteErrorBoundary /> },
  { path: '/invite/accept', element: r(<AcceptInvitationPage />), errorElement: <RouteErrorBoundary /> },
  { path: '/auth/verify-email', element: r(<VerifyEmailPage />), errorElement: <RouteErrorBoundary /> },
  { path: '/status/:slug', element: r(<StatusPagePublicSlugRoute />), errorElement: <RouteErrorBoundary /> },

  // Public API Hub — auth-free discovery surface + per-doc viewer.
  // The Java service mints share links as `${frontend}/docs/{slug}`, so this
  // route catches them and the React app calls the public JSON endpoint.
  { path: '/api-hub', element: r(<PublicHubPage />), errorElement: <RouteErrorBoundary /> },
  { path: '/docs/:slug', element: r(<PublicDocViewerPage />), errorElement: <RouteErrorBoundary /> },

  // Standalone create/manage project page — minimal chrome, own sidebar.
  {
    path: '/project',
    element: r(<ProjectStandaloneLayout />),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: r(<ProjectWorkspacePage />) },
      { path: ':id', element: r(<ProjectWorkspacePage />) },
    ],
  },

  // Main app shell — everything under /projects (gated by RequireAuth,
  // which is a no-op while VITE_DEV_BYPASS_AUTH=true).
  { path: '/projects', element: <Navigate to="/projects/collections" replace /> },
  {
    path: '/projects',
    element: <RequireAuth>{r(<AppShell />)}</RequireAuth>,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: 'collections', element: r(<RequestBuilderPage />) },
      { path: 'dashboard', element: r(<DashboardPage />) },
      { path: 'manage', element: r(<ProjectManagementPage />) },
      // Legacy environments page → variables workspace (env scope is a tab there).
      { path: 'environments', element: <Navigate to="/projects/variables" replace /> },
      { path: 'variables', element: r(<VariablesWorkspacePage />) },
      { path: 'mcp', element: r(<McpPage />) },
      { path: 'mocks', element: r(<MocksPage />) },
      { path: 'mocks/:id', element: r(<MockDetailPage />) },
      // Testing module — Specs / Cases / Library / Functional / Load / Monitors
      // Testing module — single URL, internal state-driven sub-nav.
      // All sub-routes (specs / cases / library / functional / load /
      // monitors) and any deep views (run detail, spec detail) live
      // inside `<TestingPage />` via `useTestingStore` so the URL
      // never changes while moving between them.
      { path: 'testing', element: r(<TestingPage />) },
      { path: 'testing/*', element: <Navigate to="/projects/testing" replace /> },
      { path: 'monitors', element: r(<MonitorsPage />) },
      { path: 'integrations', element: r(<IntegrationsPage />) },
      { path: 'api-docs', element: r(<ApiDocsPage />) },
      { path: 'security', element: r(<SecurityScanPage />) },
      { path: 'security/escalation-rules', element: r(<EscalationRulesPage />) },
      { path: 'audit', element: r(<AuditPage />) },
      { path: 'trash', element: r(<TrashPage />) },
      { path: 'heartbeats', element: r(<HeartbeatsPage />) },
      { path: 'digests', element: r(<DigestsPage />) },
      { path: 'bug-tracker', element: r(<BugTrackerPage />) },
      { path: 'ai-assisted', element: r(<AiAssistedPage />) },
      { path: 'ai-testing', element: r(<AiTestingPage />) },
      { path: 'profile', element: r(<ProfilePage />) },
      { path: 'notifications', element: r(<NotificationsPage />) },
      { path: 'support', element: r(<SupportPage />) },
      { path: 'support/:ticketId', element: r(<SupportTicketPage />) },
      { path: 'settings', element: r(<SettingsPage />) },
      { path: 'history', element: r(<HistoryPage />) },
    ],
  },

  // legacy /app/* → /projects/*
  { path: '/app', element: <Navigate to="/projects/collections" replace /> },
  { path: '/app/*', element: <Navigate to="/projects/collections" replace /> },

  // Public shared-entity landing page — no auth, no shell.
  { path: '/shared/:token', element: r(<SharedEntityPage />) },

  { path: '*', element: <Navigate to="/" replace /> },
]);

export const AppRouter = () => <RouterProvider router={router} />;
