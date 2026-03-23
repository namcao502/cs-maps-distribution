# BSP Install Detection Design

**Date:** 2026-03-23
**Status:** Approved

## Problem

`isMapInstalled` looks up `${originalName}.bsp` by exact filename. CS 1.6 archives frequently use a name that differs from the BSP inside — e.g. archive `de_hoschispotfinal_dcd69` contains `de_hoschispot.bsp`. This causes the "Installed" badge to never appear for such maps, even when the BSP is present.

## Goal

Detect installed maps correctly for both:
- Maps installed through this app
- Maps the user already had installed externally

## Approach: Scan + prefix match

Scan `cstrike/maps/` once per game folder selection, collect all `.bsp` basenames into a `Set<string>`, and pass the set to each `MapCard`. Replace the per-card async filesystem lookup with a synchronous set membership check using a boundary-aware prefix match.

## Match Rule

`isBspInstalled(originalName, installedBsps)` returns `true` if **any** `bspBasename` in `installedBsps` satisfies the predicate below for the given `originalName`. Both values are lowercased before comparison.

```
match if:
  originalName === bspBasename                            // exact match
  OR (
    originalName.startsWith(bspBasename)                 // archive name starts with BSP name
    AND boundary at position bspBasename.length          // boundary prevents false positives
  )
```

**Boundary characters:** `_`, any ASCII digit (`0–9`), or end-of-string.

**Examples:**

| originalName | bspBasename | Match? | Reason |
|---|---|---|---|
| `de_hoschispot` | `de_hoschispot` | ✓ | exact |
| `de_hoschispotfinal_dcd69` | `de_hoschispot` | ✗ | next char is `f`, not a boundary |
| `de_hoschispotfinal_dcd69` | `de_hoschispotfinal` | ✓ | next char is `_` |
| `de_dust2_final` | `de_dust2` | ✓ | next char is `_` |
| `de_dust2_final` | `de_dust` | ✓ | next char is `2`, digit is a boundary — acceptable false positive (see note) |
| `de_dust` | `de_dust` | ✓ | exact |
| `cs_assault_v2` | `cs_assault` | ✓ | next char is `_` |

> **Note on digit boundary:** Digits are treated as boundaries because version suffixes like `2`, `_v2` are common. The `de_dust` / `de_dust2` false-positive (both showing as installed when only one is present) is unavoidable with a pure prefix rule and is acceptable.

## Architecture

### `src/lib/install.ts`

**Remove:** `isMapInstalled(gameRoot, mapName): Promise<boolean>`

**Add:**
```ts
export async function scanInstalledBsps(
  gameRoot: FileSystemDirectoryHandle
): Promise<Set<string>>
```

Navigates `gameRoot → cstrike → maps`, iterates all file entries, collects basenames of `.bsp` files (case-insensitive, lowercased). Returns empty set on any error (missing folder, permission denied).

**Add (pure function):**
```ts
export function isBspInstalled(
  originalName: string,
  installedBsps: Set<string>
): boolean
```

Implements the match rule above. Lowercases `originalName` before matching (consistent with the lowercased set produced by `scanInstalledBsps`). Iterates over `installedBsps`; returns `true` if any entry satisfies the predicate for the given `originalName`. `isMapInstalled` has no other callers; its removal is safe.

### `src/components/MapList.tsx`

- Add `useEffect` that calls `scanInstalledBsps(gameFolder)` when `gameFolder` changes. Stores result in `installedBsps: Set<string>` state (default: empty set).
- Pass `installedBsps` and `onInstalled` callback to each `MapCard`.
- `onInstalled` triggers a rescan so the set stays current after an install.

### `src/components/MapCard.tsx`

- Accept new props: `installedBsps: Set<string>`, `onInstalled: () => void`
- Remove `useEffect` that called `isMapInstalled`
- `installed` remains local React state, initialized as `isBspInstalled(map.originalName, installedBsps) || isInstalledLocally(map.id)`. After a successful install, `setInstalled(true)` is still called optimistically so the "Reinstall" button appears immediately — `onInstalled()` then triggers a background rescan in `MapList` to keep the set current for future renders.
- After a successful install, call `onInstalled()` (in addition to existing `markInstalled` and `setInstalled(true)`)

## Error Handling

`scanInstalledBsps` catches all errors and returns an empty set. Cards show as not installed rather than crashing. This handles: no game folder selected, `cstrike/maps/` not present, permission revoked.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/install.ts` | Remove `isMapInstalled`; add `scanInstalledBsps`, `isBspInstalled` |
| `src/components/MapList.tsx` | Scan on `gameFolder` change; pass `installedBsps` + `onInstalled` to MapCard |
| `src/components/MapCard.tsx` | Accept `installedBsps` + `onInstalled`; remove async installed check; use `isBspInstalled` |

## Out of Scope

- Storing BSP names server-side in `MapEntry`
- Fuzzy string distance matching (prefix rule is sufficient for CS 1.6 naming conventions)
- Detecting maps in subdirectories other than `cstrike/maps/`
