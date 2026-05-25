# Sitely Quick Reference — Canonical Utilities

Always import from these; never reinvent.

## Blocks
```ts
import { createBlock, uid, BLOCK_LIBRARY } from "@/lib/blocks";
const block = createBlock("hero");
```

## Offline
```ts
import { cacheProject, getCachedProject, queueEdit, isOnline } from "@/lib/offline-cache";
if (!isOnline()) { queueEdit({ projectId, op, payload }); return; }
```

## DB wrapper
```ts
import { dbQuery } from "@/lib/db-wrapper";
const { data, error } = await dbQuery(() => supabase.from("x").select());
```

## Errors
```ts
import { handleError, ValidationError } from "@/lib/errors";
try { ... } catch (e) { handleError(e); }
```

## AI
```ts
import { invokeLLM } from "@/server/_core/llm";
const out = await invokeLLM({ model: "google/gemini-2.5-flash", messages });
```

## Motion (always branch on reduced motion)
```ts
import { spring, duration, easing, prefersReducedMotion } from "@/lib/motion";
const t = prefersReducedMotion() ? { duration: 0 } : spring.gentle;
```

## Plans
```ts
import { usePlanGate, PaywallGate } from "@/lib/plans";
const canUse = usePlanGate("custom-domain");
```

## Toasts
```ts
import { saveWithToast } from "@/lib/toast-helpers";
await saveWithToast(() => save(), { loading: "Saving…", success: "Saved", error: "Couldn't save — retry?" });
```

## CMS
```ts
import { scaffoldBlog, createCollection } from "@/lib/cms";
```

## Phase quality gate checklist
- [ ] Happy path
- [ ] Error toast (actionable message)
- [ ] Loading state (shape-matched skeleton)
- [ ] Mobile ≥320px
- [ ] Keyboard: Tab / Enter / Esc
- [ ] 0 TS errors (`npm run check`)
- [ ] Unit test for core logic
- [ ] Graceful offline (queue + replay preferred)

## Perf targets
| Metric | Target |
|---|---|
| Published TTFB | <100ms |
| Editor load (Fast 3G) | <2s |
| Image gen | <5s |
| Analytics query | <500ms |
| Command palette open | <16ms |
| Initial JS gzipped | <200KB |
