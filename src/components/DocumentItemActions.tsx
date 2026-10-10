'use client';

import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import type { DragEvent } from 'react';

interface DocumentItemActionsProps {
  number: number;
  first: boolean;
  last: boolean;
  canRemove: boolean;
  onInsert: () => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
}

export default function DocumentItemActions({
  number, first, last, canRemove, onInsert, onRemove, onMove, onDragStart, onDragEnd,
}: DocumentItemActionsProps) {
  const buttonClass = 'rounded p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-30 disabled:cursor-not-allowed';
  return (
    <div className="grid w-24 shrink-0 grid-cols-3 gap-0.5">
      <button
        type="button"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            onMove(event.key === 'ArrowUp' ? -1 : 1);
          }
        }}
        aria-label={`Drag item ${number} to reorder`}
        title="Drag to reorder; use arrow keys when focused"
        className={`${buttonClass} cursor-grab active:cursor-grabbing`}
      >
        <GripVertical size={18} />
      </button>
      <button type="button" disabled={first} onClick={() => onMove(-1)} aria-label={`Move item ${number} up`} title="Move up" className={buttonClass}>
        <ArrowUp size={18} />
      </button>
      <button type="button" disabled={last} onClick={() => onMove(1)} aria-label={`Move item ${number} down`} title="Move down" className={buttonClass}>
        <ArrowDown size={18} />
      </button>
      <button type="button" onClick={onInsert} aria-label={`Insert item below ${number}`} title="Insert a blank item below" className={`${buttonClass} text-blue-600`}>
        <Plus size={18} />
      </button>
      {canRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove item ${number}`} title="Remove item" className={`${buttonClass} text-red-500 hover:text-red-700`}>
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
}
