/**
 * SSE helper — `new EventSource()` cannot set custom headers, so the
 * JWT must travel as a query parameter. This wrapper grabs the current
 * access token from the auth store and appends `?token=` (or merges
 * into the existing query string) before constructing the EventSource.
 *
 * Backends accept the param via the auth filter's
 * `isSseRequest()` fallback (see ForgeqAuthFilter.java).
 */
import { useAuth } from '../stores/auth.store';

export function openAuthedEventSource(url: string, init?: EventSourceInit): EventSource {
  const token = useAuth.getState().accessToken;
  if (token) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}token=${encodeURIComponent(token)}`;
  }
  return new EventSource(url, init);
}
