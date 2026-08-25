/**
 * Enterprise Service – all API calls to Probestack Onboarding API.
 *
 * Base URL: https://probestack.io/onboarding-api
 * Headers required:
 *   - Authorization: Bearer <ps_auth_token>
 *   - X-Organization-Id   (hardcoded for now)
 *   - X-User-Email        (from auth store)
 *   - X-User-Role         (from auth store)
 *   - X-Partner-Id        = "probestack"
 *
 * All endpoints return a paginated list with `data` array inside a `status` envelope.
 */

import axios, { type AxiosInstance } from 'axios';
import { getAccessToken } from '@/stores/auth.store';
import { useAuth } from '@/stores/auth.store';

// Hardcoded organization ID (same as backend uses)
const ORG_ID = 'f52c02e6-d67a-4bc9-8e94-36e9d4b8d30c';

// Create an axios instance for Probestack Onboarding API
//
// KNOWN GAP (2026-08-23): the `Authorization: Bearer <ps_auth_token>` header
// this file tries to set below (from `getAccessToken()`) can no longer be
// populated for enterprise sessions — `ps_auth_token` is HttpOnly, so we
// have no JS-readable value to forward as a header (see auth.store.ts).
// `withCredentials: true` lets the browser attach the cookie automatically
// if probestack.io's onboarding-api accepts it directly (same registrable
// domain as where the cookie is set) — but that's unconfirmed. If these
// calls start failing with 401, this needs its own follow-up with the
// probestack.io team: does /onboarding-api accept the session cookie
// directly, the way our own backend now does?
const probestackApi: AxiosInstance = axios.create({
  baseURL: 'https://probestack.io/onboarding-api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Partner-Id': 'probestack',
  },
});

// Request interceptor to inject auth headers dynamically
probestackApi.interceptors.request.use(async (config) => {
  // Get current user from auth store
  const { user } = useAuth.getState();

  // Set organization ID (hardcoded)
  config.headers['X-Organization-Id'] = ORG_ID;

  // Set user email and role if available
  if (user) {
    config.headers['X-User-Email'] = user.email;
    // Use first role from roles array, fallback to 'USER'
    const role = user.roles?.[0] || 'USER';
    config.headers['X-User-Role'] = role;
  }

  // Set Authorization Bearer token from store (ps_auth_token)
  const token = getAccessToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
});

// =========================================================================
// Types based on actual API responses
// =========================================================================

export interface BusinessUnit {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  ownerName: string | null;
  ownerEmail: string | null;
  costCenter: string | null;
  description: string | null;
  status: string;
  projectCount: number;
  applicationCount: number;
  createdBy: string;
  createdByEmail: string;
  updatedBy: string;
  updatedByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  businessUnitId: string;
  businessUnitName: string;
  name: string;
  code: string;
  ownerName: string | null;
  ownerEmail: string | null;
  projectDlEmail: string | null;
  expectedGoLiveDate: string | null;
  deliveryModel: string | null;
  status: string;
  applicationCount: number;
  createdBy: string;
  createdByEmail: string;
  updatedBy: string;
  updatedByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  organizationId: string;
  businessUnitId: string;
  businessUnitName: string;
  projectId: string;
  projectName: string;
  name: string;
  applicationId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  applicationSme: string | null;
  smeEmail: string | null;
  testerName: string | null;
  testerEmail: string | null;
  serviceNowGroupName: string | null;
  serviceNowEmail: string | null;
  status: string;
  consumerCount: number;
  consumerIds: string[];
  createdBy: string;
  createdByEmail: string;
  updatedBy: string;
  updatedByEmail: string;
  createdAt: string;
  updatedAt: string;
}

// Nested application inside BU tree response
export interface TreeApplication {
  id: string;
  name: string;
  applicationId: string;
  ownerName: string | null;
  status: string;
  consumerCount: number;
}

// Nested project inside BU tree response
export interface TreeProject {
  id: string;
  name: string;
  code: string;
  ownerName: string | null;
  expectedGoLiveDate: string | null;
  status: string;
  applicationCount: number;
  applications: TreeApplication[];
}

// BU Tree response
export interface BusinessUnitTree {
  businessUnit: BusinessUnit;
  projectCount: number;
  applicationCount: number;
  projects: TreeProject[];
}

export interface ApiListResponse<T> {
  status: 'SUCCESS' | 'ERROR';
  code: string;
  message: string;
  data: T[];
  meta: {
    page: number | null;
    size: number | null;
    totalElements: number | null;
    totalPages: number | null;
    traceId: string | null;
    timestamp: string;
  };
}

export interface ApiSingleResponse<T> {
  status: 'SUCCESS' | 'ERROR';
  code: string;
  message: string;
  data: T;
  meta: {
    page: number | null;
    size: number | null;
    totalElements: number | null;
    totalPages: number | null;
    traceId: string | null;
    timestamp: string;
  };
}

// =========================================================================
// API Functions
// =========================================================================

/**
 * Fetch all business units (paginated)
 */
export const getBusinessUnits = async (page = 0, size = 100): Promise<BusinessUnit[]> => {
  const response = await probestackApi.get<ApiListResponse<BusinessUnit>>(
    `/api/v1/onboarding/business-units?page=${page}&size=${size}`
  );
  if (response.data.status === 'SUCCESS') {
    return response.data.data || [];
  }
  throw new Error(response.data.message || 'Failed to fetch business units');
};

/**
 * Fetch single business unit with its tree (projects + applications)
 */
export const getBusinessUnitTree = async (buId: string): Promise<BusinessUnitTree> => {
  const response = await probestackApi.get<ApiSingleResponse<BusinessUnitTree>>(
    `/api/v1/onboarding/business-units/${buId}/tree`
  );
  if (response.data.status === 'SUCCESS') {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to fetch business unit tree');
};

/**
 * Fetch all projects (paginated)
 */
export const getProjects = async (page = 0, size = 100): Promise<Project[]> => {
  const response = await probestackApi.get<ApiListResponse<Project>>(
    `/api/v1/onboarding/projects?page=${page}&size=${size}`
  );
  if (response.data.status === 'SUCCESS') {
    return response.data.data || [];
  }
  throw new Error(response.data.message || 'Failed to fetch projects');
};

/**
 * Fetch single project detail
 */
export const getProjectDetail = async (projectId: string): Promise<Project> => {
  const response = await probestackApi.get<ApiSingleResponse<Project>>(
    `/api/v1/onboarding/projects/${projectId}`
  );
  if (response.data.status === 'SUCCESS') {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to fetch project detail');
};

/**
 * Fetch applications under a specific project
 */
export const getProjectApplications = async (projectId: string): Promise<TreeApplication[]> => {
  const response = await probestackApi.get<ApiListResponse<TreeApplication>>(
    `/api/v1/onboarding/projects/${projectId}/applications`
  );
  if (response.data.status === 'SUCCESS') {
    return response.data.data || [];
  }
  throw new Error(response.data.message || 'Failed to fetch project applications');
};

/**
 * Fetch all applications (paginated)
 */
export const getApplications = async (page = 0, size = 100): Promise<Application[]> => {
  const response = await probestackApi.get<ApiListResponse<Application>>(
    `/api/v1/onboarding/applications?page=${page}&size=${size}`
  );
  if (response.data.status === 'SUCCESS') {
    return response.data.data || [];
  }
  throw new Error(response.data.message || 'Failed to fetch applications');
};

/**
 * Fetch single application detail
 */
export const getApplicationDetail = async (appId: string): Promise<Application> => {
  const response = await probestackApi.get<ApiSingleResponse<Application>>(
    `/api/v1/onboarding/applications/${appId}`
  );
  if (response.data.status === 'SUCCESS') {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to fetch application detail');
};

/**
 * Fetch applications filtered by business unit ID
 */
export const getApplicationsByBusinessUnit = async (buId: string): Promise<Application[]> => {
  // Since we have tree endpoint, we can use that instead.
  // But if we need just applications, we fetch all and filter.
  const all = await getApplications();
  return all.filter(a => a.businessUnitId === buId);
};

/**
 * Fetch projects filtered by business unit ID
 */
export const getProjectsByBusinessUnit = async (buId: string): Promise<Project[]> => {
  const all = await getProjects();
  return all.filter(p => p.businessUnitId === buId);
};