/**
 * AI-Assisted dedicated tab — full-width chat room.
 *
 * UX rules (per user):
 *   1. First visit (no chats yet) shows an empty chat room with the
 *      composer ALREADY enabled. The user can type immediately — no
 *      "create chat" click required. The first send auto-creates a
 *      session and dispatches the message in one go.
 *   2. The active session id is persisted to localStorage so navigating
 *      to another primary tab (Collections, History, …) and returning
 *      keeps the same conversation open.
 *   3. The "+ New chat" button (in the sidebar panel) is meant for the
 *      case when a chat is already open and the user wants to start a
 *      fresh one.
 *   4. If the persisted session was deleted (404 from the detail call),
 *      we silently clear the localStorage entry and fall back to the
 *      empty composer state.
 */
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createSession, getSession, sendMessage, type SessionDetail,
} from '@/services/aiChat.service';
import { ChatRoom } from './ChatRoom';
import { readActiveSession, writeActiveSession } from './aiSessionStorage';

export const AiAssistedPage = () => {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('session');
  const setSelectedId = (id: string | null) =>
    setSearchParams(id ? { session: id } : {}, { replace: true });

  /* ---------- localStorage hydration ----------
     On mount, if the URL has no `session` param but localStorage holds
     one, repopulate the URL. Only fires once. */
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (!selectedId) {
      const stored = readActiveSession();
      if (stored) setSelectedId(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Persist selectedId on every change. */
  useEffect(() => { writeActiveSession(selectedId); }, [selectedId]);

  /* ---------- detail query ---------- */
  const detailQ = useQuery<SessionDetail>({
    queryKey: ['ai-chat', 'detail', selectedId],
    queryFn: () => getSession(selectedId!),
    enabled: !!selectedId,
    staleTime: 0,
    retry: false,
  });

  /* If the persisted session 404s, gracefully reset. */
  useEffect(() => {
    if (detailQ.isError && selectedId) {
      writeActiveSession(null);
      setSelectedId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQ.isError]);

  /* ---------- send (handles both: existing session AND auto-create) ---------- */
  const sendMut = useMutation({
    mutationFn: async ({ id, content }: { id: string | null; content: string }) => {
      let sid = id;
      if (!sid) {
        const fresh = await createSession();
        sid = fresh.id;
        writeActiveSession(sid);
        setSelectedId(sid);
        /* Seed the detail cache so the optimistic bubbles render
           immediately — even before the detail query has its turn. */
        qc.setQueryData<any>(['ai-chat', 'detail', sid], {
          session: fresh,
          messages: [],
        });
        qc.invalidateQueries({ queryKey: ['ai-chat', 'sessions'] });
      }
      /* Optimistic UI for both the existing-session and just-created cases. */
      const now = new Date().toISOString();
      qc.setQueryData<any>(['ai-chat', 'detail', sid], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: [
            ...old.messages,
            { id: `tmp-${Date.now()}`, role: 'user', content, createdAt: now },
            { id: `tmp-pending-${Date.now()}`, role: 'assistant', content: '', createdAt: now, _pending: true },
          ],
        };
      });
      return await sendMessage(sid, content);
    },
    onSuccess: (_, vars) => {
      const sid = vars.id ?? readActiveSession();
      if (sid) qc.invalidateQueries({ queryKey: ['ai-chat', 'detail', sid] });
      qc.invalidateQueries({ queryKey: ['ai-chat', 'sessions'] });
    },
    onError: (e: any) => {
      const sid = readActiveSession();
      if (sid) qc.invalidateQueries({ queryKey: ['ai-chat', 'detail', sid] });
      toast.error(e?.message ?? 'Failed to reach AI');
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-probestack-bg" data-testid="ai-assisted-page">
      <ChatRoom
        detail={detailQ.data}
        loading={!!selectedId && detailQ.isFetching && !detailQ.data}
        sending={sendMut.isPending}
        onSend={(text) => sendMut.mutate({ id: selectedId, content: text })}
      />
    </div>
  );
};
