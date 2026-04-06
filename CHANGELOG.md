# Changelog

## Unreleased

### Added
- **Launch CS button**: Windows-only split-button in the site header that launches Counter-Strike 1.6 directly from the browser via a custom `cs://` URI scheme. Includes a one-time PowerShell setup script (`public/setup-cs-launch.ps1`) that opens a file picker, registers the URI scheme in the Windows registry with the correct working directory, and a 3-step setup modal with reconfigure support.

### Fixed
- Persist `SiteHeader` in root layout to eliminate auth flicker on navigation.
- Revalidate `/api/maps` cache after toggling map hidden state.

---

## 2026-03-31

### Added
- **Daily pick featured card**: Admin can set a daily pick map with an optional caption. Displays a highlighted "Today's Pick" badge on the map card. Admin confirmation dialog prevents accidental changes.

---

## 2026-03-20 — UI/UX Audit

### Fixed
- Accessibility improvements: focus management, ARIA labels, motion preferences.
- Admin submit guard to prevent duplicate submissions.

---

## 2026-03-17 — Security Audit

### Fixed
- Auth hardening, atomic writes, XSS prevention, storage validation.

---

## 2026-03-15 — Gaming Dark Redesign

### Added
- Gaming dark theme with CSS custom property tokens (`--bg-base`, `--accent-cyan`, `--accent-orange`, etc.) defined in `globals.css`.
- Single-column mobile layout with taller thumbnails.
- Sort controls and batch select toggle on map list.
- Improved `SearchInput` with clear button and accent border.
- `MapCard` hover lift, install icon, image placeholders, and accessibility fixes.
- Crosshair icon in site header logo.

### Removed
- `ThemeProvider` and `ProgressModal` replaced by gaming dark tokens.

---

## 2026-03-10 — Admin Dashboard & UI Primitives

### Added
- Admin dashboard with stats cards, top maps, and activity feed.
- UI primitive components: `Button`, `Modal`, `Spinner`, `Badge`, `Card`, `StatusBadge`.
- `GET /api/admin/stats` route.

### Changed
- All components migrated to UI primitives and gaming dark design tokens.

---

## 2026-03-05 — Installed Map Sync & Notifications

### Added
- Sync installed BSPs to localStorage after folder scan (`syncInstalledToLocalStorage`).
- Toast notification system (`NotificationProvider`).
- Admin ability to hide/show maps.
- Map reorder (up/down) in admin with `POST /api/admin/maps/reorder`.

---

## 2026-02-28 — Tags, Packs & Counts

### Added
- Tags and categories: admin assign/edit, user filter chips, map card pills.
- Map packs: admin create/delete, public `PackSection` with Install All and Pick & Install.
- Download and install counters (`downloadCount`, `installCount`) on map cards and admin list.
- Batch install with always-visible checkboxes and parallel install.

---

## 2026-02-20 — Community Submissions

### Added
- Community upload flow: Google sign-in via Firebase Auth, submission queue in Firestore, admin review (approve/reject).
- `AuthButton` with Google sign-in/out and avatar dropdown.
- User submissions page (`/submissions`) with delete own submission.
- Admin pending queue with approve/reject actions.

---

## 2026-02-10 — Theme, Search & BSP Detection

### Added
- Light/dark/system theme toggle persisted to localStorage.
- Client-side map search with `SearchInput`.
- BSP install detection: scans `cstrike/maps/` folder and matches installed maps by prefix.

---

## 2026-02-01 — Storage Migration

### Changed
- Migrated storage backend to **Supabase Storage** for binary files (archives, screenshots).
- Migrated database to **Firebase Firestore** for map metadata and submissions.
- Migrated auth to **Firebase Auth** (Google OAuth popup).

---

## 2026-01-25 — Screenshot Gallery & Install Stepper

### Added
- `MapDetailModal` with screenshot gallery and install stepper.
- `InstallStepper` component with 4 phases and progress bar.
- Screenshot upload/delete API routes and admin upload form section.
- `screenshotKeys` field on `MapEntry`.

---

## 2026-01-15 — Initial Release

### Added
- Core map browsing and install pipeline: presigned URL download, SHA256 verify, extract (ZIP/7Z/RAR), detect archive structure, write to `cstrike/maps/` via File System Access API.
- Admin upload page with map management.
- Archive structure detector (`game-root` / `cs-subfolder` / `bare-files`).
- Client-side extractors for ZIP, 7Z, and RAR.
- All API routes: maps, auth, upload, download, delete.
- Firebase/Supabase dual-backend storage architecture.
