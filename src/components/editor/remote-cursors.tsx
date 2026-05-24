// Figma-style remote cursors overlay.
// Uses CSS transitions (no animation library) — smooth, GPU-accelerated.
// Drives off the realtime presence map provided by the parent.

import { memo } from "react";

export type RemoteCursor = {
  userId: string;
  name: string;
  color: string; // any CSS color
  cursor?: { x: number; y: number };
  selectedBlockId?: string | null;
};

type Props = {
  cursors: RemoteCursor[];
  className?: string;
};

function RemoteCursorsImpl({ cursors, className }: Props) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-50 ${className ?? ""}`}
    >
      {cursors.map((c) =>
        c.cursor ? (
          <div
            key={c.userId}
            className="absolute will-change-transform"
            style={{
              transform: `translate3d(${c.cursor.x}px, ${c.cursor.y}px, 0)`,
              transition: "transform 80ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <svg width="16" height="20" viewBox="0 0 16 20" aria-hidden>
              <path
                d="M0 0L0 16L4 12L7 19L9 18L6 11L12 11Z"
                fill={c.color}
                stroke="white"
                strokeWidth="1"
              />
            </svg>
            <span
              className="absolute top-4 left-3 px-2 py-0.5 rounded-full text-xs text-white whitespace-nowrap font-medium shadow"
              style={{ background: c.color }}
            >
              {c.name}
            </span>
          </div>
        ) : null,
      )}
    </div>
  );
}

export const RemoteCursors = memo(RemoteCursorsImpl);

/** Halo for a block another user has selected. Renders inside the block. */
export function BlockCollabHighlight({
  color,
  name,
}: {
  color: string;
  name: string;
}) {
  return (
    <div
      className="absolute inset-0 rounded pointer-events-none"
      style={{ outline: `2px solid ${color}`, background: `${color}18` }}
    >
      <span
        className="absolute -top-6 left-0 text-xs px-1.5 py-0.5 rounded text-white"
        style={{ background: color }}
      >
        {name}
      </span>
    </div>
  );
}
