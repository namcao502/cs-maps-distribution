# Installed Sync — Design Spec

**Date:** 2026-03-24
**Status:** Approved

---

## Overview

Persist the results of a file-system scan back into `localStorage` so that "installed" badges on map cards survive page reloads without requiring the user to re-grant folder access.

---

## Problem

`scanInstalledBsps(gameFolder)` reads the real CS 1.6 folder and returns a `Set<string>` of BSP basenames. Today this only updates in-memory React state (`installedBsps`). On the next page load, if the user has not re-granted folder access, `installedBsps` is empty and all ✓ Installed badges disappear — even for maps that are actually on disk.

`markInstalled(mapId)` / `isInstalledLocally(mapId)` (localStorage) already handle the case where a map was installed *through the app*. The gap is maps that were installed externally, or maps installed in a previous browser session before this feature existed.

---

## Design

### New function — `folder-store.ts`

```ts
export function syncInstalledToLocalStorage(
  maps: MapEntry[],
  installedBsps: Set<string>
): void {
  for (const map of maps) {
    if (isBspInstalled(map.originalName, installedBsps)) {
      markInstalled(map.id)
    }
  }
}
```

- Calls the existing `markInstalled` for each map whose BSP is found on disk.
- Append-only: never removes a localStorage key (if a map was deleted from disk, the badge stays — acceptable given localStorage is a hint, not ground truth).
- Imports `isBspInstalled` from `./install` and `MapEntry` from `@/types/map`.

### Call site — `MapList.tsx`

Two places in `MapList` run `scanInstalledBsps`. Both get the sync call added:

**On folder change (useEffect):**
```ts
scanInstalledBsps(gameFolder).then(result => {
  if (!cancelled) {
    setInstalledBsps(result)
    syncInstalledToLocalStorage(maps, result)
  }
})
```

**After each install (`handleInstalled`):**
```ts
function handleInstalled() {
  if (!gameFolder) return
  scanInstalledBsps(gameFolder).then(result => {
    setInstalledBsps(result)
    syncInstalledToLocalStorage(maps, result)
  })
}
```

### No changes to `MapCard`

`MapCard` already reads `isInstalledLocally(map.id)` on mount and re-checks when `installedBsps` changes. After the sync runs, future page loads will find the correct localStorage values with no extra work.

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/maps/folder-store.ts` | Add `syncInstalledToLocalStorage` |
| `src/components/maps/MapList.tsx` | Call sync after every scan |

---

## Out of Scope

- Unmarking maps (removing localStorage keys when BSP no longer found on disk)
- Syncing from `PackSection` (PackSection doesn't scan the folder)
- Any server-side changes
