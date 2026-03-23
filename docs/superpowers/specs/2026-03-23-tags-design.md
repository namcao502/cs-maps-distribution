# Tags & Categories Design

## Goal

Allow admins to assign predefined tags to maps (during upload, approval, or by editing later). Users can filter the map list by tag.

## Predefined Tags

Defined in `src/lib/tags.ts`:

```ts
export const MAP_TAGS = ['de_', 'cs_', 'fy_', 'aim_', 'surf_', 'fun', 'other'] as const
export type MapTag = typeof MAP_TAGS[number]
```

## Data Layer

Add `tags: string[]` (non-optional, default `[]`) to `MapEntry` in `src/types/map.ts`.

**`src/lib/maps-store.ts`:**
- `docToMapEntry`: map `(data.tags as string[]) ?? []` — the `?? []` handles existing Firestore documents that predate this feature
- `addMap`: write `tags: entry.tags` — `tags` is now required on `MapEntry` so every call site must supply it
- New `updateMapTags(id: string, tags: string[]): Promise<void>` — updates Firestore with `{ tags }`

> **Important:** implement data layer changes first. All other files depend on `MapEntry.tags` existing.

## API

### New route — `PATCH /api/admin/maps/[id]/tags`

New directory: `src/app/api/admin/maps/[id]/tags/route.ts`

- Admin-only (verified via `getSessionUser` + `isAdmin`)
- Body: `{ tags: string[] }` — filter to only values in `MAP_TAGS` before saving
- Calls `updateMapTags(id, validatedTags)`
- Returns `{ ok: true }` or error

### Upload API (`src/app/api/upload/route.ts`)
- Read and parse tags:
  ```ts
  const raw = JSON.parse((formData.get('tags') as string | null) ?? '[]') as string[]
  const tags = raw.filter((t): t is MapTag => (MAP_TAGS as readonly string[]).includes(t))
  ```
- Pass `tags` to `addMap` (add to the `MapEntry` object literal constructed here)

### Approve Route (`src/app/api/admin/submissions/[id]/approve/route.ts`)
- Parse body: `const { tags: rawTags = [] } = await req.json()`
- Validate: `const tags = rawTags.filter((t: string): t is MapTag => (MAP_TAGS as readonly string[]).includes(t))`
- Pass `tags` to `addMap` (add to the `MapEntry` object literal constructed here)

## Admin UI

### Upload Form (`src/components/UploadForm.tsx`)
- Add `selectedTags: string[]` state (default `[]`) and tag multi-select checkboxes using `MAP_TAGS`
- Serialize: `formData.append('tags', JSON.stringify(selectedTags))`

### Pending Queue (`src/components/PendingQueue.tsx`)
- Add `pendingTags: Record<string, string[]>` state (maps submission id → selected tags)
- Render tag checkboxes per submission row
- `handleApprove(id)` sends tags in request body:
  ```ts
  await fetch(`/api/admin/submissions/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags: pendingTags[id] ?? [] }),
  })
  ```

### Admin Map List (`src/components/AdminMapList.tsx`)
- Accept new prop `onTagsUpdated: (id: string, tags: string[]) => void`
- Each map row gets an "Edit tags" button that toggles an inline tag checkbox panel
- On save: call `PATCH /api/admin/maps/[id]/tags`, then call `onTagsUpdated(id, savedTags)`

### Admin Page (`src/app/admin/page.tsx`)
- Pass `onTagsUpdated` to `AdminMapList`:
  ```ts
  onTagsUpdated={(id, tags) => setMaps(prev => prev.map(m => m.id === id ? { ...m, tags } : m))}
  ```

## User UI

### Map List (`src/components/MapList.tsx`)
- Add `selectedTags: string[]` state (default `[]`)
- Tag filter chips displayed below the search input, using `MAP_TAGS`
- Clicking a chip toggles it in `selectedTags`
- Filtering logic:
  ```ts
  const filtered = maps.filter(m => {
    const matchesSearch = m.originalName.toLowerCase().includes(query.toLowerCase())
    const matchesTags = selectedTags.length === 0 || selectedTags.some(t => m.tags.includes(t))
    return matchesSearch && matchesTags
  })
  ```

### Map Card (`src/components/MapCard.tsx`)
- Show map's tags as small pills in the metadata line (only if `map.tags.length > 0`)

## Files Affected

| File | Change |
|------|--------|
| `src/lib/tags.ts` | New — predefined tag list and type |
| `src/types/map.ts` | Add `tags: string[]` |
| `src/lib/maps-store.ts` | Update `docToMapEntry`, `addMap`; add `updateMapTags` |
| `src/app/api/admin/maps/[id]/tags/route.ts` | New PATCH route (new directory) |
| `src/app/api/upload/route.ts` | Parse, validate, and pass tags |
| `src/app/api/admin/submissions/[id]/approve/route.ts` | Parse, validate, and pass tags |
| `src/components/UploadForm.tsx` | Tag checkboxes, serialize to FormData |
| `src/components/PendingQueue.tsx` | Per-submission tag state, pass tags in approve fetch |
| `src/components/AdminMapList.tsx` | Inline tag editor, onTagsUpdated prop |
| `src/app/admin/page.tsx` | Pass onTagsUpdated to AdminMapList |
| `src/components/MapList.tsx` | Tag filter chips + filtering logic |
| `src/components/MapCard.tsx` | Display tags as pills |

## Out of Scope

- User-defined custom tags
- Tag-based sorting
- Tag usage counts
