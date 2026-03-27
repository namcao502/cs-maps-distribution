# Gaming Dark UI Redesign

**Date:** 2026-03-25
**Scope:** Full end-to-end visual redesign + three new features

---

## Overview

A full redesign of the CS Maps Distribution app using a Gaming Dark aesthetic: deep navy-black backgrounds, orange + cyan accents, monospace typography, and high-contrast FPS energy. Delivered alongside three new features: map screenshots, a map detail modal, and a cinematic install animation.

---

## Approach

Option 2 — full redesign in one shot. All components are visually interdependent (the card thumbnail ties directly to the screenshot system and the detail modal), so shipping them together avoids two rounds of rework and produces a coherent result.

---

## 1. Theme Tokens

Tokens are defined as CSS custom properties in `src/app/globals.css`. The **entire existing `:root {}` block** (all `--bg-*`, `--text-*`, `--border-*`, `--accent`, `--color-*`, `--space-*`, `--radius-*`, `--shadow-*` variables) is replaced with the Gaming Dark tokens below. The `.dark {}` override block and `@custom-variant dark` line are also removed — there is no light mode.

Every component not listed in "Files Affected" that references old tokens (e.g. `--bg-card`, `--bg-secondary`, `--bg-elevated`, `--border-default`, `--accent`) must have its token references updated as part of step 1. The `ThemeToggle` component and `ThemeProvider` context are removed.

| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#0a0c14` | Page background (`body`) |
| `--bg-surface` | `#0f1623` | Cards, nav, modals |
| `--bg-inset` | `#090b10` | Inputs, stats bar |
| `--border` | `#1e2a3a` | Default borders |
| `--border-installed` | `#1e3a2a` | Installed card borders |
| `--accent-orange` | `#f97316` | Install CTAs, logo, active progress |
| `--accent-cyan` | `#38bdf8` | Map names, active tabs, hover borders |
| `--accent-green` | `#22c55e` | Installed state, completed phases |
| `--accent-red` | `#f87171` | CS (hostage) map type badge |
| `--text-primary` | `#e2e8f0` | Headings, map names |
| `--text-muted` | `#4b5563` | Secondary info, file sizes |
| `--text-subtle` | `#94a3b8` | Meta tags |
| `--color-danger` | `#ef4444` | Error states (kept, used in install error) |
| `--radius-sm` | `6px` | Keep radius tokens — used across components |
| `--radius-md` | `10px` | |
| `--radius-lg` | `16px` | |

Font: monospace (`font-family: monospace`) for labels, badges, stats. System sans-serif for body text.

---

## 2. Layout — Top Nav + Grid

### Navigation bar
- **Left:** `CS MAPS` logo in `--accent-orange`, monospace, letter-spacing-wide + map count badge in cyan
- **Center:** Search input — full-width, dark inset style (`--bg-inset`), cyan focus ring
- **Right (primary):** Filter tabs `ALL / DEFUSE / HOSTAGE` with cyan underline on active + installed progress counter `8 / 24 installed`
- **Right (secondary, after progress):** `NotificationBell` + `AuthButton` — kept from existing `SiteHeader`. `ThemeToggle` is removed but these two remain.

**State lifting for installed counter and search query:**
`page.tsx` holds two pieces of state: `installedCount: number` and `query: string`.
- `MapList` accepts a new `onInstalledCountChange: (n: number) => void` callback and calls it whenever `installedBsps` changes.
- `SiteHeader` accepts `installedCount: number` and `query + onQueryChange` props; the search input renders inside the nav using `SearchInput` (existing component, reused).
- Filter tabs (`ALL / DEFUSE / HOSTAGE`) are single-select, replacing the current multi-select tag toggle in `MapList`. The active tag is lifted to `page.tsx` as `activeTag: 'all' | 'de_' | 'cs_'` and passed to both `SiteHeader` (for tab display) and `MapList` (for filtering). `MAP_TAGS` / `TAG_LABELS` in `src/lib/maps/tags.ts` is updated to reflect the three tab values.

### Stats bar (thin row below nav, lives in `MapList`)
- Shows total map count, current sort (clickable dropdown: Popular / Newest / A–Z)
- Sort is **client-side** — `MapList` reorders its local copy of the `maps` prop. No API changes required.
- When 1+ maps are selected: shows selection count + `INSTALL ALL` button in orange

### Grid
- 4 columns desktop → 2 tablet → 1 mobile
- Uniform card height, gap `10px`

---

## 3. Map Cards — Rich + Thumbnail

Each card has two zones: thumbnail and info.

### Thumbnail zone (top)
- Height: 80px
- Contains the map screenshot image (falls back to dark gradient placeholder)
- **Top-left badge:** map type derived from `map.tags` using `map.tags.includes('de_')` → `DE` badge in `--accent-orange`; `map.tags.includes('cs_')` → `CS` badge in `--accent-red`. Falls back to no badge if neither. (Tags store the prefix strings `'de_'` and `'cs_'` directly, not full map names.)
- **Top-right:** checkbox for batch selection (unchecked = hollow, checked = orange fill)
- **Installing state:** 3px progress bar along the bottom edge of the thumbnail, orange fill
- **Hover state:** card border transitions to `accent-cyan`
- **Installed state:** card border and thumbnail tint go green (`bg-inset` green tint)

### Info zone (bottom, padding 8px 10px)
- Map name: `text-primary`, 11px, bold, monospace
- Second row: file size (left) + install count with ↓ icon (right), both `text-muted`
- Install button: full-width, 5px radius
  - Default: orange fill, black text, `INSTALL`
  - Installed: transparent, green border+text, `✓ INSTALLED`
  - Installing: dark fill, orange border+text, `INSTALLING...`

---

## 4. New Feature: Map Screenshots

### Admin side
- Map upload form gains a **Screenshots** section: up to 3 images per map, drag-and-drop or file picker
- Accepted formats: JPG, PNG, WebP — max 2 MB each
- Screenshots stored in Supabase under `screenshots/{mapId}/0`, `screenshots/{mapId}/1`, `screenshots/{mapId}/2` (0-based index, extension preserved from the uploaded file). The DELETE endpoint `[index]` is also 0-based.
- `screenshotKeys` stores the full path including extension, e.g. `"screenshots/uuid/0.jpg"`
- Admin can reorder or delete screenshots per map
- Maps with no screenshots show a placeholder gradient (existing behaviour)

### Storage abstraction
Screenshots follow the same storage abstraction pattern as map archives in `src/lib/storage/storage.ts`. The new `src/lib/storage/screenshots.ts` module wraps Supabase operations and returns storage keys (not raw signed URLs). Signed URLs are generated on-demand at read time (same pattern as `storageKey` on `MapEntry`).

### Data model addition
```ts
// Added to MapEntry in src/types/map.ts
screenshotKeys?: string[]  // Storage keys, max 3 (e.g. "screenshots/uuid/1.webp")
```

### Persistence
`screenshotKeys` is stored in Firestore on the map document (same as all other `MapEntry` fields). `src/lib/maps/maps-store.ts` is updated to read and write `screenshotKeys` when getting/updating maps.

### API
- `POST /api/maps/[id]/screenshots` — upload screenshot, append key to `screenshotKeys` (admin only). Route file: `src/app/api/maps/[id]/screenshots/route.ts`
- `DELETE /api/maps/[id]/screenshots/[index]` — remove screenshot at position (admin only). Route file: `src/app/api/maps/[id]/screenshots/[index]/route.ts`
- `screenshotKeys` (resolved to signed URLs) included in `GET /api/maps` response

---

## 5. New Feature: Map Detail Modal

Triggered by clicking the thumbnail zone or map name on a card. The checkbox (top-right) and install button do not open the modal — they perform their own actions (select / install) directly.

### Structure
- **Backdrop:** dark overlay, click outside to dismiss
- **Screenshot gallery:** full-width at top (160px), with thumbnail strip (3 dots/previews) below the image — click to switch
- **Header:** map name (large, monospace) + uploader + upload date on the left; install count on the right
- **Meta tags row:** format badge (ZIP/7Z/RAR), file size, `SHA256 verified`
- **Install stepper** — always visible in the modal. Default/idle state: all 4 phases shown in muted style (`text-muted` icons and labels, no fill on connecting lines). Becomes active once install starts.
- **Action row:** primary `INSTALL` button (full orange) + secondary `↓ Download` button (dark outline)

### Install stepper phases

Maps to the existing `InstallStatus` type in `src/lib/maps/install.ts`:

| Step label | `InstallStatus.phase` | Active style |
|---|---|---|
| `DOWNLOAD` | `downloading` | Orange spinner + `progress` percentage shown |
| `VERIFY` | `verifying` | Orange spinner |
| `EXTRACT` | `extracting` | Orange spinner |
| `WRITE` | `writing` | Orange spinner + `done/total` file count sub-label |

Completed steps turn cyan/green. The `done` phase is not a visible step — it triggers the completion animation (all steps flash green).

Progress bar below stepper: gradient from green (completed portion) to orange (current position). For `downloading`, the bar fills from 0→100% using `InstallStatus.progress`. For other phases the bar shows indeterminate pulse.

---

## 6. New Feature: Install Animation

The install stepper (described above) is the primary animation surface. It lives inside the map detail modal when open, and as an inline mini-bar on the card thumbnail when the modal is closed.

### In the modal
- Phase label animates: text pulses at 1s interval when active (`opacity: 0.6 → 1.0`)
- Progress bar fills smoothly (CSS transition, driven by actual progress events from the extractor)
- On completion: all phases flash green simultaneously, button text changes to `✓ INSTALLED`, border turns green

### On the card (modal closed)
- 3px bar along bottom of thumbnail fills orange in real time
- Status text in info zone: `Downloading... / Verifying... / Extracting... / Writing...`
- Percentage shown on the right

---

## 7. Error Handling

- Screenshot upload failure: inline error below the dropzone, file not saved
- Install failure: phase turns red, error message shown below stepper inside modal
- No File System Access API support: `INSTALL` button replaced with `↓ Download` automatically

---

## 8. Out of Scope

- User accounts or authentication changes
- Map ratings or comments
- Admin dashboard visual changes (admin UI redesign is a separate effort)
- `ProgressModal` and the `notification-context` install-progress flow are **superseded** by `InstallStepper`. `ProgressModal.tsx` and `notification-context.tsx` are removed. `NotificationBell` keeps its existing notification features (submission status updates) but no longer drives install progress display.
- `ConfirmModal` (reinstall confirmation) is removed — the `MapDetailModal` provides sufficient context for the user to confirm reinstall by clicking `INSTALL` again when already installed.
- `CheatCodeBanner` and folder-picker section in `MapList` are kept as-is, displayed below the stats bar. Their token references are updated but behavior is unchanged.

---

## Implementation Order

1. Theme tokens — replace entire `:root {}` block in `src/app/globals.css`; update all token references across every component; remove `ThemeToggle`, `ThemeProvider`, `theme-context.tsx`
2. Navigation bar + stats bar
3. Map card component (all states)
4. Screenshot upload in admin
5. Screenshot display in cards (with fallback)
6. Map detail modal (static)
7. Install stepper wired to live progress events
8. Inline card progress bar

---

## Files Affected

| File | Change |
|---|---|
| `src/app/globals.css` | Replace entire `:root {}` block with Gaming Dark tokens; remove `.dark {}` and `@custom-variant dark` |
| `src/lib/auth/theme-context.tsx` | Delete — no longer needed |
| `src/components/layout/ThemeToggle.tsx` | Delete — no light mode |
| `src/app/layout.tsx` | Remove `ThemeProvider` wrapper; keep `NotificationProvider` |
| `src/components/layout/SiteHeader.tsx` | Rewrite: Gaming Dark nav, search center, filter tabs, installed counter prop, keep `NotificationBell` + `AuthButton` |
| `src/app/page.tsx` | Pass `installedCount` down from `MapList` callback to `SiteHeader`; update any remaining old token references |
| `src/components/maps/MapList.tsx` | Add stats bar, client-side sort, batch-select state; compute `installedCount` and pass up |
| `src/components/maps/MapCard.tsx` | Full rewrite — rich card with all states (default, installed, installing) |
| `src/components/maps/MapDetailModal.tsx` | New component — screenshot gallery, meta, install stepper, actions |
| `src/components/maps/InstallStepper.tsx` | New component — 4-step stepper wired to `InstallStatus` |
| `src/components/admin/UploadForm.tsx` | Add screenshot upload section (up to 3 images, drag-and-drop) |
| `src/app/api/maps/[id]/screenshots/route.ts` | New — POST upload screenshot |
| `src/app/api/maps/[id]/screenshots/[index]/route.ts` | New — DELETE screenshot by index |
| `src/lib/storage/screenshots.ts` | New — screenshot storage (same abstraction as `storage.ts`) |
| `src/lib/maps/maps-store.ts` | Read/write `screenshotKeys` on map documents |
| `src/types/map.ts` | Add `screenshotKeys?: string[]` to `MapEntry` |
| `src/app/api/maps/route.ts` | Resolve `screenshotKeys` to signed URLs before returning |
| `src/components/maps/SearchInput.tsx` | Reused inside `SiteHeader` (no logic changes, token references updated) |
| `src/lib/maps/tags.ts` | Update `MAP_TAGS` / `TAG_LABELS` for three-tab single-select model |
| `src/lib/auth/notification-context.tsx` | Remove install-progress notifications (keep submission notifications) |
| `src/components/ProgressModal.tsx` | Delete — superseded by `InstallStepper` |
| `src/components/ConfirmModal.tsx` | Delete — reinstall confirmation removed |
| All other components using old CSS tokens | Update `--bg-card`, `--bg-secondary`, `--bg-elevated`, `--border-default`, `--accent`, etc. to new tokens |
