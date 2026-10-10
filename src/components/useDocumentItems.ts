'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';

interface NumberedRow {
  id: string;
  no: number;
}

function renumber<T extends NumberedRow>(rows: T[]): T[] {
  return rows.map((row, index) => ({ ...row, no: index + 1 }));
}

export default function useDocumentItems<T extends NumberedRow>(
  initialItems: T[] | undefined,
  createItem: () => T,
) {
  const [items, setItems] = useState<T[]>(() =>
    renumber(initialItems?.length ? initialItems.map((item) => ({ ...item })) : [createItem()]),
  );
  const draggedId = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; after: boolean } | null>(null);

  const insertItem = useCallback((afterId?: string) => {
    const item = createItem();
    setItems((previous) => {
      const next = [...previous];
      const index = afterId ? previous.findIndex((row) => row.id === afterId) : previous.length - 1;
      if (afterId && index < 0) return previous;
      next.splice(index + 1, 0, item);
      return renumber(next);
    });
  }, [createItem]);

  const removeItem = useCallback((id: string) => {
    setItems((previous) => renumber(previous.filter((row) => row.id !== id)));
  }, []);

  const moveItem = useCallback((id: string, direction: -1 | 1) => {
    setItems((previous) => {
      const index = previous.findIndex((row) => row.id === id);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[destination]] = [next[destination], next[index]];
      return renumber(next);
    });
  }, []);

  const endDrag = () => {
    draggedId.current = null;
    setDraggingId(null);
    setDropTarget(null);
  };

  const startDrag = (event: DragEvent<HTMLButtonElement>, id: string) => {
    draggedId.current = id;
    setDraggingId(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    const row = event.currentTarget.closest('[data-document-item]');
    if (row) event.dataTransfer.setDragImage(row, 20, 20);
  };

  const isAfter = (event: DragEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.clientY > bounds.top + bounds.height / 2;
  };

  const rowDragProps = (id: string) => ({
    'data-document-item': id,
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      if (!draggedId.current) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setDropTarget({ id, after: isAfter(event) });
    },
    onDrop: (event: DragEvent<HTMLDivElement>) => {
      const sourceId = draggedId.current;
      if (!sourceId) return;
      event.preventDefault();
      const after = isAfter(event);
      if (sourceId !== id) {
        setItems((previous) => {
          const source = previous.find((row) => row.id === sourceId);
          if (!source) return previous;
          const next = previous.filter((row) => row.id !== sourceId);
          const targetIndex = next.findIndex((row) => row.id === id);
          if (targetIndex < 0) return previous;
          next.splice(targetIndex + (after ? 1 : 0), 0, source);
          return renumber(next);
        });
      }
      endDrag();
    },
    onDragLeave: (event: DragEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setDropTarget((target) => target?.id === id ? null : target);
      }
    },
  });

  const rowDragClass = (id: string) => [
    draggingId === id ? 'opacity-40' : '',
    dropTarget?.id === id && draggingId !== id
      ? dropTarget.after ? 'ring-2 ring-blue-500 border-b-blue-500' : 'ring-2 ring-blue-500 border-t-blue-500'
      : '',
  ].join(' ');

  return { items, setItems, insertItem, removeItem, moveItem, startDrag, endDrag, rowDragProps, rowDragClass };
}
