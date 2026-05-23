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
}

interface AuthState {
  user:         UserView | null;
  accessToken:  string | null;
  refreshToken: string | null;
  expiresAt:    number | null;     // epoch-ms; renew before this when possible

  /** Set after a successful login (or hydrated from a sibling tab). */
  setSession(t: { accessToken: string; refreshToken: string; expiresInSec: number; user: UserView }): void;
  /** Replace just the access token after a /refresh round-trip. */
  setAccessToken(t: { accessToken: string; expiresInSec: number }): void;
  /** Explicit sign-out (or hydrated from a sibling tab). */
  clear(): void;
  /** Internal: apply state pushed by another tab without re-broadcasting. */
  _hydrateFromBroadcast(p: Partial<AuthState>): void;

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

      setSession({ accessToken, refreshToken, expiresInSec, user }) {
        const expiresAt = Date.now() + expiresInSec * 1000;
        set({ user, accessToken, refreshToken, expiresAt });
        broadcastAuth({ type: 'login', payload: { accessToken, refreshToken, expiresAt, user } });
      },

      setAccessToken({ accessToken, expiresInSec }) {
        const expiresAt = Date.now() + expiresInSec * 1000;
        set({ accessToken, expiresAt });
        broadcastAuth({ type: 'refresh', payload: { accessToken, expiresAt } });
      },

      clear() {
        set({ user: null, accessToken: null, refreshToken: null, expiresAt: null });
        broadcastAuth({ type: 'logout' });
      },

      _hydrateFromBroadcast(p) { set(p as Partial<AuthState>); },

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
export const clearAuth       = (): void           => useAuth.getState().clear();

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
