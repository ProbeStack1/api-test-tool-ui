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
  | 'support'
  | 'dashboard'
  | 'collab';

const readEnv = (key: string, fallback = ''): string => {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
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
  support: 8094,
  dashboard: 8095,
  collab: 8096,
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
  support:        readEnv('VITE_SUPPORT_SVC_URL',         `http://localhost:${CANONICAL_PORTS.support}`),
  dashboard:      readEnv('VITE_DASHBOARD_SVC_URL',       `http://localhost:${CANONICAL_PORTS.dashboard}`),
  collab:         readEnv('VITE_COLLAB_SVC_URL',          `http://localhost:${CANONICAL_PORTS.collab}`),
};

export const env = {
  devBypassAuth: readEnv('VITE_DEV_BYPASS_AUTH', 'false') === 'true',
  isProd: import.meta.env.PROD,
  isDev:  import.meta.env.DEV,
};

/** Returns the base URL for a given microservice. */
export const serviceUrl = (name: ServiceName): string => LOCAL_URLS[name];
