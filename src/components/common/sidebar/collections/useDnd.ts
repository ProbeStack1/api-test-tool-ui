/**
 * useDnd — tiny native HTML5 drag-and-drop helpers for the Collections
 * sidebar. Keeps the rest of CollectionsPanel free of dataTransfer
 * plumbing.
 *
 * Payload shape (JSON-encoded in dataTransfer):
 *   { kind: 'request' | 'folder', id: string, collectionId: string }
 *
 * Drop targets:
 *   • Collection — move item to collection root
 *   • Folder     — move item inside that folder
 */
import { useState, type DragEvent } from 'react';

export type DnDPayload = {
  kind: 'request' | 'folder';
  id: string;
  collectionId: string;
};

const MIME = 'application/x-forgeq-node';

export const makeDragStart = (payload: DnDPayload) => (e: DragEvent) => {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData(MIME, JSON.stringify(payload));
  // also a text fallback so the native drag image shows something useful
  e.dataTransfer.setData('text/plain', `${payload.kind}:${payload.id}`);
};

export const readPayload = (e: DragEvent): DnDPayload | null => {
  const raw = e.dataTransfer.getData(MIME);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

/** Hook factored out for a drop-target (folder or collection). */
export const useDropTarget = (onDrop: (payload: DnDPayload) => void | Promise<void>) => {
  const [over, setOver] = useState(false);
  return {
    over,
    dropHandlers: {
      onDragEnter: (e: DragEvent) => {
        if (e.dataTransfer.types.includes(MIME)) {
          e.preventDefault();
          setOver(true);
        }
      },
      onDragOver: (e: DragEvent) => {
        if (e.dataTransfer.types.includes(MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }
      },
      onDragLeave: (e: DragEvent) => {
        // ignore bubbling from children
        if (e.currentTarget === e.target) setOver(false);
      },
      onDrop: async (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        const payload = readPayload(e);
        if (payload) await onDrop(payload);
      },
    },
  };
};
