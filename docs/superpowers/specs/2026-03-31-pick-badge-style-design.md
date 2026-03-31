# Pick Badge Style — Design Spec

**Date:** 2026-03-31  
**Status:** Approved

## Overview

Replace the small cyan pill badge in the info zone with a gradient overlay at the bottom of the card thumbnail. The `badge` and `caption` props on `MapCard` are unchanged — only the rendering of `badge` moves.

---

## Change

**File:** `src/components/maps/MapCard.tsx`

**Remove:** The `badge` pill `<span>` currently rendered in the info zone above the map name:
```tsx
{badge && (
  <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm mb-1"
    style={{ background: 'var(--accent-cyan)', color: 'black' }}>
    {badge}
  </span>
)}
```

**Add:** An absolutely-positioned overlay at the bottom of the thumbnail zone (`card-thumb` div), rendered when `badge` is present:
```tsx
{badge && (
  <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1 px-2 py-1"
    style={{ background: 'linear-gradient(transparent, rgba(6,182,212,0.22))' }}>
    <span style={{ color: 'var(--accent-cyan)', fontSize: 11 }}>★</span>
    <span className="text-[9px] font-mono font-bold tracking-wide"
      style={{ color: 'var(--accent-cyan)' }}>
      {badge}
    </span>
  </div>
)}
```

**Caption** (`caption` prop) stays unchanged — renders below the map name in muted text.

---

## No other changes

- `MapList.tsx` — unchanged
- `page.tsx` — unchanged
- `AdminMapList.tsx` — unchanged
- API routes — unchanged
- Props interface — unchanged
