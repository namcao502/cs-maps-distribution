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

Extend the existing CSS custom properties in `globals.css` into a full design token set. Both light and dark values defined per token, toggled by the existing `data-theme` attribute on `<html>`.

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
| `Modal` | `title`, `onClose`, `children` | `ConfirmModal` + `ProgressModal` unified base |
| `Spinner` | `size` (sm/md/lg) | inline loading states |
| `StatusBadge` | `status` (pending/approved/rejected) | submission status across admin and user pages |

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
│   └── submissions/     ← SubmitForm, PendingQueue, MySubmissions, AuthButton
│
├── lib/
│   ├── auth/            ← auth.ts, firebase-client.ts, firebase-admin.ts
│   ├── storage/         ← storage.ts, hash.ts
│   ├── extractors/      ← (unchanged)
│   ├── maps/            ← maps-store.ts, tags.ts, install.ts, folder-store.ts
│   ├── packs/           ← packs-store.ts
│   └── submissions/     ← submissions-store.ts, validate-archive.ts
│
└── types/               ← map.ts, pack.ts, submission.ts (unchanged)
```

### Rules

- Feature lib modules do not cross-import (maps does not import from submissions, etc.)
- `ui/` components contain zero business logic
- API routes import only from the lib folder of their feature domain
- Components over ~200 lines are split at refactor time

### Large Component Audit

`AdminMapList` and `PendingQueue` are flagged as candidates for splitting. Each will be assessed during the move — if over 200 lines, extracted into subcomponents within their feature folder.

### Migration Approach

Move files with updated import paths. No logic changes during Phase 2 — pure reorganization. Existing tests must pass before and after.

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
| Total Maps | Row count from `maps` table |
| Total Installs | Sum of `install_count` across all maps |
| Total Downloads | Sum of `download_count` across all maps |
| Pending Submissions | Count from `submissions` where `status = 'pending'` |

#### Top Maps

Top 5 maps by `install_count`, displayed as a ranked list with a relative bar (proportional to the top map's count).

#### Recent Activity Feed

Last 10 events merged from two sources:
- Submission reviews: `submissions` ordered by `reviewed_at` desc — shows approved (✓) or rejected (✗) with map name and time ago
- Direct admin uploads: `maps` where `uploader_id IS NULL` ordered by `uploaded_at` desc — shows as upload (↑) event

Displayed as a simple chronological list with icon, description, and relative timestamp.

### New API Route

`GET /api/admin/stats`

- Admin-only (returns 403 for non-admin)
- Returns all dashboard data in a single response
- Response cached server-side with `Cache-Control: private, max-age=60`

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

All data comes from existing `maps` and `submissions` tables. No schema changes required.

---

## Error Handling

- Phase 1: UI primitives accept `className` overrides and degrade gracefully if tokens are missing
- Phase 2: All existing tests must pass after reorganization; no new behavior introduced
- Phase 3: If `/api/admin/stats` fails, the dashboard section shows a subtle error state — the rest of the admin page is unaffected

---

## Out of Scope

- Charts or time-series graphs (the activity feed and bar indicator are sufficient for now)
- Real-time updates to the dashboard (60-second cache is acceptable)
- Splitting the admin page into sub-routes
- Any new user-facing features
