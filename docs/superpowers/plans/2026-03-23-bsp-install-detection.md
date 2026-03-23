# BSP Install Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the exact-filename BSP lookup with a directory scan + prefix match so that maps are correctly detected as installed even when the archive name differs from the BSP filename inside.

**Architecture:** `scanInstalledBsps` scans `cstrike/maps/` once in `MapList` when `gameFolder` changes and returns a `Set<string>` of lowercased BSP basenames. `isBspInstalled` is a pure function that checks whether any entry in that set matches `originalName` via exact match or boundary-aware prefix match. `MapCard` receives the set as a prop and does a synchronous lookup instead of an async per-card filesystem call.

**Tech Stack:** Next.js 16.2.1, React 19.2.4, TypeScript, File System Access API (browser). No test framework — verification via `npm run build` and dev server.

**Spec:** `docs/superpowers/specs/2026-03-23-bsp-install-detection-design.md`

---

## File Map

| File | Action | Change |
|------|--------|--------|
| `src/lib/install.ts` | Modify | Remove `isMapInstalled`; add `scanInstalledBsps` and `isBspInstalled` |
| `src/components/MapList.tsx` | Modify | Add `installedBsps` state + scan effect; pass `installedBsps` + `onInstalled` to `MapCard` |
| `src/components/MapCard.tsx` | Modify | Accept `installedBsps` + `onInstalled` props; remove `isMapInstalled` useEffect; initialize `installed` from `isBspInstalled \|\| isInstalledLocally`; call `onInstalled()` after install |

---

## Task 1: Add `isBspInstalled` and `scanInstalledBsps` to `install.ts`

**Files:**
- Modify: `src/lib/install.ts`

- [ ] **Step 1: Add `isBspInstalled` pure function**

In `src/lib/install.ts`, add this function after the `isFileSystemAccessSupported` export (around line 22). Do **not** remove `isMapInstalled` yet — `MapCard` still imports it and the build will break.

```ts
/**
 * Returns true if any BSP in installedBsps matches originalName.
 *
 * Match rule (both values lowercased before comparison):
 *   - exact: originalName === bspBasename
 *   - prefix: originalName.startsWith(bspBasename) AND the character
 *     immediately after bspBasename in originalName is '_', a digit, or
 *     end-of-string (boundary guard prevents de_dust matching de_dust2)
 *
 * Examples (originalName | bspBasename | matches?):
 *   de_hoschispotfinal_x  | de_hoschispotfinal  | yes  (boundary: '_')
 *   de_dust2_final        | de_dust2            | yes  (boundary: '_')
 *   de_dust2_final        | de_dust             | yes  (boundary: '2', digit)
 *   de_hoschispotfinal    | de_hoschispot       | no   (next char 'f', not a boundary)
 */
export function isBspInstalled(
  originalName: string,
  installedBsps: Set<string>
): boolean {
  const name = originalName.toLowerCase()
  for (const bsp of installedBsps) {
    if (name === bsp) return true
    if (name.startsWith(bsp)) {
      const next = name[bsp.length]
      if (next === '_' || next === undefined || (next >= '0' && next <= '9')) {
        return true
      }
    }
  }
  return false
}
```

- [ ] **Step 2: Add `scanInstalledBsps` async function**

Add this function directly after `isBspInstalled`:

```ts
/**
 * Scans gameRoot/cstrike/maps/ and returns a Set of lowercased BSP basenames
 * (without the .bsp extension). Returns an empty set on any error.
 */
export async function scanInstalledBsps(
  gameRoot: FileSystemDirectoryHandle
): Promise<Set<string>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = gameRoot as any
    const cstrike = await h.getDirectoryHandle('cstrike', { create: false })
    const maps = await cstrike.getDirectoryHandle('maps', { create: false })
    const result = new Set<string>()
    for await (const [name, entry] of maps.entries()) {
      if (entry.kind === 'file' && name.toLowerCase().endsWith('.bsp')) {
        result.add(name.slice(0, -4).toLowerCase())
      }
    }
    return result
  } catch {
    return new Set()
  }
}
```

- [ ] **Step 3: Verify build passes**

```bash
cd C:/TEST/cs-maps-distribution
npm run build
```

Expected: build succeeds (no type errors). `isMapInstalled` is still present so no import errors yet.

- [ ] **Step 4: Commit**

```bash
git add src/lib/install.ts
git commit -m "feat: add isBspInstalled and scanInstalledBsps to install.ts"
```

---

## Task 2: Update MapList to scan and pass installedBsps to MapCard

**Files:**
- Modify: `src/components/MapList.tsx`

- [ ] **Step 1: Rewrite MapList.tsx**

Replace the entire file content with:

```tsx
'use client'
import { useState, useEffect } from 'react'
import type { MapEntry } from '@/types/map'
import { MapCard } from './MapCard'
import { SearchInput } from './SearchInput'
import { scanInstalledBsps } from '@/lib/install'

export function MapList({
  maps,
  gameFolder,
  onPickFolder,
}: {
  maps: MapEntry[]
  gameFolder: FileSystemDirectoryHandle | null
  onPickFolder: () => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [installedBsps, setInstalledBsps] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!gameFolder) {
      setInstalledBsps(new Set())
      return
    }
    scanInstalledBsps(gameFolder).then(setInstalledBsps)
  }, [gameFolder])

  function handleInstalled() {
    if (!gameFolder) return
    scanInstalledBsps(gameFolder).then(setInstalledBsps)
  }

  const filtered = maps.filter(m =>
    m.originalName.toLowerCase().includes(query.toLowerCase())
  )

  if (maps.length === 0) {
    return <p className="text-[var(--text-muted)] text-center py-12">No maps uploaded yet.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <SearchInput value={query} onChange={setQuery} />
      {filtered.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-12">No maps found.</p>
      ) : (
        filtered.map(map => (
          <MapCard
            key={map.id}
            map={map}
            gameFolder={gameFolder}
            onPickFolder={onPickFolder}
            installedBsps={installedBsps}
            onInstalled={handleInstalled}
          />
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: build **fails** with a TypeScript error on `MapCard` — it does not yet accept `installedBsps` or `onInstalled` props. This is expected at this step.

- [ ] **Step 3: Note the error and continue to Task 3**

Do not commit yet. Proceed to Task 3 which fixes the `MapCard` props and will make the build pass.

---

## Task 3: Update MapCard to use installedBsps prop

**Files:**
- Modify: `src/components/MapCard.tsx`

- [ ] **Step 1: Update the `@/lib/install` import in MapCard.tsx**

Replace the existing import line:
```tsx
import { isFileSystemAccessSupported, installMap, isMapInstalled } from '@/lib/install'
```

with:
```tsx
import { isFileSystemAccessSupported, installMap, isBspInstalled } from '@/lib/install'
```

- [ ] **Step 2: Update the component props interface and installed initialization**

Change the function signature from:
```tsx
export function MapCard({
  map,
  gameFolder,
  onPickFolder,
}: {
  map: MapEntry
  gameFolder: FileSystemDirectoryHandle | null
  onPickFolder: () => Promise<void>
})
```

to:
```tsx
export function MapCard({
  map,
  gameFolder,
  onPickFolder,
  installedBsps,
  onInstalled,
}: {
  map: MapEntry
  gameFolder: FileSystemDirectoryHandle | null
  onPickFolder: () => Promise<void>
  installedBsps: Set<string>
  onInstalled: () => void
})
```

- [ ] **Step 3: Update `installed` state initialization**

Change:
```tsx
const [installed, setInstalled] = useState(() => isInstalledLocally(map.id))
```

to:
```tsx
const [installed, setInstalled] = useState(
  () => isBspInstalled(map.originalName, installedBsps) || isInstalledLocally(map.id)
)
```

- [ ] **Step 4: Replace the `isMapInstalled` useEffect with an `installedBsps` effect**

The `useState` lazy initializer runs only once on mount. Because `scanInstalledBsps` is async, `installedBsps` will be an empty set when cards first mount, so the initializer always returns `false`. A `useEffect` is needed to set `installed` to `true` once the scan result arrives.

Replace the existing `isMapInstalled` useEffect:

```tsx
useEffect(() => {
  if (!gameFolder) return
  isMapInstalled(gameFolder, map.originalName).then(result => {
    if (result) setInstalled(true)
  })
}, [gameFolder, map.originalName])
```

with:

```tsx
useEffect(() => {
  if (isBspInstalled(map.originalName, installedBsps)) {
    setInstalled(true)
  }
}, [installedBsps, map.originalName])
```

This fires whenever `MapList` updates `installedBsps` (after the scan completes or after a rescan), and sets `installed` to `true` if a match is found. It never sets `installed` back to `false` — once installed, the badge stays.

- [ ] **Step 5: Call `onInstalled` after successful install**

In `doInstall`, after `markInstalled(map.id)` and `setInstalled(true)`, add:

```tsx
onInstalled()
```

The block should look like:
```tsx
await installMap(map, url, sha256, handle, setStatus)
markInstalled(map.id)
setInstalled(true)
onInstalled()
```

- [ ] **Step 6: Verify build passes**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 7: Remove `isMapInstalled` from `install.ts`**

Now that `MapCard` no longer imports it, open `src/lib/install.ts` and delete the `isMapInstalled` function. Locate it by its signature — line numbers will have shifted after Task 1 added new functions:

```ts
/** Check if a map's .bsp is already present in the game folder */
export async function isMapInstalled(
  gameRoot: FileSystemDirectoryHandle,
  mapName: string
): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = gameRoot as any
    const cstrike = await h.getDirectoryHandle('cstrike', { create: false })
    const maps = await cstrike.getDirectoryHandle('maps', { create: false })
    await maps.getFileHandle(`${mapName}.bsp`, { create: false })
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 8: Verify final build passes**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 9: Commit all changes**

```bash
git add src/lib/install.ts src/components/MapList.tsx src/components/MapCard.tsx
git commit -m "feat: detect installed maps by BSP scan with prefix match"
```

---

## Final Verification

- [ ] **Start dev server**

```bash
npm run dev
```

Open `http://localhost:3000`.

- [ ] **Verify detection with game folder**

1. Click "Choose Folder & Install" to select a CS 1.6 game folder that has maps in `cstrike/maps/`
2. Any map whose archive name matches a BSP in that folder (exact or prefix+boundary) should immediately show the "✓ Installed" badge — without needing to install through this app first
3. Install a map through the app → "✓ Installed" badge appears immediately after install completes
4. The Install button for installed maps should show "Reinstall" not "Install"

- [ ] **Verify no regression**

Maps with no matching BSP in the folder show no installed badge. Search, theme toggle, and all other features work normally.
