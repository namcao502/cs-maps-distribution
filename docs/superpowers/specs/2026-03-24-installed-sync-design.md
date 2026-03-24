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

### New function — `install.ts`

`syncInstalledToLocalStorage` lives in `src/lib/maps/install.ts` alongside `isBspInstalled`, which it calls. Placing it here avoids introducing a new import into `folder-store.ts` (which currently has zero imports and should stay lightweight).

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

- Imports `markInstalled` from `../maps/folder-store` (already imported elsewhere in the codebase; browser-only, called only from `.then()` callbacks).
- Append-only: never removes a localStorage key. If a map was deleted from disk, the badge stays — acceptable because localStorage is a hint, not ground truth.
- `MapEntry` is already imported in `install.ts`.

### Call site — `MapList.tsx`

Two places in `MapList` run `scanInstalledBsps`. Both get the sync call added.

**On folder change (useEffect) — preserve the `cancelled` guard:**
```ts
scanInstalledBsps(gameFolder).then(result => {
  if (!cancelled) {
    setInstalledBsps(result)
    syncInstalledToLocalStorage(maps, result)
  }
})
return () => { cancelled = true }
```

**After each install (`handleInstalled`) — expand the shorthand callback:**
```ts
function handleInstalled() {
  if (!gameFolder) return
  scanInstalledBsps(gameFolder).then(result => {
    setInstalledBsps(result)
    syncInstalledToLocalStorage(maps, result)
  })
}
```

The `maps` argument is the full `maps` prop (not the filtered subset) so all maps are considered, not just those currently visible.

### No changes to `MapCard`

`MapCard` already reads `isInstalledLocally(map.id)` on mount and re-checks when `installedBsps` changes. After the sync runs, future page loads will find the correct localStorage values with no extra work.

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/maps/install.ts` | Add `syncInstalledToLocalStorage`, import `markInstalled` from `folder-store` |
| `src/components/maps/MapList.tsx` | Import and call `syncInstalledToLocalStorage` after every scan |

---

## Out of Scope

- Unmarking maps (removing localStorage keys when BSP no longer found on disk)
- Syncing from `PackSection` (PackSection does not scan the folder)
- Any server-side changes
