# Download Counter Design

## Goal

Track and display download and install counts separately for each map, visible on both the user-facing map card and the admin map list.

## Architecture

### Data Layer

Add two integer fields to each map document in **Firebase Firestore**:

- `downloadCount: 0` (initialized on map creation)
- `installCount: 0` (initialized on map creation)

Increments are atomic using Firestore's `FieldValue.increment(1)` to avoid race conditions.

### API Changes

**Existing route — `GET /api/download/[id]`:**
Increment `downloadCount` using `FieldValue.increment(1)` before returning the presigned URL. This fires for both the one-click install path (`doInstall`) and the fallback raw download path (`handleRawDownload`), since both call this endpoint.

**New route — `POST /api/maps/[id]/install`:**
Called by the client after a successful install (inside `doInstall()` only, after `markInstalled()`). Increments `installCount`. No authentication required.

Response: `200 { ok: true }`. On error: `500 { error: string }`.

> Note: `handleRawDownload` does **not** call this endpoint — it only triggers a `downloadCount` increment via `GET /api/download/[id]`.

### Type Changes

`MapEntry` in `src/types/map.ts` gains two new fields:

```ts
downloadCount: number
installCount: number
```

### Data Store Changes (`src/lib/maps-store.ts`)

Four changes required:

1. **`addMap`** — initialize `downloadCount: 0` and `installCount: 0` when writing a new map document
2. **`docToMapEntry`** — map `data.downloadCount ?? 0` and `data.installCount ?? 0` from the Firestore document to the `MapEntry` type
3. **`incrementDownload(id: string)`** — update the document with `{ downloadCount: FieldValue.increment(1) }`
4. **`incrementInstall(id: string)`** — update the document with `{ installCount: FieldValue.increment(1) }`

### Frontend Changes

**`src/components/MapCard.tsx`:**
- Call `POST /api/maps/[map.id]/install` inside `doInstall()` after `markInstalled()` (fire-and-forget — no `await` needed for UX)
- Display counts in the metadata line below the map name, e.g.: `↓ 12 · ⚙ 3`

**`src/components/AdminMapList.tsx`:**
- Display the same counts inline in each map row next to size/date.

## Files Affected

| File | Change |
|------|--------|
| `src/types/map.ts` | Add `downloadCount`, `installCount` fields |
| `src/lib/maps-store.ts` | Update `addMap`, `docToMapEntry`; add `incrementDownload`, `incrementInstall` |
| `src/app/api/download/[id]/route.ts` | Call `incrementDownload` before returning URL |
| `src/app/api/maps/[id]/install/route.ts` | New route — calls `incrementInstall`, returns `{ ok: true }` |
| `src/components/MapCard.tsx` | Fire install endpoint after install; display counts |
| `src/components/AdminMapList.tsx` | Display counts |

## Out of Scope

- Sorting/ranking by popularity
- Per-user tracking
- Deduplication (same user downloading twice counts twice)
