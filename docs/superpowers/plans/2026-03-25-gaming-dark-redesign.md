# Gaming Dark UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the CS Maps app with a Gaming Dark aesthetic (navy/black, orange+cyan accents) and add three new features: map screenshots, a map detail modal, and a cinematic install stepper.

**Architecture:** All shared state (search query, active tag filter, installed count) lifts to `page.tsx` and flows down as props. The install stepper replaces `ProgressModal` + the notification-context progress flow. Screenshots are stored in Supabase following the existing `storage.ts` abstraction and persisted as `screenshotKeys` on Firestore map documents.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript 5, Firebase/Firestore, Supabase, Jest + @testing-library/react

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/globals.css` | Modify | Replace `:root {}` with Gaming Dark tokens |
| `src/lib/auth/theme-context.tsx` | Delete | Replaced by static dark theme |
| `src/components/layout/ThemeToggle.tsx` | Delete | No light mode |
| `src/app/layout.tsx` | Modify | Remove `ThemeProvider`; keep `NotificationProvider` |
| `src/lib/auth/notification-context.tsx` | Modify | Remove progress-install types; keep success/error push |
| `src/components/ProgressModal.tsx` | Delete | Superseded by `InstallStepper` |
| `src/components/ConfirmModal.tsx` | Modify | Keep for invalid-folder warning in `page.tsx`; remove from `MapCard` usage |
| `src/components/maps/SearchInput.tsx` | Modify | Update token refs only |
| `src/lib/maps/tags.ts` | Modify | Update labels for single-select tab model |
| `src/components/layout/SiteHeader.tsx` | Rewrite | Gaming Dark nav: logo, search, filter tabs, installed counter |
| `src/app/page.tsx` | Modify | Lift state: query, activeTag, installedCount; wire callbacks |
| `src/components/maps/MapList.tsx` | Modify | Stats bar, client-side sort, batch-select; call `onInstalledCountChange` |
| `src/components/maps/MapCard.tsx` | Rewrite | Rich card: thumbnail zone + info zone, all install states |
| `src/types/map.ts` | Modify | Add `screenshotKeys?: string[]` to `MapEntry` |
| `src/lib/maps/maps-store.ts` | Modify | Read/write `screenshotKeys`; add `updateScreenshotKeys` |
| `src/lib/storage/screenshots.ts` | Create | Upload/delete/sign screenshot keys via Supabase |
| `src/app/api/maps/route.ts` | Modify | Resolve `screenshotKeys` → signed URLs in GET response |
| `src/app/api/maps/[id]/screenshots/route.ts` | Create | POST: upload screenshot |
| `src/app/api/maps/[id]/screenshots/[index]/route.ts` | Create | DELETE: remove screenshot by 0-based index |
| `src/components/admin/UploadForm.tsx` | Modify | Add screenshot upload section (up to 3 images) |
| `src/components/maps/InstallStepper.tsx` | Create | 4-phase stepper display component |
| `src/components/maps/MapDetailModal.tsx` | Create | Screenshot gallery + meta + stepper + actions |
| All other components with old tokens | Modify | Update `--bg-card`, `--bg-secondary`, `--border-default`, `--accent`, etc. |

---

## Task 1: Gaming Dark theme tokens

**Files:**
- Modify: `src/app/globals.css`
- Delete: `src/lib/auth/theme-context.tsx`
- Delete: `src/components/layout/ThemeToggle.tsx`
- Delete: `src/components/ProgressModal.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/lib/auth/notification-context.tsx`

- [ ] **Step 1: Replace globals.css**

Delete the entire file contents and write:

```css
@import "tailwindcss";

:root {
  --bg-base: #0a0c14;
  --bg-surface: #0f1623;
  --bg-inset: #090b10;
  --border: #1e2a3a;
  --border-installed: #1e3a2a;
  --accent-orange: #f97316;
  --accent-cyan: #38bdf8;
  --accent-green: #22c55e;
  --accent-red: #f87171;
  --text-primary: #e2e8f0;
  --text-muted: #4b5563;
  --text-subtle: #94a3b8;
  --color-danger: #ef4444;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}

body {
  background-color: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-geist-sans), system-ui, sans-serif;
}
```

- [ ] **Step 2: Delete the three files**

```bash
rm src/lib/auth/theme-context.tsx
rm src/components/layout/ThemeToggle.tsx
rm src/components/ProgressModal.tsx
```

- [ ] **Step 3: Update layout.tsx** — remove `ThemeProvider` import and wrapper; keep `NotificationProvider`

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NotificationProvider } from "@/lib/auth/notification-context";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CS 1.6 Maps",
  description: "Browse and install Counter-Strike 1.6 maps",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NotificationProvider>{children}</NotificationProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Slim down notification-context.tsx** — remove progress-install types; keep success/error `push`

Replace the file with a version that removes `progress` from the `Notification` union, removes `startProgress`, `updateProgress`, `activeInstallId`:

```tsx
'use client'
import { createContext, useContext, useState, useCallback } from 'react'

export type Notification = {
  id: string
  type: 'success' | 'error'
  message: string
  read: boolean
  at: Date
}

type NotificationContextType = {
  notifications: Notification[]
  push: (message: string, type: 'success' | 'error') => void
  markAllRead: () => void
  clear: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)
const AUTO_DISMISS_MS = 3000

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const push = useCallback((message: string, type: 'success' | 'error') => {
    const id = `${Date.now()}-${Math.random()}`
    setNotifications(prev => [{ id, type, message, read: false, at: new Date() }, ...prev].slice(0, 20))
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
  }, [dismiss])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clear = useCallback(() => setNotifications([]), [])

  return (
    <NotificationContext.Provider value={{ notifications, push, markAllRead, clear }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
```

- [ ] **Step 5: Fix TypeScript errors** — run the type checker to find all components that reference deleted types/components

```bash
npx tsc --noEmit 2>&1 | head -60
```

Fix each error: remove `startProgress`/`updateProgress`/`activeInstallId` usages (mainly in `MapCard.tsx` — those usages will be replaced in Task 7). For now add a `// TODO: wired in Task 7` comment at each removed call site to keep the build green.

- [ ] **Step 6: Verify build passes**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors (warnings OK).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: gaming dark theme tokens, remove ThemeProvider and ProgressModal"
```

---

## Task 2: Token migration — update all existing components

**Files:** Every component/page that uses old CSS variable names (`--bg-card`, `--bg-primary`, `--bg-secondary`, `--bg-elevated`, `--border-default`, `--border-subtle`, `--border-strong`, `--accent`, `--text-secondary`, `--text-inverse`, `--color-success`, `--color-danger`, etc.)

- [ ] **Step 1: Find all old token usages**

```bash
grep -r "var(--bg-\|var(--text-secondary\|var(--border-default\|var(--border-subtle\|var(--border-strong\|var(--accent)\|var(--color-success\|var(--color-warning" src/ --include="*.tsx" --include="*.ts" --include="*.css" -l
```

- [ ] **Step 2: Apply token mapping**

For each file found, replace old tokens with new equivalents:

| Old token | New token |
|---|---|
| `--bg-primary` | `--bg-base` |
| `--bg-card` | `--bg-surface` |
| `--bg-surface` | `--bg-surface` |
| `--bg-elevated` | `--bg-surface` |
| `--bg-secondary` | `--bg-inset` |
| `--bg-inset` | `--bg-inset` |
| `--border-default` | `--border` |
| `--border-subtle` | `--border` |
| `--border-strong` | `--border` |
| `--text-secondary` | `--text-subtle` |
| `--text-inverse` | `--bg-base` |
| `--accent` | `--accent-cyan` |
| `--accent-hover` | `--accent-cyan` |
| `--color-success` | `--accent-green` |
| `--color-success-hover` | `--accent-green` |
| `--color-success-muted` | `--bg-inset` |
| `--color-danger` | `--color-danger` (unchanged) |
| `--color-danger-muted` | `--bg-inset` |
| `--color-warning` | `--accent-orange` |

- [ ] **Step 3: Run build to verify no broken references**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: migrate all components to gaming dark tokens"
```

---

## Task 3: Tags update

**Files:**
- Modify: `src/lib/maps/tags.ts`
- Test: `tests/lib/maps/tags.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/lib/maps/tags.test.ts
import { FILTER_TABS, tabToTag } from '@/lib/maps/tags'

test('FILTER_TABS has three entries', () => {
  expect(FILTER_TABS).toHaveLength(3)
})

test('tabToTag maps correctly', () => {
  expect(tabToTag('all')).toBeNull()
  expect(tabToTag('de_')).toBe('de_')
  expect(tabToTag('cs_')).toBe('cs_')
})
```

```bash
npx jest tests/lib/maps/tags.test.ts
```

Expected: FAIL — `FILTER_TABS` and `tabToTag` not exported.

- [ ] **Step 2: Update tags.ts**

```ts
// src/lib/maps/tags.ts
export const MAP_TAGS = ['de_', 'cs_'] as const
export type MapTag = typeof MAP_TAGS[number]
export type FilterTab = 'all' | 'de_' | 'cs_'

export const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'de_', label: 'DEFUSE' },
  { value: 'cs_', label: 'HOSTAGE' },
]

export const TAG_LABELS: Record<string, string> = {
  'de_': 'Bomb/Defuse (DE)',
  'cs_': 'Hostage Rescue (CS)',
}

export const TAG_SHORT: Record<string, string> = {
  'de_': 'DE',
  'cs_': 'CS',
}

export function tabToTag(tab: FilterTab): MapTag | null {
  return tab === 'all' ? null : tab
}
```

- [ ] **Step 3: Run test — verify passes**

```bash
npx jest tests/lib/maps/tags.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/maps/tags.ts tests/lib/maps/tags.test.ts
git commit -m "feat: add FILTER_TABS and tabToTag for single-select nav tabs"
```

---

## Task 4: SiteHeader redesign

**Files:**
- Rewrite: `src/components/layout/SiteHeader.tsx`
- Modify: `src/components/maps/SearchInput.tsx` (token refs only)
- Test: `tests/components/layout/SiteHeader.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// tests/components/layout/SiteHeader.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { SiteHeader } from '@/components/layout/SiteHeader'

const defaultProps = {
  installedCount: 3,
  totalCount: 10,
  query: '',
  onQueryChange: jest.fn(),
  activeTab: 'all' as const,
  onTabChange: jest.fn(),
}

test('renders logo', () => {
  render(<SiteHeader {...defaultProps} />)
  expect(screen.getByText('CS MAPS')).toBeInTheDocument()
})

test('renders installed counter', () => {
  render(<SiteHeader {...defaultProps} />)
  expect(screen.getByText(/3.*10/)).toBeInTheDocument()
})

test('calls onTabChange when DEFUSE tab clicked', () => {
  const onTabChange = jest.fn()
  render(<SiteHeader {...defaultProps} onTabChange={onTabChange} />)
  fireEvent.click(screen.getByText('DEFUSE'))
  expect(onTabChange).toHaveBeenCalledWith('de_')
})

test('calls onQueryChange when search input changes', () => {
  const onQueryChange = jest.fn()
  render(<SiteHeader {...defaultProps} onQueryChange={onQueryChange} />)
  fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'dust' } })
  expect(onQueryChange).toHaveBeenCalledWith('dust')
})
```

```bash
npx jest tests/components/layout/SiteHeader.test.tsx
```

Expected: FAIL — component doesn't accept new props.

- [ ] **Step 2: Rewrite SiteHeader.tsx**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/auth/firebase-client'
import { AuthButton } from '@/components/submissions/AuthButton'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { SearchInput } from '@/components/maps/SearchInput'
import { FILTER_TABS, type FilterTab } from '@/lib/maps/tags'

interface SiteHeaderProps {
  installedCount: number
  totalCount: number
  query: string
  onQueryChange: (q: string) => void
  activeTab: FilterTab
  onTabChange: (tab: FilterTab) => void
}

export function SiteHeader({
  installedCount,
  totalCount,
  query,
  onQueryChange,
  activeTab,
  onTabChange,
}: SiteHeaderProps) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    return onAuthStateChanged(auth, setUser)
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg-surface)] border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono font-bold text-[var(--accent-orange)] tracking-widest text-sm">CS MAPS</span>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--bg-inset)] text-[var(--accent-cyan)] border border-[var(--border)]">
            {totalCount}
          </span>
        </div>

        {/* Search */}
        <div className="flex-1">
          <SearchInput value={query} onChange={onQueryChange} />
        </div>

        {/* Filter tabs */}
        <nav className="flex items-center shrink-0">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={`px-3 py-1.5 text-xs font-mono font-semibold transition-colors border-b-2 ${
                activeTab === tab.value
                  ? 'text-[var(--accent-cyan)] border-[var(--accent-cyan)]'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Installed counter */}
        <span className="text-xs font-mono text-[var(--text-muted)] shrink-0 border border-[var(--border)] px-2 py-1 rounded">
          <span className="text-[var(--accent-green)]">{installedCount}</span>
          {' / '}{totalCount}{' '}
          <span className="text-[var(--accent-green)]">installed</span>
        </span>

        {/* Auth utilities */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationBell />
          {user !== undefined && (
            <AuthButton adminEmail={process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''} />
          )}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Update SearchInput.tsx** — replace old token refs (`--bg-card` → `--bg-surface`, `--border-default` → `--border`, etc.); make it accept `value`+`onChange` props (check current signature first)

- [ ] **Step 4: Run tests — verify pass**

```bash
npx jest tests/components/layout/SiteHeader.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/SiteHeader.tsx src/components/maps/SearchInput.tsx tests/components/layout/SiteHeader.test.tsx
git commit -m "feat: gaming dark SiteHeader with search, filter tabs, installed counter"
```

---

## Task 5: page.tsx state lifting

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update page.tsx** — add `query`, `activeTab`, `installedCount` state; pass callbacks to `MapList`; pass props to `SiteHeader`

```tsx
'use client'
import { useEffect, useState } from 'react'
import { MapList } from '@/components/maps/MapList'
import type { MapEntry } from '@/types/map'
import { isFileSystemAccessSupported, pickGameFolder, validateGameFolder } from '@/lib/maps/install'
import { saveHandle, loadHandle } from '@/lib/maps/folder-store'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { ConfirmModal } from '@/components/ConfirmModal'
import type { FilterTab } from '@/lib/maps/tags'

export default function HomePage() {
  const [maps, setMaps] = useState<MapEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [gameFolder, setGameFolder] = useState<FileSystemDirectoryHandle | null>(null)
  const [supportsFileApi, setSupportsFileApi] = useState(false)
  const [pendingHandle, setPendingHandle] = useState<FileSystemDirectoryHandle | null>(null)

  // Lifted state for SiteHeader
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [installedCount, setInstalledCount] = useState(0)

  function fetchMaps() {
    setLoading(true)
    fetch('/api/maps')
      .then(r => r.ok ? r.json() : [])
      .then(setMaps)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchMaps()
    function onPageShow(e: PageTransitionEvent) { if (e.persisted) fetchMaps() }
    function onVisibilityChange() { if (document.visibilityState === 'visible') fetchMaps() }
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supported = isFileSystemAccessSupported()
    setSupportsFileApi(supported)
    if (supported) loadHandle().then(h => { if (h) setGameFolder(h) }).catch(() => {})
  }, [])

  async function handlePickFolder() {
    try {
      const handle = await pickGameFolder()
      const valid = await validateGameFolder(handle)
      if (!valid) { setPendingHandle(handle); return }
      await saveHandle(handle)
      setGameFolder(handle)
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'AbortError') throw err
    }
  }

  async function confirmFolder() {
    if (!pendingHandle) return
    setPendingHandle(null)
    await saveHandle(pendingHandle)
    setGameFolder(pendingHandle)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <SiteHeader
        installedCount={installedCount}
        totalCount={maps.length}
        query={query}
        onQueryChange={setQuery}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <main className="max-w-7xl mx-auto px-4 py-4">
        {!supportsFileApi && (
          <div className="mb-6 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--accent-orange)] rounded-lg text-sm text-[var(--accent-orange)]">
            Your browser doesn&apos;t support one-click install. Use the <strong>Download</strong> button instead.
          </div>
        )}
        {supportsFileApi && !gameFolder && (
          <div className="mb-4 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-muted)]">
            Select your CS 1.6 folder first — e.g. <code className="font-mono text-[var(--accent-cyan)]">C:\Games\Counter-Strike</code>
          </div>
        )}
        {loading ? (
          <div className="text-center py-20 text-[var(--text-muted)] text-sm font-mono">Loading maps...</div>
        ) : (
          <MapList
            maps={maps}
            gameFolder={gameFolder}
            onPickFolder={handlePickFolder}
            query={query}
            activeTab={activeTab}
            onInstalledCountChange={setInstalledCount}
          />
        )}
      </main>
      {pendingHandle && (
        <ConfirmModal
          message="This doesn't look like a CS 1.6 root folder (no 'cstrike' subfolder found). Continue anyway?"
          confirmLabel="Continue"
          onConfirm={confirmFolder}
          onCancel={() => setPendingHandle(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run build to catch type errors**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -40
```

Fix any errors (MapList will need new props — those come in Task 6).

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: lift query/activeTab/installedCount state to page.tsx"
```

---

## Task 6: MapList redesign

**Files:**
- Modify: `src/components/maps/MapList.tsx`
- Test: `tests/components/maps/MapList.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// tests/components/maps/MapList.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MapList } from '@/components/maps/MapList'
import type { MapEntry } from '@/types/map'

const mockMap = (id: string, tags: string[]): MapEntry => ({
  id, originalName: `de_${id}`, storageKey: `archives/${id}.zip`,
  format: 'zip', size: 1024 * 1024, sha256: 'abc', uploadedAt: '2025-01-01T00:00:00Z',
  installCount: 5, tags,
})

const defaultProps = {
  maps: [mockMap('1', ['de_']), mockMap('2', ['cs_'])],
  gameFolder: null,
  onPickFolder: jest.fn(),
  query: '',
  activeTab: 'all' as const,
  onInstalledCountChange: jest.fn(),
}

test('renders map count in stats bar', () => {
  render(<MapList {...defaultProps} />)
  expect(screen.getByText(/2 maps/i)).toBeInTheDocument()
})

test('filters by activeTab de_', () => {
  render(<MapList {...defaultProps} activeTab="de_" />)
  expect(screen.getByText('de_1')).toBeInTheDocument()
  expect(screen.queryByText('de_2')).not.toBeInTheDocument()
})

test('filters by query', () => {
  render(<MapList {...defaultProps} query="de_1" />)
  expect(screen.getByText('de_1')).toBeInTheDocument()
  expect(screen.queryByText('de_2')).not.toBeInTheDocument()
})
```

```bash
npx jest tests/components/maps/MapList.test.tsx
```

Expected: FAIL — `MapList` doesn't accept new props.

- [ ] **Step 2: Update MapList.tsx** — accept new props; move query/tag filtering into MapList (driven by props); add stats bar with sort dropdown; keep existing folder-picker + CheatCodeBanner below stats bar; add `onInstalledCountChange` callback that fires when `installedBsps` changes

Key changes to `MapList`:
- Add props: `query: string`, `activeTab: FilterTab`, `onInstalledCountChange: (n: number) => void`
- Remove internal `query` + `selectedTags` state (now comes from props)
- Apply filtering: `maps.filter(m => (activeTab === 'all' || m.tags.includes(activeTab)) && m.originalName.toLowerCase().includes(query.toLowerCase()))`
- Add `sort` state: `'popular' | 'newest' | 'az'`, default `'popular'`
- Sort before render: popular = by `installCount` desc; newest = by `uploadedAt` desc; az = by `originalName` asc
- Add stats bar row above the grid: `{filtered.length} maps · Sort: <dropdown>`
- When `selectedIds.size > 0`: stats bar shows `{n} selected · INSTALL ALL` button
- Call `onInstalledCountChange(installedBsps.size)` in the `useEffect` that scans for installed BSPs

- [ ] **Step 3: Run tests — verify pass**

```bash
npx jest tests/components/maps/MapList.test.tsx
```

- [ ] **Step 4: Run build**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/components/maps/MapList.tsx tests/components/maps/MapList.test.tsx
git commit -m "feat: MapList stats bar, sort, single-select tag filter from props"
```

---

## Task 7: MapCard rewrite

**Files:**
- Rewrite: `src/components/maps/MapCard.tsx`
- Test: `tests/components/maps/MapCard.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// tests/components/maps/MapCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MapCard } from '@/components/maps/MapCard'
import type { MapEntry } from '@/types/map'

const mockMap: MapEntry = {
  id: '1', originalName: 'de_dust2', storageKey: 'archives/1.zip',
  format: 'zip', size: 2 * 1024 * 1024, sha256: 'abc',
  uploadedAt: '2025-01-01T00:00:00Z', installCount: 1204, tags: ['de_'],
}

const defaultProps = {
  map: mockMap,
  gameFolder: null,
  onPickFolder: jest.fn(),
  installedBsps: new Set<string>(),
  onInstalled: jest.fn(),
  onOpenDetail: jest.fn(),
}

test('renders map name', () => {
  render(<MapCard {...defaultProps} />)
  expect(screen.getByText('de_dust2')).toBeInTheDocument()
})

test('renders DE badge for de_ tag', () => {
  render(<MapCard {...defaultProps} />)
  expect(screen.getByText('DE')).toBeInTheDocument()
})

test('renders install count', () => {
  render(<MapCard {...defaultProps} />)
  expect(screen.getByText(/1,204/)).toBeInTheDocument()
})

test('INSTALL button present when not installed', () => {
  render(<MapCard {...defaultProps} />)
  expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument()
})

test('clicking thumbnail calls onOpenDetail', () => {
  const onOpenDetail = jest.fn()
  render(<MapCard {...defaultProps} onOpenDetail={onOpenDetail} />)
  fireEvent.click(screen.getByTestId('card-thumbnail'))
  expect(onOpenDetail).toHaveBeenCalledWith(mockMap)
})

test('clicking map name calls onOpenDetail', () => {
  const onOpenDetail = jest.fn()
  render(<MapCard {...defaultProps} onOpenDetail={onOpenDetail} />)
  fireEvent.click(screen.getByText('de_dust2'))
  expect(onOpenDetail).toHaveBeenCalledWith(mockMap)
})
```

```bash
npx jest tests/components/maps/MapCard.test.tsx
```

Expected: FAIL.

- [ ] **Step 2: Rewrite MapCard.tsx**

```tsx
'use client'
import { useState, useEffect } from 'react'
import type { MapEntry } from '@/types/map'
import { isFileSystemAccessSupported, installMap, isBspInstalled } from '@/lib/maps/install'
import { ensurePermission, markInstalled, isInstalledLocally } from '@/lib/maps/folder-store'
import type { InstallStatus } from '@/lib/maps/install'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getTypeBadge(tags: string[]): { label: string; color: string } | null {
  if (tags.includes('de_')) return { label: 'DE', color: 'var(--accent-orange)' }
  if (tags.includes('cs_')) return { label: 'CS', color: 'var(--accent-red)' }
  return null
}

export function MapCard({
  map,
  gameFolder,
  onPickFolder,
  installedBsps,
  onInstalled,
  onOpenDetail,
  selected = false,
  onToggleSelect,
  autoInstall = false,
  onBatchTriggered,
  installStatus,
  onInstallStatusChange,
}: {
  map: MapEntry
  gameFolder: FileSystemDirectoryHandle | null
  onPickFolder: () => Promise<void>
  installedBsps: Set<string>
  onInstalled: () => void
  onOpenDetail: (map: MapEntry) => void
  selected?: boolean
  onToggleSelect?: () => void
  autoInstall?: boolean
  onBatchTriggered?: () => void
  installStatus?: InstallStatus | null
  onInstallStatusChange?: (id: string, status: InstallStatus | null) => void
}) {
  const [installed, setInstalled] = useState(() => isInstalledLocally(map.id))
  const [installCount, setInstallCount] = useState(map.installCount)
  const supportsFileApi = isFileSystemAccessSupported()
  const isInstalling = installStatus != null && installStatus.phase !== 'done' && installStatus.phase !== 'error'

  // Download progress for inline bar (0–100)
  const downloadProgress = installStatus?.phase === 'downloading' ? installStatus.progress : null

  useEffect(() => {
    setInstalled(isBspInstalled(map.originalName, installedBsps) || isInstalledLocally(map.id))
  }, [installedBsps, map.originalName, map.id])

  useEffect(() => {
    if (!autoInstall) return
    void doInstall()
    onBatchTriggered?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInstall])

  async function doInstall() {
    onInstallStatusChange?.(map.id, { phase: 'downloading', progress: 0 })
    try {
      let handle = gameFolder
      if (!handle) { await onPickFolder(); return }
      const permitted = await ensurePermission(handle)
      if (!permitted) {
        onInstallStatusChange?.(map.id, { phase: 'error', message: 'Folder access denied.' })
        return
      }
      const res = await fetch(`/api/download/${map.id}`)
      if (!res.ok) throw new Error('Failed to get download URL')
      const { url, sha256 } = await res.json()
      await installMap(map, url, sha256, handle, (s: InstallStatus) => onInstallStatusChange?.(map.id, s))
      markInstalled(map.id)
      fetch(`/api/maps/${map.id}/install`, { method: 'POST' }).catch(() => {})
      setInstalled(true)
      setInstallCount(c => c + 1)
      onInstalled()
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return
      const msg = (err as Error).message ?? 'Unknown error'
      onInstallStatusChange?.(map.id, { phase: 'error', message: msg })
    }
  }

  async function handleRawDownload() {
    const res = await fetch(`/api/download/${map.id}`)
    const { url } = await res.json()
    const a = document.createElement('a')
    a.href = url
    a.download = `${map.originalName}.${map.format}`
    a.click()
  }

  const badge = getTypeBadge(map.tags)
  const screenshotUrl = map.screenshotKeys?.[0] ?? null

  // Installed card gets green tint border
  const cardBorder = installed
    ? 'border-[var(--border-installed)]'
    : isInstalling
      ? 'border-[var(--accent-orange)]'
      : 'border-[var(--border)] hover:border-[var(--accent-cyan)]'

  const phaseLabel = installStatus
    ? installStatus.phase === 'downloading' ? `Downloading... ${Math.round(installStatus.progress)}%`
    : installStatus.phase === 'verifying' ? 'Verifying...'
    : installStatus.phase === 'extracting' ? 'Extracting...'
    : installStatus.phase === 'writing' ? `Writing ${installStatus.done}/${installStatus.total}...`
    : null
    : null

  return (
    <div className={`bg-[var(--bg-surface)] border rounded-lg overflow-hidden transition-colors ${cardBorder}`}>

      {/* Thumbnail zone */}
      <div
        data-testid="card-thumbnail"
        className="relative h-20 cursor-pointer"
        style={{ background: screenshotUrl ? undefined : 'linear-gradient(135deg, #1a2744, #0f1e3a)' }}
        onClick={() => onOpenDetail(map)}
      >
        {screenshotUrl && (
          <img src={screenshotUrl} alt={map.originalName} className="w-full h-full object-cover" />
        )}
        {/* Type badge */}
        {badge && (
          <span
            className="absolute top-1.5 left-2 text-xs font-mono font-bold px-1.5 py-0.5 rounded-sm text-black"
            style={{ background: badge.color }}
          >
            {badge.label}
          </span>
        )}
        {/* Batch checkbox */}
        <button
          className="absolute top-1.5 right-2 w-4 h-4 rounded-sm border flex items-center justify-center"
          style={{
            background: selected ? 'var(--accent-orange)' : 'rgba(0,0,0,0.5)',
            borderColor: selected ? 'var(--accent-orange)' : 'var(--text-muted)',
          }}
          onClick={e => { e.stopPropagation(); onToggleSelect?.() }}
          aria-label={selected ? 'Deselect' : 'Select'}
        >
          {selected && <span className="text-black text-xs font-bold leading-none">✓</span>}
        </button>
        {/* Inline progress bar */}
        {isInstalling && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--border)]">
            <div
              className="h-full bg-[var(--accent-orange)] transition-all duration-300"
              style={{ width: `${downloadProgress ?? 50}%` }}
            />
          </div>
        )}
        {installed && !isInstalling && (
          <div className="absolute inset-0 bg-[var(--accent-green)] opacity-5 pointer-events-none" />
        )}
      </div>

      {/* Info zone */}
      <div className="px-2.5 py-2">
        <div
          className="text-xs font-mono font-bold text-[var(--text-primary)] mb-1 cursor-pointer hover:text-[var(--accent-cyan)] truncate"
          onClick={() => onOpenDetail(map)}
        >
          {map.originalName}
        </div>
        <div className="flex justify-between items-center mb-2 text-[var(--text-muted)] text-xs font-mono">
          {isInstalling && phaseLabel ? (
            <span className="text-[var(--accent-orange)] truncate">{phaseLabel}</span>
          ) : (
            <span>{formatBytes(map.size)}</span>
          )}
          <span>↓ {installCount.toLocaleString()}</span>
        </div>

        {supportsFileApi ? (
          <button
            className={`w-full py-1.5 rounded text-xs font-mono font-bold tracking-wide transition-colors ${
              isInstalling
                ? 'bg-[var(--bg-inset)] text-[var(--accent-orange)] border border-[var(--accent-orange)]'
                : installed
                  ? 'bg-transparent text-[var(--accent-green)] border border-[var(--accent-green)]'
                  : 'bg-[var(--accent-orange)] text-black hover:opacity-90'
            }`}
            onClick={() => { if (!isInstalling) void doInstall() }}
            disabled={isInstalling}
          >
            {isInstalling ? 'INSTALLING...' : installed ? '✓ INSTALLED' : 'INSTALL'}
          </button>
        ) : (
          <button
            className="w-full py-1.5 rounded text-xs font-mono font-bold bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-colors"
            onClick={handleRawDownload}
          >
            ↓ DOWNLOAD
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run tests — verify pass**

```bash
npx jest tests/components/maps/MapCard.test.tsx
```

- [ ] **Step 4: Update MapList.tsx** to wire `installStatus` map and `onInstallStatusChange` through to each `MapCard`, replacing the old `useNotifications`-based approach

- [ ] **Step 5: Run full test suite**

```bash
npx jest --testPathPattern="tests/" 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add src/components/maps/MapCard.tsx src/components/maps/MapList.tsx tests/components/maps/MapCard.test.tsx
git commit -m "feat: rewrite MapCard with rich thumbnail, gaming dark states, inline progress"
```

---

## Task 8: Screenshot data model + storage

**Files:**
- Modify: `src/types/map.ts`
- Modify: `src/lib/maps/maps-store.ts`
- Create: `src/lib/storage/screenshots.ts`
- Test: `tests/lib/storage/screenshots.test.ts`

- [ ] **Step 1: Add screenshotKeys to MapEntry**

```ts
// src/types/map.ts
export interface MapEntry {
  id: string
  originalName: string
  storageKey: string
  format: 'zip' | '7z' | 'rar'
  size: number
  sha256: string
  uploadedAt: string
  installCount: number
  order?: number
  tags: string[]
  hidden?: boolean
  uploader?: { id: string; name: string; avatar: string }
  screenshotKeys?: string[]   // e.g. ["screenshots/uuid/0.jpg"]
}
```

- [ ] **Step 2: Write failing storage test**

```ts
// tests/lib/storage/screenshots.test.ts
import { screenshotKey } from '@/lib/storage/screenshots'

test('screenshotKey generates correct path', () => {
  expect(screenshotKey('map-123', 0, 'jpg')).toBe('screenshots/map-123/0.jpg')
  expect(screenshotKey('map-123', 2, 'webp')).toBe('screenshots/map-123/2.webp')
})

test('screenshotKey rejects index > 2', () => {
  expect(() => screenshotKey('map-123', 3, 'jpg')).toThrow()
})
```

```bash
npx jest tests/lib/storage/screenshots.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create screenshots.ts**

```ts
// src/lib/storage/screenshots.ts
import { putObject, deleteObject, getPresignedUrl } from './storage'

const ALLOWED_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export function screenshotKey(mapId: string, index: number, ext: string): string {
  if (index < 0 || index > 2) throw new Error(`Screenshot index must be 0-2, got ${index}`)
  const normalExt = ext.toLowerCase().replace(/^\./, '')
  if (!ALLOWED_TYPES[normalExt]) throw new Error(`Unsupported format: ${ext}`)
  return `screenshots/${mapId}/${index}.${normalExt}`
}

export async function uploadScreenshot(
  mapId: string,
  index: number,
  ext: string,
  data: Buffer,
): Promise<string> {
  const key = screenshotKey(mapId, index, ext)
  const contentType = ALLOWED_TYPES[ext.toLowerCase().replace(/^\./, '')]
  await putObject(key, data, contentType)
  return key
}

export async function deleteScreenshot(key: string): Promise<void> {
  await deleteObject(key)
}

export async function getScreenshotUrl(key: string): Promise<string> {
  return getPresignedUrl(key, 3600) // 1hr TTL for screenshots
}

export async function resolveScreenshotUrls(keys: string[]): Promise<string[]> {
  return Promise.all(keys.map(getScreenshotUrl))
}
```

- [ ] **Step 4: Run tests — verify pass**

```bash
npx jest tests/lib/storage/screenshots.test.ts
```

- [ ] **Step 5: Update maps-store.ts** — read/write `screenshotKeys`; add `updateScreenshotKeys` function

In `docToMapEntry`, add:
```ts
screenshotKeys: (data.screenshotKeys as string[]) ?? [],
```

In `addMap`, add `screenshotKeys: []` to the document.

Add new export:
```ts
export async function updateScreenshotKeys(id: string, keys: string[]): Promise<void> {
  await getAdminDb().collection('maps').doc(id).update({ screenshotKeys: keys })
}
```

- [ ] **Step 6: Run build**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

- [ ] **Step 7: Commit**

```bash
git add src/types/map.ts src/lib/maps/maps-store.ts src/lib/storage/screenshots.ts tests/lib/storage/screenshots.test.ts
git commit -m "feat: add screenshotKeys to MapEntry, screenshot storage lib"
```

---

## Task 9: Screenshot API routes

**Files:**
- Modify: `src/app/api/maps/route.ts`
- Create: `src/app/api/maps/[id]/screenshots/route.ts`
- Create: `src/app/api/maps/[id]/screenshots/[index]/route.ts`

- [ ] **Step 1: Update GET /api/maps to resolve screenshot URLs**

```ts
// src/app/api/maps/route.ts
import { NextResponse } from 'next/server'
import { getMaps } from '@/lib/maps/maps-store'
import { resolveScreenshotUrls } from '@/lib/storage/screenshots'

export async function GET() {
  try {
    const maps = (await getMaps()).filter(m => !m.hidden)
    const resolved = await Promise.all(
      maps.map(async m => ({
        ...m,
        screenshotKeys: m.screenshotKeys?.length
          ? await resolveScreenshotUrls(m.screenshotKeys)
          : [],
      }))
    )
    return NextResponse.json(resolved, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Failed to load maps' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create POST /api/maps/[id]/screenshots/route.ts**

```ts
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/auth'
import { getMaps, updateScreenshotKeys } from '@/lib/maps/maps-store'
import { uploadScreenshot } from '@/lib/storage/screenshots'
import path from 'path'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const adminError = await requireAdmin(req)
  if (adminError) return adminError

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = path.extname(file.name).replace('.', '').toLowerCase()
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return NextResponse.json({ error: 'Unsupported format. Use JPG, PNG or WebP.' }, { status: 400 })
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 2 MB)' }, { status: 400 })
  }

  // Find map and next available index
  const maps = await getMaps()
  const map = maps.find(m => m.id === id)
  if (!map) return NextResponse.json({ error: 'Map not found' }, { status: 404 })

  const currentKeys = map.screenshotKeys ?? []
  if (currentKeys.length >= 3) {
    return NextResponse.json({ error: 'Maximum 3 screenshots per map' }, { status: 400 })
  }

  const index = currentKeys.length
  const buffer = Buffer.from(await file.arrayBuffer())
  const key = await uploadScreenshot(id, index, ext, buffer)
  const newKeys = [...currentKeys, key]
  await updateScreenshotKeys(id, newKeys)

  return NextResponse.json({ key }, { status: 201 })
}
```

- [ ] **Step 3: Create DELETE /api/maps/[id]/screenshots/[index]/route.ts**

```ts
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/auth'
import { getMaps, updateScreenshotKeys } from '@/lib/maps/maps-store'
import { deleteScreenshot } from '@/lib/storage/screenshots'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const { id, index: indexStr } = await params
  const adminError = await requireAdmin(req)
  if (adminError) return adminError

  const index = parseInt(indexStr, 10)
  if (isNaN(index) || index < 0 || index > 2) {
    return NextResponse.json({ error: 'Invalid index' }, { status: 400 })
  }

  const maps = await getMaps()
  const map = maps.find(m => m.id === id)
  if (!map) return NextResponse.json({ error: 'Map not found' }, { status: 404 })

  const currentKeys = map.screenshotKeys ?? []
  if (index >= currentKeys.length) {
    return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 })
  }

  await deleteScreenshot(currentKeys[index])
  const newKeys = currentKeys.filter((_, i) => i !== index)
  await updateScreenshotKeys(id, newKeys)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run build**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/maps/route.ts src/app/api/maps/[id]/screenshots/
git commit -m "feat: screenshot upload/delete API routes, resolve URLs in GET /api/maps"
```

---

## Task 10: Admin upload form — screenshot section

**Files:**
- Modify: `src/components/admin/UploadForm.tsx`
- Test: `tests/components/admin/UploadForm.test.tsx`

- [ ] **Step 1: Read existing UploadForm.tsx to understand structure**

```bash
cat src/components/admin/UploadForm.tsx
```

- [ ] **Step 2: Write failing test**

```tsx
// tests/components/admin/UploadForm.test.tsx
import { render, screen } from '@testing-library/react'
import { UploadForm } from '@/components/admin/UploadForm'

test('renders screenshots section', () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  expect(screen.getByText(/screenshots/i)).toBeInTheDocument()
})

test('shows max 3 note', () => {
  render(<UploadForm onUploaded={jest.fn()} />)
  expect(screen.getByText(/up to 3/i)).toBeInTheDocument()
})
```

```bash
npx jest tests/components/admin/UploadForm.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Add screenshot section to UploadForm**

After the existing map file upload section, add a collapsible `Screenshots` section:
- Label: `Screenshots (optional, up to 3)`
- Three file input slots. Each shows: empty dropzone or uploaded filename + remove button
- Accept: `image/jpeg,image/png,image/webp`
- Max: 2 MB per file (validated client-side before submit)
- On form submit, after the map is uploaded and the map `id` is known, POST each screenshot to `/api/maps/{id}/screenshots` sequentially

- [ ] **Step 4: Run tests — verify pass**

```bash
npx jest tests/components/admin/UploadForm.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/UploadForm.tsx tests/components/admin/UploadForm.test.tsx
git commit -m "feat: add screenshot upload section to admin UploadForm"
```

---

## Task 11: InstallStepper component

**Files:**
- Create: `src/components/maps/InstallStepper.tsx`
- Test: `tests/components/maps/InstallStepper.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// tests/components/maps/InstallStepper.test.tsx
import { render, screen } from '@testing-library/react'
import { InstallStepper } from '@/components/maps/InstallStepper'
import type { InstallStatus } from '@/lib/maps/install'

test('renders all 4 phase labels in idle state', () => {
  render(<InstallStepper status={null} />)
  expect(screen.getByText('DOWNLOAD')).toBeInTheDocument()
  expect(screen.getByText('VERIFY')).toBeInTheDocument()
  expect(screen.getByText('EXTRACT')).toBeInTheDocument()
  expect(screen.getByText('WRITE')).toBeInTheDocument()
})

test('shows active phase label when downloading', () => {
  const status: InstallStatus = { phase: 'downloading', progress: 45 }
  render(<InstallStepper status={status} />)
  expect(screen.getByText(/45%/)).toBeInTheDocument()
})

test('shows file count when writing', () => {
  const status: InstallStatus = { phase: 'writing', current: 'de_dust2.bsp', total: 5, done: 2 }
  render(<InstallStepper status={status} />)
  expect(screen.getByText(/2\/5/)).toBeInTheDocument()
})

test('shows error message on error', () => {
  const status: InstallStatus = { phase: 'error', message: 'Folder access denied.' }
  render(<InstallStepper status={status} />)
  expect(screen.getByText('Folder access denied.')).toBeInTheDocument()
})
```

```bash
npx jest tests/components/maps/InstallStepper.test.tsx
```

Expected: FAIL.

- [ ] **Step 2: Create InstallStepper.tsx**

```tsx
'use client'
import type { InstallStatus } from '@/lib/maps/install'

type Phase = 'downloading' | 'verifying' | 'extracting' | 'writing'

const PHASES: { key: Phase; label: string }[] = [
  { key: 'downloading', label: 'DOWNLOAD' },
  { key: 'verifying', label: 'VERIFY' },
  { key: 'extracting', label: 'EXTRACT' },
  { key: 'writing', label: 'WRITE' },
]

function phaseIndex(phase: string): number {
  return PHASES.findIndex(p => p.key === phase)
}

export function InstallStepper({ status }: { status: InstallStatus | null }) {
  const activeIdx = status ? phaseIndex(status.phase) : -1
  const isDone = status?.phase === 'done'
  const isError = status?.phase === 'error'

  // Progress bar fill: 0–100
  let progress = 0
  if (isDone) progress = 100
  else if (status?.phase === 'downloading') progress = status.progress / 4 // 0–25%
  else if (status?.phase === 'verifying') progress = 25
  else if (status?.phase === 'extracting') progress = 50
  else if (status?.phase === 'writing') progress = 75 + (status.done / status.total) * 25

  return (
    <div className="bg-[var(--bg-inset)] border border-[var(--border)] rounded-md p-3">
      {/* Phase steps */}
      <div className="flex items-center justify-between mb-3">
        {PHASES.map((phase, i) => {
          const isComplete = isDone || (activeIdx >= 0 && i < activeIdx)
          const isActive = !isDone && activeIdx === i
          const isFuture = activeIdx < 0 || i > activeIdx

          return (
            <div key={phase.key} className="flex-1 flex flex-col items-center">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold mb-1 transition-all"
                style={{
                  background: isDone || isComplete ? 'var(--accent-green)' :
                              isError && isActive ? 'var(--color-danger)' :
                              isActive ? 'var(--accent-orange)' : 'var(--bg-surface)',
                  border: `1px solid ${isFuture && !isDone ? 'var(--border)' : 'transparent'}`,
                  color: (isComplete || isDone) ? '#000' : isActive ? '#000' : 'var(--text-muted)',
                  animation: isActive && !isError ? 'pulse 1s ease-in-out infinite' : 'none',
                }}
              >
                {isComplete || isDone ? '✓' : isActive && isError ? '✕' : i + 1}
              </div>
              <span
                className="text-xs font-mono"
                style={{ color: isComplete || isDone || isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                {phase.label}
              </span>
              {isActive && (
                <span className="text-xs font-mono text-[var(--accent-orange)] mt-0.5">
                  {status?.phase === 'downloading' ? `${Math.round(status.progress)}%` :
                   status?.phase === 'writing' ? `${status.done}/${status.total}` : ''}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: isError ? 'var(--color-danger)' :
                        isDone ? 'var(--accent-green)' :
                        `linear-gradient(90deg, var(--accent-green), var(--accent-orange))`,
          }}
        />
      </div>

      {/* Error message */}
      {isError && (
        <p className="mt-2 text-xs font-mono text-[var(--color-danger)]">{status.message}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run tests — verify pass**

```bash
npx jest tests/components/maps/InstallStepper.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/components/maps/InstallStepper.tsx tests/components/maps/InstallStepper.test.tsx
git commit -m "feat: InstallStepper component with 4 phases and progress bar"
```

---

## Task 12: MapDetailModal

**Files:**
- Create: `src/components/maps/MapDetailModal.tsx`
- Test: `tests/components/maps/MapDetailModal.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// tests/components/maps/MapDetailModal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MapDetailModal } from '@/components/maps/MapDetailModal'
import type { MapEntry } from '@/types/map'

const mockMap: MapEntry = {
  id: '1', originalName: 'de_dust2', storageKey: 'archives/1.zip',
  format: 'zip', size: 2 * 1024 * 1024, sha256: 'abc',
  uploadedAt: '2025-01-01T00:00:00Z', installCount: 1204,
  tags: ['de_'], screenshotKeys: ['screenshots/1/0.jpg'],
}

test('renders map name', () => {
  render(<MapDetailModal map={mockMap} onClose={jest.fn()} onInstall={jest.fn()} onDownload={jest.fn()} status={null} />)
  expect(screen.getByText('de_dust2')).toBeInTheDocument()
})

test('renders format badge', () => {
  render(<MapDetailModal map={mockMap} onClose={jest.fn()} onInstall={jest.fn()} onDownload={jest.fn()} status={null} />)
  expect(screen.getByText('ZIP')).toBeInTheDocument()
})

test('calls onClose when backdrop clicked', () => {
  const onClose = jest.fn()
  render(<MapDetailModal map={mockMap} onClose={onClose} onInstall={jest.fn()} onDownload={jest.fn()} status={null} />)
  fireEvent.click(screen.getByTestId('modal-backdrop'))
  expect(onClose).toHaveBeenCalled()
})

test('calls onInstall when INSTALL button clicked', () => {
  const onInstall = jest.fn()
  render(<MapDetailModal map={mockMap} onClose={jest.fn()} onInstall={onInstall} onDownload={jest.fn()} status={null} />)
  fireEvent.click(screen.getByRole('button', { name: /install/i }))
  expect(onInstall).toHaveBeenCalled()
})
```

```bash
npx jest tests/components/maps/MapDetailModal.test.tsx
```

Expected: FAIL.

- [ ] **Step 2: Create MapDetailModal.tsx**

```tsx
'use client'
import { useState } from 'react'
import type { MapEntry } from '@/types/map'
import type { InstallStatus } from '@/lib/maps/install'
import { InstallStepper } from './InstallStepper'
import { isFileSystemAccessSupported } from '@/lib/maps/install'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MapDetailModal({
  map,
  onClose,
  onInstall,
  onDownload,
  status,
  installed = false,
}: {
  map: MapEntry
  onClose: () => void
  onInstall: () => void
  onDownload: () => void
  status: InstallStatus | null
  installed?: boolean
}) {
  const [activeScreenshot, setActiveScreenshot] = useState(0)
  const screenshots = map.screenshotKeys ?? []
  const supportsFileApi = isFileSystemAccessSupported()
  const isInstalling = status != null && status.phase !== 'done' && status.phase !== 'error'

  return (
    <div
      data-testid="modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden w-full max-w-lg mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Screenshot gallery */}
        <div className="relative h-44 bg-[var(--bg-inset)]" style={{
          background: screenshots[activeScreenshot] ? undefined : 'linear-gradient(135deg, #1a2744, #0f1e3a)'
        }}>
          {screenshots[activeScreenshot] && (
            <img src={screenshots[activeScreenshot]} alt={map.originalName} className="w-full h-full object-cover" />
          )}
          {/* Close */}
          <button
            className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] font-mono text-sm"
            onClick={onClose}
            aria-label="Close"
          >✕</button>
          {/* Thumbnail strip */}
          {screenshots.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
              {screenshots.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveScreenshot(i)}
                  className="w-8 h-5 rounded-sm border transition-colors"
                  style={{
                    borderColor: i === activeScreenshot ? 'var(--accent-cyan)' : 'var(--border)',
                    background: i === activeScreenshot ? 'rgba(56,189,248,0.3)' : 'rgba(0,0,0,0.5)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="font-mono font-bold text-[var(--text-primary)] text-base">{map.originalName}</h2>
              <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                {map.uploader ? <>by <span className="text-[var(--accent-cyan)]">{map.uploader.name}</span></> : 'Uploaded'}{' '}
                · {new Date(map.uploadedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-[var(--accent-orange)] text-sm">↓ {map.installCount.toLocaleString()}</div>
              <div className="text-xs text-[var(--text-muted)] font-mono">installs</div>
            </div>
          </div>

          {/* Meta badges */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="bg-[var(--bg-inset)] border border-[var(--accent-cyan)] text-[var(--accent-cyan)] text-xs font-mono px-2 py-0.5 rounded-sm">
              {map.format.toUpperCase()}
            </span>
            <span className="bg-[var(--bg-inset)] border border-[var(--border)] text-[var(--text-subtle)] text-xs font-mono px-2 py-0.5 rounded-sm">
              {formatBytes(map.size)}
            </span>
            <span className="bg-[var(--bg-inset)] border border-[var(--border)] text-[var(--text-subtle)] text-xs font-mono px-2 py-0.5 rounded-sm">
              SHA256 ✓
            </span>
          </div>

          {/* Install stepper */}
          <div className="mb-3">
            <InstallStepper status={status} />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {supportsFileApi && (
              <button
                className={`flex-1 py-2 rounded-md text-sm font-mono font-bold tracking-wide transition-colors ${
                  isInstalling
                    ? 'bg-[var(--bg-inset)] text-[var(--accent-orange)] border border-[var(--accent-orange)]'
                    : installed
                      ? 'bg-transparent text-[var(--accent-green)] border border-[var(--accent-green)]'
                      : 'bg-[var(--accent-orange)] text-black hover:opacity-90'
                }`}
                onClick={onInstall}
                disabled={isInstalling}
              >
                {isInstalling ? 'INSTALLING...' : installed ? '✓ INSTALLED' : 'INSTALL'}
              </button>
            )}
            <button
              className="px-4 py-2 rounded-md text-sm font-mono text-[var(--text-subtle)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-colors"
              onClick={onDownload}
            >
              ↓ Download
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run tests — verify pass**

```bash
npx jest tests/components/maps/MapDetailModal.test.tsx
```

- [ ] **Step 4: Wire modal into MapList** — add `openDetailMap: MapEntry | null` state to `MapList`; pass `onOpenDetail` to each `MapCard`; render `MapDetailModal` when `openDetailMap != null`; connect `onInstall` / `onDownload` / `status` from the map's install state

- [ ] **Step 5: Run full test suite**

```bash
npx jest --testPathPattern="tests/" 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add src/components/maps/MapDetailModal.tsx src/components/maps/MapList.tsx tests/components/maps/MapDetailModal.test.tsx
git commit -m "feat: MapDetailModal with screenshot gallery, install stepper, wired to MapList"
```

---

## Task 13: Final polish + smoke test

- [ ] **Step 1: Run full build**

```bash
npm run build 2>&1 | tail -30
```

Fix any remaining errors.

- [ ] **Step 2: Run all tests**

```bash
npx jest --testPathPattern="tests/" --verbose 2>&1 | tail -40
```

All tests must pass.

- [ ] **Step 3: Visual smoke check** — start dev server and verify in browser

```bash
npm run dev
```

Check:
- [ ] Page background is `#0a0c14` (very dark navy)
- [ ] Nav shows orange `CS MAPS` logo, search input, filter tabs, installed counter
- [ ] Map cards show thumbnail zone, type badge, install count, gaming dark INSTALL button
- [ ] Clicking a card thumbnail/name opens the detail modal
- [ ] Detail modal shows stepper, format badges, actions
- [ ] Installing a map shows inline progress bar on card and stepper in modal
- [ ] Admin upload form has screenshot section

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: gaming dark UI redesign complete"
```
