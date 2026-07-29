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
// import { useRunHistoryStore } from '@/stores/runHistory.store'; 

export const App = () => {
  // NEW: Bootstrap enterprise session on application mount.
  useEffect(() => {
    const bootstrap = async () => {
      await useAuth.getState().bootstrapFromCookie();
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

  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
};