# Download Counter Design

## Goal

Track and display download and install counts separately for each map, visible on both the user-facing map card and the admin map list.

## Architecture

### Data Layer

Add two integer columns to the maps table in Supabase:

- `download_count INTEGER NOT NULL DEFAULT 0`
- `install_count INTEGER NOT NULL DEFAULT 0`

Increments are atomic (using Supabase's `increment` RPC or a raw SQL `UPDATE ... SET count = count + 1`) to avoid race conditions.

### API Changes

**Existing route — `GET /api/download/[id]`:**
Increment `download_count` when a presigned download URL is issued. No new route needed.

**New route — `POST /api/maps/[id]/install`:**
Fire-and-forget endpoint called by the client after a successful install. Increments `install_count`. No authentication required — not sensitive data.

### Type Changes

`MapEntry` in `src/types/map.ts` gains two new fields:

```ts
downloadCount: number
installCount: number
```

### Frontend Changes

**`src/components/MapCard.tsx`:**
- Call `POST /api/maps/[map.id]/install` inside `doInstall()` after `markInstalled()` (fire-and-forget, no await needed for UX)
- Display counts in the metadata line below the map name, e.g.:
  `↓ 12 · ⚙ 3`

**`src/components/AdminMapList.tsx`:**
- Display the same counts inline in each map row next to size/date.

## Files Affected

| File | Change |
|------|--------|
| `src/types/map.ts` | Add `downloadCount`, `installCount` fields |
| `src/lib/maps-store.ts` | Read new columns; add `incrementDownload`, `incrementInstall` functions |
| `src/app/api/download/[id]/route.ts` | Call `incrementDownload` before returning URL |
| `src/app/api/maps/[id]/install/route.ts` | New route — calls `incrementInstall` |
| `src/components/MapCard.tsx` | Call install endpoint; display counts |
| `src/components/AdminMapList.tsx` | Display counts |

## Out of Scope

- Sorting/ranking by popularity
- Per-user tracking
- Deduplication (same user downloading twice counts twice)
