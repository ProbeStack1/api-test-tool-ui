import { userSettingApi } from '../lib/apiClient';

const BASE = '/api/v1/settings';

/* -------------------------------------------------------------
 * Existing endpoints (UNCHANGED)
 * ----------------------------------------------------------- */

/** GET /api/v1/settings/all */
export const fetchSettings = () => userSettingApi.get(`${BASE}/all`);

/** PUT /api/v1/settings/general */
export const updateGeneralSettings = (data) =>
  userSettingApi.put(`${BASE}/general`, data);

/** PUT /api/v1/settings/certification */
export const updateCertificationSettings = (data) =>
  userSettingApi.put(`${BASE}/certification`, data);

/* =============================================================
 * AI module (NEW) — all endpoints under /api/v1/settings/ai/*
 *
 * All calls require the X-User-Id header. The existing apiClient
 * attaches it automatically for this base — if yours doesn't, pass
 * it explicitly via { headers: { 'X-User-Id': <uuid> } }.
 * =========================================================== */

/** GET /api/v1/settings/ai/providers → [{ id, label, models: [{id,label,description}] }] */
export const fetchAiProviders = () =>
  userSettingApi.get(`${BASE}/ai/providers`);

/** GET /api/v1/settings/ai/config → user's saved AI preferences (never null). */
export const fetchAiConfig = () =>
  userSettingApi.get(`${BASE}/ai/config`);

/** PUT /api/v1/settings/ai/config → partial update. */
export const updateAiConfig = (data) =>
  userSettingApi.put(`${BASE}/ai/config`, data);

/**
 * POST /api/v1/settings/ai/chat
 * payload: { provider?, model?, sessionId?, mode?, messages:[{role,content}], errorContext?, singleAttempt? }
 *
 * If `provider` / `model` are omitted the server uses the user's saved config.
 * If `sessionId` is given the message pair is persisted in AI Assisted history.
 * If `singleAttempt: true` the server will NOT walk through other sub-models — it
 * tries ONLY the given model. The UI uses this to drive per-attempt progress text.
 */
export const aiChat = (payload) =>
  userSettingApi.post(`${BASE}/ai/chat`, payload);

/**
 * Convenience wrapper: same as aiChat but with singleAttempt=true forced.
 * Used by AIAssisted page to drive per-submodel progress messages.
 */
export const aiChatSingle = (payload) =>
  userSettingApi.post(`${BASE}/ai/chat`, { ...payload, singleAttempt: true });

/**
 * POST /api/v1/settings/ai/analyze-error
 * Convenience wrapper: send `{ errorContext, provider?, model? }` — no messages[] needed.
 */
export const aiAnalyzeError = (payload) =>
  userSettingApi.post(`${BASE}/ai/analyze-error`, payload);

/* ---- history (AI Assisted page only) ---- */

/** GET /api/v1/settings/ai/history/sessions?page=0&size=30 */
export const listAiSessions = (page = 0, size = 30) =>
  userSettingApi.get(`${BASE}/ai/history/sessions`, { params: { page, size } });

/** POST /api/v1/settings/ai/history/sessions  body: { title?, provider?, model? } */
export const createAiSession = (data = {}) =>
  userSettingApi.post(`${BASE}/ai/history/sessions`, data);

/** GET /api/v1/settings/ai/history/sessions/{sessionId}/messages → [{role,content}] */
export const getAiSessionMessages = (sessionId) =>
  userSettingApi.get(`${BASE}/ai/history/sessions/${sessionId}/messages`);

/** DELETE /api/v1/settings/ai/history/sessions/{sessionId} */
export const deleteAiSession = (sessionId) =>
  userSettingApi.delete(`${BASE}/ai/history/sessions/${sessionId}`);
