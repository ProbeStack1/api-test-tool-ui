/**
 * Auth store — single source of truth for the logged-in user + JWT pair.
 *
 * Persists access + refresh tokens in localStorage so reloads keep the
 * session. The HTTP layer (`lib/http.ts`) reads `getAccessToken()` on
 * every request and the response interceptor calls `refresh()` once
 * when it sees a 401 with `AUTH_TOKEN_EXPIRED`.
 *
 * Cross-tab sync: a {@link BroadcastChannel} fan-out keeps every open
 * ForgeFuzz tab on the same session — login in tab A → tabs B/C/D
 * adopt the token; logout in tab A → tabs B/C/D drop it and the
 * `RequireAuth` guard bounces them to `/login`.
 *
 * Key shape lives in {@link UserView} — keep in lock-step with
 * the backend DTO at `forgeq-test-user-mgmt-svc → dto/AuthDtos.UserView`.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { broadcastAuth, onAuthBroadcast } from '@/lib/auth-broadcast';

export interface UserView {
  userId: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  accountStatus: string;
  emailVerified: boolean;
  subscriptionTier?: string;
  roles: string[];
  createdAt?: string;
  lastLoginAt?: string;
  /** NEW: Distinguishes enterprise vs individual users for UI feature toggles. */
  accountType?: 'INDIVIDUAL' | 'ENTERPRISE';
}

/**
 * Helper to read a NON-HttpOnly cookie by name. `ps_auth_token` itself is
 * HttpOnly now (probestack.io sets it that way, deliberately, so JS can
 * never read or forward it — that's the whole point of HttpOnly) so this
 * can no longer see it; kept as a general-purpose utility for anything
 * else that isn't HttpOnly.
 */
export const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

/**
 * Helper to delete a NON-HttpOnly cookie by name (sets expiry to epoch).
 * Cannot clear `ps_auth_token` (HttpOnly blocks JS writes to it too, not
 * just reads — the assignment below silently no-ops for it). Enterprise
 * logout needs the cookie expired server-side by probestack.io; tracked
 * as a follow-up, not something fixable from this side.
 */
const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  // Extra attempt for subdomain
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
};

/**
 * Storage adapter that picks localStorage vs sessionStorage PER WRITE based
 * on the `rememberMe` flag inside the state being persisted — this is what
 * actually implements the "Remember me" checkbox. Unchecked → sessionStorage,
 * so the session is gone the moment the browser/tab closes, same as
 * Firebase's own `browserSessionPersistence` we set alongside it at sign-in.
 * `getItem` checks both since we don't know in advance which one holds the
 * live session (and the other is guaranteed empty — we always clear it).
 */
const rememberAwareStorage = {
  getItem: (name: string) => localStorage.getItem(name) ?? sessionStorage.getItem(name),
  setItem: (name: string, value: string) => {
    let remember = true;
    try { remember = JSON.parse(value)?.state?.rememberMe !== false; } catch { /* default true */ }
    if (remember) {
      localStorage.setItem(name, value);
      sessionStorage.removeItem(name);
    } else {
      sessionStorage.setItem(name, value);
      localStorage.removeItem(name);
    }
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

interface AuthState {
  user:         UserView | null;
  accessToken:  string | null;
  refreshToken: string | null;
  expiresAt:    number | null;     // epoch-ms; renew before this when possible
  /** NEW: Cached account type to avoid repeated checks and allow early renders. */
  accountType:  'INDIVIDUAL' | 'ENTERPRISE' | null;
  /** "Remember me" from the sign-in form — false = session-only (cleared on browser close). */
  rememberMe:   boolean;
  /** True until the initial `bootstrapFromCookie()` call resolves (success
   *  or failure). We can no longer peek at the HttpOnly cookie via JS to
   *  decide "should I even try" — the only way to know is to actually ask
   *  the backend, so route guards must wait for this instead of assuming
   *  "no token yet" means "not logged in". */
  isBootstrapping: boolean;

  /** Set after a successful login (or hydrated from a sibling tab). `remember` defaults to true
   *  for flows that don't surface the checkbox (OAuth, OTP, enterprise cookie bootstrap). */
  setSession(t: { accessToken: string; refreshToken: string; expiresInSec: number; user: UserView; remember?: boolean }): void;
  /** Replace just the access token after a /refresh round-trip. */
  setAccessToken(t: { accessToken: string; expiresInSec: number }): void;
  /** Explicit sign-out (or hydrated from a sibling tab). */
  clear(): Promise<void>;
  /** Internal: apply state pushed by another tab without re-broadcasting. */
  _hydrateFromBroadcast(p: Partial<AuthState>): void;

  /** NEW: Bootstrap enterprise session using the ps_auth_token cookie. Returns true if successful. */
  bootstrapFromCookie(): Promise<boolean>;
  /** NEW: Convenience helper to check if the current user is enterprise. */
  isEnterprise(): boolean;
  isAuthenticated(): boolean;
  hasRole(role: string): boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      accountType: null,
      rememberMe: true,
      isBootstrapping: true,

      setSession({ accessToken, refreshToken, expiresInSec, user, remember }) {
        const expiresAt = Date.now() + expiresInSec * 1000;
        set({
          user,
          accessToken,
          refreshToken,
          expiresAt,
          accountType: user?.accountType || 'INDIVIDUAL',
          rememberMe: remember ?? true,
        });
        broadcastAuth({ type: 'login', payload: { accessToken, refreshToken, expiresAt, user } });
      },

      setAccessToken({ accessToken, expiresInSec }) {
        const expiresAt = Date.now() + expiresInSec * 1000;
        set({ accessToken, expiresAt });
        broadcastAuth({ type: 'refresh', payload: { accessToken, expiresAt } });
      },

      clear: async () => {
        // Best-effort — cannot actually clear ps_auth_token from here, see
        // deleteCookie's javadoc (HttpOnly blocks the write too). Local
        // state below is what actually signs the user out on this device;
        // full enterprise logout also needs the cookie expired server-side.
        deleteCookie('ps_auth_token');
        deleteCookie('ps_auth_session');

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          accountType: null,
          rememberMe: true,
          // Explicit sign-out, not a fresh page load — stay false so
          // RequireAuth redirects immediately instead of showing a loading
          // state waiting for a bootstrap that isn't going to happen again.
          isBootstrapping: false,
        });
        broadcastAuth({ type: 'logout' });
      },

      _hydrateFromBroadcast(p) { set(p as Partial<AuthState>); },

      /**
       * Bootstraps an enterprise session from the ps_auth_token cookie.
       * Called once on app load. Returns true if bootstrapping succeeded,
       * false otherwise.
       *
       * <p>We used to read the cookie's VALUE via JS first and only call
       * `/me` if one was found. That no longer works — `ps_auth_token` is
       * HttpOnly (probestack.io sets it that way on purpose, so it can
       * never be read or forwarded by JS, XSS protection), which means
       * `document.cookie` can't even tell us whether it EXISTS, let alone
       * its value. So we can no longer "peek" — we just always ask the
       * backend by calling `/me`. As long as this request is same-origin
       * (see env.ts's rewrite for `*.probestack.io` pages) and sent with
       * `withCredentials: true` (see http.ts), the browser attaches the
       * cookie automatically if one exists; the backend's response is the
       * only reliable signal of whether there's a valid enterprise session.
       */
      bootstrapFromCookie: async (): Promise<boolean> => {
        // If we already have a valid Firebase session, skip bootstrap.
        const { accessToken, expiresAt } = get();
        if (accessToken && expiresAt && Date.now() < expiresAt) {
          set({ isBootstrapping: false });
          return true;
        }

        try {
          // Dynamically import http to avoid circular dependency issues.
          const { createHttp } = await import('@/lib/http');
          const http = createHttp('userMgmt');
          const res = await http.get('/api/v1/users/me', { withCredentials: true });

          const userData = res.data as UserView;
          if (!userData.accountType) {
            userData.accountType = 'ENTERPRISE';
          }

          // NOTE: unlike the Firebase path, there is no JWT string to store
          // as `accessToken` here — the credential lives entirely in the
          // HttpOnly cookie, which JS never sees. `accessToken` stays null;
          // `accountType`/`expiresAt` below are what `isAuthenticated()`
          // and `RequireAuth` key off for an enterprise session instead.
          // The backend will reject the cookie if it's truly expired,
          // triggering a 401 the next time any protected call is made.
          const expiresAt = Date.now() + 3600 * 1000;
          set({
            user: userData,
            accessToken: null,
            refreshToken: null,
            expiresAt,
            accountType: userData.accountType,
            isBootstrapping: false,
          });

          broadcastAuth({
            type: 'login',
            payload: {
              accessToken: '',
              refreshToken: '',
              expiresAt,
              user: userData,
            },
          });
          return true;
        } catch (err) {
          console.warn('Enterprise bootstrap failed:', err);
          // No/invalid/expired cookie — nothing to do. The user gets
          // redirected to login if they navigate to a protected route.
          set({ isBootstrapping: false });
          return false;
        }
      },

      isEnterprise: () => get().accountType === 'ENTERPRISE',

      isAuthenticated() {
        const { accessToken, expiresAt, accountType } = get();
        if (!expiresAt || Date.now() >= expiresAt) return false;
        // Individual (Firebase): a real bearer token. Enterprise: no token
        // string (HttpOnly cookie, invisible to JS) — accountType +
        // expiresAt from a successful bootstrap /me call is the signal.
        return !!accessToken || accountType === 'ENTERPRISE';
      },

      hasRole(role) {
        return !!get().user?.roles?.includes(role);
      },
    }),
    {
      name: 'forgefuzz.auth',
      storage: createJSONStorage(() => rememberAwareStorage),
      // `isBootstrapping` must NOT persist — it needs to start `true` on
      // every fresh page load (that's the whole point: block RequireAuth
      // until the new bootstrap call resolves). Persisting it would
      // restore last session's terminal value (usually `false`) before
      // App.tsx's bootstrap effect even runs, letting RequireAuth redirect
      // to /login on the very first render despite a still-valid cookie.
      partialize: (state) => {
        const { isBootstrapping: _isBootstrapping, ...rest } = state;
        return rest;
      },
    },
  ),
);

// Sync helpers for non-React modules (interceptors).
export const getAccessToken  = (): string | null  => useAuth.getState().accessToken;
export const getRefreshToken = (): string | null  => useAuth.getState().refreshToken;
export const clearAuth       = (): Promise<void> => useAuth.getState().clear();

// ─── Cross-tab subscription (runs once on module load) ────────────────────
onAuthBroadcast((evt) => {
  const s = useAuth.getState();
  if (evt.type === 'login') {
    s._hydrateFromBroadcast({
      accessToken: evt.payload.accessToken,
      refreshToken: evt.payload.refreshToken,
      expiresAt: evt.payload.expiresAt,
      user: evt.payload.user as UserView,
    });
  } else if (evt.type === 'logout') {
    s._hydrateFromBroadcast({ accessToken: null, refreshToken: null, expiresAt: null, user: null });
  } else if (evt.type === 'refresh') {
    s._hydrateFromBroadcast({ accessToken: evt.payload.accessToken, expiresAt: evt.payload.expiresAt });
  }
});
