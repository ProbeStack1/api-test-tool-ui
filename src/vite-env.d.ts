/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_BYPASS_AUTH:        string;
  readonly VITE_WORKSPACE_SVC_URL:      string;
  readonly VITE_COLLECTION_SVC_URL:     string;
  readonly VITE_REQUEST_SVC_URL:        string;
  readonly VITE_ENVIRONMENT_SVC_URL:    string;
  readonly VITE_MOCK_SVC_URL:           string;
  readonly VITE_AUDIT_SVC_URL:          string;
  readonly VITE_API_DOCS_SVC_URL:       string;
  readonly VITE_TEST_SPEC_SVC_URL:      string;
  readonly VITE_MONITOR_SVC_URL:        string;
  readonly VITE_FUNCTIONAL_TEST_SVC_URL:string;
  readonly VITE_LOAD_TEST_SVC_URL:      string;
  readonly VITE_INTEGRATIONS_SVC_URL:   string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
