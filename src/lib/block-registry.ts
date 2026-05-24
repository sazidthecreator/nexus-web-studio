// Versioned, extensible block registry (Sitely Elite v2).
// This is the SCHEMA for a v2 block. Existing blocks continue to use the
// legacy `BLOCK_LIBRARY` in src/lib/blocks.ts; new blocks may register here
// to opt into the property-controls panel + migration system.
//
// Migrate a stored block (with an old props shape) to the current version
// by walking each registered migration step.

import type { ComponentType } from "react";
import type { PropertyControl } from "./property-controls";

export type BlockCategory =
  | "structure"
  | "content"
  | "media"
  | "interactive"
  | "data"
  | "embed"
  | "commerce";

export type BlockDefinition<P extends Record<string, unknown> = Record<string, unknown>> = {
  type: string;
  version: number;
  label: string;
  description: string;
  category: BlockCategory;
  icon: ComponentType<{ className?: string }>;
  keywords: string[];

  defaultProps: P;
  migrate?: (oldProps: any, fromVersion: number) => P;

  component: ComponentType<{ props: P; editing: boolean }>;
  publishedComponent?: ComponentType<{ props: P }>;

  controls: PropertyControl[];

  constraints?: {
    maxPerPage?: number;
    minWidth?: number;
    allowedChildren?: string[];
  };

  thumbnail: string;
  previewProps?: Partial<P>;
};

export type StoredBlock = {
  id: string;
  type: string;
  version?: number;
  props: Record<string, unknown>;
};

const REGISTRY = new Map<string, BlockDefinition<any>>();

export function registerBlock<P extends Record<string, unknown>>(
  def: BlockDefinition<P>,
): void {
  REGISTRY.set(def.type, def);
}

export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return REGISTRY.get(type);
}

export function listBlockDefinitions(): BlockDefinition[] {
  return Array.from(REGISTRY.values());
}

/**
 * Walk migrations until the stored block's props match the current schema
 * version. Throws if the type is unknown so we never render stale shapes.
 */
export function migrateBlock(block: StoredBlock): StoredBlock & { version: number } {
  const def = REGISTRY.get(block.type);
  if (!def) throw new Error(`Unknown block type: ${block.type}`);
  let props: any = block.props;
  let version = block.version ?? 1;
  while (version < def.version) {
    props = def.migrate ? def.migrate(props, version) : props;
    version++;
  }
  return { ...block, props, version };
}
