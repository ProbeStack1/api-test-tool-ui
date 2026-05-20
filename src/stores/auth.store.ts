/**
 * Auth store — single source of truth for the logged-in user + JWT pair.
 *
 * Persists access + refresh tokens in localStorage so reloads keep the
 * session. The HTTP layer (`lib/http.ts`) reads `getAccessToken()` on
 * every request and the response interceptor calls `refresh()` once
 * when it sees a 401 with `AUTH_TOKEN_EXPIRED`.
 *
 * Key shape lives in {@link UserView} — keep in lock-step with
 * the backend DTO at `forgeq-test-user-mgmt-svc → dto/AuthDtos.UserView`.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

  setSession(t: { accessToken: string; refreshToken: string; expiresInSec: number; user: UserView }): void;
  clear(): void;

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
        set({
          user,
          accessToken,
          refreshToken,
          expiresAt: Date.now() + expiresInSec * 1000,
        });
      },

      clear() {
        set({ user: null, accessToken: null, refreshToken: null, expiresAt: null });
      },

      isAuthenticated() {
        const { accessToken, expiresAt } = get();
        return !!accessToken && !!expiresAt && Date.now() < expiresAt;
      },

      hasRole(role) {
        return !!get().user?.roles?.includes(role);
      },
    }),
    {
      name: 'forgeq.auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Sync helpers for non-React modules (interceptors).
export const getAccessToken  = (): string | null  => useAuth.getState().accessToken;
export const getRefreshToken = (): string | null  => useAuth.getState().refreshToken;
export const clearAuth       = (): void           => useAuth.getState().clear();
