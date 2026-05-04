/**
 * Tiny helper around localStorage for the "last opened AI chat session" id.
 *
 * The AI-Assisted page persists the active session here so that switching
 * to another primary tab (Collections, History, …) and coming back keeps
 * the same conversation open — exactly the behaviour the user asked for.
 *
 *   • {@link readActiveSession}  → returns the stored id or null
 *   • {@link writeActiveSession} → stores OR clears (when given null)
 */
const KEY = 'forgeq.aiAssisted.activeSession.v1';

export const readActiveSession = (): string | null => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};

export const writeActiveSession = (id: string | null): void => {
  try {
    if (id) localStorage.setItem(KEY, id);
    else    localStorage.removeItem(KEY);
  } catch { /* private mode / quota — silent */ }
};
