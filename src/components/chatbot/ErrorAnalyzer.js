/**
 * ErrorAnalyzer.js (AI-enabled)
 *
 * BACKWARD COMPATIBLE:
 *   The three original synchronous helpers
 *     - generateErrorAnalysis()
 *     - analyzeJSError()
 *     - generateFollowUpResponse()
 *   still exist and still return the same static strings. Existing components
 *   can keep calling them as a zero-cost fallback.
 *
 * NEW:
 *   - analyzeErrorViaAi(response, error, requestInfo, overrides?) → Promise<string>
 *   - chatViaAi(messages, { context, overrides, sessionId }) → Promise<{ content, provider, model, attempts, fallback, sessionId }>
 *
 * Callers pattern:
 *   try {
 *     const text = await analyzeErrorViaAi(response, error, requestInfo);
 *     ...use text...
 *   } catch (e) {
 *     // fall back to static
 *     const text = generateErrorAnalysis(response, error, requestInfo);
 *   }
 */

import { aiChat, aiAnalyzeError, fetchAiProviders, fetchAiConfig, aiChatSingle } from '../../services/userSettingService';

/* ====== STATIC FALLBACKS (unchanged) =====================================
 * These functions preserve the original dummy behaviour, used whenever the
 * backend AI call fails or the chatbot mode is "disabled".
 * ======================================================================= */

export const generateErrorAnalysis = (response, error, requestInfo) => {
  const statusCode = response?.status || error?.status || 0;
  const errorMessage = error?.message || response?.statusText || 'Unknown error';
  const url = requestInfo?.url || 'N/A';
  const method = requestInfo?.method || 'GET';

  if (statusCode >= 400 && statusCode < 500) {
    if (statusCode === 400) return `**Validation Error (400 Bad Request)**\n\nThe server rejected your request due to invalid data.\n\n**Possible Causes:**\n• Required fields are missing\n• Wrong data types\n• Invalid JSON\n\n**Quick Fixes:**\n• Check request body fields\n• Verify Content-Type header\n\n**Error:** ${errorMessage}\n**URL:** ${url}`;
    if (statusCode === 401) return `**Authentication Error (401)**\n\nAuthentication is required.\n\n**Quick Fixes:**\n• Add API key / token in Auth tab\n• Refresh expired token\n• Verify Authorization header format\n\n**URL:** ${url}`;
    if (statusCode === 403) return `**Forbidden (403)**\n\nYou lack permission to access this resource.\n\n**Quick Fixes:**\n• Check account permissions\n• Verify credentials\n\n**URL:** ${url}`;
    if (statusCode === 404) return `**Not Found (404)**\n\nThe resource does not exist.\n\n**Quick Fixes:**\n• Double-check URL / resource id\n\n**Request:** ${method} ${url}`;
    if (statusCode === 405) return `**Method Not Allowed (405)**\n\n${method} is not supported on this endpoint.`;
    if (statusCode === 429) return `**Rate Limit Exceeded (429)**\n\nWait before retrying. Check X-RateLimit-* headers.`;
    return `**Client Error (${statusCode})**\n\n${errorMessage}\n**URL:** ${url}`;
  }
  if (statusCode >= 500) {
    if (statusCode === 500) return `**Internal Server Error (500)**\n\nServer issue, not your fault. Retry shortly.`;
    if (statusCode === 502) return `**Bad Gateway (502)**\n\nServer communication failed. Retry in 30-60s.`;
    if (statusCode === 503) return `**Service Unavailable (503)**\n\nServer down or under maintenance.`;
    if (statusCode === 504) return `**Gateway Timeout (504)**\n\nServer did not respond in time.`;
    return `**Server Error (${statusCode})**\n\n${errorMessage}`;
  }
  return `**Network/Connection Error**\n\nUnable to reach the server.\n\n**Check:**\n• Internet / CORS / firewall\n• Server URL\n\n**Error:** ${errorMessage}`;
};

export const analyzeJSError = (error) => {
  const message = error?.message || 'Unknown JavaScript error';
  return `**JavaScript Error**\n\n**Error:** ${message}\n\n**What to do:**\n• Check browser console (F12)\n• Revert recent changes\n• Try to reproduce consistently`;
};

export const generateFollowUpResponse = (userMessage, context) => {
  return `**AI offline fallback**\n\nYou asked: "${userMessage}"\n\nThe real-time AI is not reachable right now — showing a generic tip instead. Please retry shortly or change the provider/model from Settings → AI.`;
};

/* ====== NEW: ASYNC BACKEND-BACKED HELPERS =============================== */

/**
 * Calls POST /api/v1/settings/ai/analyze-error and returns the assistant text.
 * Throws on failure so callers can fall back to the static helper.
 *
 * @param {Object} response    { status, statusText, body? }
 * @param {Object} error       { message, status? }
 * @param {Object} requestInfo { method, url, body? }
 * @param {Object} [overrides] optional { provider, model }
 * @returns {Promise<{ content: string, provider: string, model: string, attempts: string[], fallback: boolean }>}
 */
export const analyzeErrorViaAi = async (response, error, requestInfo, overrides = {}) => {
  const payload = {
    provider: overrides.provider,
    model:    overrides.model,
    mode: 'error',
    errorContext: {
      status:       response?.status ?? error?.status ?? null,
      statusText:   response?.statusText ?? null,
      method:       requestInfo?.method ?? null,
      url:          requestInfo?.url ?? null,
      requestBody:  requestInfo?.body ? safeStringify(requestInfo.body) : null,
      responseBody: response?.body ? safeStringify(response.body) : null,
      errorMessage: error?.message ?? null,
    },
  };
  const { data } = await aiAnalyzeError(payload);
  return data;
};

/**
 * Generic chat call. Caller supplies the message array and optional overrides.
 *
 * @param {Array}  messages   [{ role: 'user'|'assistant', content }]
 * @param {Object} [opts]
 * @param {'chat'|'error'|'sidebar'} [opts.context]
 * @param {Object} [opts.overrides]  { provider, model }
 * @param {string} [opts.sessionId]  if given, backend persists the turn in history
 * @param {Object} [opts.errorContext] only for context='error'|'sidebar'
 * @returns {Promise<{ content, provider, model, attempts, fallback, sessionId }>}
 */
export const chatViaAi = async (messages, opts = {}) => {
  const payload = {
    provider:     opts.overrides?.provider,
    model:        opts.overrides?.model,
    sessionId:    opts.sessionId,
    mode:         opts.context || 'chat',
    messages,
    errorContext: opts.errorContext,
  };
  const { data } = await aiChat(payload);
  return data;
};

function safeStringify(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

/* ====== AUTO-SWITCH ENGINE (silent) ============================
 * Used by the popup chatbot and the right-sidebar AI: there are
 * no dropdowns visible there, so we walk through every provider
 * and every sub-model automatically until ONE succeeds, optionally
 * reporting progress via onProgress.
 *
 *   onProgress(stage)
 *     stage = { phase: 'try' | 'switch' | 'all_failed',
 *               providerId, providerLabel, modelId, modelLabel,
 *               attempted: [modelId,...], previousProviderId? }
 *
 *   Returns { content, provider, model, sessionId? } on success.
 *   Throws Error('AI_ALL_PROVIDERS_FAILED') if everything fails.
 * ============================================================= */

let _catalogCache = null;
let _userCfgCache = null;
async function getCatalog() {
  if (_catalogCache) return _catalogCache;
  const { data } = await fetchAiProviders();
  _catalogCache = data || [];
  return _catalogCache;
}
async function getUserConfig() {
  if (_userCfgCache) return _userCfgCache;
  try {
    const { data } = await fetchAiConfig();
    _userCfgCache = data || {};
  } catch { _userCfgCache = {}; }
  return _userCfgCache;
}

/**
 * Walk through every provider+submodel in user-preference order.
 * Used by chatbot popup and sidebar AI (no UI for switching).
 */
export const chatWithAutoSwitch = async (messages, opts = {}) => {
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};

  const [catalog, cfg] = await Promise.all([getCatalog(), getUserConfig()]);
  if (catalog.length === 0) throw new Error('AI_NO_PROVIDERS');

  // Build provider order: user-preferred first, then the rest in catalog order.
  const preferred = cfg.provider;
  const ordered = preferred && catalog.some(p => p.id === preferred)
    ? [catalog.find(p => p.id === preferred), ...catalog.filter(p => p.id !== preferred)]
    : [...catalog];

  let prevProviderId;
  for (const provider of ordered) {
    const subs = provider.models.map(m => m.id);
    // For the user-preferred provider, start with their saved sub-model.
    const startId = (provider.id === preferred && cfg.model && subs.includes(cfg.model)) ? cfg.model : subs[0];
    const startIdx = subs.indexOf(startId);
    const subOrder = [...subs.slice(startIdx), ...subs.slice(0, startIdx)];

    if (prevProviderId) {
      onProgress({
        phase: 'switch',
        providerId: provider.id, providerLabel: provider.label,
        previousProviderId: prevProviderId,
      });
    }

    const attempted = [];
    for (let i = 0; i < subOrder.length; i++) {
      const mid = subOrder[i];
      attempted.push(mid);
      const modelLabel = provider.models.find(x => x.id === mid)?.label || mid;
      onProgress({
        phase: 'try',
        providerId: provider.id, providerLabel: provider.label,
        modelId: mid, modelLabel,
        attempted: [...attempted],
      });
      try {
        const { data } = await aiChatSingle({
          provider: provider.id,
          model: mid,
          sessionId: opts.sessionId,
          mode: opts.context || 'chat',
          messages,
          errorContext: opts.errorContext,
        });
        return data;
      } catch (e) {
        // continue to next sub-model
        // eslint-disable-next-line no-console
        console.warn('AI sub-model failed', provider.id, mid, e?.response?.data);
      }
    }
    prevProviderId = provider.id;
  }

  onProgress({ phase: 'all_failed' });
  const err = new Error('AI_ALL_PROVIDERS_FAILED');
  err.code = 'AI_ALL_PROVIDERS_FAILED';
  throw err;
};

/**
 * Convenience wrapper for error analysis with auto-switch.
 * Returns a string ready to be rendered in a chat bubble.
 */
export const analyzeErrorWithAutoSwitch = async (response, error, requestInfo, opts = {}) => {
  const errorContext = {
    status:       response?.status ?? error?.status ?? null,
    statusText:   response?.statusText ?? null,
    method:       requestInfo?.method ?? null,
    url:          requestInfo?.url ?? null,
    requestBody:  requestInfo?.body ? safeStringify(requestInfo.body) : null,
    responseBody: response?.body ? safeStringify(response.body) : null,
    errorMessage: error?.message ?? null,
  };
  return chatWithAutoSwitch(
    [{ role: 'user', content: 'Please analyse the error above and tell me what is wrong.' }],
    { context: 'error', errorContext, onProgress: opts.onProgress }
  );
};
