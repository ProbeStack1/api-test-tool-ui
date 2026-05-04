/**
 * User service — thin wrappers for workspace-svc user endpoints.
 * Currently only `bootstrapUser` used by landing StartTestingModal.
 */
import { createHttp } from '@/lib/http';

const http = createHttp('workspace');

export interface BootstrapPayload {
  email: string;
  name?: string;
}

export interface BootstrapResponse {
  userId?: string;
  workspaceId?: string;
  email?: string;
  [k: string]: unknown;
}

export const bootstrapUser = async (payload: BootstrapPayload): Promise<BootstrapResponse> => {
  const { data } = await http.post<BootstrapResponse>('/api/v1/users/bootstrap', payload);
  return data;
};
