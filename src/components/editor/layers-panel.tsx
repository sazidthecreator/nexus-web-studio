import type { Block } from "@/lib/blocks";
import { GripVertical, Eye, EyeOff, Trash2 } from "lucide-react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function LayersPanel({
  blocks,
  selectedIds,
  onSelect,
  onReorder,
  onToggleHidden,
  onRemove,
}: {
  blocks: Block[];
  selectedIds: Set<string>;
  onSelect: (id: string, additive: boolean) => void;
  onReorder: (from: number, to: number) => void;
  onToggleHidden: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const handleEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    if (from < 0 || to < 0) return;
    arrayMove(blocks, from, to);
    onReorder(from, to);
  };
  return (
    <div className="space-y-1">
      <h3 className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
        Layers
      </h3>
      {blocks.length === 0 ? (
        <p className="text-xs text-muted-foreground">No blocks yet.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((b) => (
              <LayerRow
                key={b.id}
                block={b}
                selected={selectedIds.has(b.id)}
                onSelect={(additive) => onSelect(b.id, additive)}
                onToggleHidden={() => onToggleHidden(b.id)}
                onRemove={() => onRemove(b.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function LayerRow({
  block,
  selected,
  onSelect,
  onToggleHidden,
  onRemove,
}: {
  block: Block;
  selected: boolean;
  onSelect: (additive: boolean) => void;
  onToggleHidden: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const hidden = block.props?.__hidden === true;
  const label = (block.props?.headline || block.props?.title || block.props?.label || block.props?.body || block.type) as string;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`group flex items-center gap-1 rounded-md px-1.5 py-1 cursor-pointer transition-colors ${
        selected ? "bg-primary/10 text-primary" : "hover:bg-muted"
      }`}
      onClick={(e) => onSelect(e.shiftKey || e.metaKey || e.ctrlKey)}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing text-muted-foreground"
        title="Drag to reorder"
      >
        <GripVertical className="size-3.5" />
      </button>
      <span className="flex-1 truncate text-xs">
        <span className="font-medium capitalize">{block.type}</span>
        <span className="text-muted-foreground"> · {String(label).slice(0, 24)}</span>
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleHidden(); }}
        className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
        title={hidden ? "Show" : "Hide"}
      >
        {hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
        title="Delete"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
