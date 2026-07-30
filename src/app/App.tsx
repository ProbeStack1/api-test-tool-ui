/**
 * Root App — minimal wiring: providers + router.
 */
import { Providers } from './providers';
import { AppRouter } from './router';
import { useEffect } from 'react';
import { useAuth, getCookie } from '@/stores/auth.store';
import { useRequests } from '@/stores/requests.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useVariablesUi } from '@/stores/variables-ui.store';
import { toast } from 'sonner';
// import { useRunHistoryStore } from '@/stores/runHistory.store';

export const App = () => {
  // NEW: Bootstrap enterprise session on application mount.
  useEffect(() => {
    const bootstrap = async () => {
      const hasCookie = !!getCookie('ps_auth_token');
      const success = await useAuth.getState().bootstrapFromCookie();
      if (!success && hasCookie) {
        // Only show toast if a cookie existed but bootstrapping failed (expired/invalid token)
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