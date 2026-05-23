/**
 * Cross-tab auth broadcast — keeps every open ForgeFuzz tab in sync on
 * login / logout / token-refresh.
 *
 * Why: zustand `persist` already shares state via localStorage *between
 * page reloads*, but it does NOT push live updates to other open tabs.
 * Without this, signing out in one tab leaves a stale session running in
 * the second tab until you reload. We broadcast over {@link BroadcastChannel}
 * (available everywhere except IE11) and the auth store subscribes once
 * at startup.
 *
 * Events:
 *   - `login`   : fresh session in this tab; other tabs hydrate token+user
 *   - `logout`  : explicit sign-out; other tabs clear and redirect to /login
 *   - `refresh` : new access token after 401-refresh; other tabs adopt it
 */

export type AuthBroadcastEvent =
  | { type: 'login'; payload: { accessToken: string; refreshToken: string; expiresAt: number; user: unknown } }
  | { type: 'logout' }
  | { type: 'refresh'; payload: { accessToken: string; expiresAt: number } };

const CHANNEL = 'forgefuzz.auth';

let channel: BroadcastChannel | null = null;

const getChannel = (): BroadcastChannel | null => {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (channel) return channel;
  try {
    channel = new BroadcastChannel(CHANNEL);
  } catch {
    channel = null;
  }
  return channel;
};

export const broadcastAuth = (event: AuthBroadcastEvent) => {
  const c = getChannel();
  if (!c) return;
  try { c.postMessage(event); } catch { /* noop */ }
};

export const onAuthBroadcast = (handler: (e: AuthBroadcastEvent) => void): (() => void) => {
  const c = getChannel();
  if (!c) return () => undefined;
  const listener = (msg: MessageEvent<AuthBroadcastEvent>) => {
    if (msg?.data?.type) handler(msg.data);
  };
  c.addEventListener('message', listener);
  return () => c.removeEventListener('message', listener);
};
