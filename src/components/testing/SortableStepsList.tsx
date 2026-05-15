/**
 * SortableStepsList — generic drag-to-reorder list backed by @dnd-kit/sortable
 * (Task 3.6). Used wherever a UI surfaces an ordered step/request/case
 * collection and we want the user to reshuffle them with mouse or
 * keyboard.
 *
 * Caller responsibilities:
 *   - Provide an array of items with stable string ids.
 *   - Provide a `renderItem(item, dragHandleProps)` render function so
 *     this component never needs to know what the rows look like.
 *   - Persist the new order in `onChange`. The persistence call (PATCH
 *     against the backend) is up to the caller — keeps this component
 *     transport-agnostic.
 *
 * Accessibility:
 *   - The DnD context wires keyboard sensors automatically, so users
 *     who can't drag can reorder with `Tab` + `Space` + `arrow keys`.
 *   - We also attach a visible "drag handle" with proper aria-grabbed.
 */
import { useMemo } from 'react';
import {
  DndContext, type DragEndEvent, closestCenter,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
  sortableKeyboardCoordinates, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface DragHandleProps {
  attributes: ReturnType<typeof useSortable>['attributes'];
  listeners: ReturnType<typeof useSortable>['listeners'];
}

interface Props<T extends { id: string }> {
  items: T[];
  /** Called with the reordered array whenever a drop completes. */
  onChange: (next: T[]) => void;
  /** Render function — receives the item and the drag-handle props you
   *  must spread on whatever element should be grabbable. */
  renderItem: (item: T, handle: DragHandleProps, idx: number) => React.ReactNode;
  /** Optional className for the outer ul. */
  className?: string;
  /** Optional className for each row wrapper (between DnD and renderItem). */
  itemClassName?: string;
}

export function SortableStepsList<T extends { id: string }>({
  items, onChange, renderItem, className, itemClassName,
}: Props<T>) {
  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to   = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onChange(arrayMove(items, from, to));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={cn('flex flex-col', className)} data-testid="sortable-list">
          {items.map((item, idx) => (
            <SortableRow
              key={item.id}
              id={item.id}
              className={itemClassName}
              render={(handle) => renderItem(item, handle, idx)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id, render, className,
}: {
  id: string;
  render: (handle: DragHandleProps) => React.ReactNode;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-60', className)}
      data-testid={`sortable-row-${id}`}
    >
      {render({ attributes, listeners })}
    </li>
  );
}

/** Pre-styled drag handle — small grip icon that callers can drop into
 *  their row layout. Spread the handle props to enable grab. */
export function DragHandle(props: DragHandleProps) {
  return (
    <button
      {...props.attributes}
      {...props.listeners}
      type="button"
      aria-label="Drag to reorder"
      className="cursor-grab rounded p-0.5 text-text-muted hover:bg-hover hover:text-text-secondary active:cursor-grabbing"
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  );
}

export default SortableStepsList;
