# Map Packs Design

## Goal

Admins curate named collections of maps (packs). Users can install all maps in a pack at once, or pick a subset to install.

## Data

### Type — `src/types/pack.ts`

```ts
export interface MapPack {
  id: string
  name: string
  description: string
  mapIds: string[]
  createdAt: string
}
```

### Firestore

New collection `packs`. Each document stores `name`, `description`, `mapIds`, `createdAt`. `mapIds` is an array of map document IDs from the existing `maps` collection.

### Store — `src/lib/packs-store.ts`

```ts
getPacks(): Promise<MapPack[]>
addPack(pack: MapPack): Promise<void>  // receives fully-constructed MapPack (id and createdAt already set by caller)
removePack(id: string): Promise<void>
```

`getPacks` orders by `createdAt` descending.

## API

### Auth pattern for admin routes

Use `getSessionUser` / `isAdmin` from `@/lib/auth`:

```ts
import { getSessionUser, isAdmin } from '@/lib/auth'
const user = await getSessionUser()
if (!user || !isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

### `GET /api/packs`

Public. Returns an array of packs, each with a resolved `maps: MapEntry[]` field. Fetches all maps once via `getMaps()` from `@/lib/maps-store`, then filters in memory by each pack's `mapIds` (avoids N+1 Firestore reads). Sets `Cache-Control: no-store`. Response:

```ts
Array<MapPack & { maps: MapEntry[] }>
```

### `POST /api/admin/packs`

Admin-only (use `getSessionUser`/`isAdmin` pattern above). Body: `{ name: string; description: string; mapIds: string[] }`. Validates that `name` is non-empty and `mapIds` is a non-empty array. Constructs the full `MapPack` object with `id: uuidv4()` and `createdAt: new Date().toISOString()`, then passes it to `addPack(pack)`. Returns `{ ok: true, id }`.

### `DELETE /api/admin/packs/[id]`

Admin-only (use `getSessionUser`/`isAdmin` pattern above). Calls `removePack(id)`. Returns `{ ok: true }`.

## Admin UI — `PackManager` (`src/components/PackManager.tsx`)

Rendered at the bottom of the admin page (`src/app/admin/page.tsx`), below `AdminMapList`. Receives `maps: MapEntry[]` as a prop (already loaded by the page).

**Create pack form:**
- Text input for pack name (required)
- Text input for description (optional)
- Multi-select checkbox list of all maps (shows `originalName`)
- "Create Pack" button — disabled when name is empty or no maps selected
- On submit: POST to `/api/admin/packs`, then refresh pack list

**Pack list:**
- Fetches packs from `GET /api/packs` on mount
- Each pack row: name, description, map count, delete button
- Delete calls `DELETE /api/admin/packs/[id]`, removes from local state

## User UI — `PackSection` (`src/components/PackSection.tsx`)

Rendered at the top of the map list on the home page (`src/app/page.tsx`), above `MapList`. Receives `gameFolder: FileSystemDirectoryHandle | null` and `onPickFolder: () => Promise<void>` as props. Fetches packs from `GET /api/packs` on mount.

If no packs exist, renders nothing.

**Pack card layout:**
- Pack name, description, map count
- Two buttons: **"Install All"** and **"Pick & Install"**

**Install All:**
Triggers `installPack(packId, pack.maps)` — installs all maps in parallel.

**Pick & Install:**
Toggles an expanded section below the pack card showing each map as a checkbox row. An "Install (N)" button appears when ≥1 map is checked. Clicking it calls `installPack(packId, selectedMaps)`.

**Install logic (self-contained in `PackSection`):**

State: `installStates: Record<string, Record<string, 'idle' | 'installing' | 'done' | 'error'>>` — keyed by `packId → mapId → status`.

`installPack(packId: string, maps: MapEntry[])`:
1. If no `gameFolder`, call `onPickFolder()` and return (user must re-click after picking; `onPickFolder` updates parent state so subsequent click succeeds)
2. Request write permission via `ensurePermission(gameFolder)` — return on denial
3. For each map in `maps`: set status to `'installing'`
4. `Promise.all(maps.map(map => installSingleMap(packId, map)))`

`installSingleMap(packId: string, map: MapEntry)`:
1. Fetch presigned URL: `GET /api/download/${map.id}` → `{ url, sha256 }` (this also increments `downloadCount` server-side)
2. Call `installMap(map, url, sha256, gameFolder!, () => {})` from `@/lib/install`
3. Call `markInstalled(map.id)` from `@/lib/folder-store` — **synchronous void function**, do not `await`
4. Call `fetch('/api/maps/${map.id}/install', { method: 'POST' }).catch(() => {})` to increment `installCount` server-side
5. Set status to `'done'`
6. On any error: set status to `'error'`

**Per-map status display (in Pick & Install expanded view and after Install All):**
- `idle` — no indicator
- `installing` — spinner
- `done` — ✓ green
- `error` — ✗ red

## Files Affected

| File | Change |
|------|--------|
| `src/types/pack.ts` | New — MapPack type |
| `src/lib/packs-store.ts` | New — getPacks, addPack, removePack |
| `src/app/api/packs/route.ts` | New — GET (public) |
| `src/app/api/admin/packs/route.ts` | New — POST (admin) |
| `src/app/api/admin/packs/[id]/route.ts` | New — DELETE (admin) |
| `src/components/PackManager.tsx` | New — admin create/delete packs |
| `src/components/PackSection.tsx` | New — user pack cards with install |
| `src/app/admin/page.tsx` | Add PackManager below AdminMapList |
| `src/app/page.tsx` | Add PackSection above MapList |

## Out of Scope

- Editing pack name/description/maps after creation
- Pack ordering/reordering
- Per-pack install progress bar (only per-map status icons)
