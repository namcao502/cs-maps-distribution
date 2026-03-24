# Installed Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist folder-scan results to localStorage so "✓ Installed" badges survive page reloads without re-granting folder access.

**Architecture:** Add `syncInstalledToLocalStorage(maps, installedBsps)` to `install.ts` (alongside `isBspInstalled` which it calls); then call it in `MapList` after every `scanInstalledBsps` invocation.

**Tech Stack:** TypeScript, React, localStorage, Jest

**Spec:** `docs/superpowers/specs/2026-03-24-installed-sync-design.md`

---

## File Map

| File | Change |
|---|---|
| `src/lib/maps/install.ts` | Add `syncInstalledToLocalStorage`, import `markInstalled` |
| `src/components/maps/MapList.tsx` | Add `useRef` for maps, import + call `syncInstalledToLocalStorage` after each scan |
| `tests/lib/install.test.ts` | New — unit tests for `syncInstalledToLocalStorage` |

---

## Task 1: Write failing tests for syncInstalledToLocalStorage

**Files:**
- Create: `tests/lib/install.test.ts`

- [ ] **Create the test file:**

```ts
import { syncInstalledToLocalStorage, isBspInstalled } from '@/lib/maps/install'
import { isInstalledLocally } from '@/lib/maps/folder-store'
import type { MapEntry } from '@/types/map'

// Minimal MapEntry fixture — only fields used by syncInstalledToLocalStorage
function makeMap(id: string, originalName: string): MapEntry {
  return {
    id,
    originalName,
    storageKey: '',
    format: 'zip',
    size: 0,
    sha256: '',
    uploadedAt: '',
    downloadCount: 0,
    installCount: 0,
    tags: [],
    hidden: false,
    uploader: undefined,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('syncInstalledToLocalStorage', () => {
  it('marks a map as installed when its BSP is in the set', () => {
    const maps = [makeMap('id-1', 'de_dust2')]
    const bsps = new Set(['de_dust2'])
    syncInstalledToLocalStorage(maps, bsps)
    expect(isInstalledLocally('id-1')).toBe(true)
  })

  it('does not mark a map when its BSP is absent', () => {
    const maps = [makeMap('id-1', 'de_dust2')]
    const bsps = new Set(['cs_assault'])
    syncInstalledToLocalStorage(maps, bsps)
    expect(isInstalledLocally('id-1')).toBe(false)
  })

  it('marks only matching maps when multiple maps are provided', () => {
    const maps = [
      makeMap('id-1', 'de_dust2'),
      makeMap('id-2', 'cs_assault'),
      makeMap('id-3', 'de_nuke'),
    ]
    const bsps = new Set(['de_dust2', 'de_nuke'])
    syncInstalledToLocalStorage(maps, bsps)
    expect(isInstalledLocally('id-1')).toBe(true)
    expect(isInstalledLocally('id-2')).toBe(false)
    expect(isInstalledLocally('id-3')).toBe(true)
  })

  it('does nothing when installedBsps is empty', () => {
    const maps = [makeMap('id-1', 'de_dust2')]
    syncInstalledToLocalStorage(maps, new Set())
    expect(isInstalledLocally('id-1')).toBe(false)
  })

  it('does nothing when maps array is empty', () => {
    // Should not throw
    expect(() => syncInstalledToLocalStorage([], new Set(['de_dust2']))).not.toThrow()
  })

  it('uses prefix matching (de_dust2_final matches de_dust2 BSP)', () => {
    const maps = [makeMap('id-1', 'de_dust2_final')]
    const bsps = new Set(['de_dust2'])
    syncInstalledToLocalStorage(maps, bsps)
    expect(isInstalledLocally('id-1')).toBe(true)
  })
})
```

- [ ] **Run to verify it fails (function doesn't exist yet):**

```bash
npm test -- tests/lib/install.test.ts
```

Expected: FAIL — `syncInstalledToLocalStorage is not a function` or similar.

- [ ] **Commit the failing test:**

```bash
git add tests/lib/install.test.ts
git commit -m "test: add failing tests for syncInstalledToLocalStorage"
```

---

## Task 2: Implement syncInstalledToLocalStorage

**Files:**
- Modify: `src/lib/maps/install.ts`

- [ ] **Add the import** at the top of `src/lib/maps/install.ts` (after existing imports):

```ts
import { markInstalled } from '@/lib/maps/folder-store'
```

- [ ] **Add the function** at the end of `src/lib/maps/install.ts` (after `installMap`):

```ts
/**
 * For each map whose BSP basename is found in installedBsps, persists
 * the installed state to localStorage. Call this after scanInstalledBsps
 * so that installed badges survive page reloads without folder re-access.
 */
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

- [ ] **Run the tests — expect all 6 PASS:**

```bash
npm test -- tests/lib/install.test.ts
```

Expected: 6 tests pass.

- [ ] **Run the full suite to confirm no regressions:**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit:**

```bash
git add src/lib/maps/install.ts tests/lib/install.test.ts
git commit -m "feat: add syncInstalledToLocalStorage to install.ts"
```

---

## Task 3: Call syncInstalledToLocalStorage in MapList

**Files:**
- Modify: `src/components/maps/MapList.tsx`

Context: `MapList` runs `scanInstalledBsps` in two places:
1. `useEffect` (lines ~63–73) — runs when `gameFolder` changes
2. `handleInstalled` (lines ~96–99) — runs after each map install

- [ ] **Update the import** in `src/components/maps/MapList.tsx`.

Find the existing line:
```ts
import { scanInstalledBsps } from '@/lib/maps/install'
```

Replace with:
```ts
import { scanInstalledBsps, syncInstalledToLocalStorage } from '@/lib/maps/install'
```

- [ ] **Add a `useRef` for maps** near the top of the `MapList` function body (just after the state declarations):

```ts
const mapsRef = useRef(maps)
useEffect(() => { mapsRef.current = maps }, [maps])
```

This keeps a current reference to `maps` without triggering unnecessary re-scans when the parent re-renders. Add `useRef` to the React import:
```ts
import { useState, useEffect, useRef } from 'react'
```

- [ ] **Update the `useEffect` that scans on folder change.**

Find the current `useEffect` block (it looks like this):
```ts
useEffect(() => {
  if (!gameFolder) {
    setInstalledBsps(new Set())
    return
  }
  let cancelled = false
  scanInstalledBsps(gameFolder).then(result => {
    if (!cancelled) setInstalledBsps(result)
  })
  return () => { cancelled = true }
}, [gameFolder])
```

Replace with:
```ts
useEffect(() => {
  if (!gameFolder) {
    setInstalledBsps(new Set())
    return
  }
  let cancelled = false
  scanInstalledBsps(gameFolder).then(result => {
    if (!cancelled) {
      setInstalledBsps(result)
      syncInstalledToLocalStorage(mapsRef.current, result)
    }
  })
  return () => { cancelled = true }
}, [gameFolder])
```

`maps` is accessed via `mapsRef.current` so it does not need to be in the dependency array — the scan should only re-fire when `gameFolder` changes, not on every parent re-render.

- [ ] **Update `handleInstalled`.**

Find the current `handleInstalled` function:
```ts
function handleInstalled() {
  if (!gameFolder) return
  scanInstalledBsps(gameFolder).then(setInstalledBsps)
}
```

Replace with:
```ts
function handleInstalled() {
  if (!gameFolder) return
  scanInstalledBsps(gameFolder).then(result => {
    setInstalledBsps(result)
    syncInstalledToLocalStorage(mapsRef.current, result)
  })
}
```

- [ ] **Run `npm run build`** to confirm no TypeScript errors:

```bash
npm run build
```

Expected: clean build.

- [ ] **Run the full test suite:**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Commit:**

```bash
git add src/components/maps/MapList.tsx
git commit -m "feat: sync installed BSPs to localStorage after folder scan"
```

---

## Verification

After all tasks are committed:

Manual smoke test (browser):
1. Open the app, grant folder access to your CS 1.6 installation
2. Observe ✓ Installed badges appear on maps you already have
3. Reload the page **without** granting folder access
4. Confirm the same ✓ Installed badges are still visible (from localStorage)
5. Open DevTools → Application → Local Storage and verify keys like `cs-installed:<id>` are present
