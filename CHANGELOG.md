# Changelog

## 2026-04-06

### Added
- **Launch CS button**: Windows-only split-button in the site header that launches Counter-Strike 1.6 directly from the browser via a custom `cs://` URI scheme. Includes a one-time PowerShell setup script that opens a file picker, registers the URI scheme in the Windows registry with the correct working directory (`cmd /c` wrapper), and a 3-step setup modal with reconfigure support via a gear icon.

### Fixed
- Persist `SiteHeader` in root layout to eliminate auth flicker on navigation.
- Revalidate `/api/maps` cache after toggling map hidden state.

---

## 2026-03-31

### Added
- **Daily pick featured card**: Admin can set a daily pick map with an optional caption. Displays a highlighted "Today's Pick" badge on the map card. Admin confirmation dialog prevents accidental changes.

---

## 2026-03-30

### Fixed
- LCP image preloading, auth sign-in flow, and route protection.

---

## 2026-03-27 -- UI/UX Polish

### Added
- `MapCard` hover lift, install icon, image placeholders, and accessibility fixes.
- Improved `SearchInput` with clear button and accent border.
- Sort controls and discoverable batch select toggle on map list.
- Single-column mobile layout with taller thumbnails.
- Crosshair icon in site header logo.

### Fixed
- `MapDetailModal` accessibility and replaced `img` with `next/image`.
- Skeleton grid loading state on main page.
- Button hover feedback and auto-collapse folder picker when folder is set.
- Loading spinner for initial screenshot in `MapDetailModal`.
- Jest config works correctly from both project root and worktrees.

---

## 2026-03-26

### Added
- Test suite expanded to 96% statement coverage.
- Toast notifications wired across all user actions.

### Changed
- Theme lightened; admin UX polished.

---

## 2026-03-25 -- Gaming Dark Redesign & Screenshots

### Added
- Gaming dark theme with CSS custom property tokens (`--bg-base`, `--accent-cyan`, `--accent-orange`, etc.).
- `MapDetailModal` with screenshot gallery and install stepper (4 phases, progress bar).
- Screenshot upload/delete API routes and admin upload form section.
- `screenshotKeys` field on `MapEntry`.
- `MapList` stats bar, sort, and single-select tag filter.
- `MapCard` rewritten with rich thumbnail, gaming dark states, and inline install progress.
- UI/UX improvements across admin, map list, and submit pages.
- All UI strings extracted to `constants/messages.ts`.

### Changed
- `ThemeProvider` and `ProgressModal` removed; replaced by gaming dark tokens.
- Tags updated to `FILTER_TABS`/`tabToTag` for single-select gaming dark nav.

---

## 2026-03-24 -- Design System, Admin Dashboard & Map Reorder

### Added
- UI primitive components: `Button`, `Modal`, `Spinner`, `Badge`, `Card`, `StatusBadge`.
- Admin dashboard with stats cards, top maps, and activity feed (`GET /api/admin/stats`).
- Map reorder (up/down buttons) in admin with `POST /api/admin/maps/reorder`.
- `syncInstalledToLocalStorage` to persist BSP scan results across sessions.
- Notification panel auto-dismiss after 3s, fixed to right side.

### Changed
- All components migrated to UI primitives.
- Lib files reorganized into feature folders (`maps/`, `auth/`, `submissions/`).

---

## 2026-03-23 -- Theme, Search, BSP Detection, Tags, Packs & Counts

### Added
- Light/dark/system theme toggle with localStorage persistence.
- Client-side map search with `SearchInput`.
- BSP install detection: scans `cstrike/maps/` folder and matches installed maps by prefix.
- Folder tree guide and persistent folder picker with "Change" option.
- Avatar dropdown menu with admin/user context-aware nav and sign-out.
- Download and install counters (`downloadCount`, `installCount`) on map cards and admin list.
- Tags and categories: admin assign/edit, user filter chips, map card pills.
- Map packs: admin create/delete, public `PackSection` with Install All and Pick & Install.
- Batch install with always-visible checkboxes and parallel install.

---

## 2026-03-22 -- Initial Release

### Added
- Core map browsing and install pipeline: presigned URL download, SHA256 verify, extract (ZIP/7Z/RAR), detect archive structure (`game-root` / `cs-subfolder` / `bare-files`), write to `cstrike/maps/` via File System Access API.
- Admin upload and map management page.
- Community upload flow: Google sign-in via Firebase Auth, submission queue in Firestore, admin review (approve/reject).
- `AuthButton` with Google sign-in/out.
- User submissions page (`/submissions`) with delete own submission.
- All API routes: maps, auth, upload, download, delete, submit, admin review.
- Firebase Firestore for map metadata and submissions; Supabase Storage for binary files.
- Archive structure detector and client-side extractors for ZIP, 7Z, and RAR.
