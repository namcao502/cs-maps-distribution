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

CSS custom properties + React context + `.dark` class on `<html>`. No third-party theme library. All theming is CSS-variable-only — `dark:` Tailwind utility prefixes are **not** used. Intent-specific colors (status badges, format badges, notification banners) are **out of scope** for this iteration and remain as hard-coded Tailwind classes — they will be visually inconsistent in dark mode, which is acceptable for now.

### CSS Variables (`src/app/globals.css`)

Replace all existing content with the following. The existing `body { background: ...; color: ...; }` rule must be removed and replaced with CSS variable references to avoid overriding dark mode:

```css
@import "tailwindcss";

/* Enables dark: utility prefix for future use. Not currently used — all theming is via CSS variables. */
@custom-variant dark (&:where(.dark, .dark *));

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

body {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
```

Components use CSS variables directly (e.g. `bg-[var(--bg-card)]`). No `dark:` prefix utilities.

### ThemeContext (`src/lib/theme-context.tsx`)

- Initial `theme` state is `'system'`
- On mount, resolves the effective display mode: if `theme === 'system'`, reads `window.matchMedia('(prefers-color-scheme: dark)')` to determine whether to apply `.dark`
- Adds/removes the `dark` class on `<html>` whenever the resolved theme changes
- Listens to `matchMedia` change event to react to OS theme changes in real time; the listener must be cleaned up via the effect's return function to prevent memory leaks
- No localStorage — resets to `'system'` on each page load
- Exports:
  - `ThemeProvider` — React component wrapping `children`
  - `useTheme()` — named export returning `{ theme: 'light' | 'dark' | 'system', setTheme: (t: 'light' | 'dark' | 'system') => void }`

### ThemeProvider

Wraps `children` in the context. Mounted in `src/app/layout.tsx`.

### ThemeToggle (`src/components/ThemeToggle.tsx`)

- Three-button segmented control: Sun (light) / Monitor (system) / Moon (dark)
- Uses inline SVG icons (no icon library dependency)
- Active option is visually highlighted
- Reads/writes via `useTheme()` hook
- Placed in the page header flex row **between the page title and `AuthButton`**, left of the folder picker

### Files Changed

| File | Change |
|------|--------|
| `src/app/globals.css` | Replace body rule with CSS variables; add `@custom-variant dark` and variable tokens |
| `src/app/layout.tsx` | Wrap with `ThemeProvider`; add `suppressHydrationWarning` to `<html>` (required to prevent React hydration mismatch — the `dark` class is applied client-side after the server renders no class) |
| `src/lib/theme-context.tsx` | New — context, `ThemeProvider`, `useTheme` hook |
| `src/components/ThemeToggle.tsx` | New — segmented toggle button |
| `src/app/page.tsx` | Add `ThemeToggle` to header; migrate structural colors to CSS variables |
| `src/app/admin/page.tsx` | Migrate structural colors to CSS variables |
| `src/app/submissions/page.tsx` | Migrate structural colors to CSS variables |
| `src/components/MapCard.tsx` | Migrate structural colors to CSS variables |
| `src/components/MapList.tsx` | Migrate structural colors to CSS variables |
| `src/components/AuthButton.tsx` | Migrate structural colors to CSS variables |
| `src/components/ConfirmModal.tsx` | Migrate structural colors to CSS variables |
| `src/components/ProgressModal.tsx` | Migrate structural colors to CSS variables |
| `src/components/PendingQueue.tsx` | Migrate structural colors to CSS variables |
| `src/components/AdminMapList.tsx` | Migrate structural colors to CSS variables |
| `src/components/MySubmissions.tsx` | Migrate structural colors to CSS variables |
| `src/components/SubmitForm.tsx` | Migrate structural colors to CSS variables |
| `src/components/UploadForm.tsx` | Migrate structural colors to CSS variables |

> **Migration scope:** Replace structural color utilities — `bg-white`, `bg-slate-*`, `text-slate-*`, `border-slate-*`, `bg-gray-*`, `text-gray-*`, `border-gray-*` — with CSS variable equivalents. Intent-specific colors (green/yellow/red status badges, blue/violet/orange format badges, amber/blue notification banners) are **not migrated** in this iteration.

---

## Feature 2: Map Search

### Approach

Client-side filtering in `MapList` — no library, no API changes.

### SearchInput (`src/components/SearchInput.tsx`)

- Controlled input: `value: string`, `onChange: (value: string) => void` (string value, not a DOM event — simplifies call site in `MapList`)
- Includes a search icon (inline SVG) on the left
- Styled with CSS variable tokens (themed automatically)
- No internal state

### MapList changes (`src/components/MapList.tsx`)

- Add `'use client'` directive (file has no directive today, making it a Server Component by default — though it already receives a non-serializable `FileSystemDirectoryHandle` prop from its Client Component parent; adding `'use client'` formalizes this and enables `useState`)
- Adds `query` state via `useState<string>('')`
- Renders `<SearchInput>` above the map grid
- Derives filtered list: `maps.filter(m => m.name.toLowerCase().includes(query.toLowerCase()))`
- Shows a "No maps found" empty state when `filteredMaps.length === 0` and `query` is non-empty
- Existing "No maps uploaded yet." empty state preserved when the list is empty with no query

### Files Changed

| File | Change |
|------|--------|
| `src/components/SearchInput.tsx` | New — controlled search input |
| `src/components/MapList.tsx` | Add `'use client'`, query state, SearchInput, filter logic, empty state; migrate structural colors |

---

## Architecture Summary

```
layout.tsx  (suppressHydrationWarning on <html>)
└── ThemeProvider
    └── page.tsx
        ├── Header (flex row)
        │   ├── Title
        │   ├── ThemeToggle   ← new (between title and AuthButton)
        │   ├── AuthButton
        │   └── FolderPicker (conditional)
        └── MapList           ← updated ('use client', search added, colors migrated)
            ├── SearchInput   ← new
            └── MapCard[]     ← colors migrated
```

---

## Decisions & Constraints

- **No localStorage** — theme resets to `'system'` on reload by design
- **No third-party dependencies** — next-themes not used
- **Initial theme state is `'system'`** — effective display mode resolved on mount via `matchMedia`
- **Theming is CSS-variable-only** — `dark:` Tailwind utilities not used; `@custom-variant dark` added for future use
- **`suppressHydrationWarning` on `<html>`** — required because `dark` class is applied client-side
- **`matchMedia` listener cleanup** — must be removed in the effect return to prevent memory leaks
- **`useTheme()` exports** — `{ theme, setTheme }` named export from `src/lib/theme-context.tsx`
- **Search scope** — name only, no format or uploader filtering
- **Search placement** — above the map grid, inside MapList
- **Toggle placement** — header flex row, between title and AuthButton
- **Flash on load** — accepted; since no `localStorage` is used, there is no way to know the user's preferred theme before React hydrates. A brief light→dark flash may occur for users on a dark OS preference. No blocking inline script is added to suppress this.
- **Intent-specific colors out of scope** — badge/banner colors remain hard-coded; accepted visual inconsistency in dark mode
- **`gray-*` classes in scope** — `bg-gray-*`, `text-gray-*`, `border-gray-*` structural uses are migrated alongside `slate-*` equivalents
