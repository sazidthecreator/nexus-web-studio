import { useEffect } from "react";

export type EditorShortcutHandlers = {
  undo: () => void;
  redo: () => void;
  save: () => void;
  duplicate: () => void;
  copy: () => void;
  paste: () => void;
  remove: () => void;
  deselect: () => void;
  moveUp: () => void;
  moveDown: () => void;
  selectNext: () => void;
  selectPrev: () => void;
  togglePalette: () => void;
  toggleShortcuts: () => void;
  toggleDevtools: () => void;
};

const isEditable = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
};

export function useEditorShortcuts(h: EditorShortcutHandlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();

      // Always-on: command palette
      if (meta && k === "k") { e.preventDefault(); h.togglePalette(); return; }

      if (isEditable(e.target)) return;

      if (meta && k === "z" && !e.shiftKey) { e.preventDefault(); h.undo(); return; }
      if (meta && (k === "y" || (k === "z" && e.shiftKey))) { e.preventDefault(); h.redo(); return; }
      if (meta && k === "s") { e.preventDefault(); h.save(); return; }
      if (meta && k === "d") { e.preventDefault(); h.duplicate(); return; }
      if (meta && k === "c") { h.copy(); return; }
      if (meta && k === "v") { h.paste(); return; }
      if (meta && e.shiftKey && k === "d") { e.preventDefault(); h.toggleDevtools(); return; }

      if (k === "delete" || k === "backspace") { e.preventDefault(); h.remove(); return; }
      if (k === "escape") { h.deselect(); return; }
      if (k === "?" || (e.shiftKey && k === "/")) { e.preventDefault(); h.toggleShortcuts(); return; }
      if (k === "arrowup") { e.preventDefault(); h.moveUp(); return; }
      if (k === "arrowdown") { e.preventDefault(); h.moveDown(); return; }
      if (k === "tab") {
        e.preventDefault();
        if (e.shiftKey) h.selectPrev(); else h.selectNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [h]);
}
