# Sitely Quick Reference

## Block management
```ts
import { createBlock, uid, BLOCK_LIBRARY } from '@/lib/blocks'
const block = createBlock('hero')
const id = uid('hero')
```

## Offline cache
```ts
import { cacheProject, getCachedProject, queueEdit, isOnline } from '@/lib/offline-cache'
await cacheProject({ id, content, updatedAt: Date.now() })
```

## Database — always wrap
```ts
import { dbQuery } from '@/lib/db-wrapper'
import { supabase } from '@/integrations/supabase/client'
const project = await dbQuery(
  supabase.from('projects').select('*').eq('id', id).single()
)
```

## Errors
```ts
import { handleError, ValidationError } from '@/lib/errors'
try { await riskyOperation() } catch (e) { handleError(e) }
```

## AI Gateway
```ts
import { invokeLLM } from '@/server/_core/llm'
const response = await invokeLLM({ messages: [{ role: 'user', content: prompt }] })
```

## Motion tokens — always check reduced motion
```ts
import { spring, duration, easing, prefersReducedMotion } from '@/lib/motion'
if (prefersReducedMotion()) return simpleVariant
```

## Plan gating
```ts
import { usePlanGate, PaywallGate } from '@/lib/plans'
const { allowed } = usePlanGate('cms_collections')
```

## Toast pattern
```ts
import { saveWithToast } from '@/lib/toast-helpers'
saveWithToast(
  () => supabase.from('projects').update(data).eq('id', id),
  { loading: 'Saving…', success: 'Saved!', error: 'Save failed' }
)
```

## CMS
```ts
import { scaffoldBlog, createCollection } from '@/lib/cms'
await scaffoldBlog(projectId)

// Public CMS query (edge-cached)
const items = await supabase
  .from('cms_items')
  .select('*')
  .eq('collection_id', collectionId)
  .eq('is_draft', false)
  .not('published_at', 'is', null)
  .order('published_at', { ascending: false })
```

## CMS-bound block render
```tsx
function CMSListBlock({ block, cmsContext }: { block: Block; cmsContext?: CMSContext }) {
  const { items } = useCMSItems(block.props.collectionId, block.props.limit)
  // render with block.props.cardTemplate
}
```
