// Pages bar: switch / add / rename / delete / reorder pages in the editor.
import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ProjectContent, ProjectPage } from "@/lib/blocks";
import { uid } from "@/lib/blocks";
import { PageSettingsButton } from "./page-settings";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Page = ProjectPage;

export function PagesBar({
  pages, currentPageId, onChange, onSwitch,
}: {
  pages: Page[];
  currentPageId: string;
  onChange: (next: Page[]) => void;
  onSwitch: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function addPage() {
    const n = pages.length + 1;
    const p: Page = { id: uid("pg"), name: `Page ${n}`, blocks: [] };
    onChange([...pages, p]);
    onSwitch(p.id);
    setEditingId(p.id);
    setDraftName(p.name);
  }
  function rename(id: string, name: string) {
    const clean = name.trim() || "Untitled";
    onChange(pages.map((p) => (p.id === id ? { ...p, name: clean } : p)));
  }
  function patchPage(id: string, patch: Partial<Page>) {
    onChange(pages.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function remove(id: string) {
    if (pages.length <= 1) return;
    const next = pages.filter((p) => p.id !== id);
    onChange(next);
    if (currentPageId === id) onSwitch(next[0].id);
  }
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = pages.findIndex((p) => p.id === active.id);
    const to = pages.findIndex((p) => p.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(pages, from, to));
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={pages.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex items-center gap-1">
            {pages.map((p) => (
              <SortablePageTab
                key={p.id}
                page={p}
                active={p.id === currentPageId}
                editing={editingId === p.id}
                draftName={draftName}
                canDelete={pages.length > 1}
                onSwitch={() => onSwitch(p.id)}
                onStartRename={() => { setEditingId(p.id); setDraftName(p.name); }}
                onChangeDraft={setDraftName}
                onCommitRename={() => { rename(p.id, draftName); setEditingId(null); }}
                onCancelRename={() => setEditingId(null)}
                onRequestDelete={() => setConfirmDeleteId(p.id)}
                onPatch={(patch) => patchPage(p.id, patch)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button size="icon" variant="ghost" onClick={addPage} title="Add page" aria-label="Add page">
        <Plus className="size-4" />
      </Button>
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this page?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the page and all of its blocks. You can undo immediately with ⌘Z.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmDeleteId) remove(confirmDeleteId); setConfirmDeleteId(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortablePageTab({
  page, active, editing, draftName, canDelete,
  onSwitch, onStartRename, onChangeDraft, onCommitRename, onCancelRename, onRequestDelete, onPatch,
}: {
  page: Page; active: boolean; editing: boolean; draftName: string; canDelete: boolean;
  onSwitch: () => void; onStartRename: () => void; onChangeDraft: (s: string) => void;
  onCommitRename: () => void; onCancelRename: () => void; onRequestDelete: () => void;
  onPatch: (patch: Partial<Page>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
        active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
      }`}
    >
      <button {...attributes} {...listeners} className="cursor-grab opacity-50 hover:opacity-100" aria-label="Reorder page">
        <FileText className="size-3.5" />
      </button>
      {editing ? (
        <>
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => onChangeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitRename();
              if (e.key === "Escape") onCancelRename();
            }}
            className="h-6 w-28 px-1 text-xs"
            aria-label="Page name"
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCommitRename} aria-label="Save page name">
            <Check className="size-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancelRename} aria-label="Cancel rename">
            <X className="size-3.5" />
          </Button>
        </>
      ) : (
        <>
          <button onClick={onSwitch} className="px-1 font-medium" title="Switch to page">
            {page.name}
          </button>
          <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={onStartRename} aria-label="Rename page">
            <Pencil className="size-3" />
          </Button>
          <PageSettingsButton page={page} onChange={onPatch} />
          {canDelete && (
            <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={onRequestDelete} aria-label="Delete page">
              <Trash2 className="size-3" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
