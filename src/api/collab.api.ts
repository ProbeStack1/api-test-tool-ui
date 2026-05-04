/**
 * Collaboration service — Comments + Shared Links + Notifications.
 * Backend: forgeq-collab-mgmt-svc on port 8096.
 */
import { createHttp } from '@/lib/http';

const http = createHttp('collab');
const BASE = '/api/v1/collaboration';

/* -------- Comments ---------- */
export interface CommentView {
  id: string;
  entityType: string;
  entityId: string;
  userId: string;
  workspaceId: string;
  parentCommentId?: string | null;
  content: string;
  mentions: string[];
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentBody {
  entityType: string;
  entityId: string;
  content: string;
  parentCommentId?: string | null;
  mentions?: string[];
}

export interface CommentsPage { total: number; items: CommentView[] }

export const createComment = (userId: string, workspaceId: string, body: CreateCommentBody) =>
  http.post<CommentView>(`${BASE}/comments`, body, {
    headers: { 'X-User-Id': userId, 'X-Workspace-Id': workspaceId },
  }).then((r) => r.data);

export const listComments = (workspaceId: string, entityType: string, entityId: string) =>
  http.get<CommentsPage>(`${BASE}/comments`, {
    params: { entityType, entityId, page: 0, size: 50 },
    headers: { 'X-Workspace-Id': workspaceId },
  }).then((r) => r.data);

export const updateComment = (userId: string, id: string, content: string) =>
  http.patch<CommentView>(`${BASE}/comments/${id}`, { content }, { headers: { 'X-User-Id': userId } }).then((r) => r.data);

export const deleteComment = (userId: string, id: string) =>
  http.delete<void>(`${BASE}/comments/${id}`, { headers: { 'X-User-Id': userId } });

/* -------- Shared Links ---------- */
export interface SharedLinkView {
  id: string;
  entityType: string;
  entityId: string;
  workspaceId: string;
  createdBy: string;
  token: string;
  accessType: string;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSharedLinkBody {
  entityType: string;
  entityId: string;
  accessType: 'view' | 'edit';
  expiresAt?: string;
}

export const createSharedLink = (userId: string, workspaceId: string, body: CreateSharedLinkBody) =>
  http.post<SharedLinkView>(`${BASE}/shared-links`, body, {
    headers: { 'X-User-Id': userId, 'X-Workspace-Id': workspaceId },
  }).then((r) => r.data);

export const listSharedLinks = (workspaceId: string, entityType: string, entityId: string) =>
  http.get<SharedLinkView[]>(`${BASE}/shared-links`, {
    params: { entityType, entityId },
    headers: { 'X-Workspace-Id': workspaceId },
  }).then((r) => r.data);

export const disableSharedLink = (userId: string, id: string) =>
  http.delete<void>(`${BASE}/shared-links/${id}`, { headers: { 'X-User-Id': userId } });

export const resolveSharedToken = (token: string) =>
  http.get<SharedLinkView>(`${BASE}/shared/${token}`).then((r) => r.data);

/* -------- Notifications ---------- */
export interface NotificationView {
  id: string;
  userId: string;
  type: string;
  referenceId?: string | null;
  referenceType?: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsPage {
  items: NotificationView[];
  total: number;
  unread: number;
}

export const listNotifications = (userId: string) =>
  http.get<NotificationsPage>(`${BASE}/notifications`, {
    params: { page: 0, size: 50 },
    headers: { 'X-User-Id': userId },
  }).then((r) => r.data);

export const markNotificationRead = (userId: string, id: string) =>
  http.patch<void>(`${BASE}/notifications/${id}/read`, null, { headers: { 'X-User-Id': userId } });

export const markAllNotificationsRead = (userId: string) =>
  http.post<{ updated: number }>(`${BASE}/notifications/mark-all-read`, null, { headers: { 'X-User-Id': userId } })
    .then((r) => r.data);
