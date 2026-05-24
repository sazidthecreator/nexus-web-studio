import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { ReactNode } from "react";

export type BlockContextActions = {
  onDuplicate: () => void;
  onDelete: () => void;
  onCopyStyles: () => void;
  onPasteStyles: () => void;
  hasCopiedStyles: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSaveAsPreset?: () => void;
};

export function BlockContextMenu({ children, actions }: { children: ReactNode; actions: BlockContextActions }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={actions.onDuplicate}>Duplicate <span className="ml-auto text-xs text-muted-foreground">⌘D</span></ContextMenuItem>
        <ContextMenuItem onClick={actions.onCopyStyles}>Copy styles</ContextMenuItem>
        <ContextMenuItem onClick={actions.onPasteStyles} disabled={!actions.hasCopiedStyles}>Paste styles</ContextMenuItem>
        {actions.onSaveAsPreset && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={actions.onSaveAsPreset}>Save as preset…</ContextMenuItem>
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={actions.onMoveUp}>Move up <span className="ml-auto text-xs text-muted-foreground">↑</span></ContextMenuItem>
        <ContextMenuItem onClick={actions.onMoveDown}>Move down <span className="ml-auto text-xs text-muted-foreground">↓</span></ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={actions.onDelete} className="text-destructive focus:text-destructive">
          Delete <span className="ml-auto text-xs text-muted-foreground">⌫</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
