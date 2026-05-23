/**
 * Environment configuration — single source of truth for backend URLs.
 *
 * Local-first: every microservice has a canonical port. Override any
 * URL via .env (VITE_<NAME>_SVC_URL) when needed.
 */

export type ServiceName =
  | 'workspace'
  | 'collection'
  | 'request'
  | 'environment'
  | 'mock'
  | 'audit'
  | 'apiDocs'
  | 'testSpec'
  | 'monitor'
  | 'functionalTest'
  | 'loadTest'
  | 'integrations'
  | 'aiAssistant'
  | 'aiTesting'
  | 'support'
  | 'dashboard'
  | 'collab'
  | 'userMgmt';

const readEnv = (key: string, fallback = ''): string => {
  const value = import.meta.env[key];
  const resolved = typeof value === 'string' && value.length > 0 ? value : fallback;

  /*
   * Same-origin guard for hosted demos.
   *
   * `.env.local` typically points every service URL at `http://localhost:8001`
   * so the developer can hit the local nginx mux directly. When the same
   * bundle is served via the public preview URL (eg. `*.preview.emergentagent.com`),
   * the browser's `localhost` is the user's machine — not our container — and
   * every request 404s with `net::ERR_FAILED`.
   *
   * Solution: if the page is loaded from a host that is NOT `localhost`, and
   * the configured URL points to localhost or 127.0.0.1, transparently
   * rewrite it to the page's own origin. Nginx in the container already
   * routes `/api/*` to the right microservice, so this is safe.
   */
  if (typeof window !== 'undefined' && resolved) {
    const localhostUrl = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i;
    const pageOrigin = window.location?.origin || '';
    if (localhostUrl.test(resolved) && resolved !== pageOrigin) {
      /*
       * Two cases:
       *  1. Page on `*.preview.emergentagent.com` but env still points
       *     to `http://localhost:8001` → the browser cannot reach our
       *     container's localhost, so route through the page origin
       *     (nginx mux serves /api/* there).
       *  2. Page on `http://localhost:3000` (tcp-forward to vite) with
       *     env pointing to `http://localhost:8001` → going to a
       *     different port from the page can break in sandboxed
       *     browsers; using the page origin lets the vite dev-server
       *     proxy forward /api/* to nginx for us.
       */
      return pageOrigin;
    }
  }

  return resolved;
};

/** Canonical local ports — match each service's application.properties **/
export const CANONICAL_PORTS: Record<ServiceName, number> = {
  workspace: 8081,
  collection: 8082,
  request: 8083,
  environment: 8084,
  mock: 8085,
  monitor: 8086,
  apiDocs: 8087,
  audit: 8088,
  functionalTest: 8089,
  integrations: 8090,
  loadTest: 8091,
  testSpec: 8092,
  aiAssistant: 8093,
  aiTesting: 8084,
  support: 8094,
  dashboard: 8095,
  collab: 8096,
  userMgmt: 8083,
};

const LOCAL_URLS: Record<ServiceName, string> = {
  workspace:      readEnv('VITE_WORKSPACE_SVC_URL',       `http://localhost:${CANONICAL_PORTS.workspace}`),
  collection:     readEnv('VITE_COLLECTION_SVC_URL',      `http://localhost:${CANONICAL_PORTS.collection}`),
  request:        readEnv('VITE_REQUEST_SVC_URL',         `http://localhost:${CANONICAL_PORTS.request}`),
  environment:    readEnv('VITE_ENVIRONMENT_SVC_URL',     `http://localhost:${CANONICAL_PORTS.environment}`),
  mock:           readEnv('VITE_MOCK_SVC_URL',            `http://localhost:${CANONICAL_PORTS.mock}`),
  audit:          readEnv('VITE_AUDIT_SVC_URL',           `http://localhost:${CANONICAL_PORTS.audit}`),
  apiDocs:        readEnv('VITE_API_DOCS_SVC_URL',        `http://localhost:${CANONICAL_PORTS.apiDocs}`),
  testSpec:       readEnv('VITE_TEST_SPEC_SVC_URL',       `http://localhost:${CANONICAL_PORTS.testSpec}`),
  monitor:        readEnv('VITE_MONITOR_SVC_URL',         `http://localhost:${CANONICAL_PORTS.monitor}`),
  functionalTest: readEnv('VITE_FUNCTIONAL_TEST_SVC_URL', `http://localhost:${CANONICAL_PORTS.functionalTest}`),
  loadTest:       readEnv('VITE_LOAD_TEST_SVC_URL',       `http://localhost:${CANONICAL_PORTS.loadTest}`),
  integrations:   readEnv('VITE_INTEGRATIONS_SVC_URL',    `http://localhost:${CANONICAL_PORTS.integrations}`),
  aiAssistant:    readEnv('VITE_AI_ASSISTANT_SVC_URL',    `http://localhost:${CANONICAL_PORTS.aiAssistant}`),
  aiTesting:      readEnv('VITE_AI_TESTING_SVC_URL',      `http://localhost:${CANONICAL_PORTS.aiTesting}`),
  support:        readEnv('VITE_SUPPORT_SVC_URL',         `http://localhost:${CANONICAL_PORTS.support}`),
  dashboard:      readEnv('VITE_DASHBOARD_SVC_URL',       `http://localhost:${CANONICAL_PORTS.dashboard}`),
  collab:         readEnv('VITE_COLLAB_SVC_URL',          `http://localhost:${CANONICAL_PORTS.collab}`),
  userMgmt:       readEnv('VITE_USER_MGMT_SVC_URL',       `http://localhost:${CANONICAL_PORTS.userMgmt}`),
};

export const env = {
  devBypassAuth: readEnv('VITE_DEV_BYPASS_AUTH', 'false') === 'true',
  isProd: import.meta.env.PROD,
  isDev:  import.meta.env.DEV,
};

/** Returns the base URL for a given microservice. */
export const serviceUrl = (name: ServiceName): string => LOCAL_URLS[name];
