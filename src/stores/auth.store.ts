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
 * Helper to read a cookie by name.
 * Used for enterprise auth (ps_auth_token) bootstrap.
 */
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

/**
 * Helper to delete a cookie by name (sets expiry to epoch).
 * Used during logout to clear ps_auth_token and ps_auth_session.
 */
const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  // Extra attempt for subdomain
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
};

interface AuthState {
  user:         UserView | null;
  accessToken:  string | null;
  refreshToken: string | null;
  expiresAt:    number | null;     // epoch-ms; renew before this when possible
  /** NEW: Cached account type to avoid repeated checks and allow early renders. */
  accountType:  'INDIVIDUAL' | 'ENTERPRISE' | null;

  /** Set after a successful login (or hydrated from a sibling tab). */
  setSession(t: { accessToken: string; refreshToken: string; expiresInSec: number; user: UserView }): void;
  /** Replace just the access token after a /refresh round-trip. */
  setAccessToken(t: { accessToken: string; expiresInSec: number }): void;
  /** Explicit sign-out (or hydrated from a sibling tab). */
  clear(): Promise<void>;
  /** Internal: apply state pushed by another tab without re-broadcasting. */
  _hydrateFromBroadcast(p: Partial<AuthState>): void;

  /** NEW: Bootstrap enterprise session using the ps_auth_token cookie. */
  bootstrapFromCookie(): Promise<void>;
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

      setSession({ accessToken, refreshToken, expiresInSec, user }) {
        const expiresAt = Date.now() + expiresInSec * 1000;
        set({ 
          user, 
          accessToken, 
          refreshToken, 
          expiresAt, 
          accountType: user?.accountType || 'INDIVIDUAL' 
        });
        broadcastAuth({ type: 'login', payload: { accessToken, refreshToken, expiresAt, user } });
      },

      setAccessToken({ accessToken, expiresInSec }) {
        const expiresAt = Date.now() + expiresInSec * 1000;
        set({ accessToken, expiresAt });
        broadcastAuth({ type: 'refresh', payload: { accessToken, expiresAt } });
      },

      clear: async () => {
        // Frontend cookies clear
        deleteCookie('ps_auth_token');
        deleteCookie('ps_auth_session');

        set({ 
          user: null, 
          accessToken: null, 
          refreshToken: null, 
          expiresAt: null,
          accountType: null 
        });
        broadcastAuth({ type: 'logout' });
      },

      _hydrateFromBroadcast(p) { set(p as Partial<AuthState>); },

      /**
       * Bootstraps an enterprise session from the ps_auth_token cookie.
       * Called once on app load. If the cookie exists, we call /me
       * with it to hydrate the store without showing the login page.
       */
      bootstrapFromCookie: async () => {
        // If we already have a valid Firebase session, skip bootstrap.
        const { accessToken, expiresAt } = get();
        if (accessToken && expiresAt && Date.now() < expiresAt) {
          return;
        }

        const cookieToken = getCookie('ps_auth_token');
        if (!cookieToken) return;

        try {
          // Dynamically import http to avoid circular dependency issues.
          const { createHttp } = await import('@/lib/http');
          const http = createHttp('userMgmt');
          const res = await http.get('/api/v1/users/me', {
            headers: { Authorization: `Bearer ${cookieToken}` }
          });
          
          const userData = res.data as UserView;
          
          // If backend doesn't send accountType yet, derive it from cookie presence.
          if (!userData.accountType) {
            userData.accountType = 'ENTERPRISE';
          }

          // We set a fake refreshToken & a 1-hour expiry guess.
          // The backend will reject the token if truly expired, triggering 401 -> logout.
          const expiresAt = Date.now() + 3600 * 1000;
          set({ 
            user: userData, 
            accessToken: cookieToken, 
            refreshToken: null, 
            expiresAt,
            accountType: userData.accountType 
          });
          
          broadcastAuth({ 
            type: 'login', 
            payload: { 
              accessToken: cookieToken, 
              refreshToken: '', 
              expiresAt, 
              user: userData 
            } 
          });
        } catch (err) {
          console.warn('Enterprise bootstrap failed:', err);
          // If /me fails (expired/revoked cookie), do nothing.
          // The user will be redirected to login if they navigate to a protected route.
        }
      },

      isEnterprise: () => get().accountType === 'ENTERPRISE',

      isAuthenticated() {
        const { accessToken, expiresAt } = get();
        return !!accessToken && !!expiresAt && Date.now() < expiresAt;
      },

      hasRole(role) {
        return !!get().user?.roles?.includes(role);
      },
    }),
    {
      name: 'forgefuzz.auth',
      storage: createJSONStorage(() => localStorage),
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
