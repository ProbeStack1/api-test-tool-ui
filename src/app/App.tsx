/**
 * Root App — minimal wiring: providers + router.
 */
import { Providers } from './providers';
import { AppRouter } from './router';
import { useEffect } from 'react';
import { useAuth } from '@/stores/auth.store';
import { useRequests } from '@/stores/requests.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useVariablesUi } from '@/stores/variables-ui.store';
import { toast } from 'sonner';
// import { useRunHistoryStore } from '@/stores/runHistory.store';

export const App = () => {
  // Bootstrap enterprise session on application mount.
  //
  // `ps_auth_token` is HttpOnly now, so we can no longer check via JS
  // whether the cookie exists before deciding to call bootstrapFromCookie —
  // that check (`getCookie('ps_auth_token')`) always came back empty for an
  // HttpOnly cookie, same as trying to read its value. We just always
  // attempt bootstrap and let the backend's response be the source of
  // truth (see auth.store.ts).
  //
  // We only surface the "session expired" toast on a probestack.io host —
  // that's the only place this cookie is ever plausibly set, so a failed
  // bootstrap there likely means a real expired/revoked session worth
  // telling the user about. On forgefuzz.com, every individual visitor
  // without an enterprise session would otherwise see a false "expired"
  // toast on every single page load.
  useEffect(() => {
    const bootstrap = async () => {
      const success = await useAuth.getState().bootstrapFromCookie();
      const onProbestackHost = /(^|\.)probestack\.io$/i.test(window.location.hostname);
      if (!success && onProbestackHost) {
        toast.error('Your session has expired. Please try logging in again.', {
          duration: 5000,
        });
      }
    };
    bootstrap();
  }, []);

  // Auth sync: clear user-specific data on userId mismatch
  useEffect(() => {
    const unsubscribe = useAuth.subscribe((authState) => {
      const currentUserId = authState.user?.userId ?? null;

      // Check request store
      const storedUserId = useRequests.getState().userId;
      if (currentUserId && storedUserId && currentUserId !== storedUserId) {
        useRequests.getState().clear();
      }

      // Check workspace store
      const wsUserId = useWorkspaceStore.getState().userId;
      if (currentUserId && wsUserId && currentUserId !== wsUserId) {
        useWorkspaceStore.getState().clear();
      }

      // Check variables UI store
      const varUserId = useVariablesUi.getState().userId;
      if (currentUserId && varUserId && currentUserId !== varUserId) {
        useVariablesUi.getState().clear();
      }

      // (Optional) If you want to clear run history on user switch too,
      // add it here (runHistoryStore doesn't store userId, so just clear on mismatch)
      // if (currentUserId && storedUserId && currentUserId !== storedUserId) {
      //   useRunHistoryStore.getState().clear();
      // }
    });

    return unsubscribe;
  }, []);

  // Clean up enterprise SSO query parameters from the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('authToken') || params.has('userEmail') || params.has('userRole')) {
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState(null, '', cleanUrl);
    }
  }, []);

  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
};