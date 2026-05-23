/**
 * API client — single axios instance pointing at the ForgeFuzz BFF gateway.
 * All 5 priority services (workspace, collection, request, environment, mock)
 * share the same base URL because the BFF hosts them under one API.
 */
import { createHttp } from '@/lib/http';

// Every service uses the same underlying gateway (BFF pattern).
export const workspaceApi = createHttp('workspace');
export const collectionApi = createHttp('collection');
export const requestApi = createHttp('request');
export const environmentApi = createHttp('environment');
export const mockApi = createHttp('mock');
