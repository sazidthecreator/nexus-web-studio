// Editor state machine (xstate v5).
// Models every editor state explicitly so transitions can't drift.
// Opt-in: the existing editor reducer continues to work. Wire this in
// when you're ready to replace ad-hoc booleans with a single source of truth.

import { createMachine, assign } from "xstate";

export type EditorContext = {
  selectedBlockIds: string[];
  hoveredBlockId: string | null;
  draggingBlockId: string | null;
  resizingBlockId: string | null;
  editingTextBlockId: string | null;
  historyIndex: number;
  historyLength: number;
  isDirty: boolean;
  zoom: number;
  panOffset: { x: number; y: number };
};

export type EditorEvent =
  | { type: "SELECT_BLOCK"; id: string }
  | { type: "SELECT_ADD"; id: string }
  | { type: "HOVER_BLOCK"; id: string | null }
  | { type: "CANVAS_CLICK" }
  | { type: "DESELECT" }
  | { type: "DRAG_START"; id: string }
  | { type: "DRAG_MOVE"; x: number; y: number }
  | { type: "DRAG_END" }
  | { type: "RESIZE_START"; id: string }
  | { type: "RESIZE_MOVE"; w: number; h: number }
  | { type: "RESIZE_END" }
  | { type: "EDIT_TEXT"; id: string }
  | { type: "TEXT_CHANGE"; value: string }
  | { type: "COMMIT_TEXT" }
  | { type: "ESCAPE" }
  | { type: "DELETE" }
  | { type: "DUPLICATE" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SAVE" };

const initialContext: EditorContext = {
  selectedBlockIds: [],
  hoveredBlockId: null,
  draggingBlockId: null,
  resizingBlockId: null,
  editingTextBlockId: null,
  historyIndex: -1,
  historyLength: 0,
  isDirty: false,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
};

export const editorMachine = createMachine({
  id: "editor",
  initial: "idle",
  types: {} as { context: EditorContext; events: EditorEvent },
  context: initialContext,
  states: {
    idle: {
      on: {
        SELECT_BLOCK: {
          target: "blockSelected",
          actions: assign(({ event }) =>
            event.type === "SELECT_BLOCK" ? { selectedBlockIds: [event.id] } : {},
          ),
        },
        HOVER_BLOCK: {
          actions: assign(({ event }) =>
            event.type === "HOVER_BLOCK" ? { hoveredBlockId: event.id } : {},
          ),
        },
        DRAG_START: { target: "dragging" },
      },
    },
    blockSelected: {
      on: {
        SELECT_BLOCK: {
          actions: assign(({ event }) =>
            event.type === "SELECT_BLOCK" ? { selectedBlockIds: [event.id] } : {},
          ),
        },
        SELECT_ADD: {
          actions: assign(({ context, event }) =>
            event.type === "SELECT_ADD"
              ? { selectedBlockIds: [...context.selectedBlockIds, event.id] }
              : {},
          ),
        },
        DESELECT: { target: "idle", actions: assign({ selectedBlockIds: () => [] }) },
        DRAG_START: { target: "dragging" },
        RESIZE_START: { target: "resizing" },
        EDIT_TEXT: { target: "textEditing" },
        ESCAPE: { target: "idle", actions: assign({ selectedBlockIds: () => [] }) },
      },
    },
    dragging: {
      on: {
        DRAG_END: { target: "blockSelected" },
        ESCAPE: { target: "blockSelected" },
      },
    },
    resizing: {
      on: {
        RESIZE_END: { target: "blockSelected" },
        ESCAPE: { target: "blockSelected" },
      },
    },
    textEditing: {
      on: {
        COMMIT_TEXT: { target: "blockSelected" },
        ESCAPE: { target: "blockSelected" },
        CANVAS_CLICK: { target: "idle" },
      },
    },
  },
});
