/**
 * Root App — minimal wiring: providers + router.
 */
import { Providers } from './providers';
import { AppRouter } from './router';

export const App = () => (
  <Providers>
    <AppRouter />
  </Providers>
);
