# Theme + Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a light/dark/system theme switcher and client-side map name search to the CS 1.6 maps distribution app.

**Architecture:** CSS custom properties define all structural colors on `:root` and `.dark`. A React context manages the active theme and applies the `dark` class to `<html>`. A controlled `SearchInput` feeds a filter in `MapList`. No new dependencies are added.

**Tech Stack:** Next.js 16.2.1, React 19.2.4, Tailwind CSS v4 (arbitrary value syntax for CSS variables), inline SVG icons.

**Note on testing:** No test framework is configured in this project. Each task includes a **Verify** step using the dev server and build instead of automated tests.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/app/globals.css` | Modify | CSS variable tokens + `@custom-variant dark` |
| `src/app/layout.tsx` | Modify | Add `ThemeProvider`, `suppressHydrationWarning` |
| `src/lib/theme-context.tsx` | **Create** | Context, ThemeProvider, useTheme hook |
| `src/components/ThemeToggle.tsx` | **Create** | Sun/Monitor/Moon segmented control |
| `src/components/SearchInput.tsx` | **Create** | Controlled search input |
| `src/app/page.tsx` | Modify | Add ThemeToggle to header; migrate structural colors |
| `src/components/MapList.tsx` | Modify | Add `'use client'`, query state, SearchInput, filter, empty state; migrate colors |
| `src/components/MapCard.tsx` | Modify | Migrate structural colors |
| `src/components/AuthButton.tsx` | Modify | Migrate structural colors |
| `src/components/ConfirmModal.tsx` | Modify | Migrate structural colors |
| `src/components/ProgressModal.tsx` | Modify | Migrate structural colors |
| `src/components/PendingQueue.tsx` | Modify | Migrate structural colors |
| `src/components/AdminMapList.tsx` | Modify | Migrate structural colors |
| `src/components/MySubmissions.tsx` | Modify | Migrate structural colors |
| `src/components/SubmitForm.tsx` | Modify | Migrate structural colors |
| `src/components/UploadForm.tsx` | Modify | Migrate structural colors |
| `src/app/admin/page.tsx` | Modify | Migrate structural colors |
| `src/app/submissions/page.tsx` | Modify | Migrate structural colors |

---

## Color Migration Reference

Replace these patterns everywhere they appear as structural (background/text/border) colors. **Do not touch** intent colors: `green-*`, `red-*`, `yellow-*`, `orange-*` (status/format badges), `amber-*`, `blue-50/blue-100/blue-200` (notification banners), `violet-*`.

| Old class | New class |
|-----------|-----------|
| `bg-white` | `bg-[var(--bg-card)]` |
| `bg-slate-50` | `bg-[var(--bg-secondary)]` |
| `bg-slate-100` | `bg-[var(--bg-secondary)]` |
| `bg-slate-200` | `bg-[var(--border)]` |
| `hover:bg-slate-50` | `hover:bg-[var(--bg-secondary)]` |
| `hover:bg-slate-100` | `hover:bg-[var(--bg-secondary)]` |
| `hover:bg-slate-200` | `hover:bg-[var(--border)]` |
| `bg-gray-200` | `bg-[var(--bg-secondary)]` |
| `bg-gray-300` | `bg-[var(--border)]` |
| `border-slate-200` | `border-[var(--border)]` |
| `border-gray-300` | `border-[var(--border)]` |
| `hover:border-gray-400` | `hover:border-[var(--text-muted)]` |
| `text-slate-900` | `text-[var(--text-primary)]` |
| `text-slate-800` | `text-[var(--text-primary)]` |
| `text-slate-700` | `text-[var(--text-primary)]` |
| `text-slate-600` | `text-[var(--text-primary)]` |
| `text-slate-500` | `text-[var(--text-muted)]` |
| `text-slate-400` | `text-[var(--text-muted)]` |
| `text-gray-500` | `text-[var(--text-muted)]` |
| `text-gray-400` | `text-[var(--text-muted)]` |
| `hover:text-slate-800` | `hover:text-[var(--text-primary)]` |
| `hover:text-slate-600` | `hover:text-[var(--text-primary)]` |
| `hover:text-gray-600` | `hover:text-[var(--text-primary)]` |

---

## Task 1: CSS Foundation

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace globals.css content**

Replace the **entire file** with the content below — do not keep any existing `@import` or `@tailwind` directives. The `@custom-variant dark` line registers the `.dark` class as a Tailwind CSS v4 variant so `dark:` utility prefixes work; it does not enable them automatically — we are not using `dark:` utilities in this project, but including it prevents future confusion.

Replace the entire file with:

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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 2: Verify build still passes**

```bash
cd C:/TEST/cs-maps-distribution
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add CSS variable tokens for light/dark theming"
```

---

## Task 2: ThemeContext

**Files:**
- Create: `src/lib/theme-context.tsx`

**Important implementation note:** The `matchMedia` change listener must be attached **only** when `theme === 'system'`. When `theme` is `'light'` or `'dark'`, applying the class is sufficient — do NOT attach the listener. If the listener were attached unconditionally, changing back to `'system'` would leave orphaned listeners and OS changes would incorrectly override an explicit `'light'` or `'dark'` selection.

- [ ] **Step 1: Create the file**

```tsx
'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
})

function resolveEffective(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    function applyTheme() {
      const effective = resolveEffective(theme)
      document.documentElement.classList.toggle('dark', effective === 'dark')
    }

    applyTheme()

    // Only listen to OS changes when in 'system' mode.
    // In 'light' or 'dark' mode, the class is set above and no listener is needed.
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', applyTheme)
      return () => mq.removeEventListener('change', applyTheme)
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme-context.tsx
git commit -m "feat: add ThemeContext with system/light/dark support"
```

---

## Task 3: Update layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`

**Server/Client boundary note:** `layout.tsx` is a Server Component. `ThemeProvider` is a Client Component (`'use client'`). Server Components can render Client Components as children — this is the correct pattern. Do NOT add `'use client'` to `layout.tsx` itself. The theme is applied via `document.documentElement.classList` in JS, NOT via a `className` prop on `<html>` in the server render. The only change to the `<html>` tag is adding `suppressHydrationWarning` to silence the React warning that occurs when JS adds the `dark` class after the server renders without it.

- [ ] **Step 1: Update layout.tsx**

Replace the file content with:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CS 1.6 Maps",
  description: "Browse and install Counter-Strike 1.6 maps",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Start dev server and verify no hydration errors in browser console**

```bash
npm run dev
```

Open `http://localhost:3000`. Open DevTools → Console. Expected: No React hydration warnings.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: wrap app in ThemeProvider, add suppressHydrationWarning"
```

---

## Task 4: ThemeToggle Component

**Files:**
- Create: `src/components/ThemeToggle.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'
import { useTheme } from '@/lib/theme-context'

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
  </svg>
)

const MonitorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
  </svg>
)

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

type Option = { value: 'light' | 'dark' | 'system'; icon: React.ReactNode; label: string }

const OPTIONS: Option[] = [
  { value: 'light', icon: <SunIcon />, label: 'Light' },
  { value: 'system', icon: <MonitorIcon />, label: 'System' },
  { value: 'dark', icon: <MoonIcon />, label: 'Dark' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-0.5 gap-0.5">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          title={opt.label}
          className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
            theme === opt.value
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ThemeToggle.tsx
git commit -m "feat: add ThemeToggle segmented control (sun/monitor/moon)"
```

---

## Task 5: Wire ThemeToggle into page.tsx + Migrate page.tsx Colors

**Files:**
- Modify: `src/app/page.tsx`

**Server/Client note:** `page.tsx` is already a Client Component (`'use client'` on line 1). `ThemeToggle` is also a Client Component — no boundary changes needed. `page.tsx` does NOT call `useTheme()` directly; `ThemeToggle` is the only consumer.

- [ ] **Step 1: Add ThemeToggle import and place in header**

At the top of the file, add the import:
```tsx
import { ThemeToggle } from '@/components/ThemeToggle'
```

In the header's flex row (line 75 area, inside `<div className="flex items-center gap-3">`), add `<ThemeToggle />` **before** `<AuthButton .../>`:

```tsx
<div className="flex items-center gap-3">
  <ThemeToggle />
  <AuthButton adminEmail={process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''} />
  {supportsFileApi && (
    ...
  )}
</div>
```

- [ ] **Step 2: Migrate structural colors in page.tsx**

Apply the color migration reference table. The specific changes:

```
Line 67:  bg-slate-100           → bg-[var(--bg-primary)]
Line 69:  bg-white               → bg-[var(--bg-card)]
Line 69:  border-slate-200       → border-[var(--border)]
Line 72:  text-slate-900         → text-[var(--text-primary)]
Line 73:  text-slate-400         → text-[var(--text-muted)]
Line 80:  bg-slate-50            → bg-[var(--bg-secondary)]
Line 80:  border-slate-200       → border-[var(--border)]
Line 81:  text-slate-400         → text-[var(--text-muted)]
Line 84:  text-slate-700         → text-[var(--text-primary)]
Line 121: text-slate-400         → text-[var(--text-muted)]
```

Leave the amber and blue notification banners (lines 109-118) untouched — they are intent colors, out of scope.

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

- [ ] **Step 4: Visual check in dev server**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- ThemeToggle appears in header between the title and AuthButton
- Clicking Sun sets light mode (light background)
- Clicking Moon sets dark mode (dark background)
- Clicking Monitor returns to system default
- Header and page background theme correctly

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add ThemeToggle to header, migrate page.tsx structural colors"
```

---

## Task 6: SearchInput Component

**Files:**
- Create: `src/components/SearchInput.tsx`

- [ ] **Step 1: Create the file**

```tsx
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
)

export function SearchInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-muted)]">
      <SearchIcon />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search maps…"
        className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SearchInput.tsx
git commit -m "feat: add SearchInput controlled component"
```

---

## Task 7: Update MapList — Search + Color Migration

**Files:**
- Modify: `src/components/MapList.tsx`

- [ ] **Step 1: Rewrite MapList with search and 'use client'**

Replace the entire file with:

```tsx
'use client'
import { useState } from 'react'
import type { MapEntry } from '@/types/map'
import { MapCard } from './MapCard'
import { SearchInput } from './SearchInput'

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
          <MapCard key={map.id} map={map} gameFolder={gameFolder} onPickFolder={onPickFolder} />
        ))
      )}
    </div>
  )
}
```

**Field confirmed:** `MapEntry` uses `originalName` (not `name`) per `src/types/map.ts`. The filter above uses the correct field.

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Visual check**

Open `http://localhost:3000`. Verify:
- Search box appears above the map list
- Typing filters maps by name (case-insensitive)
- When no maps match, "No maps found." appears
- When no maps are uploaded (empty list), "No maps uploaded yet." appears instead

- [ ] **Step 4: Commit**

```bash
git add src/components/MapList.tsx src/components/SearchInput.tsx
git commit -m "feat: add map search to MapList with client-side filtering"
```

---

## Task 8: Migrate MapCard Colors

**Files:**
- Modify: `src/components/MapCard.tsx`

- [ ] **Step 1: Apply color migrations**

In `MapCard.tsx`, make these replacements:

```
Line 99:  bg-white               → bg-[var(--bg-card)]
Line 99:  border-slate-200       → border-[var(--border)]
Line 101: bg-slate-100 text-slate-600  → bg-[var(--bg-secondary)] text-[var(--text-primary)]  (fallback format badge)
Line 106: text-slate-900         → text-[var(--text-primary)]
Line 113: text-slate-400         → text-[var(--text-muted)]
Line 119: text-slate-400         → text-[var(--text-muted)]
Line 132: bg-slate-100 text-slate-400 cursor-not-allowed  → bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed
Line 134: bg-slate-100 text-slate-600 hover:bg-slate-200  → bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--border)]
```

Leave `FORMAT_COLORS` (bg-blue-100, bg-violet-100, bg-orange-100), `bg-green-100 text-green-700` (installed badge), `bg-green-500/bg-green-600` (Install button), and `bg-blue-500/bg-blue-600` (Download button) untouched.

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Visual check**

In the browser, verify MapCard backgrounds, text, and borders theme correctly in both light and dark mode.

- [ ] **Step 4: Commit**

```bash
git add src/components/MapCard.tsx
git commit -m "refactor: migrate MapCard structural colors to CSS variables"
```

---

## Task 9: Migrate AuthButton Colors

**Files:**
- Modify: `src/components/AuthButton.tsx`

- [ ] **Step 1: Apply color migrations**

```
Line 50:  bg-white               → bg-[var(--bg-card)]
Line 50:  border-slate-200       → border-[var(--border)]
Line 50:  text-slate-700         → text-[var(--text-primary)]
Line 50:  hover:bg-slate-50      → hover:bg-[var(--bg-secondary)]
Line 68:  text-slate-700         → text-[var(--text-primary)]
Line 73:  text-slate-600 hover:text-slate-800  → text-[var(--text-primary)] hover:text-[var(--text-primary)]
Line 77:  text-slate-400 hover:text-slate-600  → text-[var(--text-muted)] hover:text-[var(--text-primary)]
```

Leave Google brand colors (`#4285F4`, `#34A853`, etc.) untouched. Leave `text-blue-600 hover:text-blue-800` (Admin link) and `text-green-600 hover:text-green-800` (Submit link) untouched.

- [ ] **Step 2: Verify + commit**

```bash
npm run build
git add src/components/AuthButton.tsx
git commit -m "refactor: migrate AuthButton structural colors to CSS variables"
```

---

## Task 10: Migrate Modal Colors

**Files:**
- Modify: `src/components/ConfirmModal.tsx`
- Modify: `src/components/ProgressModal.tsx`

- [ ] **Step 1: Migrate ConfirmModal.tsx**

```
Line 22:  bg-white               → bg-[var(--bg-card)]
Line 23:  text-slate-800         → text-[var(--text-primary)]
Line 27:  text-slate-600 hover:text-slate-800  → text-[var(--text-muted)] hover:text-[var(--text-primary)]
```

Leave `bg-red-500 hover:bg-red-600` and `bg-blue-500 hover:bg-blue-600` (action buttons) untouched.

- [ ] **Step 2: Migrate ProgressModal.tsx**

```
Line 17:  bg-white               → bg-[var(--bg-card)]
Line 27:  text-slate-900         → text-[var(--text-primary)]
Line 34:  text-slate-400         → text-[var(--text-muted)]
Line 41:  bg-slate-100           → bg-[var(--bg-secondary)]   (progress track)
Line 47:  text-slate-400         → text-[var(--text-muted)]
Line 53:  bg-slate-100           → bg-[var(--bg-secondary)]   (progress track)
Line 59:  text-slate-400         → text-[var(--text-muted)]
Line 75:  text-slate-900         → text-[var(--text-primary)]
Line 76:  text-slate-400         → text-[var(--text-muted)]
Line 99:  text-slate-900         → text-[var(--text-primary)]
Line 99:  text-slate-500         → text-[var(--text-muted)]
Line 113: bg-slate-100 hover:bg-slate-200 text-slate-700  → bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-[var(--text-primary)]
```

Leave `bg-blue-100`, `border-blue-500`, `bg-green-100`, `text-green-600`, `bg-green-500/600`, `bg-red-100`, `text-red-600` untouched.

- [ ] **Step 3: Verify + commit**

```bash
npm run build
git add src/components/ConfirmModal.tsx src/components/ProgressModal.tsx
git commit -m "refactor: migrate modal structural colors to CSS variables"
```

---

## Task 11: Migrate PendingQueue + AdminMapList

**Files:**
- Modify: `src/components/PendingQueue.tsx`
- Modify: `src/components/AdminMapList.tsx`

- [ ] **Step 1: Migrate PendingQueue.tsx**

```
Line 70:  bg-white               → bg-[var(--bg-card)]
Line 73:  text-slate-600         → text-[var(--text-primary)]
Line 74:  text-slate-400         → text-[var(--text-muted)]
Line 79:  bg-slate-100 text-slate-600  → bg-[var(--bg-secondary)] text-[var(--text-primary)]  (format badge)
Line 80:  text-slate-900         → text-[var(--text-primary)]
Line 81:  text-slate-400         → text-[var(--text-muted)]
Line 92:  bg-slate-50            → bg-[var(--bg-secondary)]
Line 93:  text-slate-500         → text-[var(--text-muted)]
Line 112: border rounded-lg      → border border-[var(--border)] rounded-lg  (rejection input)
```

Leave `border-orange-200` (card border), `text-orange-600` (heading), `bg-green-500/600`, `bg-red-100 text-red-600/200`, `text-blue-500/700` untouched.

- [ ] **Step 2: Migrate AdminMapList.tsx**

```
Line 32:  text-gray-400          → text-[var(--text-muted)]
Line 38:  bg-white border rounded-lg  → bg-[var(--bg-card)] border border-[var(--border)] rounded-lg
Line 41:  text-gray-400          → text-[var(--text-muted)]
Line 42:  text-gray-400          → text-[var(--text-muted)]
Line 43:  text-gray-400          → text-[var(--text-muted)]
```

Leave `text-red-500 hover:text-red-700` (Delete button) untouched.

- [ ] **Step 3: Verify + commit**

```bash
npm run build
git add src/components/PendingQueue.tsx src/components/AdminMapList.tsx
git commit -m "refactor: migrate PendingQueue + AdminMapList structural colors to CSS variables"
```

---

## Task 12: Migrate MySubmissions + SubmitForm + UploadForm

**Files:**
- Modify: `src/components/MySubmissions.tsx`
- Modify: `src/components/SubmitForm.tsx`
- Modify: `src/components/UploadForm.tsx`

- [ ] **Step 1: Migrate MySubmissions.tsx**

```
Line 27:  text-slate-400         → text-[var(--text-muted)]
Line 28:  text-slate-400         → text-[var(--text-muted)]
Line 33:  bg-white               → bg-[var(--bg-card)]
Line 33:  border-slate-200       → border-[var(--border)]
Line 36:  text-slate-900         → text-[var(--text-primary)]
Line 37:  text-slate-400         → text-[var(--text-muted)]
Line 38:  text-slate-400         → text-[var(--text-muted)]
Line 48:  text-slate-400         → text-[var(--text-muted)]
```

Leave `STATUS_STYLES` (yellow/green/red status badges) and `text-red-500` untouched.

- [ ] **Step 2: Migrate SubmitForm.tsx**

```
Line 106: border-gray-300 hover:border-gray-400  → border-[var(--border)] hover:border-[var(--text-muted)]
Line 124: text-gray-500          → text-[var(--text-muted)]
Line 125: text-gray-400          → text-[var(--text-muted)]
Line 131: bg-white border        → bg-[var(--bg-card)] border border-[var(--border)]
Line 133: text-slate-800         → text-[var(--text-primary)]
Line 135: text-gray-400          → text-[var(--text-muted)]
Line 154: bg-gray-200            → bg-[var(--bg-secondary)]   (progress track)
Line 170: text-gray-400 hover:text-gray-600  → text-[var(--text-muted)] hover:text-[var(--text-primary)]
```

Leave blue/green/red upload status badges, `bg-blue-50/blue-400`, `bg-blue-500` untouched.

- [ ] **Step 3: Migrate UploadForm.tsx** (identical structure to SubmitForm)

Same replacements as SubmitForm — lines are at the same positions since the files are structurally identical.

- [ ] **Step 4: Verify + commit**

```bash
npm run build
git add src/components/MySubmissions.tsx src/components/SubmitForm.tsx src/components/UploadForm.tsx
git commit -m "refactor: migrate MySubmissions + SubmitForm + UploadForm structural colors to CSS variables"
```

---

## Task 13: Migrate Page Files

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/submissions/page.tsx`

- [ ] **Step 1: Migrate admin/page.tsx**

```
Line 35:  text-gray-400          → text-[var(--text-muted)]
Line 36:  text-gray-400          → text-[var(--text-muted)]
```

- [ ] **Step 2: Migrate submissions/page.tsx**

```
Line 9:   text-slate-500         → text-[var(--text-muted)]
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

- [ ] **Step 4: Full visual review**

```bash
npm run dev
```

Check all routes in both light and dark mode:
- `http://localhost:3000` — home page, map cards, search, theme toggle
- `http://localhost:3000/admin` — upload form, map list, pending queue
- `http://localhost:3000/submissions` — submit form, my submissions
- Verify modals (ConfirmModal via install confirmation) theme correctly
- Verify ProgressModal themes correctly during install

- [ ] **Step 5: Final commit**

```bash
git add src/app/admin/page.tsx src/app/submissions/page.tsx
git commit -m "refactor: migrate admin + submissions page structural colors to CSS variables"
```

---

## Final Verification Checklist

- [ ] `npm run build` passes with no errors
- [ ] Theme toggle (Sun/Monitor/Moon) visible in header
- [ ] Switching to Dark mode: all card backgrounds, text, borders are dark-themed
- [ ] Switching to Light mode: returns to light colors
- [ ] System mode: matches OS preference; changes in real time if OS preference changes
- [ ] Page reload resets to System mode
- [ ] Search input visible above map list
- [ ] Typing in search filters map cards by name
- [ ] Empty search state ("No maps found.") appears when no cards match
- [ ] Original empty state ("No maps uploaded yet.") preserved when list is empty
- [ ] Intent colors (green installed badge, orange format badge, etc.) unchanged
- [ ] Notification banners (amber/blue) unchanged
- [ ] No React hydration warnings in DevTools console
