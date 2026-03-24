# Map Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to reorder maps in the admin list using ↑/↓ buttons, with order persisting to Firestore and reflected on the public map list.

**Architecture:** Add optional `order` field to `MapEntry`; `getMaps()` sorts by `order` ascending (client-side, no Firestore index needed); `reorderMaps(ids)` batch-writes new positions; a new API endpoint `/api/admin/maps/reorder` handles persistence; `AdminMapList` gets ↑/↓ buttons with optimistic updates and revert on error.

**Tech Stack:** TypeScript, React, Next.js, Firestore (firebase-admin batch writes), Jest

**Spec:** `docs/superpowers/specs/2026-03-24-map-reorder-design.md`

---

## File Map

| File | Change |
|---|---|
| `src/types/map.ts` | Add `order?: number` |
| `src/lib/maps/maps-store.ts` | Update `docToMapEntry`, `addMap`, `getMaps` sort; add `reorderMaps` |
| `src/app/api/admin/maps/reorder/route.ts` | New — POST endpoint, admin-only |
| `src/components/maps/AdminMapList.tsx` | Add `onReorder` prop, local orderedMaps state, ↑/↓ buttons |
| `src/app/admin/page.tsx` | Pass `onReorder` to `AdminMapList` |
| `tests/lib/maps-store.test.ts` | Add tests for `reorderMaps` and updated `getMaps` sort |

---

## Task 1: Add `order` to types and store

**Files:**
- Modify: `src/types/map.ts`
- Modify: `src/lib/maps/maps-store.ts`
- Modify: `tests/lib/maps-store.test.ts`

### Context

Current `tests/lib/maps-store.test.ts` mock setup (lines 1–51):
- Top-level: `const mockGet`, `mockSet`, `mockDelete`, `mockSelect`, `mockOrderBy`, `mockDoc`, `mockCollection` — all `jest.fn()`
- `jest.mock('@/lib/auth/firebase-admin', ...)` returns `{ collection: mockCollection }`
- `beforeEach`: `mockCollection.mockReturnValue({ orderBy: mockOrderBy, doc: mockDoc, select: mockSelect })` — **no `get` key** because current `getMaps` calls `.orderBy(...).get()`
- `mockDoc.mockReturnValue({ set: mockSet, delete: mockDelete })` — **no `update` key** yet

After this task, `getMaps` will call `.collection('maps').get()` directly (no `.orderBy`), so `mockCollection` must also return `{ get: mockGet }`. We must update the mock BEFORE adding failing tests, otherwise the existing `getMaps` tests will break for the wrong reason.

- [ ] **Update `tests/lib/maps-store.test.ts` mock setup first:**

At the top of the file, add three new mock variables alongside the existing ones:
```ts
const mockBatch = jest.fn()
const mockBatchUpdate = jest.fn()
const mockBatchCommit = jest.fn()
const mockUpdate = jest.fn()
```

Replace the `jest.mock` factory (currently `{ collection: mockCollection }`) with:
```ts
jest.mock('@/lib/auth/firebase-admin', () => ({
  getAdminDb: jest.fn(() => ({
    collection: mockCollection,
    batch: mockBatch,
  })),
}))
```

In `beforeEach`, replace:
```ts
mockDoc.mockReturnValue({ set: mockSet, delete: mockDelete })
mockCollection.mockReturnValue({ orderBy: mockOrderBy, doc: mockDoc, select: mockSelect })
```
with:
```ts
mockUpdate.mockResolvedValue(undefined)
mockDoc.mockReturnValue({ set: mockSet, delete: mockDelete, update: mockUpdate })
mockCollection.mockReturnValue({ get: mockGet, orderBy: mockOrderBy, doc: mockDoc, select: mockSelect })
mockBatch.mockReturnValue({ update: mockBatchUpdate, commit: mockBatchCommit })
mockBatchCommit.mockResolvedValue(undefined)
mockBatchUpdate.mockReturnValue(undefined)
```

- [ ] **Run existing tests to verify they still pass after mock update:**

```bash
npm test -- tests/lib/maps-store.test.ts
```

Expected: all existing tests PASS (mock is backward-compatible).

- [ ] **Add failing tests at the end of `tests/lib/maps-store.test.ts`:**

First, update the import at line 1 to include `reorderMaps`:
```ts
import { getMaps, addMap, removeMap, getMapSha256s, reorderMaps } from '@/lib/maps/maps-store'
```

Then add these suites at the end:
```ts
describe('getMaps sort order', () => {
  it('puts maps with order before maps without order', async () => {
    mockGet.mockResolvedValue({
      docs: [
        { id: 'b', data: () => ({ ...sampleDocData, originalName: 'cs_assault', order: 1 }) },
        { id: 'c', data: () => ({ ...sampleDocData, originalName: 'de_nuke' }) },
        { id: 'a', data: () => ({ ...sampleDocData, originalName: 'de_dust2', order: 0 }) },
      ],
    })
    const maps = await getMaps()
    expect(maps[0].originalName).toBe('de_dust2')    // order: 0
    expect(maps[1].originalName).toBe('cs_assault')  // order: 1
    expect(maps[2].originalName).toBe('de_nuke')     // no order
  })
})

describe('reorderMaps', () => {
  it('batch-updates each id with its index as order', async () => {
    const ids = ['id-a', 'id-b', 'id-c']
    await reorderMaps(ids)
    expect(mockBatch).toHaveBeenCalled()
    expect(mockBatchUpdate).toHaveBeenCalledTimes(3)
    expect(mockBatchUpdate).toHaveBeenCalledWith(expect.anything(), { order: 0 })
    expect(mockBatchUpdate).toHaveBeenCalledWith(expect.anything(), { order: 1 })
    expect(mockBatchUpdate).toHaveBeenCalledWith(expect.anything(), { order: 2 })
    expect(mockBatchCommit).toHaveBeenCalled()
  })
})
```

- [ ] **Run to verify new tests fail:**

```bash
npm test -- tests/lib/maps-store.test.ts
```

Expected: FAIL — `reorderMaps is not a function`, sort test fails.

- [ ] **Update `src/types/map.ts`** — add `order?: number` after `installCount`:

```ts
export interface MapEntry {
  id: string
  originalName: string
  storageKey: string
  format: 'zip' | '7z' | 'rar'
  size: number
  sha256: string
  uploadedAt: string
  installCount: number
  order?: number
  tags: string[]
  hidden?: boolean
  uploader?: {
    id: string
    name: string
    avatar: string
  }
}
```

- [ ] **Update `src/lib/maps/maps-store.ts`:**

In `docToMapEntry`, add after the `installCount` line:
```ts
order: data.order !== undefined ? (data.order as number) : undefined,
```

In `addMap`, add `order: 0` to the `.set(...)` object (after `installCount: 0`):
```ts
installCount: 0,
order: 0,
```

Replace `getMaps` entirely:
```ts
export async function getMaps(): Promise<MapEntry[]> {
  const snap = await getAdminDb().collection('maps').get()
  const maps = snap.docs.map(doc => docToMapEntry(doc.id, doc.data()))
  return maps.sort((a, b) => {
    const aHas = a.order !== undefined
    const bHas = b.order !== undefined
    if (aHas && bHas) return a.order! - b.order!
    if (aHas) return -1
    if (bHas) return 1
    return b.uploadedAt.localeCompare(a.uploadedAt)
  })
}
```

Add `reorderMaps` at the end of the file:
```ts
export async function reorderMaps(ids: string[]): Promise<void> {
  const db = getAdminDb()
  const batch = db.batch()
  ids.forEach((id, index) => {
    batch.update(db.collection('maps').doc(id), { order: index })
  })
  await batch.commit()
}
```

- [ ] **Run tests — expect all pass:**

```bash
npm test -- tests/lib/maps-store.test.ts
```

Expected: all tests pass including new sort and reorderMaps tests.

- [ ] **Run full suite:**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit:**

```bash
git add src/types/map.ts src/lib/maps/maps-store.ts tests/lib/maps-store.test.ts
git commit -m "feat: add order field to MapEntry and reorderMaps to store"
```

---

## Task 2: Add `/api/admin/maps/reorder` API route

**Files:**
- Create: `src/app/api/admin/maps/reorder/route.ts`

- [ ] **Create `src/app/api/admin/maps/reorder/route.ts`:**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { reorderMaps } from '@/lib/maps/maps-store'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.ids) || !body.ids.every((id: unknown) => typeof id === 'string')) {
    return NextResponse.json({ error: 'Invalid body: expected { ids: string[] }' }, { status: 400 })
  }

  try {
    await reorderMaps(body.ids as string[])
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to reorder maps' }, { status: 500 })
  }
}
```

- [ ] **Run build to verify no TypeScript errors:**

```bash
npm run build
```

Expected: clean build.

- [ ] **Commit:**

```bash
git add src/app/api/admin/maps/reorder/route.ts
git commit -m "feat: add POST /api/admin/maps/reorder endpoint"
```

---

## Task 3: Add ↑/↓ buttons to AdminMapList

**Files:**
- Modify: `src/components/maps/AdminMapList.tsx`

### Context

Current file structure (relevant parts):
- Line 1: `'use client'`
- Line 2: `import { useState } from 'react'` — needs `useEffect` added
- Lines 30–40: `AdminMapList` props (no `onReorder` yet)
- Line 41: `const [query, setQuery] = useState('')` — first state declaration
- Lines 49–...: helper functions (`saveTags`, `toggleHidden`)
- **Line 90**: `const filtered = maps.filter(m => m.originalName.toLowerCase().includes(query.toLowerCase()))` — **already exists**, just change `maps` to `orderedMaps`
- Lines 86–88: `if (maps.length === 0)` early-return guard — change to `orderedMaps.length`
- The render loop: `filtered.map(map => (...))`  — each `map` row is a `<div className="flex items-center justify-between ...`

- [ ] **Update `src/components/maps/AdminMapList.tsx`:**

**Step 1 — imports.** Change:
```ts
import { useState } from 'react'
```
to:
```ts
import { useState, useEffect } from 'react'
```

Add after the existing imports:
```ts
import { useNotifications } from '@/lib/auth/notification-context'
```

**Step 2 — add `onReorder` prop.** Change the props destructuring from:
```ts
export function AdminMapList({
  maps,
  onDeleted,
  onTagsUpdated,
  onHiddenUpdated,
}: {
  maps: MapEntry[]
  onDeleted: (id: string) => void
  onTagsUpdated: (id: string, tags: string[]) => void
  onHiddenUpdated: (id: string, hidden: boolean) => void
})
```
to:
```ts
export function AdminMapList({
  maps,
  onDeleted,
  onTagsUpdated,
  onHiddenUpdated,
  onReorder,
}: {
  maps: MapEntry[]
  onDeleted: (id: string) => void
  onTagsUpdated: (id: string, tags: string[]) => void
  onHiddenUpdated: (id: string, hidden: boolean) => void
  onReorder?: (newMaps: MapEntry[]) => void
})
```

**Step 3 — add state.** After the existing state declarations (after line 47 `const [togglingHidden, setTogglingHidden] = useState<string | null>(null)`), add:
```ts
const [orderedMaps, setOrderedMaps] = useState<MapEntry[]>(maps)
const [isSaving, setIsSaving] = useState(false)
const { push } = useNotifications()

useEffect(() => { setOrderedMaps(maps) }, [maps])
```

**Step 4 — add moveMap function.** After the `toggleHidden` function, add:
```ts
async function moveMap(index: number, direction: 'up' | 'down') {
  const swapIndex = direction === 'up' ? index - 1 : index + 1
  const prev = orderedMaps
  const next = [...orderedMaps]
  ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  setOrderedMaps(next)
  onReorder?.(next)
  setIsSaving(true)
  try {
    const res = await fetch('/api/admin/maps/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: next.map(m => m.id) }),
    })
    if (!res.ok) throw new Error('Failed')
  } catch {
    setOrderedMaps(prev)
    onReorder?.(prev)
    push('Failed to save map order', 'error')
  } finally {
    setIsSaving(false)
  }
}
```

**Step 5 — fix early-return guard.** Change:
```ts
if (maps.length === 0) {
```
to:
```ts
if (orderedMaps.length === 0) {
```

**Step 6 — update filtered to use orderedMaps.** Change the existing line (currently `const filtered = maps.filter(...)`):
```ts
const filtered = maps.filter(m => m.originalName.toLowerCase().includes(query.toLowerCase()))
```
to:
```ts
const filtered = orderedMaps.filter(m => m.originalName.toLowerCase().includes(query.toLowerCase()))
```

**Step 7 — add saving indicator.** In the JSX, find the header/title area above the map list (or just above the `filtered.map(...)` loop) and add:
```tsx
{isSaving && (
  <p className="text-xs text-[var(--text-muted)] text-right mb-1">Saving order…</p>
)}
```

**Step 8 — add ↑/↓ buttons.** Inside the `filtered.map(map => (...))` render loop, compute the index once per row and add buttons as the first child of the row's outer flex div:

```tsx
{filtered.map(map => {
  const orderedIndex = orderedMaps.indexOf(map)
  return (
    <div key={map.id} className="...existing card className...">
      {/* existing Card/div wrapper preserved; add buttons inside the left section */}
      ...
```

Specifically, find the inner `<div className="flex items-center justify-between ...">` that wraps each row's content, and prepend a button group as its first child:

```tsx
<div className="flex items-center gap-1 shrink-0 mr-1">
  <button
    onClick={() => moveMap(orderedIndex, 'up')}
    disabled={orderedIndex === 0 || isSaving}
    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
    title="Move up"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
  </button>
  <button
    onClick={() => moveMap(orderedIndex, 'down')}
    disabled={orderedIndex === orderedMaps.length - 1 || isSaving}
    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
    title="Move down"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  </button>
</div>
```

Note: `orderedIndex` is based on `orderedMaps` (full list), not `filtered` (search subset). This ensures ↑/↓ moves in the full list even when a search filter is active.

- [ ] **Run build:**

```bash
npm run build
```

Expected: clean build.

- [ ] **Run tests:**

```bash
npm test
```

Expected: all pass.

- [ ] **Commit:**

```bash
git add src/components/maps/AdminMapList.tsx
git commit -m "feat: add up/down reorder buttons to AdminMapList"
```

---

## Task 4: Wire up admin page

**Files:**
- Modify: `src/app/admin/page.tsx`

### Context

Current `AdminMapList` usage in `src/app/admin/page.tsx` (lines 53–58):
```tsx
<AdminMapList
  maps={maps}
  onDeleted={id => setMaps(prev => prev.filter(m => m.id !== id))}
  onTagsUpdated={(id, tags) => setMaps(prev => prev.map(m => m.id === id ? { ...m, tags } : m))}
  onHiddenUpdated={(id, hidden) => setMaps(prev => prev.map(m => m.id === id ? { ...m, hidden } : m))}
/>
```

- [ ] **Add `onReorder` prop:**

```tsx
<AdminMapList
  maps={maps}
  onDeleted={id => setMaps(prev => prev.filter(m => m.id !== id))}
  onTagsUpdated={(id, tags) => setMaps(prev => prev.map(m => m.id === id ? { ...m, tags } : m))}
  onHiddenUpdated={(id, hidden) => setMaps(prev => prev.map(m => m.id === id ? { ...m, hidden } : m))}
  onReorder={newMaps => setMaps(newMaps)}
/>
```

- [ ] **Run build:**

```bash
npm run build
```

Expected: clean build.

- [ ] **Run full test suite:**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit:**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: wire onReorder in admin page"
```

---

## Verification

Manual smoke test (browser, admin account):
1. Open `/admin`, observe map list renders with ↑/↓ buttons on each row
2. Click ↑ on a map — it moves one slot up immediately; "Saving order…" appears briefly
3. Click ↓ on a map — it moves one slot down
4. Buttons are disabled on first (↑) and last (↓) rows
5. Reload page — order is preserved (fetched from Firestore)
6. Reload public `/` — map list reflects same order
7. With search filter active: ↑/↓ still moves within the full list
