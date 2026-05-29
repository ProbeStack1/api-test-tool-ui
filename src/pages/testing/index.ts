/**
 * Single public export — TestingLayout owns every sub-view internally
 * via `useTestingStore`. This keeps the router clean and makes the
 * URL `/projects/testing` stable across all in-page navigation.
 */
export { TestingPage } from './TestingPage';
