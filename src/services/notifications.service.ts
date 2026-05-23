/**
 * Centralised notification service client. All notification surfaces (bell,
 * page, settings) hit the same handful of endpoints — keep the wire format
 * in one place so the future svc-extraction is a single URL flip.
 */
import axios from 'axios';
import { useAuth } from '@/stores/auth.store';
import { serviceUrl } from '@/lib/env';

export interface NotificationItem {
  id: string;
  type: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  link?: string | null;
  workspaceId?: string | null;
  actorEmail?: string | null;
  payload?: Record<string, unknown>;
  read: boolean;
  readAt?: string | null;
  trashed: boolean;
  trashedAt?: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unread: number;
  total: number;
  trash: number;
}

export interface NotificationCounts {
  unread: number;
  total: number;
  trash: number;
}

export interface NotificationPreferences {
  email: string;
  brandNewsletter: boolean;
  productUpdates: boolean;
  loginEmailAlert: boolean;
  loginInAppAlert: boolean;
  inApp: Record<string, boolean>;
  emailChannel: Record<string, boolean>;
  updatedAt?: string;
}

const base = () => `${serviceUrl('workspace')}/api/v1/workspaces/notifications`;
const auth = () => {
  const t = useAuth.getState().accessToken;
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export const notificationsApi = {
  inbox: (page = 0, limit = 20) =>
    axios.get<{ data: NotificationListResponse }>(base(), { headers: auth(), params: { page, limit } })
      .then((r) => r.data?.data),
  trash: (page = 0, limit = 20) =>
    axios.get<{ data: NotificationListResponse }>(`${base()}/trash`, { headers: auth(), params: { page, limit } })
      .then((r) => r.data?.data),
  counts: () =>
    axios.get<{ data: NotificationCounts }>(`${base()}/counts`, { headers: auth() })
      .then((r) => r.data?.data),
  markRead: (id: string) =>
    axios.post(`${base()}/${id}/read`, null, { headers: auth() }),
  markUnread: (id: string) =>
    axios.post(`${base()}/${id}/unread`, null, { headers: auth() }),
  markAllRead: () =>
    axios.post<{ data: number }>(`${base()}/read-all`, null, { headers: auth() }),
  trashOne: (id: string) =>
    axios.post(`${base()}/${id}/trash`, null, { headers: auth() }),
  restoreOne: (id: string) =>
    axios.post(`${base()}/${id}/restore`, null, { headers: auth() }),
  deleteOne: (id: string) =>
    axios.delete(`${base()}/${id}`, { headers: auth() }),
  deleteRead: () =>
    axios.delete<{ data: number }>(`${base()}/read`, { headers: auth() }),
  deleteAll: () =>
    axios.delete<{ data: number }>(`${base()}/all`, { headers: auth() }),
  prefs: () =>
    axios.get<{ data: NotificationPreferences }>(`${base()}/prefs`, { headers: auth() })
      .then((r) => r.data?.data),
  savePrefs: (body: NotificationPreferences) =>
    axios.put<{ data: NotificationPreferences }>(`${base()}/prefs`, body, { headers: auth() })
      .then((r) => r.data?.data),
};
