# Pick Featured Card — Design Spec

**Date:** 2026-03-31
**Status:** Approved

## Overview

When a map is Today's Pick, it renders as a full-width "featured" card that breaks out of the normal grid. All other cards are unchanged. The `badge` and `caption` props on `MapCard` are unchanged — a new `featured` boolean prop drives the alternate layout.

---

## Changes

### `src/components/maps/MapCard.tsx`

Add `featured?: boolean` to props.

When `featured` is true, render a horizontal layout instead of the default vertical layout:

- **Outer card:** same cyan border + glow as today. `col-span-full` is handled by the parent wrapper in `MapList`, not by `MapCard` itself.
- **Structure:** `flex-row` — thumbnail on the left, body on the right.
- **Thumbnail:** full height of the card, fixed width (`w-40` / `160px`), same aspect. Contains:
  - Screenshot or gradient background (unchanged)
  - Type badge (unchanged, absolute top-left)
  - Select checkbox (unchanged, absolute top-right, only when `onToggleSelect` defined)
  - Progress bar (unchanged, absolute bottom)
  - Installed green tint (unchanged)
  - `badge` overlay: moves from bottom-gradient-strip to a small pill in the **top-left of the thumbnail**, styled as `background: rgba(6,182,212,0.15); border: 1px solid #06b6d4`. Rendered when `badge && !isInstalling`.
- **Body:** `flex-col justify-between flex-1 px-3 py-2.5`. Contains:
  - Map name: `text-sm` (slightly larger than default `text-xs`), cyan (`text-[var(--accent-cyan)]`), bold, truncated.
  - Caption (if present): same muted style as current, but not truncated (can wrap to 2 lines).
  - Bottom row: meta (size + install count) on the left, install button on the right — in a `flex justify-between items-end` wrapper.
  - Install button: same logic as current, but `w-auto px-4` instead of `w-full`.

When `featured` is false (default), layout is **identical to today** — no changes to the existing vertical layout.

### `src/components/maps/MapList.tsx`

Where the pick card is rendered in the grid:

```tsx
<div className={isPick ? 'col-span-full' : ''}>
  <MapCard ... featured={isPick} />
</div>
```

This wraps every card in a div (harmless for non-pick cards since the div has no classes), and gives the pick card `col-span-full` to span the full grid row.

---

## No other changes

- `page.tsx` — unchanged
- `AdminMapList.tsx` — unchanged
- API routes — unchanged
- Props interface beyond `featured?: boolean` — unchanged
- The bottom gradient overlay (`badge && !isInstalling`) is **replaced** in featured mode by the top-left pill badge. In non-featured mode the bottom overlay stays.
