# Broad Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the CS Map Distribution app across three sequential phases: design system (visual polish), code reorganization (structure), and admin analytics dashboard (visibility).

**Architecture:** Phase 1 adds CSS design tokens and shared UI primitives. Phase 2 reorganizes flat file structure into feature-scoped modules with no logic changes. Phase 3 builds an admin stats dashboard on top of the clean base.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Firebase Admin (Firestore), TypeScript, Jest

**Spec:** `docs/superpowers/specs/2026-03-24-broad-improvement-design.md`

---

## File Map

### Phase 1 — New files
- `src/components/ui/Button.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Modal.tsx`
- `src/components/ui/Spinner.tsx`
- `src/components/ui/StatusBadge.tsx`
- `src/components/ui/index.ts`

### Phase 1 — Modified files
- `src/app/globals.css` — expanded token set
- `src/components/ConfirmModal.tsx` — rewritten using Modal primitive
- `src/components/ProgressModal.tsx` — rewritten using Modal primitive
- `src/components/MapCard.tsx` — use Button + Badge
- `src/components/AdminMapList.tsx` — use Button + Badge + Card
- `src/components/PendingQueue.tsx` — use Button + Badge + StatusBadge
- `src/components/UploadForm.tsx` — use Button + Spinner
- `src/components/SiteHeader.tsx` — use Button
- `src/components/SubmitForm.tsx` — use Button + Spinner
- `src/components/PackSection.tsx` — use Button
- `src/components/PackManager.tsx` — use Button + Badge
- `src/components/MySubmissions.tsx` — use StatusBadge + Badge
- `src/components/MapList.tsx` — use Button (empty state)
- `src/components/NotificationBell.tsx` — use Spinner

### Phase 2 — Moved components (no logic changes)
```
src/components/SiteHeader.tsx         → src/components/layout/SiteHeader.tsx
src/components/ThemeToggle.tsx        → src/components/layout/ThemeToggle.tsx
src/components/NotificationBell.tsx   → src/components/layout/NotificationBell.tsx
src/components/MapCard.tsx            → src/components/maps/MapCard.tsx
src/components/MapList.tsx            → src/components/maps/MapList.tsx
src/components/AdminMapList.tsx       → src/components/maps/AdminMapList.tsx
src/components/SearchInput.tsx        → src/components/maps/SearchInput.tsx
src/components/PackSection.tsx        → src/components/packs/PackSection.tsx
src/components/PackManager.tsx        → src/components/packs/PackManager.tsx
src/components/UploadForm.tsx         → src/components/admin/UploadForm.tsx
src/components/SubmitForm.tsx         → src/components/submissions/SubmitForm.tsx
src/components/PendingQueue.tsx       → src/components/submissions/PendingQueue.tsx
src/components/MySubmissions.tsx      → src/components/submissions/MySubmissions.tsx
src/components/AuthButton.tsx         → src/components/submissions/AuthButton.tsx
```

### Phase 2 — Moved lib files (no logic changes)
```
src/lib/auth.ts                   → src/lib/auth/auth.ts
src/lib/firebase-client.ts        → src/lib/auth/firebase-client.ts
src/lib/firebase-admin.ts         → src/lib/auth/firebase-admin.ts
src/lib/theme-context.tsx         → src/lib/auth/theme-context.tsx
src/lib/notification-context.tsx  → src/lib/auth/notification-context.tsx
src/lib/storage.ts                → src/lib/storage/storage.ts
src/lib/hash.ts                   → src/lib/storage/hash.ts
src/lib/maps-store.ts             → src/lib/maps/maps-store.ts
src/lib/tags.ts                   → src/lib/maps/tags.ts
src/lib/install.ts                → src/lib/maps/install.ts
src/lib/folder-store.ts           → src/lib/maps/folder-store.ts
src/lib/packs-store.ts            → src/lib/packs/packs-store.ts
src/lib/submissions-store.ts      → src/lib/submissions/submissions-store.ts
src/lib/validate-archive.ts       → src/lib/submissions/validate-archive.ts
```

Note: `src/lib/empty-module.ts` stays in place (webpack shim — not a feature module).

### Phase 3 — New files
- `src/lib/admin/stats-store.ts` — Firestore reads, `unstable_cache` wrapper
- `src/app/api/admin/stats/route.ts` — admin-only GET route
- `src/components/admin/StatsCard.tsx` — single stat tile
- `src/components/admin/StatsRow.tsx` — 4-card grid
- `src/components/admin/TopMaps.tsx` — ranked bar list
- `src/components/admin/ActivityFeed.tsx` — merged activity list
- `src/components/admin/AdminDashboard.tsx` — container
- `tests/lib/admin/stats-store.test.ts` — unit test for merge logic

### Phase 3 — Modified files
- `src/app/admin/page.tsx` — add `<AdminDashboard />` above existing content

---

## Phase 1 — Design System

### Task 1: Expand design tokens

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Replace the existing `:root` / `.dark` blocks** with the expanded token set below. Keep the existing `@import "tailwindcss"` and `@custom-variant dark` lines untouched at the top.

```css
:root {
  /* Backgrounds */
  --bg-primary: #f8fafc;
  --bg-surface: #ffffff;
  --bg-elevated: #ffffff;
  --bg-secondary: #f1f5f9;

  /* Text */
  --text-primary: #0f172a;
  --text-secondary: #334155;
  --text-muted: #64748b;
  --text-inverse: #ffffff;

  /* Borders */
  --border-default: #e2e8f0;
  --border-subtle: #f1f5f9;
  --border-strong: #cbd5e1;

  /* Accent */
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --accent-muted: #eff6ff;

  /* Semantic */
  --color-danger: #ef4444;
  --color-danger-hover: #dc2626;
  --color-danger-muted: #fef2f2;
  --color-success: #22c55e;
  --color-success-hover: #16a34a;
  --color-success-muted: #f0fdf4;
  --color-warning: #f59e0b;
  --color-warning-muted: #fffbeb;
  --color-info: #3b82f6;
  --color-info-muted: #eff6ff;

  /* Spacing (4px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Shadow */
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07);
  --shadow-md: 0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;

  /* Legacy aliases (keep for backward compat during migration) */
  --bg-card: var(--bg-surface);
  --border: var(--border-default);
}

.dark {
  --bg-primary: #0f172a;
  --bg-surface: #1e293b;
  --bg-elevated: #263347;
  --bg-secondary: #1e293b;

  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --text-inverse: #0f172a;

  --border-default: #334155;
  --border-subtle: #1e293b;
  --border-strong: #475569;

  --accent: #60a5fa;
  --accent-hover: #3b82f6;
  --accent-muted: #1e3a5f;

  --color-danger: #f87171;
  --color-danger-hover: #ef4444;
  --color-danger-muted: #2d1515;
  --color-success: #4ade80;
  --color-success-hover: #22c55e;
  --color-success-muted: #14261d;
  --color-warning: #fbbf24;
  --color-warning-muted: #27200a;
  --color-info: #60a5fa;
  --color-info-muted: #1e3a5f;

  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 12px 0 rgb(0 0 0 / 0.4);

  --bg-card: var(--bg-surface);
  --border: var(--border-default);
}
```

- [ ] **Commit**
```bash
git add src/app/globals.css
git commit -m "style: expand design tokens in globals.css"
```

---

### Task 2: Create Button primitive

**Files:**
- Create: `src/components/ui/Button.tsx`

- [ ] **Create the file:**

```tsx
'use client'
import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md'

const BASE = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white focus-visible:ring-[var(--accent)]',
  secondary: 'bg-[var(--bg-secondary)] hover:bg-[var(--border-default)] text-[var(--text-primary)] focus-visible:ring-[var(--border-strong)]',
  ghost:     'hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] focus-visible:ring-[var(--border-strong)]',
  danger:    'bg-[var(--color-danger)] hover:bg-[var(--color-danger-hover)] text-white focus-visible:ring-[var(--color-danger)]',
  success:   'bg-[var(--color-success)] hover:bg-[var(--color-success-hover)] text-white focus-visible:ring-[var(--color-success)]',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
```

- [ ] **Commit**
```bash
git add src/components/ui/Button.tsx
git commit -m "feat: add Button ui primitive"
```

---

### Task 3: Create Spinner, Badge, Card, StatusBadge primitives

**Files:**
- Create: `src/components/ui/Spinner.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/StatusBadge.tsx`

- [ ] **Create `Spinner.tsx`:**

```tsx
type Size = 'sm' | 'md' | 'lg'
const SIZES: Record<Size, string> = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-6 h-6' }

export function Spinner({ size = 'md' }: { size?: Size }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${SIZES[size]} border-2 border-current border-t-transparent rounded-full animate-spin`}
    />
  )
}
```

- [ ] **Create `Badge.tsx`:**

```tsx
import { type ReactNode } from 'react'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  default: 'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
  success: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
  danger:  'bg-[var(--color-danger-muted)] text-[var(--color-danger)]',
  info:    'bg-[var(--color-info-muted)] text-[var(--color-info)]',
}

const SIZES: Record<Size, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-sm',
}

export function Badge({
  variant = 'default',
  size = 'sm',
  children,
  className = '',
}: {
  variant?: Variant
  size?: Size
  children: ReactNode
  className?: string
}) {
  return (
    <span className={`inline-flex items-center font-semibold rounded-md uppercase tracking-wide ${VARIANTS[variant]} ${SIZES[size]} ${className}`}>
      {children}
    </span>
  )
}
```

- [ ] **Create `Card.tsx`:**

```tsx
import { type ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-sm)] ${className}`}>
      {children}
    </div>
  )
}
```

- [ ] **Create `StatusBadge.tsx`:**

```tsx
import { Badge } from './Badge'

type Status = 'pending' | 'approved' | 'rejected'

const STATUS_PROPS: Record<Status, { variant: 'warning' | 'success' | 'danger'; label: string }> = {
  pending:  { variant: 'warning', label: 'Pending' },
  approved: { variant: 'success', label: 'Approved' },
  rejected: { variant: 'danger',  label: 'Rejected' },
}

export function StatusBadge({ status }: { status: Status }) {
  const { variant, label } = STATUS_PROPS[status]
  return <Badge variant={variant}>{label}</Badge>
}
```

- [ ] **Commit**
```bash
git add src/components/ui/Spinner.tsx src/components/ui/Badge.tsx src/components/ui/Card.tsx src/components/ui/StatusBadge.tsx
git commit -m "feat: add Spinner, Badge, Card, StatusBadge ui primitives"
```

---

### Task 4: Create Modal primitive and rewrite ConfirmModal / ProgressModal

**Files:**
- Create: `src/components/ui/Modal.tsx`
- Modify: `src/components/ConfirmModal.tsx`
- Modify: `src/components/ProgressModal.tsx`

- [ ] **Create `Modal.tsx`:**

```tsx
'use client'
import { type ReactNode } from 'react'

export function Modal({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl w-full max-w-sm shadow-[var(--shadow-md)] overflow-hidden">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Rewrite `ConfirmModal.tsx`** to use `Modal`:

```tsx
'use client'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

interface Props {
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal>
      <div className="p-6">
        <p className="text-[var(--text-primary)] text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="md" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={destructive ? 'danger' : 'primary'} size="md" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Rewrite `ProgressModal.tsx`** to use `Modal` — keep all existing internal logic, only replace the outer `<div className="fixed inset-0 ...">...<div className="...max-w-sm...">` wrapper with `<Modal>`:

```tsx
'use client'
import type { InstallStatus } from '@/lib/install'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

interface Props {
  status: InstallStatus | null
  onClose: () => void
  onFallbackDownload?: () => void
}

export function ProgressModal({ status, onClose, onFallbackDownload }: Props) {
  if (!status) return null

  const isActive = status.phase === 'downloading' || status.phase === 'verifying' || status.phase === 'extracting' || status.phase === 'writing'

  return (
    <Modal>
      {/* Active phases */}
      {isActive && (
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[var(--color-info-muted)] flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-[var(--color-info)] border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)] text-sm">
                {status.phase === 'downloading' && 'Downloading...'}
                {status.phase === 'verifying' && 'Verifying integrity...'}
                {status.phase === 'extracting' && 'Extracting archive...'}
                {status.phase === 'writing' && 'Installing files...'}
              </p>
              {status.phase === 'writing' && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate max-w-[240px]">{status.current}</p>
              )}
            </div>
          </div>
          {(status.phase === 'downloading' || status.phase === 'writing') && (
            <div>
              <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2">
                <div
                  className="bg-[var(--accent)] h-2 rounded-full transition-all duration-150"
                  style={{ width: `${Math.round(status.phase === 'downloading' ? status.progress * 100 : (status.done / status.total) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 text-right">
                {status.phase === 'downloading' ? `${Math.round(status.progress * 100)}%` : `${status.done}/${status.total} files`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Done */}
      {status.phase === 'done' && (
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-success-muted)] flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)] text-sm">Map installed!</p>
              <p className="text-xs text-[var(--text-muted)]">{status.result.written.length} file(s) written to <span className="font-mono">{status.result.gameRoot}</span></p>
            </div>
          </div>
          <Button variant="success" size="md" className="mt-2 w-full py-2.5 rounded-xl" onClick={onClose}>Done</Button>
        </div>
      )}

      {/* Error */}
      {status.phase === 'error' && (
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-danger-muted)] flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--color-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)] text-sm">Installation failed</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{status.message}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {onFallbackDownload && (
              <Button variant="primary" size="md" className="w-full py-2.5 rounded-xl" onClick={() => { onClose(); onFallbackDownload() }}>
                Download archive instead
              </Button>
            )}
            <Button variant="secondary" size="md" className="w-full py-2.5 rounded-xl" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
```

- [ ] **Commit**
```bash
git add src/components/ui/Modal.tsx src/components/ConfirmModal.tsx src/components/ProgressModal.tsx
git commit -m "feat: add Modal primitive, rewrite ConfirmModal and ProgressModal as wrappers"
```

---

### Task 5: Create ui/index.ts and migrate MapCard

**Files:**
- Create: `src/components/ui/index.ts`
- Modify: `src/components/MapCard.tsx`

- [ ] **Create barrel export `src/components/ui/index.ts`:**

```ts
export { Button } from './Button'
export { Badge } from './Badge'
export { Card } from './Card'
export { Modal } from './Modal'
export { Spinner } from './Spinner'
export { StatusBadge } from './StatusBadge'
```

- [ ] **Migrate `MapCard.tsx`** — replace the ad-hoc inline button and badge spans with `Button` and `Badge` from `@/components/ui`. Import at top:

```tsx
import { Button, Badge } from '@/components/ui'
```

Replace the format badge span:
```tsx
// Before
<span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${FORMAT_COLORS[map.format] ?? '...'}`}>
  {map.format}
</span>

// After
<Badge variant={FORMAT_VARIANTS[map.format] ?? 'default'} className="shrink-0">
  {map.format}
</Badge>
```

Add `FORMAT_VARIANTS` constant (replaces `FORMAT_COLORS`):
```tsx
const FORMAT_VARIANTS: Record<string, 'info' | 'default'> = {
  zip: 'info',
  '7z': 'info',
  rar: 'info',
}
```

Replace tag badges similarly. Replace the install/reinstall/download buttons with `<Button>` variants — `success` for Install, `secondary` for Reinstall, `primary` for Download.

- [ ] **Run `npm run build`** to verify no TypeScript errors.
Expected: clean build or only pre-existing errors.

- [ ] **Commit**
```bash
git add src/components/ui/index.ts src/components/MapCard.tsx
git commit -m "feat: add ui/index barrel, migrate MapCard to Button+Badge"
```

---

### Task 6: Migrate remaining components to ui primitives

**Files:**
- Modify: `src/components/AdminMapList.tsx`, `src/components/PendingQueue.tsx`, `src/components/UploadForm.tsx`, `src/components/SiteHeader.tsx`, `src/components/SubmitForm.tsx`, `src/components/PackSection.tsx`, `src/components/PackManager.tsx`, `src/components/MySubmissions.tsx`, `src/components/MapList.tsx`, `src/components/NotificationBell.tsx`

For each component, add `import { Button, Badge, Card, Spinner, StatusBadge } from '@/components/ui'` as needed and replace ad-hoc button/badge/spinner/card patterns.

- [ ] **AdminMapList.tsx** — Replace `<button>` elements (Delete, Hide/Show, tag edit Save/Cancel) with `<Button variant="danger" size="sm">`, `<Button variant="secondary" size="sm">`. Wrap each map row in `<Card>`.

- [ ] **PendingQueue.tsx** — Replace Approve/Reject buttons with `<Button variant="success" size="sm">` / `<Button variant="danger" size="sm">`. Replace status text with `<StatusBadge status="pending" />`. Wrap items in `<Card>`.

- [ ] **UploadForm.tsx** — Replace submit button with `<Button variant="primary" loading={uploading}>`. Replace inline spinner div with `<Spinner size="md" />`.

- [ ] **SiteHeader.tsx** — Replace nav buttons with `<Button variant="ghost" size="sm">`.

- [ ] **SubmitForm.tsx** — Replace submit button with `<Button variant="primary" loading={submitting}>`.

- [ ] **PackSection.tsx** — Replace Install All / Pick & Install buttons with `<Button>` variants.

- [ ] **PackManager.tsx** — Replace Create Pack / Delete Pack buttons with `<Button>` variants. Replace pack badges with `<Badge>`.

- [ ] **MySubmissions.tsx** — Replace status spans with `<StatusBadge status={sub.status} />`. Replace Delete button with `<Button variant="danger" size="sm">`.

- [ ] **MapList.tsx** — Add an empty-state `<Card>` with a message when there are no maps.

- [ ] **NotificationBell.tsx** — Replace any inline spinner with `<Spinner size="sm" />`.

- [ ] **Run `npm run build`**
Expected: clean build.

- [ ] **Run `npm test`**
Expected: all existing tests pass.

- [ ] **Smoke test in browser** — Open `/`, `/admin`, `/submissions`. Verify buttons, badges, modals look consistent. Check dark mode toggle.

- [ ] **Commit**
```bash
git add src/components/
git commit -m "style: migrate all components to ui primitives"
```

---

## Phase 2 — Code Reorganization

### Task 7: Move layout and maps components

**Principle:** Move files one group at a time. After each group, update all import references and verify the build.

- [ ] **Create directories**
```bash
mkdir -p src/components/layout src/components/maps src/components/packs src/components/admin src/components/submissions
```

- [ ] **Move layout components** (copy file, then delete original):
```
src/components/SiteHeader.tsx       → src/components/layout/SiteHeader.tsx
src/components/ThemeToggle.tsx      → src/components/layout/ThemeToggle.tsx
src/components/NotificationBell.tsx → src/components/layout/NotificationBell.tsx
```

- [ ] **Move maps components:**
```
src/components/MapCard.tsx     → src/components/maps/MapCard.tsx
src/components/MapList.tsx     → src/components/maps/MapList.tsx
src/components/AdminMapList.tsx → src/components/maps/AdminMapList.tsx
src/components/SearchInput.tsx → src/components/maps/SearchInput.tsx
```

- [ ] **Update internal imports** — inside moved files, fix any relative imports (e.g., `./ConfirmModal` stays in `src/components/` so becomes `../ConfirmModal`; `@/lib/...` paths are unchanged).

- [ ] **Update all consumers** — search for old import paths and update:
```bash
# Find all files importing from old paths
grep -r "from '@/components/SiteHeader'" src/ --include="*.tsx" --include="*.ts" -l
grep -r "from '@/components/ThemeToggle'" src/ --include="*.tsx" --include="*.ts" -l
grep -r "from '@/components/NotificationBell'" src/ --include="*.tsx" --include="*.ts" -l
grep -r "from '@/components/MapCard'" src/ --include="*.tsx" --include="*.ts" -l
grep -r "from '@/components/MapList'" src/ --include="*.tsx" --include="*.ts" -l
grep -r "from '@/components/AdminMapList'" src/ --include="*.tsx" --include="*.ts" -l
grep -r "from '@/components/SearchInput'" src/ --include="*.tsx" --include="*.ts" -l
```
Update each found file to use `@/components/layout/SiteHeader`, `@/components/maps/MapCard`, etc.

- [ ] **Delete the original files** (after confirming new paths compile).

- [ ] **Run `npm run build`**. Fix any import errors.

- [ ] **Commit**
```bash
git add src/components/
git commit -m "refactor: move layout and maps components to feature folders"
```

---

### Task 8: Move packs, admin, submissions components

- [ ] **Move packs components:**
```
src/components/PackSection.tsx → src/components/packs/PackSection.tsx
src/components/PackManager.tsx → src/components/packs/PackManager.tsx
```

- [ ] **Move admin component:**
```
src/components/UploadForm.tsx → src/components/admin/UploadForm.tsx
```

- [ ] **Move submissions components:**
```
src/components/SubmitForm.tsx    → src/components/submissions/SubmitForm.tsx
src/components/PendingQueue.tsx  → src/components/submissions/PendingQueue.tsx
src/components/MySubmissions.tsx → src/components/submissions/MySubmissions.tsx
src/components/AuthButton.tsx    → src/components/submissions/AuthButton.tsx
```

- [ ] **Update internal imports** in moved files (relative sibling imports → updated relative paths or `@/` paths).

- [ ] **Search and update all consumers:**
```bash
grep -r "from '@/components/Pack\|from '@/components/UploadForm\|from '@/components/SubmitForm\|from '@/components/PendingQueue\|from '@/components/MySubmissions\|from '@/components/AuthButton'" src/ --include="*.tsx" --include="*.ts" -l
```

- [ ] **Delete original files.**

- [ ] **Run `npm run build`.**

- [ ] **Commit**
```bash
git add src/components/
git commit -m "refactor: move packs, admin, submissions components to feature folders"
```

---

### Task 9: Move lib/auth and lib/storage files

- [ ] **Create directories**
```bash
mkdir -p src/lib/auth src/lib/storage
```

- [ ] **Move auth files:**
```
src/lib/auth.ts                  → src/lib/auth/auth.ts
src/lib/firebase-client.ts       → src/lib/auth/firebase-client.ts
src/lib/firebase-admin.ts        → src/lib/auth/firebase-admin.ts
src/lib/theme-context.tsx        → src/lib/auth/theme-context.tsx
src/lib/notification-context.tsx → src/lib/auth/notification-context.tsx
```

- [ ] **Move storage files:**
```
src/lib/storage.ts → src/lib/storage/storage.ts
src/lib/hash.ts    → src/lib/storage/hash.ts
```

- [ ] **Update internal imports** inside moved files.

- [ ] **Search and update all consumers:**
```bash
grep -r "from '@/lib/auth'\|from '@/lib/firebase-client'\|from '@/lib/firebase-admin'\|from '@/lib/theme-context'\|from '@/lib/notification-context'\|from '@/lib/storage'\|from '@/lib/hash'" src/ --include="*.tsx" --include="*.ts" -l
```
Update each to the new path (e.g., `@/lib/auth/auth`, `@/lib/auth/firebase-admin`, `@/lib/storage/storage`, etc.).

- [ ] **Delete original files.**

- [ ] **Run `npm run build`.**

- [ ] **Commit**
```bash
git add src/lib/
git commit -m "refactor: move auth and storage lib files to feature folders"
```

---

### Task 10: Move lib/maps, lib/packs, lib/submissions files

- [ ] **Create directories**
```bash
mkdir -p src/lib/maps src/lib/packs src/lib/submissions
```

- [ ] **Move maps lib files:**
```
src/lib/maps-store.ts  → src/lib/maps/maps-store.ts
src/lib/tags.ts        → src/lib/maps/tags.ts
src/lib/install.ts     → src/lib/maps/install.ts
src/lib/folder-store.ts → src/lib/maps/folder-store.ts
```

- [ ] **Move packs lib file:**
```
src/lib/packs-store.ts → src/lib/packs/packs-store.ts
```

- [ ] **Move submissions lib files:**
```
src/lib/submissions-store.ts → src/lib/submissions/submissions-store.ts
src/lib/validate-archive.ts  → src/lib/submissions/validate-archive.ts
```

- [ ] **Update internal imports** inside moved files.

- [ ] **Search and update all consumers** (components + API routes):
```bash
grep -r "from '@/lib/maps-store'\|from '@/lib/tags'\|from '@/lib/install'\|from '@/lib/folder-store'\|from '@/lib/packs-store'\|from '@/lib/submissions-store'\|from '@/lib/validate-archive'" src/ --include="*.tsx" --include="*.ts" -l
```

Key API routes known to need updates after all Phase 2 moves:
- `src/app/api/upload/route.ts` — imports `@/lib/auth`, `@/lib/storage`, `@/lib/maps-store`, `@/lib/hash`, `@/lib/validate-archive`
- `src/app/api/download/[id]/route.ts` — imports `@/lib/maps-store`, `@/lib/storage`
- `src/app/api/delete/[id]/route.ts` — imports `@/lib/auth`, `@/lib/maps-store`, `@/lib/storage`
- `src/app/api/submit/route.ts` — imports `@/lib/auth`, `@/lib/storage`, `@/lib/submissions-store`, `@/lib/hash`, `@/lib/validate-archive`
- `src/app/api/admin/submissions/*/route.ts` — imports `@/lib/auth`, `@/lib/submissions-store`, `@/lib/storage`, `@/lib/maps-store`
- `src/app/api/admin/maps/*/route.ts` — imports `@/lib/auth`, `@/lib/maps-store`
- `src/app/api/maps/*/route.ts` — imports `@/lib/maps-store`
- `src/app/api/packs/route.ts`, `src/app/api/admin/packs/*/route.ts` — imports `@/lib/auth`, `@/lib/packs-store`

- [ ] **Update test imports** — sweep entire `tests/` directory for stale lib imports:
```bash
grep -r "from '@/lib/" tests/ --include="*.ts" -l
```
Update each file found. At minimum `tests/lib/submissions-store.test.ts` must change `@/lib/submissions-store` → `@/lib/submissions/submissions-store`.

- [ ] **Delete original files.**

- [ ] **Run `npm run build`.**

- [ ] **Run `npm test`** — all tests must pass.
```bash
npm test
```
Expected: all existing tests pass with 0 failures.

- [ ] **Smoke test** — open `/`, `/admin`, `/submissions` in browser. Verify:
  - Home page: maps load, install button works
  - Admin page: auth check works, upload form visible, maps list loads
  - Submissions page: redirects to `/` if not signed in; submission form visible when signed in
  - All API routes respond (no 500 errors in browser DevTools network tab)

- [ ] **Commit**
```bash
git add src/ tests/
git commit -m "refactor: move maps, packs, submissions lib files to feature folders"
```

---

## Phase 3 — Admin Analytics Dashboard

### Task 11: Write failing test for stats-store merge logic

**Files:**
- Create: `tests/lib/admin/stats-store.test.ts`

- [ ] **Create the test directory:**
```bash
mkdir -p tests/lib/admin
```

- [ ] **Create the test file:**

```ts
import { mergeRecentActivity } from '@/lib/admin/stats-store'

describe('mergeRecentActivity', () => {
  it('merges and sorts events by timestamp desc', () => {
    const reviewed = [
      { type: 'approved' as const, mapName: 'de_dust2', at: '2026-03-22T10:00:00Z' },
      { type: 'rejected' as const, mapName: 'junk', at: '2026-03-21T08:00:00Z' },
    ]
    const uploaded = [
      { type: 'uploaded' as const, mapName: 'de_nuke', at: '2026-03-22T11:00:00Z' },
    ]
    const result = mergeRecentActivity(reviewed, uploaded, 10)
    expect(result).toEqual([
      { type: 'uploaded', mapName: 'de_nuke', at: '2026-03-22T11:00:00Z' },
      { type: 'approved', mapName: 'de_dust2', at: '2026-03-22T10:00:00Z' },
      { type: 'rejected', mapName: 'junk', at: '2026-03-21T08:00:00Z' },
    ])
  })

  it('slices to the given limit', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      type: 'approved' as const,
      mapName: `map${i}`,
      at: `2026-03-${String(20 - i).padStart(2, '0')}T00:00:00Z`,
    }))
    expect(mergeRecentActivity(many, [], 5)).toHaveLength(5)
  })

  it('returns empty array when both inputs are empty', () => {
    expect(mergeRecentActivity([], [], 10)).toEqual([])
  })
})
```

- [ ] **Run the test — expect FAIL** (function doesn't exist yet):
```bash
npm test -- tests/lib/admin/stats-store.test.ts
```
Expected: FAIL with "Cannot find module" or similar.

- [ ] **Commit the test**
```bash
git add tests/lib/admin/stats-store.test.ts
git commit -m "test: add failing test for mergeRecentActivity"
```

---

### Task 12: Implement stats-store and make tests pass

**Files:**
- Create: `src/lib/admin/stats-store.ts`

- [ ] **Create the directory:**
```bash
mkdir -p src/lib/admin
```

- [ ] **Create `src/lib/admin/stats-store.ts`:**

```ts
import { unstable_cache } from 'next/cache'
import { getAdminDb } from '@/lib/auth/firebase-admin'
import { AggregateField } from 'firebase-admin/firestore'

export type ActivityEvent = {
  type: 'approved' | 'rejected' | 'uploaded'
  mapName: string
  at: string
}

export function mergeRecentActivity(
  reviewed: ActivityEvent[],
  uploaded: ActivityEvent[],
  limit: number
): ActivityEvent[] {
  return [...reviewed, ...uploaded]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
}

async function fetchStats() {
  const db = getAdminDb()

  // Aggregate totals
  const mapsAgg = await db.collection('maps').aggregate({
    totalMaps: AggregateField.count(),
    totalInstalls: AggregateField.sum('installCount'),
    totalDownloads: AggregateField.sum('downloadCount'),
  }).get()

  const pendingAgg = await db.collection('submissions')
    .where('status', '==', 'pending')
    .count()
    .get()

  // Top maps
  const topSnap = await db.collection('maps')
    .orderBy('installCount', 'desc')
    .limit(5)
    .get()
  const topMaps = topSnap.docs.map(doc => ({
    id: doc.id,
    originalName: doc.data().originalName as string,
    installCount: (doc.data().installCount as number) ?? 0,
  }))

  // Recent reviewed submissions
  const reviewedSnap = await db.collection('submissions')
    .orderBy('reviewedAt', 'desc')
    .limit(10)
    .get()
  const reviewed: ActivityEvent[] = reviewedSnap.docs
    .filter(doc => doc.data().reviewedAt)
    .map(doc => ({
      type: doc.data().status as 'approved' | 'rejected',
      mapName: doc.data().originalName as string,
      at: doc.data().reviewedAt as string,
    }))

  // Recent admin direct uploads
  const uploadedSnap = await db.collection('maps')
    .where('uploaderId', '==', null)
    .orderBy('uploadedAt', 'desc')
    .limit(10)
    .get()
  const uploaded: ActivityEvent[] = uploadedSnap.docs.map(doc => ({
    type: 'uploaded' as const,
    mapName: doc.data().originalName as string,
    at: doc.data().uploadedAt as string,
  }))

  const aggData = mapsAgg.data()
  return {
    totalMaps: aggData.totalMaps as number,
    totalInstalls: (aggData.totalInstalls as number) ?? 0,
    totalDownloads: (aggData.totalDownloads as number) ?? 0,
    pendingSubmissions: pendingAgg.data().count as number,
    topMaps,
    recentActivity: mergeRecentActivity(reviewed, uploaded, 10),
  }
}

export const getAdminStats = unstable_cache(fetchStats, ['admin-stats'], { revalidate: 60 })
```

- [ ] **Run the test — expect PASS:**
```bash
npm test -- tests/lib/admin/stats-store.test.ts
```
Expected: 3 tests pass.

- [ ] **Commit**
```bash
git add src/lib/admin/stats-store.ts tests/lib/admin/stats-store.test.ts
git commit -m "feat: add stats-store with mergeRecentActivity and getAdminStats"
```

---

### Task 13: Create /api/admin/stats route

**Files:**
- Create: `src/app/api/admin/stats/route.ts`

- [ ] **Create the route directory** (`src/app/api/admin/` already exists; just create the new subdirectory):
```bash
mkdir -p src/app/api/admin/stats
```

- [ ] **Create the route:**

```ts
import { NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { getAdminStats } from '@/lib/admin/stats-store'

export async function GET() {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const stats = await getAdminStats()
    return NextResponse.json(stats)
  } catch (err) {
    console.error('Failed to fetch admin stats:', err)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
```

- [ ] **Run `npm run build`.**
Expected: clean build.

- [ ] **Manual test:** Sign in as admin, open DevTools → Network, navigate to `/admin`. Manually fetch `/api/admin/stats` in the console: `await fetch('/api/admin/stats').then(r=>r.json())`. Confirm the response shape matches the spec.

- [ ] **Commit**
```bash
git add src/app/api/admin/stats/route.ts
git commit -m "feat: add GET /api/admin/stats route"
```

---

### Task 14: Create StatsRow component

**Files:**
- Create: `src/components/admin/StatsCard.tsx`
- Create: `src/components/admin/StatsRow.tsx`

- [ ] **Create `StatsCard.tsx`:**

```tsx
import { Card } from '@/components/ui'

export function StatsCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold text-[var(--text-primary)]">{value.toLocaleString()}</span>
    </Card>
  )
}
```

- [ ] **Create `StatsRow.tsx`:**

```tsx
import { StatsCard } from './StatsCard'

interface Props {
  totalMaps: number
  totalInstalls: number
  totalDownloads: number
  pendingSubmissions: number
}

export function StatsRow({ totalMaps, totalInstalls, totalDownloads, pendingSubmissions }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <StatsCard label="Maps" value={totalMaps} />
      <StatsCard label="Installs" value={totalInstalls} />
      <StatsCard label="Downloads" value={totalDownloads} />
      <StatsCard label="Pending" value={pendingSubmissions} />
    </div>
  )
}
```

- [ ] **Commit**
```bash
git add src/components/admin/StatsCard.tsx src/components/admin/StatsRow.tsx
git commit -m "feat: add StatsCard and StatsRow components"
```

---

### Task 15: Create TopMaps and ActivityFeed components

**Files:**
- Create: `src/components/admin/TopMaps.tsx`
- Create: `src/components/admin/ActivityFeed.tsx`

- [ ] **Create `TopMaps.tsx`:**

```tsx
import { Card } from '@/components/ui'

interface MapStat { id: string; originalName: string; installCount: number }

export function TopMaps({ maps }: { maps: MapStat[] }) {
  if (maps.length === 0) return null
  const max = maps[0].installCount || 1

  return (
    <Card className="p-4 mb-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Top Maps by Installs</h3>
      <ol className="space-y-2">
        {maps.map((m, i) => (
          <li key={m.id} className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-muted)] w-4 text-right">{i + 1}</span>
            <span className="text-sm text-[var(--text-primary)] w-32 truncate">{m.originalName}</span>
            <div className="flex-1 bg-[var(--bg-secondary)] rounded-full h-2">
              <div
                className="bg-[var(--accent)] h-2 rounded-full transition-all"
                style={{ width: `${(m.installCount / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-[var(--text-muted)] w-10 text-right">{m.installCount}</span>
          </li>
        ))}
      </ol>
    </Card>
  )
}
```

- [ ] **Create `ActivityFeed.tsx`:**

```tsx
import { Card } from '@/components/ui'
import type { ActivityEvent } from '@/lib/admin/stats-store'

const ICONS: Record<ActivityEvent['type'], string> = {
  approved: '✓',
  rejected: '✗',
  uploaded: '↑',
}

const ICON_COLORS: Record<ActivityEvent['type'], string> = {
  approved: 'text-[var(--color-success)]',
  rejected: 'text-[var(--color-danger)]',
  uploaded: 'text-[var(--text-muted)]',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) return null

  return (
    <Card className="p-4 mb-6">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recent Activity</h3>
      <ul className="space-y-2">
        {events.map((e, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span className={`font-bold text-base w-4 text-center ${ICON_COLORS[e.type]}`}>{ICONS[e.type]}</span>
            <span className="text-[var(--text-primary)] flex-1 truncate">{e.mapName}</span>
            <span className="text-xs text-[var(--text-muted)] shrink-0">{timeAgo(e.at)}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
```

- [ ] **Commit**
```bash
git add src/components/admin/TopMaps.tsx src/components/admin/ActivityFeed.tsx
git commit -m "feat: add TopMaps and ActivityFeed components"
```

---

### Task 16: Create AdminDashboard and wire to admin page

**Files:**
- Create: `src/components/admin/AdminDashboard.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Create `AdminDashboard.tsx`:**

```tsx
'use client'
import { useEffect, useState } from 'react'
import { StatsRow } from './StatsRow'
import { TopMaps } from './TopMaps'
import { ActivityFeed } from './ActivityFeed'
import type { ActivityEvent } from '@/lib/admin/stats-store'

interface Stats {
  totalMaps: number
  totalInstalls: number
  totalDownloads: number
  pendingSubmissions: number
  topMaps: Array<{ id: string; originalName: string; installCount: number }>
  recentActivity: ActivityEvent[]
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(setStats)
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <p className="text-xs text-[var(--text-muted)] mb-6">Could not load dashboard stats.</p>
    )
  }

  if (!stats) {
    return (
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="mb-6">
      <StatsRow
        totalMaps={stats.totalMaps}
        totalInstalls={stats.totalInstalls}
        totalDownloads={stats.totalDownloads}
        pendingSubmissions={stats.pendingSubmissions}
      />
      <TopMaps maps={stats.topMaps} />
      <ActivityFeed events={stats.recentActivity} />
    </div>
  )
}
```

- [ ] **Update all imports in `src/app/admin/page.tsx`** — replace every old flat import with the new feature-folder paths (these should already be done by Phase 2, but verify):

```tsx
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { UploadForm } from '@/components/admin/UploadForm'
import { AdminMapList } from '@/components/maps/AdminMapList'
import { PendingQueue } from '@/components/submissions/PendingQueue'
import { PackManager } from '@/components/packs/PackManager'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { getFirebaseAuth } from '@/lib/auth/firebase-client'
```

- [ ] **Add `<AdminDashboard />` as the first element inside the authenticated `<>` block**, above `<PendingQueue>`:

```tsx
<>
  <AdminDashboard />
  <PendingQueue onApproved={loadMaps} />
  <h2 className="text-lg font-semibold mb-3">Upload Map</h2>
  <UploadForm onUploaded={loadMaps} />
  <AdminMapList ... />
  <PackManager maps={maps} />
</>
```

- [ ] **Run `npm run build`.**

- [ ] **Smoke test** — open `/admin` as admin user. Verify:
  - Dashboard skeleton appears while loading
  - Stats cards show correct numbers (spot-check against Firestore)
  - Top maps list appears if there are maps with installs
  - Activity feed shows recent events
  - Error state works by temporarily breaking the route (comment out the body, return 500)

- [ ] **Run full test suite**
```bash
npm test
```
Expected: all tests pass.

- [ ] **Commit**
```bash
git add src/components/admin/AdminDashboard.tsx src/app/admin/page.tsx
git commit -m "feat: add AdminDashboard with stats, top maps, and activity feed"
```
