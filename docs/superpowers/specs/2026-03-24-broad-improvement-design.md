# Broad Improvement — Design Spec

**Date:** 2026-03-24
**Status:** Approved

---

## Overview

Three-phase comprehensive improvement of the CS Map Distribution app covering visual polish, code organization, and admin visibility. Each phase is a prerequisite for the next.

---

## Phase 1 — Design System

### Problem

The app has ad-hoc Tailwind classes and a handful of CSS custom properties (`--bg-primary`, `--text-muted`, etc.). Buttons, badges, and cards look inconsistent across components. There is no single source of truth for spacing, color, or interaction states.

### Token Layer

Extend the existing CSS custom properties in `globals.css` into a full design token set. Both light and dark values defined per token. The existing theme mechanism uses a `.dark` class on `<html>` (toggled by `ThemeProvider` in `src/lib/theme-context.tsx`); dark token values are defined inside a `.dark { ... }` selector in `globals.css`, matching the existing pattern.

Token groups:

| Group | Tokens |
|---|---|
| Color — background | `--bg-primary`, `--bg-surface`, `--bg-elevated` |
| Color — text | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse` |
| Color — border | `--border-default`, `--border-subtle`, `--border-strong` |
| Color — accent | `--accent`, `--accent-hover`, `--accent-muted` |
| Color — semantic | `--color-danger`, `--color-success`, `--color-warning`, `--color-info` |
| Spacing | `--space-1` through `--space-10` (4px base unit) |
| Radius | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full` |
| Shadow | `--shadow-sm`, `--shadow-md` |
| Transition | `--transition-fast` (150ms), `--transition-base` (200ms) |

### Component Primitives

New folder: `src/components/ui/`

| Component | Props | Replaces |
|---|---|---|
| `Button` | `variant` (primary/secondary/ghost/danger), `size` (sm/md), `loading`, `disabled` | ad-hoc `<button className="...">` across all features |
| `Badge` | `variant` (default/success/warning/danger/info), `size` | format pills, status pills, tag chips |
| `Card` | `className` passthrough | repeated white-box-with-border pattern |
| `Modal` | `title`, `onClose`, `children` | base primitive for overlays |
| `Spinner` | `size` (sm/md/lg) | inline loading states |
| `StatusBadge` | `status` (pending/approved/rejected) | submission status across admin and user pages |

**`ConfirmModal` migration:** `ConfirmModal.tsx` is rewritten in Phase 1 to use the new `Modal` primitive internally. Its external props (`message`, `confirmLabel`, `onConfirm`, `onCancel`) are unchanged so callers require no update. `ProgressModal.tsx` is similarly refactored onto `Modal`. After Phase 1, `ConfirmModal` and `ProgressModal` are thin wrappers over `Modal`; the raw `Modal` primitive is also available for future use.

### Visual Polish Targets

- Consistent spacing rhythm using token scale
- Consistent font-size scale across headings and body text
- Polished hover/focus ring states on all interactive elements
- Smooth transitions (150ms) on hover/active states
- Better empty states (icon + message) for map list, submission list
- No layout changes — same page structure, refined presentation

---

## Phase 2 — Code Reorganization

### Problem

`src/lib/` is a flat folder of 15+ files spanning auth, storage, maps, packs, submissions, extractors, tags, install, and theme context. `src/components/` is 15+ flat files mixing UI primitives with feature components. As features were added, cross-imports accumulated and module boundaries blurred.

### Target Structure

```
src/
├── components/
│   ├── ui/              ← Button, Badge, Card, Modal, Spinner, StatusBadge (Phase 1)
│   ├── layout/          ← SiteHeader, ThemeToggle, NotificationBell
│   ├── maps/            ← MapCard, MapList, AdminMapList, SearchInput
│   ├── packs/           ← PackSection, PackManager
│   ├── admin/           ← UploadForm (admin direct-upload, distinct from community submissions)
│   └── submissions/     ← SubmitForm, PendingQueue, MySubmissions, AuthButton
│
├── lib/
│   ├── auth/            ← auth.ts, firebase-client.ts, firebase-admin.ts
│   │                       theme-context.tsx, notification-context.tsx
│   │                       (React context providers stay in lib — not moved to components/)
│   ├── storage/         ← storage.ts, hash.ts
│   ├── extractors/      ← (unchanged)
│   ├── maps/            ← maps-store.ts, tags.ts, install.ts, folder-store.ts
│   ├── packs/           ← packs-store.ts
│   └── submissions/     ← submissions-store.ts, validate-archive.ts
│
└── types/               ← map.ts, pack.ts, submission.ts (unchanged)
```

**Context providers** (`theme-context.tsx`, `notification-context.tsx`) remain in `src/lib/auth/` rather than moving to `components/`. They are React context providers with no render output — logically they belong in `lib/`, not `components/`. Import paths from `layout.tsx` update accordingly.

### Rules

- Feature lib modules do not cross-import (maps does not import from submissions, etc.)
- `ui/` components contain zero business logic
- API routes import only from the lib folder of their feature domain
- Components over ~200 lines are split at refactor time

### Large Component Audit

`AdminMapList` and `PendingQueue` are flagged as candidates for splitting. Each will be assessed during the move — if over 200 lines, extracted into subcomponents within their feature folder.

### Migration Approach

Move files with updated import paths. No logic changes during Phase 2 — pure reorganization. Verify correctness by manual smoke-test of all routes after the move (there are no automated tests in this project).

---

## Phase 3 — Admin Analytics Dashboard

### Problem

The admin page is purely task-oriented (upload, manage, review). There is no at-a-glance visibility into app health, map popularity, or recent activity.

### New Dashboard Section

Added above the existing admin page content. Uses `Card` and `Badge` from Phase 1, inside the reorganized component structure from Phase 2.

#### Stats Row

Four stat cards in a 2×2 grid (mobile) / single row (desktop):

| Card | Value |
|---|---|
| Total Maps | Document count from `maps` Firestore collection |
| Total Installs | Sum of `installCount` across all map documents |
| Total Downloads | Sum of `downloadCount` across all map documents |
| Pending Submissions | Count of `submissions` documents where `status == 'pending'` |

#### Top Maps

Top 5 maps by `installCount`, displayed as a ranked list with a relative bar (proportional to the top map's count).

#### Recent Activity Feed

Last 10 events, merged in application code from two separate Firestore queries:

1. **Reviewed submissions:** Query `submissions` collection ordered by `reviewedAt` desc, limit 10. Each document yields an `approved` or `rejected` event using `originalName` and `reviewedAt`.
2. **Direct admin uploads:** Query `maps` collection where `uploaderId == null`, ordered by `uploadedAt` desc, limit 10. Each document yields an `uploaded` event using `originalName` and `uploadedAt`. Intentionally filters to admin-only uploads (`uploaderId == null`) — user-submitted approved maps already appear as `approved` events from query 1, so including them here would produce duplicates.

Both result sets are merged in memory, sorted by timestamp desc, and the top 10 are returned. This approach requires two Firestore reads — acceptable given the 60-second cache.

Displayed as a simple chronological list with icon, description, and relative timestamp.

### New API Route

`GET /api/admin/stats`

- Admin-only (returns 403 for non-admin)
- Returns all dashboard data in a single response
- Caching: wrap the Firestore reads using `unstable_cache` from `next/cache` as `unstable_cache(fn, ['admin-stats'], { revalidate: 60 })`

Response shape:

```ts
{
  totalMaps: number
  totalInstalls: number
  totalDownloads: number
  pendingSubmissions: number
  topMaps: Array<{ id: string; originalName: string; installCount: number }>
  recentActivity: Array<{
    type: 'approved' | 'rejected' | 'uploaded'
    mapName: string
    at: string   // ISO 8601
  }>
}
```

### No New Tables

All data comes from existing `maps` and `submissions` Firestore collections. No schema changes required.

---

## Error Handling

- Phase 1: UI primitives accept `className` overrides and degrade gracefully if tokens are missing
- Phase 2: No new behavior introduced; verify by manual smoke-test after reorganization
- Phase 3: If `/api/admin/stats` fails, the dashboard section shows a subtle error state — the rest of the admin page is unaffected

---

## Out of Scope

- Charts or time-series graphs (the activity feed and bar indicator are sufficient for now)
- Real-time updates to the dashboard (60-second cache is acceptable)
- Splitting the admin page into sub-routes
- Any new user-facing features
