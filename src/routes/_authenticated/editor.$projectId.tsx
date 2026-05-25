import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Monitor, Tablet, Smartphone, Plus, Trash2, Save, Undo2, Redo2,
  Sparkles, GripVertical, Layers, Code2, Keyboard, Search, Download, Map as MapIcon,
  Gauge,
} from "lucide-react";
import { OnboardingTour, openOnboardingTour } from "@/components/editor/onboarding-tour";
import { AuditPanel } from "@/components/editor/audit-panel";
import { CanvasMinimap } from "@/components/editor/canvas-minimap";
import { exportSiteZip } from "@/lib/export-site";
import { TemplateIoButtons } from "@/components/editor/template-io-button";
import { AiCopyRewriteButton } from "@/components/editor/ai-copy-rewrite";
import { AiBlockRewriteButton } from "@/components/editor/ai-block-rewrite";
import { setAiHistoryProject } from "@/lib/ai-history";
import { cacheProject, getCachedProject, queueEdit, isOnline } from "@/lib/offline-cache";
import { startReplayScheduler } from "@/lib/sync/replay-scheduler";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  BLOCK_LIBRARY, createBlock, DEFAULT_BRANDING, FONTS, uid,
  type Block, type BlockType, type ProjectContent,
} from "@/lib/blocks";
import { PRESETS } from "@/lib/presets";
import { TYPO_PRESETS, getTypoPreset, googleFontsHref, typoStyleVars, type TypoPreset } from "@/lib/typography";
import { TypographyPicker } from "@/components/editor/typography-picker";

import { PresetList } from "@/components/editor/preset-preview";
import { SectionLibraryDialog } from "@/components/editor/section-library";
import { UserPresetsPanel } from "@/components/editor/user-presets-panel";
import { useServerFn } from "@tanstack/react-start";
import { createUserPreset } from "@/lib/user-presets.functions";

import { BlockRenderer } from "@/components/block-renderer";
import { PropertyEditor } from "@/components/property-editor";
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CommandPalette, type PaletteAction } from "@/components/editor/command-palette";
import { ShortcutOverlay } from "@/components/editor/shortcut-overlay";
import { DevtoolsPanel } from "@/components/editor/devtools-panel";
import { LayersPanel } from "@/components/editor/layers-panel";
import { BlockContextMenu } from "@/components/editor/context-menu";
import { useEditorShortcuts } from "@/components/editor/use-editor-shortcuts";
import { SeoPanel } from "@/components/editor/seo-panel";
import { WriterAssistant } from "@/components/editor/writer-assistant";
import { ConflictDialog, type ConflictChoice } from "@/components/editor/conflict-dialog";
import { PublishDialog } from "@/components/editor/publish-dialog";
import { BlogPanel } from "@/components/editor/blog-panel";

import { VersionHistory } from "@/components/editor/version-history";
import { CustomCodePanel } from "@/components/editor/custom-code";
import { HealthBadge, HealthPanel, useHealth } from "@/components/editor/health-panel";
import { BulkFixSummaryDialog } from "@/components/editor/bulk-fix-summary-dialog";
import { SubmissionsPanel } from "@/components/editor/submissions-panel";
import { TranslatePanel } from "@/components/editor/translate-panel";
import { CommentsPanel } from "@/components/editor/comments-panel";
import { PresenceBar } from "@/components/editor/presence-bar";
import { Inbox, Languages, MessageSquare } from "lucide-react";
import { Globe, History as HistoryIcon, FileText } from "lucide-react";
import { AiProviderChip } from "@/components/editor/ai-provider-chip";
import { PagesBar } from "@/components/editor/pages-bar";

export const Route = createFileRoute("/_authenticated/editor/$projectId")({
  head: () => ({ meta: [{ title: "Editor — Sitely" }] }),
  component: EditorPage,
});

const VIEWPORTS = {
  desktop: { label: "Desktop", icon: Monitor, width: 1280 },
  tablet: { label: "Tablet", icon: Tablet, width: 768 },
  mobile: { label: "Mobile", icon: Smartphone, width: 390 },
} as const;
type ViewportKey = keyof typeof VIEWPORTS;

// History stack for undo/redo. Tracks past/future sizes via a tick.
function useHistory<T>(initial: T | null) {
  const [state, setState] = useState<T | null>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const [, force] = useState(0);
  const tick = useCallback(() => force((n) => n + 1), []);

  const set = useCallback((next: T, record = true) => {
    setState((prev) => {
      if (record && prev != null) {
        past.current.push(prev);
        if (past.current.length > 100) past.current.shift();
        future.current = [];
      }
      return next;
    });
    tick();
  }, [tick]);

  const undo = useCallback((): T | null => {
    let result: T | null = null;
    setState((prev) => {
      const p = past.current.pop();
      if (!p || prev == null) return prev;
      future.current.push(prev);
      result = p;
      return p;
    });
    tick();
    return result;
  }, [tick]);

  const redo = useCallback((): T | null => {
    let result: T | null = null;
    setState((prev) => {
      const f = future.current.pop();
      if (!f || prev == null) return prev;
      past.current.push(prev);
      result = f;
      return f;
    });
    tick();
    return result;
  }, [tick]);

  return {
    state, set, undo, redo,
    pastSize: past.current.length,
    futureSize: future.current.length,
  };
}

// Find block IDs that differ between two block arrays (added or modified).
function diffBlockIds(prev: Block[], next: Block[]): string[] {
  const prevMap = new Map(prev.map((b) => [b.id, b]));
  const ids: string[] = [];
  for (const b of next) {
    const p = prevMap.get(b.id);
    if (!p || JSON.stringify(p) !== JSON.stringify(b)) ids.push(b.id);
  }
  return ids;
}

function flashBlocks(ids: string[], color: "amber" | "green") {
  requestAnimationFrame(() => {
    ids.forEach((id) => {
      const el = document.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
      if (!el) return;
      el.setAttribute("data-flash", color);
      setTimeout(() => el.removeAttribute("data-flash"), 600);
    });
  });
}

function useGoogleFonts(preset: TypoPreset) {
  useEffect(() => {
    const href = googleFontsHref(preset);
    if (!href) return;
    const id = `wb-gf-${preset.id}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [preset]);
}

function EditorPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const [viewport, setViewport] = useState<ViewportKey>("desktop");
  const history = useHistory<ProjectContent>(null);
  const content = history.state;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [aiPrompt, setAiPrompt] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [devtoolsOpen, setDevtoolsOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [blogOpen, setBlogOpen] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [bulkSummaryOpen, setBulkSummaryOpen] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<import("@/components/editor/bulk-fix-summary-dialog").BulkFixSummary | null>(null);
  const [bulkUndo, setBulkUndo] = useState<{ content: ProjectContent; seo: any; seoPatched: boolean } | null>(null);
  const [submissionsOpen, setSubmissionsOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [minimapOpen, setMinimapOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem("editor.minimap.open");
    return v == null ? true : v === "1";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("editor.minimap.open", minimapOpen ? "1" : "0");
    }
  }, [minimapOpen]);
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const [leftTab, setLeftTab] = useState<"blocks" | "layers" | "ai">("blocks");
  const [sectionLibraryOpen, setSectionLibraryOpen] = useState(false);
  const [userPresetsOpen, setUserPresetsOpen] = useState(false);
  const [rightTab, setRightTab] = useState<"block" | "brand" | "writer">("block");
  const clipboardRef = useRef<Block[]>([]);
  const stylesClipboardRef = useRef<Record<string, any> | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (project?.content) {
      const c = project.content as any;
      const next: ProjectContent = !c.branding
        ? { branding: { ...DEFAULT_BRANDING }, pages: c.pages || [{ id: "home", name: "Home", blocks: [] }] }
        : (c as ProjectContent);
      history.set(next, false);
      const baseUpdatedAt = (project as any).updated_at
        ? Date.parse((project as any).updated_at as string)
        : undefined;
      cacheProject({ id: projectId, content: next, updatedAt: Date.now(), baseUpdatedAt });
    } else if (!project) {
      getCachedProject(projectId).then((cached) => {
        if (cached && !history.state) history.set(cached.content, false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, projectId]);

  // Smart offline replay: backoff retries + per-edit conflict surfacing.
  useEffect(() => {
    const handle = startReplayScheduler(projectId, (s) => {
      if (s.synced > 0) {
        toast.success(`Synced ${s.synced} offline edit${s.synced === 1 ? "" : "s"}`);
      }
      if (s.conflicted.length > 0) {
        // Show the freshest remote so the merge UI compares against it.
        const latest = s.conflicted.reduce(
          (a, b) => (b.remoteUpdatedAt > a.remoteUpdatedAt ? b : a),
        );
        setConflict({ remote: latest.remote, remoteUpdatedAt: latest.remoteUpdatedAt });
        toast.message(
          `${s.conflicted.length} offline edit${s.conflicted.length === 1 ? "" : "s"} conflicted — resolve below.`,
        );
      }
      if (s.failed.length > 0) {
        const giveUp = s.failed.filter((f) => f.givingUp).length;
        const retrying = s.failed.length - giveUp;
        if (retrying > 0) {
          toast.warning(
            `${retrying} edit${retrying === 1 ? "" : "s"} failed — retrying with backoff (${s.failed[0].error}).`,
          );
        }
        if (giveUp > 0) {
          toast.error(
            `${giveUp} edit${giveUp === 1 ? "" : "s"} gave up after ${6} retries — paused 24h.`,
          );
        }
      }
    });
    return () => handle.stop();
  }, [projectId]);

  // Active page (multi-page editing). Persisted per project in localStorage.
  const [currentPageId, setCurrentPageIdState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(`editor.page.${projectId}`) || "";
  });
  const currentPage = useMemo(() => {
    if (!content?.pages?.length) return null;
    return content.pages.find((p) => p.id === currentPageId) ?? content.pages[0];
  }, [content, currentPageId]);
  const setCurrentPageId = useCallback((id: string) => {
    setCurrentPageIdState(id);
    try { window.localStorage.setItem(`editor.page.${projectId}`, id); } catch { /* ignore */ }
  }, [projectId]);
  useEffect(() => {
    if (currentPage && currentPage.id !== currentPageId) setCurrentPageId(currentPage.id);
  }, [currentPage, currentPageId, setCurrentPageId]);

  const blocks = currentPage?.blocks ?? [];
  const branding = content?.branding ?? DEFAULT_BRANDING;
  const selectedId = selectedIds.size === 1 ? [...selectedIds][0] : null;
  const selected = selectedId ? blocks.find((b) => b.id === selectedId) ?? null : null;

  // Auto-switch the right panel between block / brand based on selection,
  // but never override an explicit "writer" choice.
  useEffect(() => {
    setRightTab((cur) => {
      if (cur === "writer") return cur;
      return selected || selectedIds.size > 0 ? "block" : "brand";
    });
  }, [selectedIds, selected]);

  // Pick the single most representative text prop on the selected block —
  // gives Writer a stable source so inline fix replacements can be spliced
  // back into one prop. When nothing is selected, fall back to a joined
  // read-only summary across all blocks (no inline fix in that case).
  const writerSource = useMemo<{ text: string; blockId: string; propKey: string } | null>(() => {
    if (!selected?.props) return null;
    const ordered = ["heading", "title", "headline", "subtitle", "subheading", "body", "text", "description", "content"];
    for (const key of ordered) {
      const v = selected.props[key];
      if (typeof v === "string" && v.trim()) {
        return { text: v, blockId: selected.id, propKey: key };
      }
    }
    // Fallback: any string prop with meaningful length.
    for (const [key, v] of Object.entries(selected.props)) {
      if (typeof v === "string" && v.trim().length > 8) {
        return { text: v, blockId: selected.id, propKey: key };
      }
    }
    return null;
  }, [selected]);

  const writerText = useMemo(() => {
    if (writerSource) return writerSource.text;
    const collect = (props: Record<string, any> | undefined) => {
      if (!props) return "";
      return Object.values(props)
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .join("\n\n");
    };
    return blocks.map((b) => collect(b.props)).filter(Boolean).join("\n\n");
  }, [writerSource, blocks]);

  const headlineTargetKey = useMemo(() => {
    if (!selected?.props) return null;
    const ordered = ["heading", "title", "headline", "subtitle", "subheading"];
    for (const k of ordered) if (typeof selected.props[k] === "string") return k;
    return null;
  }, [selected]);

  const applyMetaDescription = useCallback(async (value: string) => {
    try {
      const existing = ((project as any)?.seo as Record<string, any>) || {};
      const { error } = await supabase
        .from("projects")
        .update({ seo: { ...existing, description: value } as any })
        .eq("id", projectId);
      if (error) throw error;
      toast.success("Meta description updated");
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save meta description");
    }
  }, [project, projectId, router]);

  const applyHeadline = useCallback((value: string) => {
    if (!selected || !headlineTargetKey) {
      toast.error("Select a block with a heading first");
      return;
    }
    updateBlockProps(selected.id, { [headlineTargetKey]: value });
    toast.success(`Updated ${headlineTargetKey}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, headlineTargetKey]);

  const applyWriterFix = useCallback((next: string) => {
    if (!writerSource) return;
    updateBlockProps(writerSource.blockId, { [writerSource.propKey]: next });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writerSource]);


  const setBlocks = useCallback((next: Block[]) => {
    if (!content || !currentPage) return;
    const activeId = currentPage.id;
    const newPages = content.pages.map((p) => (p.id === activeId ? { ...p, blocks: next } : p));
    history.set({ ...content, pages: newPages });
  }, [content, currentPage, history]);

  function updateBranding(patch: Partial<typeof branding>) {
    if (!content) return;
    history.set({ ...content, branding: { ...content.branding, ...patch } });
  }
  function addBlock(type: BlockType) {
    if (!content) return;
    const block = createBlock(type);
    setBlocks([...blocks, block]);
    setSelectedIds(new Set([block.id]));
  }
  function insertBlocks(newBlocks: Block[]) {
    if (!content || newBlocks.length === 0) return;
    setBlocks([...blocks, ...newBlocks]);
    setSelectedIds(new Set(newBlocks.map((b) => b.id)));
  }
  const createPresetFn = useServerFn(createUserPreset);
  const qcEditor = useQueryClient();
  async function saveBlocksAsPreset(ids: string[]) {
    const picked = blocks.filter((b) => ids.includes(b.id));
    if (picked.length === 0) {
      toast.error("Nothing selected");
      return;
    }
    const name = window.prompt(`Save ${picked.length} block(s) as preset — name:`, picked[0].type);
    if (!name?.trim()) return;
    try {
      await createPresetFn({
        data: {
          name: name.trim(),
          category: "Custom",
          thumbnail: null,
          blocks: picked.map((b) => ({ id: b.id, type: b.type, props: b.props || {} })),
        },
      });
      qcEditor.invalidateQueries({ queryKey: ["user_presets"] });
      toast.success(`Saved "${name.trim()}" to your presets`);
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  }
  function addPreset(presetId: string) {
    if (!content) return;
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const newBlocks = preset.build();
    setBlocks([...blocks, ...newBlocks]);
    setSelectedIds(new Set(newBlocks.map((b) => b.id)));
    toast.success(`Inserted "${preset.label}" preset`);
  }
  function removeBlocks(ids: string[]) {
    if (ids.length === 0) return;
    const set = new Set(ids);
    setBlocks(blocks.filter((b) => !set.has(b.id)));
    setSelectedIds(new Set());
  }
  function updateBlockProps(id: string, patch: Record<string, any>) {
    setBlocks(blocks.map((b) => b.id === id ? { ...b, props: { ...b.props, ...patch } } : b));
  }
  function updateBlocksProps(ids: Set<string>, patch: Record<string, any>) {
    setBlocks(blocks.map((b) => ids.has(b.id) ? { ...b, props: { ...b.props, ...patch } } : b));
  }
  function reorder(activeId: string, overId: string) {
    if (activeId === overId) return;
    const oldIdx = blocks.findIndex((b) => b.id === activeId);
    const newIdx = blocks.findIndex((b) => b.id === overId);
    if (oldIdx < 0 || newIdx < 0) return;
    setBlocks(arrayMove(blocks, oldIdx, newIdx));
  }
  function moveSelected(dir: -1 | 1) {
    if (!selectedId) return;
    const idx = blocks.findIndex((b) => b.id === selectedId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= blocks.length) return;
    setBlocks(arrayMove(blocks, idx, target));
  }
  function duplicateSelected() {
    if (selectedIds.size === 0) return;
    const newOnes: Block[] = [];
    const next: Block[] = [];
    for (const b of blocks) {
      next.push(b);
      if (selectedIds.has(b.id)) {
        const copy = { ...b, id: uid(b.type), props: JSON.parse(JSON.stringify(b.props)) };
        next.push(copy);
        newOnes.push(copy);
      }
    }
    setBlocks(next);
    setSelectedIds(new Set(newOnes.map((b) => b.id)));
  }
  function copySelected() {
    if (selectedIds.size === 0) return;
    clipboardRef.current = blocks
      .filter((b) => selectedIds.has(b.id))
      .map((b) => JSON.parse(JSON.stringify(b)));
    toast.success(`Copied ${clipboardRef.current.length} block(s)`);
  }
  function pasteClipboard() {
    if (clipboardRef.current.length === 0) return;
    const copies = clipboardRef.current.map((b) => ({ ...b, id: uid(b.type) }));
    setBlocks([...blocks, ...copies]);
    setSelectedIds(new Set(copies.map((c) => c.id)));
  }
  // Style-only keys we copy across blocks (presentation, not content).
  const STYLE_KEYS = ["align", "style", "rounded", "spacing", "maxWidth"] as const;
  function copyStyles() {
    const source = selected ?? blocks.find((b) => selectedIds.has(b.id));
    if (!source) return;
    const out: Record<string, any> = {};
    for (const k of STYLE_KEYS) if (k in (source.props || {})) out[k] = source.props[k];
    if (Object.keys(out).length === 0) {
      toast.error("No copyable styles on this block");
      return;
    }
    stylesClipboardRef.current = out;
    toast.success(`Copied ${Object.keys(out).length} style prop(s)`);
  }
  function pasteStyles() {
    const clip = stylesClipboardRef.current;
    if (!clip || selectedIds.size === 0) return;
    // Apply only keys the target block actually has, to avoid polluting with irrelevant props.
    setBlocks(blocks.map((b) => {
      if (!selectedIds.has(b.id)) return b;
      const patch: Record<string, any> = {};
      for (const k of Object.keys(clip)) if (k in (b.props || {})) patch[k] = clip[k];
      return Object.keys(patch).length ? { ...b, props: { ...b.props, ...patch } } : b;
    }));
    toast.success(`Pasted styles to ${selectedIds.size} block(s)`);
  }
  function toggleHidden(id: string) {
    const b = blocks.find((x) => x.id === id);
    if (!b) return;
    updateBlockProps(id, { __hidden: !b.props?.__hidden });
  }

  function jumpToSelected() {
    if (!selectedId) return;
    const el = document.querySelector<HTMLElement>(`[data-block-id="${selectedId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Selection helpers
  function selectBlock(id: string, additive: boolean) {
    setSelectedIds((prev) => {
      if (!additive) return new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectStep(dir: 1 | -1) {
    if (blocks.length === 0) return;
    const idx = selectedId ? blocks.findIndex((b) => b.id === selectedId) : -1;
    const next = ((idx + dir + blocks.length) % blocks.length + blocks.length) % blocks.length;
    setSelectedIds(new Set([blocks[next].id]));
  }

  const [conflict, setConflict] = useState<{ remote: ProjectContent; remoteUpdatedAt: number } | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (!content) return;
      const baseUpdatedAt = (project as any)?.updated_at
        ? Date.parse((project as any).updated_at as string)
        : undefined;
      // Always cache locally first.
      cacheProject({ id: projectId, content, updatedAt: Date.now(), baseUpdatedAt });
      if (!isOnline()) {
        await queueEdit({ projectId, content, queuedAt: Date.now(), baseUpdatedAt });
        return { queued: true as const };
      }
      const { checkRemoteConflict, writeProjectContent } = await import("@/lib/sync/conflict");
      const probe = await checkRemoteConflict(projectId, baseUpdatedAt);
      if (probe.status === "conflict") {
        setConflict({ remote: probe.remoteContent, remoteUpdatedAt: probe.remoteUpdatedAt });
        return { queued: false as const, conflict: true as const };
      }
      await writeProjectContent(projectId, content);
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("project_snapshots").insert({
          project_id: projectId,
          user_id: u.user.id,
          content: content as any,
        });
      }
      return { queued: false as const, conflict: false as const };
    },
    onSuccess: (r) => {
      if (r?.queued) toast.success("Saved offline — will sync when online");
      else if ((r as any)?.conflict) toast.message("Sync conflict — please resolve.");
      else { toast.success("Saved"); router.invalidate(); }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Undo/redo with flash highlight
  const onUndo = useCallback(() => {
    const before = blocks;
    const next = history.undo();
    if (next) {
      const ids = diffBlockIds(before, (next.pages.find((p) => p.id === currentPage?.id) ?? next.pages[0]).blocks);
      flashBlocks(ids, "amber");
    }
  }, [blocks, history]);
  const onRedo = useCallback(() => {
    const before = blocks;
    const next = history.redo();
    if (next) {
      const ids = diffBlockIds(before, (next.pages.find((p) => p.id === currentPage?.id) ?? next.pages[0]).blocks);
      flashBlocks(ids, "green");
    }
  }, [blocks, history]);

  useEditorShortcuts({
    undo: onUndo,
    redo: onRedo,
    save: () => save.mutate(),
    duplicate: duplicateSelected,
    copy: copySelected,
    paste: pasteClipboard,
    remove: () => removeBlocks([...selectedIds]),
    deselect: () => setSelectedIds(new Set()),
    moveUp: () => moveSelected(-1),
    moveDown: () => moveSelected(1),
    selectNext: () => selectStep(1),
    selectPrev: () => selectStep(-1),
    togglePalette: () => setPaletteOpen((v) => !v),
    toggleShortcuts: () => setShortcutsOpen((v) => !v),
    toggleDevtools: () => setDevtoolsOpen((v) => !v),
  });

  // Minimap toggle: `M` (ignored while typing in inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() !== "m") return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      setMinimapOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onPaletteAction(a: PaletteAction) {
    switch (a.kind) {
      case "addBlock": addBlock(a.type); break;
      case "selectBlock": {
        setSelectedIds(new Set([a.id]));
        requestAnimationFrame(() => {
          document.querySelector<HTMLElement>(`[data-block-id="${a.id}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        break;
      }
      case "jumpToSelected": jumpToSelected(); break;
      case "undo": onUndo(); break;
      case "redo": onRedo(); break;
      case "save": save.mutate(); break;
      case "duplicate": duplicateSelected(); break;
      case "delete": removeBlocks([...selectedIds]); break;
      case "viewport": setViewport(a.v); break;
      case "openAi": setLeftTab("ai"); break;
      case "openLayers": setLeftTab("layers"); break;
      case "openDevtools": setDevtoolsOpen(true); break;
      case "openShortcuts": setShortcutsOpen(true); break;
      case "openTour": openOnboardingTour(); break;
      case "openSectionLibrary": setSectionLibraryOpen(true); break;
      case "openAudit": setAuditOpen(true); break;
    }
  }

  const aiGenerate = useMutation({
    mutationFn: async (prompt: string) => {
      const { data, error } = await supabase.functions.invoke("generate-blocks", { body: { prompt } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { blocks: { type: BlockType; props: any }[] };
    },
    onSuccess: (data) => {
      if (!content) return;
      const newBlocks: Block[] = (data.blocks || []).map((b) => ({ id: uid(b.type), type: b.type, props: b.props }));
      if (newBlocks.length === 0) { toast.error("AI returned no blocks"); return; }
      setBlocks(newBlocks);
      setAiPrompt("");
      toast.success(`Generated ${newBlocks.length} blocks`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) reorder(String(active.id), String(over.id));
  }

  const previewWidth = VIEWPORTS[viewport].width;
  const fontStyle = useMemo(() => ({ fontFamily: branding.fontFamily }), [branding.fontFamily]);
  const typoPreset = useMemo(() => getTypoPreset(branding.typographyPreset), [branding.typographyPreset]);
  useGoogleFonts(typoPreset);
  const health = useHealth(content, (project as any)?.seo);

  if (isLoading || !content) {
    return <div className="p-8 text-muted-foreground">Loading editor…</div>;
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] relative">
      {/* Left panel */}
      <aside className="editor-panel-left w-72 shrink-0 border-r border-border overflow-y-auto bg-card">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => navigate({ to: "/dashboard" })} aria-label="Back to dashboard">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="text-sm font-semibold truncate">{project?.name}</div>
        </div>
        <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as typeof leftTab)} className="w-full">
          <TabsList className="grid grid-cols-3 mx-4 mt-3">
            <TabsTrigger value="blocks">Blocks</TabsTrigger>
            <TabsTrigger value="layers"><Layers className="size-3.5" /></TabsTrigger>
            <TabsTrigger value="ai"><Sparkles className="size-3.5" /></TabsTrigger>
          </TabsList>
          <TabsContent value="blocks" className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Presets</h3>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px] gap-1"
                    onClick={() => setUserPresetsOpen(true)}
                    title="Your saved presets"
                  >
                    My presets
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px] gap-1"
                    onClick={() => setSectionLibraryOpen(true)}
                  >
                    <Sparkles className="size-3" /> Browse library
                  </Button>
                </div>
              </div>
              <PresetList branding={content?.branding} onInsert={addPreset} />
            </div>
            {Array.from(new Set(BLOCK_LIBRARY.map((b) => b.category))).map((cat) => (
              <div key={cat} className="space-y-2">
                <h3 className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{cat}</h3>
                <div className="space-y-1.5">
                  {BLOCK_LIBRARY.filter((b) => b.category === cat).map((b) => (
                    <button
                      key={b.type}
                      onClick={() => addBlock(b.type)}
                      style={{ transition: "all var(--duration-fast) var(--ease-smooth)" }}
                      className="w-full text-left rounded-lg border border-border bg-background p-2.5 hover:border-primary/40 hover:shadow-sm hover:-translate-y-px"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{b.label}</span>
                        <Plus className="size-3.5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="layers" className="p-4">
            <LayersPanel
              blocks={blocks}
              selectedIds={selectedIds}
              onSelect={selectBlock}
              onReorder={(from, to) => setBlocks(arrayMove(blocks, from, to))}
              onToggleHidden={toggleHidden}
              onRemove={(id) => removeBlocks([id])}
            />
          </TabsContent>
          <TabsContent value="ai" className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">Describe your site. AI will replace the page with generated blocks.</p>
            <Textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="E.g. A landing page for an AI-powered note-taking app for students." rows={5} />
            <Button className="w-full" disabled={!aiPrompt.trim() || aiGenerate.isPending}
              onClick={() => aiGenerate.mutate(aiPrompt)}>
              <Sparkles className="size-4" />
              {aiGenerate.isPending ? "Generating…" : "Generate page"}
            </Button>
            <AiProviderChip />
          </TabsContent>
        </Tabs>
      </aside>

      {/* Center */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/30 relative">
        {content && currentPage && (
          <div className="h-10 border-b border-border bg-background flex items-center px-4 gap-2 overflow-x-auto">
            <PagesBar
              pages={content.pages}
              currentPageId={currentPage.id}
              onChange={(pages) => history.set({ ...content, pages })}
              onSwitch={(id) => { setCurrentPageId(id); setSelectedIds(new Set()); }}
            />
          </div>
        )}
        <div className="h-12 border-b border-border bg-background flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={onUndo} title="Undo (⌘Z)" aria-label="Undo" disabled={history.pastSize === 0}>
                <Undo2 className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={onRedo} title="Redo (⌘⇧Z)" aria-label="Redo" disabled={history.futureSize === 0}>
                <Redo2 className="size-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {(Object.keys(VIEWPORTS) as ViewportKey[]).map((k) => {
                const V = VIEWPORTS[k];
                const Icon = V.icon;
                return (
                  <button key={k} onClick={() => setViewport(k)}
                    style={{ transition: "background-color var(--duration-fast) var(--ease-smooth)" }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 ${viewport === k ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    title={`${V.label} (${V.width}px)`}>
                    <Icon className="size-3.5" />{V.label}
                  </button>
                );
              })}
              <span className="text-xs text-muted-foreground px-2">{previewWidth}px</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setPaletteOpen(true)} title="Command palette (⌘K)">
              <span className="text-xs">⌘K</span>
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setShortcutsOpen(true)} title="Shortcuts (?)" aria-label="Keyboard shortcuts">
              <Keyboard className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setDevtoolsOpen((v) => !v)} title="Devtools (⌘⇧D)" aria-label="Toggle devtools">
              <Code2 className="size-4" />
            </Button>
            <Button
              size="icon"
              variant={minimapOpen ? "secondary" : "ghost"}
              onClick={() => setMinimapOpen((v) => !v)}
              title="Toggle minimap (M)"
              aria-label="Toggle minimap"
              aria-pressed={minimapOpen}
            >
              <MapIcon className="size-4" />
            </Button>
            <HealthBadge score={health.summary.score} onClick={() => setHealthOpen(true)} />
            <Button size="sm" variant="ghost" onClick={() => setAuditOpen(true)} title="Page quality audit">
              <Gauge className="size-4" /> Audit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSeoOpen(true)} title="SEO & social">
              <Search className="size-4" /> SEO
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSubmissionsOpen(true)} title="Form submissions">
              <Inbox className="size-4" /> Inbox
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setTranslateOpen(true)} title="Translations">
              <Languages className="size-4" /> i18n
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCommentsOpen(true)} title="Comments">
              <MessageSquare className="size-4" /> Comments
            </Button>
            <PresenceBar projectId={projectId} />
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (!content) return;
                try {
                  await exportSiteZip(content, project?.name || "site");
                  toast.success("Exported HTML/CSS ZIP");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Export failed");
                }
              }}
              title="Export HTML/CSS ZIP"
            >
              <Download className="size-4" /> Export
            </Button>
            <AiCopyRewriteButton content={content} onApply={(c) => history.set(c)} />
            <TemplateIoButtons content={content} projectName={project?.name || "site"} onImport={(c) => history.set(c)} />
            <Button size="icon" variant="ghost" onClick={() => setHistoryOpen(true)} title="Version history" aria-label="Version history">
              <HistoryIcon className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setCodeOpen(true)} title="Custom code" aria-label="Custom code">
              <Code2 className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setBlogOpen(true)} title="Blog & CMS">
              <FileText className="size-4" /> Blog
            </Button>

            <Button onClick={() => save.mutate()} disabled={save.isPending} size="sm" variant="ghost">
              <Save className="size-4" /> {save.isPending ? "Saving…" : "Save"}
            </Button>
            <Button onClick={() => setPublishOpen(true)} size="sm">
              <Globe className="size-4" /> Publish
            </Button>
          </div>
        </div>
        <div ref={canvasScrollRef} className="flex-1 overflow-auto p-6 flex justify-center items-start" onClick={() => setSelectedIds(new Set())}>
          <div
            className="editor-canvas-frame wb-canvas bg-white shadow-2xl origin-top"
            style={{ width: previewWidth, maxWidth: "100%", ...fontStyle, ...typoStyleVars(typoPreset) }}
            onClick={(e) => e.stopPropagation()}
          >
            {blocks.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                Add a block from the left to get started.
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map((b: Block) => (
                    <SortableBlock
                      key={b.id}
                      block={b}
                      branding={branding}
                      selected={selectedIds.has(b.id)}
                      onSelect={(additive) => selectBlock(b.id, additive)}
                      onRemove={() => removeBlocks([b.id])}
                      contextActions={{
                        onDuplicate: () => { setSelectedIds(new Set([b.id])); duplicateSelected(); },
                        onDelete: () => removeBlocks([b.id]),
                        onCopyStyles: () => { setSelectedIds(new Set([b.id])); copyStyles(); },
                        onPasteStyles: () => { setSelectedIds(new Set([b.id])); pasteStyles(); },
                        hasCopiedStyles: !!stylesClipboardRef.current,
                        onMoveUp: () => { setSelectedIds(new Set([b.id])); moveSelected(-1); },
                        onMoveDown: () => { setSelectedIds(new Set([b.id])); moveSelected(1); },
                        onSaveAsPreset: () => saveBlocksAsPreset(selectedIds.size > 1 && selectedIds.has(b.id) ? [...selectedIds] : [b.id]),
                      }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
        <CanvasMinimap
          blocks={blocks}
          selectedIds={selectedIds}
          onSelect={(id) => setSelectedIds(new Set([id]))}
          scrollEl={canvasScrollRef.current}
          open={minimapOpen && blocks.length > 0}
          onClose={() => setMinimapOpen(false)}
        />
        <DevtoolsPanel
          open={devtoolsOpen}
          onClose={() => setDevtoolsOpen(false)}
          selected={selected}
          blockCount={blocks.length}
          historySize={{ past: history.pastSize, future: history.futureSize }}
        />
      </div>

      {/* Right */}
      <aside className="editor-panel-right w-80 shrink-0 border-l border-border overflow-y-auto bg-card">
        <Tabs
          value={rightTab}
          onValueChange={(v) => {
            const next = v as typeof rightTab;
            if (next === "brand") setSelectedIds(new Set());
            setRightTab(next);
          }}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 mx-4 mt-3">
            <TabsTrigger value="block" disabled={!selected && selectedIds.size === 0}>
              {selectedIds.size > 1 ? `${selectedIds.size} sel` : "Block"}
            </TabsTrigger>
            <TabsTrigger value="brand">Brand</TabsTrigger>
            <TabsTrigger value="writer">Writer</TabsTrigger>
          </TabsList>
          <TabsContent value="block" className="p-4">
            {selectedIds.size > 1 ? (() => {
              const selectedBlocks = blocks.filter((b) => selectedIds.has(b.id));
              const sameType = selectedBlocks.every((b) => b.type === selectedBlocks[0].type);
              // Build a "shared props" object: keys whose values are equal across all selected.
              let sharedProps: Record<string, any> = {};
              if (sameType) {
                const first = selectedBlocks[0].props || {};
                for (const k of Object.keys(first)) {
                  const v = JSON.stringify(first[k]);
                  if (selectedBlocks.every((b) => JSON.stringify(b.props?.[k]) === v)) {
                    sharedProps[k] = first[k];
                  }
                }
              }
              const syntheticBlock = sameType
                ? { ...selectedBlocks[0], props: sharedProps }
                : null;
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{selectedIds.size} blocks selected</div>
                      <p className="text-xs text-muted-foreground">
                        {sameType ? `Editing shared ${selectedBlocks[0].type} fields.` : "Mixed types — only batch actions available."}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeBlocks([...selectedIds])} aria-label="Delete selected blocks">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={duplicateSelected}>Duplicate all</Button>
                    <Button size="sm" variant="outline" onClick={() => removeBlocks([...selectedIds])}>
                      <Trash2 className="size-3.5" /> Delete all
                    </Button>
                    <Button size="sm" variant="outline" onClick={copyStyles}>Copy styles</Button>
                    <Button size="sm" variant="outline" onClick={pasteStyles} disabled={!stylesClipboardRef.current}>
                      Paste styles
                    </Button>
                  </div>
                  {syntheticBlock && (
                    <div className="pt-2 border-t border-border">
                      <PropertyEditor
                        block={syntheticBlock}
                        onChange={(patch) => updateBlocksProps(selectedIds, patch)}
                        pages={content?.pages}
                      />
                    </div>
                  )}
                </div>
              );
            })() : selected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold capitalize">{selected.type}</div>
                    <p className="text-xs text-muted-foreground">Edit this block only.</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeBlocks([selected.id])} aria-label="Delete block">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={copyStyles}>Copy styles</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={pasteStyles} disabled={!stylesClipboardRef.current}>
                    Paste
                  </Button>
                </div>
                <PropertyEditor
                  block={selected}
                  onChange={(patch) => updateBlockProps(selected.id, patch)}
                  pages={content?.pages}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Select a block in the canvas to edit its content.</p>
            )}
          </TabsContent>
          <TabsContent value="brand" className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="site-name">Site name</Label>
              <Input id="site-name" value={branding.siteName} onChange={(e) => updateBranding({ siteName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="primary-color">Primary color</Label>
              <div className="flex items-center gap-2">
                <input id="primary-color" type="color" value={branding.primaryColor}
                  onChange={(e) => updateBranding({ primaryColor: e.target.value })}
                  className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent" />
                <Input value={branding.primaryColor} onChange={(e) => updateBranding({ primaryColor: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="font-family">Body font</Label>
              <select id="font-family" value={branding.fontFamily}
                onChange={(e) => updateBranding({ fontFamily: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <p className="text-[11px] text-muted-foreground">Used as a fallback when no typography preset is active.</p>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-border">
              <TypographyPicker
                activeId={branding.typographyPreset}
                onChange={(id) => updateBranding({ typographyPreset: id })}
                onClear={() => updateBranding({ typographyPreset: undefined })}
              />
            </div>
          </TabsContent>
          <TabsContent value="writer" className="p-4">
            {writerText.trim() ? (
              <>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Analyzing {writerSource
                    ? <><span className="font-medium">{writerSource.propKey}</span> on selected block</>
                    : selected ? <span className="font-medium">selected block</span> : "all blocks"} —
                  fully on-device, no AI calls.
                </p>
                <WriterAssistant
                  text={writerText}
                  onApplyMeta={applyMetaDescription}
                  onApplyHeadline={selected && headlineTargetKey ? applyHeadline : undefined}
                  onApplyFix={writerSource ? applyWriterFix : undefined}
                />
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Add some text to a block, then come back here for readability, tone, headline ideas, and meta description suggestions.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </aside>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onAction={onPaletteAction}
        pageBlocks={blocks}
        hasSelection={selectedIds.size > 0}
      />
      <ShortcutOverlay open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <ConflictDialog
        open={!!conflict}
        onOpenChange={(v) => { if (!v) setConflict(null); }}
        local={content}
        remote={conflict?.remote ?? null}
        remoteUpdatedAt={conflict?.remoteUpdatedAt ?? null}
        onResolve={async (choice: ConflictChoice) => {
          if (!conflict || !content) return;
          const { writeProjectContent, mergeContents } = await import("@/lib/sync/conflict");
          try {
            if (choice === "remote") {
              history.set(conflict.remote, false);
              toast.success("Switched to server version");
            } else if (choice === "local") {
              await writeProjectContent(projectId, content);
              toast.success("Your version saved");
            } else {
              const merged = mergeContents(content, conflict.remote);
              history.set(merged, false);
              await writeProjectContent(projectId, merged);
              toast.success("Merged and saved");
            }
            router.invalidate();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Resolve failed");
          } finally {
            setConflict(null);
          }
        }}
      />
      {project && (
        <SeoPanel
          open={seoOpen}
          onOpenChange={setSeoOpen}
          projectId={projectId}
          projectName={project.name || "Untitled"}
          initial={(project.seo as any) || {}}
          contentSummary={blocks
            .map((b) => Object.values(b.props || {}).filter((v) => typeof v === "string").join(" "))
            .join("\n").slice(0, 4000)}
        />
      )}
      {project && (
        <PublishDialog
          open={publishOpen}
          onOpenChange={setPublishOpen}
          projectId={projectId}
          projectName={project.name || "Untitled"}
          content={content}
          currentSlug={(project as any).slug ?? null}
          currentPublished={!!project.published}
          onPublished={() => router.invalidate()}
          seo={(project as any).seo}
        />
      )}
      {project && (
        <BlogPanel
          open={blogOpen}
          onOpenChange={setBlogOpen}
          projectId={projectId}
          projectSlug={(project as any).slug ?? null}
          projectPublished={!!project.published}
        />
      )}

      <VersionHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        projectId={projectId}
        currentContent={content}
        onRestore={(c) => history.set(c)}
      />
      {project && (
        <CustomCodePanel
          open={codeOpen}
          onOpenChange={setCodeOpen}
          projectId={projectId}
          initialHead={(project as any).head_code || ""}
          initialBody={(project as any).body_code || ""}
          onSaved={() => router.invalidate()}
        />
      )}
      <HealthPanel
        open={healthOpen}
        onOpenChange={setHealthOpen}
        summary={health.summary}
        seoReport={health.seoReport}
        linkIssues={health.linkIssues}
        a11yIssues={health.a11yIssues}
        content={content}
        projectId={projectId}
        onFixSeo={(id) => {
          if (id === "title" || id === "desc" || id === "og") {
            setSeoOpen(true);
            return;
          }
          if (id === "alt") {
            const target = blocks.find(
              (b) => b.type === "image" && !(b.props?.alt || "").trim(),
            ) || blocks.find(
              (b) => b.type === "gallery" && (b.props?.items || []).some((i: any) => !(i?.alt || "").trim()),
            );
            if (target) {
              setSelectedIds(new Set([target.id]));
              setRightTab("block");
              setHealthOpen(false);
              setTimeout(() => {
                document.querySelector(`[data-block-id="${target.id}"]`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 50);
            } else toast.message("All images already have alt text");
            return;
          }
          if (id === "h1") {
            const target = blocks.find((b) => b.type === "hero" || b.type === "heading");
            if (target) {
              setSelectedIds(new Set([target.id]));
              setRightTab("block");
              setHealthOpen(false);
            } else {
              toast.message("Add a Hero or Heading block to provide an H1");
            }
            return;
          }
          const blockTypeFor: Record<string, string> = {
            cta: "cta", navbar: "navbar", footer: "footer", links: "navbar", content: "text",
          };
          const wanted = blockTypeFor[id];
          if (wanted) {
            const existing = blocks.find((b) => b.type === wanted);
            if (existing) {
              setSelectedIds(new Set([existing.id]));
              setRightTab("block");
              setHealthOpen(false);
            } else {
              addBlock(wanted as BlockType);
              setHealthOpen(false);
              toast.success(`Added ${wanted} block`);
            }
          }
        }}
        onFixAllSeo={async (ids) => {
          if (!content) return;
          const applied: string[] = [];
          const skipped: string[] = [];
          let nextBlocks = [...blocks];
          const wants = new Set(ids);

          // helper: filename-derived alt — pure, no fetch
          const altFromSrc = (src: unknown): string => {
            const s = String(src || "").split("/").pop() || "";
            const base = s.split("?")[0].replace(/\.[a-z0-9]+$/i, "").replace(/[_\-]+/g, " ").trim();
            return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Image";
          };

          // 1. alt — fill missing alt on images & gallery items
          if (wants.has("alt")) {
            let touched = 0;
            nextBlocks = nextBlocks.map((b) => {
              if (b.type === "image" && !(b.props?.alt || "").trim() && b.props?.src) {
                touched += 1;
                return { ...b, props: { ...b.props, alt: altFromSrc(b.props.src) } };
              }
              if (b.type === "gallery" && Array.isArray(b.props?.items)) {
                const items = b.props.items.map((it: any) => {
                  if (!(it?.alt || "").trim() && it?.src) {
                    touched += 1;
                    return { ...it, alt: altFromSrc(it.src) };
                  }
                  return it;
                });
                return { ...b, props: { ...b.props, items } };
              }
              return b;
            });
            touched > 0 ? applied.push(`alt text (${touched})`) : skipped.push("alt");
          }

          // 2. h1 — promote first heading to level 1, or note skip
          if (wants.has("h1")) {
            const hasHero = nextBlocks.some((b) => b.type === "hero");
            const hasH1 = nextBlocks.some((b) => b.type === "heading" && (b.props?.level === 1 || !b.props?.level));
            if (!hasHero && !hasH1) {
              const idx = nextBlocks.findIndex((b) => b.type === "heading");
              if (idx >= 0) {
                nextBlocks[idx] = { ...nextBlocks[idx], props: { ...nextBlocks[idx].props, level: 1 } };
                applied.push("H1");
              } else {
                skipped.push("H1 (add a Hero/Heading block)");
              }
            }
          }

          // 3. navbar / footer / cta — add if missing
          for (const t of ["navbar", "footer", "cta"] as const) {
            if (!wants.has(t)) continue;
            if (!nextBlocks.some((b) => b.type === t)) {
              const block = createBlock(t);
              if (t === "footer") nextBlocks.push(block);
              else if (t === "navbar") nextBlocks.unshift(block);
              else nextBlocks.push(block);
              applied.push(t);
            }
          }

          // commit canvas changes once
          if (nextBlocks !== blocks) {
            history.set({ ...content, pages: content.pages.map((p) => p.id === (currentPage?.id ?? content.pages[0].id) ? { ...p, blocks: nextBlocks } : p) });
          }

          // 4-6. SEO fields (title / desc / og) — derive & save in one update
          const seoNow = ((project as any)?.seo as Record<string, any>) || {};
          const seoPatch: Record<string, any> = {};
          if (wants.has("title") && !(seoNow.title || "").trim()) {
            const name = (project as any)?.name?.trim();
            if (name) { seoPatch.title = name; applied.push("title"); }
            else skipped.push("title");
          }
          if (wants.has("desc") && !(seoNow.description || "").trim()) {
            const text = nextBlocks
              .map((b) => Object.values(b.props || {}).filter((v) => typeof v === "string").join(" "))
              .join(" ").trim();
            if (text.length >= 40) {
              const { metaDescription } = await import("@/lib/writer/summarize");
              seoPatch.description = metaDescription(text, 155);
              applied.push("description");
            } else skipped.push("description (need more content)");
          }
          if (wants.has("og") && !(seoNow.ogImage || "").trim()) {
            const firstImg = nextBlocks.find((b) => b.type === "image" && b.props?.src)?.props?.src
              || nextBlocks.find((b) => b.type === "gallery" && b.props?.items?.[0]?.src)?.props?.items?.[0]?.src;
            if (firstImg) { seoPatch.ogImage = firstImg; applied.push("og:image"); }
            else skipped.push("og:image (no image found)");
          }
          if (Object.keys(seoPatch).length > 0) {
            try {
              const { error } = await supabase.from("projects")
                .update({ seo: { ...seoNow, ...seoPatch } as any })
                .eq("id", projectId);
              if (error) throw error;
              router.invalidate();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Couldn't save SEO");
            }
          }

          // content / links / footer-already-handled — nothing else to auto-do
          if (wants.has("content")) skipped.push("content (manual)");
          if (wants.has("links")) skipped.push("links (manual)");

          if (applied.length === 0) toast.message(`Nothing to auto-fix — ${skipped.join(", ") || "all good"}`);
          else if (skipped.length === 0) toast.success(`Applied: ${applied.join(", ")}`);
          else toast.success(`Applied: ${applied.join(", ")} · Skipped: ${skipped.join(", ")}`);
        }}
        onBulkFixAllPages={async (onProgress, scope) => {
          if (!content) return;
          // Snapshot for one-click undo. Capture BEFORE any mutation so we can
          // restore both the page blocks and the project-level SEO patch.
          const prevContent = content;
          const prevSeo = ((project as any)?.seo as Record<string, any>) || {};
          const { applyBlockSeoFixes, joinBlockText, pickFirstImageSrc } = await import("@/lib/health/seo-fixes");
          const allIds = ["alt", "h1", "navbar", "footer", "cta"] as const;
          const ids = (scope?.fixIds && scope.fixIds.length > 0)
            ? (scope.fixIds.filter((i) => (allIds as readonly string[]).includes(i)) as unknown as typeof allIds)
            : allIds;
          const includeProjectSeo = scope?.includeProjectSeo ?? true;
          const pageIdSet = scope?.pageIds && scope.pageIds.length > 0 ? new Set(scope.pageIds) : null;

          const targetPages = pageIdSet
            ? content.pages.filter((p) => pageIdSet.has(p.id))
            : content.pages;
          const perPage: { pageId: string; pageName: string; applied: string[]; skipped: string[] }[] = [];
          const total = targetPages.length;

          // Initial progress snapshot — only the in-scope pages.
          const progressPages = targetPages.map((p) => ({
            id: p.id, name: p.name, status: "pending" as const,
          }));
          onProgress({ total, done: 0, pages: [...progressPages], phase: "pages" });

          // Yield to the browser so the initial UI paints before we start.
          await new Promise((r) => requestAnimationFrame(() => r(null)));

          let pagesChanged = 0;
          // Build the new pages array, preserving out-of-scope pages untouched.
          const fixedById = new Map<string, typeof content.pages[number]>();
          for (let i = 0; i < targetPages.length; i++) {
            const p = targetPages[i];
            (progressPages[i] as any).status = "fixing";
            onProgress({ total, done: i, pages: [...progressPages], phase: "pages" });
            await new Promise((r) => setTimeout(r, 30));

            const r = applyBlockSeoFixes(p.blocks, ids);
            perPage.push({ pageId: p.id, pageName: p.name, applied: r.applied, skipped: r.skipped });
            if (r.changed) pagesChanged += 1;
            fixedById.set(p.id, r.changed ? { ...p, blocks: r.blocks } : p);

            (progressPages[i] as any).status = "done";
            (progressPages[i] as any).appliedCount = r.applied.length;
            (progressPages[i] as any).skippedCount = r.skipped.length;
            onProgress({ total, done: i + 1, pages: [...progressPages], phase: "pages" });
          }

          const nextPages = content.pages.map((p) => fixedById.get(p.id) ?? p);

          if (pagesChanged > 0) {
            history.set({ ...content, pages: nextPages });
          }

          onProgress({ total, done: total, pages: [...progressPages], phase: "seo" });

          // Project-level SEO fields (only when in scope)
          const seoNow = ((project as any)?.seo as Record<string, any>) || {};
          const seoPatch: Record<string, any> = {};
          const seoApplied: string[] = [];
          const seoSkipped: string[] = [];
          if (includeProjectSeo) {
            if (!(seoNow.title || "").trim()) {
              const name = (project as any)?.name?.trim();
              if (name) { seoPatch.title = name; seoApplied.push("title"); }
              else seoSkipped.push("title");
            }
            if (!(seoNow.description || "").trim()) {
              const text = nextPages.flatMap((p) => p.blocks).reduce((acc, b) => acc + " " + joinBlockText([b]), "").trim();
              if (text.length >= 40) {
                const { metaDescription } = await import("@/lib/writer/summarize");
                seoPatch.description = metaDescription(text, 155);
                seoApplied.push("description");
              } else seoSkipped.push("description");
            }
            if (!(seoNow.ogImage || "").trim()) {
              const img = nextPages.map((p) => pickFirstImageSrc(p.blocks)).find(Boolean);
              if (img) { seoPatch.ogImage = img; seoApplied.push("og:image"); }
              else seoSkipped.push("og:image");
            }
          }
          const errors: string[] = [];
          if (Object.keys(seoPatch).length > 0) {
            try {
              const { error } = await supabase.from("projects")
                .update({ seo: { ...seoNow, ...seoPatch } as any })
                .eq("id", projectId);
              if (error) throw error;
              router.invalidate();
            } catch (e) {
              errors.push(e instanceof Error ? e.message : "Couldn't save SEO");
            }
          }

          setBulkSummary({
            pagesProcessed: targetPages.length,
            pagesChanged,
            perPage,
            seoApplied,
            seoSkipped,
            errors,
          });
          // Only offer undo if something actually changed.
          const seoPatched = Object.keys(seoPatch).length > 0 && errors.length === 0;
          if (pagesChanged > 0 || seoPatched) {
            setBulkUndo({ content: prevContent, seo: prevSeo, seoPatched });
          } else {
            setBulkUndo(null);
          }
          onProgress({ total, done: total, pages: [...progressPages], phase: "complete" });
          setBulkSummaryOpen(true);
        }}
        onJumpBlock={(blockId) => {
          setSelectedIds(new Set([blockId]));
          setHealthOpen(false);
          setTimeout(() => {
            document.querySelector(`[data-block-id="${blockId}"]`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 50);
        }}
      />
      <SubmissionsPanel open={submissionsOpen} onOpenChange={setSubmissionsOpen} projectId={projectId} />
      <TranslatePanel open={translateOpen} onOpenChange={setTranslateOpen} projectId={projectId} content={content} />
      <CommentsPanel open={commentsOpen} onOpenChange={setCommentsOpen} projectId={projectId} pageId={currentPage?.id ?? "home"} />
      <BulkFixSummaryDialog
        open={bulkSummaryOpen}
        onOpenChange={setBulkSummaryOpen}
        summary={bulkSummary}
        canUndo={!!bulkUndo}
        onUndo={async () => {
          if (!bulkUndo) return;
          history.set(bulkUndo.content);
          if (bulkUndo.seoPatched) {
            try {
              const { error } = await supabase.from("projects")
                .update({ seo: bulkUndo.seo as any })
                .eq("id", projectId);
              if (error) throw error;
              router.invalidate();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Couldn't revert SEO");
              return;
            }
          }
          setBulkUndo(null);
          toast.success("Bulk fix reverted");
        }}
      />
      <AuditPanel
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        content={content}
        pageId={currentPage?.id}
      />
      <OnboardingTour />
      <SectionLibraryDialog
        open={sectionLibraryOpen}
        onOpenChange={setSectionLibraryOpen}
        branding={content?.branding}
        onInsert={addPreset}
      />
      <UserPresetsPanel
        open={userPresetsOpen}
        onOpenChange={setUserPresetsOpen}
        onInsert={insertBlocks}
      />
    </div>
  );
}

function SortableBlock({ block, branding, selected, onSelect, onRemove, contextActions }: {
  block: Block;
  branding: typeof DEFAULT_BRANDING;
  selected: boolean;
  onSelect: (additive: boolean) => void;
  onRemove: () => void;
  contextActions: React.ComponentProps<typeof BlockContextMenu>["actions"];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const hidden = block.props?.__hidden === true;
  return (
    <BlockContextMenu actions={contextActions}>
      <div
        ref={setNodeRef}
        data-block-id={block.id}
        data-dragging={isDragging || undefined}
        style={style}
        className={`group relative ${hidden ? "opacity-30" : ""} ${
          selected ? "outline outline-2 outline-offset-[-2px] outline-blue-500"
                   : "hover:outline hover:outline-2 hover:outline-offset-[-2px] hover:outline-blue-300"
        }`}
        onClick={(e) => { e.stopPropagation(); onSelect(e.shiftKey || e.metaKey || e.ctrlKey); }}
      >
        <BlockRenderer block={block} branding={branding} />
        {selected && (
          <svg className="selection-ring-svg pointer-events-none absolute inset-0 w-full h-full" aria-hidden>
            <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)"
              fill="none" stroke="rgb(59 130 246)" strokeWidth="2" />
          </svg>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100"
          style={{ transition: "opacity var(--duration-fast) var(--ease-smooth)" }}>
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="size-7 rounded-md bg-black/70 text-white flex items-center justify-center cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="size-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="size-7 rounded-md bg-black/70 text-white flex items-center justify-center"
            title="Remove block"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono opacity-0 group-hover:opacity-100"
          style={{ transition: "opacity var(--duration-fast) var(--ease-smooth)" }}>
          {block.type}
        </span>
      </div>
    </BlockContextMenu>
  );
}
