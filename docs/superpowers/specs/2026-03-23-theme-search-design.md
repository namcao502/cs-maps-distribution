# Design Spec: Light/Dark/System Theme + Map Search

**Date:** 2026-03-23
**Project:** cs-maps-distribution
**Status:** Approved

---

## Overview

Add a three-way theme switcher (light / dark / system) and a client-side map name search to the CS 1.6 maps distribution app.

---

## Feature 1: Theme System

### Approach

CSS custom properties + Tailwind v4 dark mode class strategy + React context. No third-party theme library.

### CSS Variables (`src/app/globals.css`)

Define all color tokens on `:root` (light values) and override under `.dark`:

```css
:root {
  --bg-primary: #f8fafc;
  --bg-secondary: #f1f5f9;
  --bg-card: #ffffff;
  --text-primary: #0f172a;
  --text-muted: #64748b;
  --border: #e2e8f0;
  --accent: #3b82f6;
}

.dark {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-card: #1e293b;
  --text-primary: #f1f5f9;
  --text-muted: #94a3b8;
  --border: #334155;
  --accent: #60a5fa;
}
```

Existing hard-coded Tailwind color classes in all components are migrated to use these variables.

### ThemeContext (`src/lib/theme-context.tsx`)

- Exposes `theme: 'light' | 'dark' | 'system'` and `setTheme`
- On mount, resolves `system` by reading `window.matchMedia('(prefers-color-scheme: dark)')`
- Adds/removes the `dark` class on `<html>` whenever resolved theme changes
- Listens to `matchMedia` change event to react to OS theme changes in real time
- No localStorage — resets to `system` on each page load

### ThemeProvider (`src/lib/theme-context.tsx`)

Wraps `children` in the context. Mounted in `src/app/layout.tsx`.

### ThemeToggle (`src/components/ThemeToggle.tsx`)

- Three-button segmented control: Sun (light) / Monitor (system) / Moon (dark)
- Uses inline SVG icons (no icon library dependency)
- Active option is visually highlighted
- Reads/writes via `useTheme()` hook
- Placed in the page header, next to `AuthButton`

### Files Changed

| File | Change |
|------|--------|
| `src/app/globals.css` | Add CSS variable tokens for light/dark |
| `src/app/layout.tsx` | Wrap with `ThemeProvider` |
| `src/lib/theme-context.tsx` | New — context, provider, hook |
| `src/components/ThemeToggle.tsx` | New — segmented toggle button |
| `src/app/page.tsx` | Add `ThemeToggle` to header |
| `src/components/MapCard.tsx` | Migrate hard-coded colors to CSS variables |
| `src/components/MapList.tsx` | Migrate hard-coded colors to CSS variables |
| `src/components/AuthButton.tsx` | Migrate hard-coded colors to CSS variables |
| Other components | Migrate hard-coded colors as needed |

---

## Feature 2: Map Search

### Approach

Client-side filtering in `MapList` — no library, no API changes.

### SearchInput (`src/components/SearchInput.tsx`)

- Controlled input: receives `value: string` and `onChange: (v: string) => void` as props
- Includes a search icon (inline SVG) on the left
- Styled with CSS variable tokens (themed automatically)
- No internal state

### MapList changes (`src/components/MapList.tsx`)

- Adds `query` state via `useState<string>('')`
- Renders `<SearchInput>` above the map grid
- Derives filtered list: `maps.filter(m => m.name.toLowerCase().includes(query.toLowerCase()))`
- Shows a "No maps found" empty state when `filteredMaps.length === 0` and `query` is non-empty

### Files Changed

| File | Change |
|------|--------|
| `src/components/SearchInput.tsx` | New — controlled search input |
| `src/components/MapList.tsx` | Add query state, SearchInput, filter logic, empty state |

---

## Architecture Summary

```
layout.tsx
└── ThemeProvider
    └── page.tsx
        ├── Header
        │   ├── ThemeToggle   ← new
        │   └── AuthButton
        └── MapList           ← updated
            ├── SearchInput   ← new
            └── MapCard[]     ← colors migrated
```

---

## Decisions & Constraints

- **No localStorage** — theme resets to system on reload by design
- **No third-party dependencies** — next-themes not used
- **Search scope** — name only, no format or uploader filtering
- **Search placement** — above the map grid, inside MapList
- **Toggle placement** — header, next to AuthButton
- **Flash on load** — acceptable; a brief light→dark flash may occur on system-dark since the class is applied client-side
