# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm run lint      # ESLint
npm run test      # Jest (all tests)
npx jest tests/path/to/file.test.ts  # Single test file
```

Tests live in `tests/` and use `ts-jest` with Node environment. Some test files override to `jsdom` via `@jest-environment` docblock.

## Architecture

**What this is**: A web platform for browsing and installing Counter-Strike 1.6 map archives directly into the user's game folder via the browser's File System Access API.

**Dual-backend storage**:
- **Firestore** — map metadata (`maps` collection), submission queue (`submissions` collection), config (`config` collection, e.g. `config/daily-pick`)
- **Supabase** — binary files: `archives/{id}.{ext}`, `screenshots/{id}/{index}.jpg`, `submissions/{id}.{ext}`

Server-side Firestore/Supabase access goes through `src/lib/auth/firebase-admin.ts` and Supabase server clients only. Browser code never touches admin credentials.

**Auth split**: `src/lib/auth/firebase-client.ts` (browser SDK) vs `firebase-admin.ts` (server). Session cookie (`__session`) is set on sign-in and verified server-side via `getSessionUser()` in `src/lib/auth/auth.ts`. Admin access is gated by email match against `ADMIN_GOOGLE_EMAIL` (server-only env var) via `isAdmin()` in the same file.

**Middleware**: `src/proxy.ts` (Next.js 16 uses `proxy.ts`, not `middleware.ts`). Currently guards `/admin/:path*` — redirects to `/` if no valid session cookie.

**Install pipeline** (`src/lib/maps/install.ts`): presigned URL → download → SHA256 verify (`src/lib/storage/hash.ts`) → extract (ZIP/7Z/RAR via `src/lib/extractors/`) → detect archive structure (`game-root` / `cs-subfolder` / `bare-files`) → write to `cstrike/maps/` via File System Access API. The selected folder handle is persisted to localStorage via `src/lib/maps/folder-store.ts`.

**Submission flow**: user uploads via `/api/upload` → `/api/submit` validates (format, SHA256 dedup via `src/lib/submissions/validate-archive.ts`) → stored as `pending` in Firestore (`src/lib/submissions/submissions-store.ts`). Admin reviews via `/api/admin/submissions/*`, approves/rejects, moves approved maps to `maps` collection (`src/lib/maps/maps-store.ts`).

**Daily pick**: admin sets a featured map with caption via `/api/admin/daily-pick`. Stored in Firestore `config/daily-pick`, active for 48 hours. Retrieved via `/api/daily-pick` using `src/lib/maps/daily-pick-store.ts`. Displayed as a featured card on the browse page.

**Launch CS**: `cs://` URI scheme integration. `src/lib/maps/launch-store.ts` persists a setup flag to localStorage. `LaunchButton` in `src/components/layout/` opens the URI; `LaunchSetupModal` guides first-time setup.

**Map metadata** (`src/types/map.ts` `MapEntry`): `id`, `originalName`, `storageKey` (full path e.g. `archives/uuid.zip`), `format`, `size`, `sha256`, `uploadedAt`, `installCount`, `order` (for admin reorder), `tags` (string[]), `hidden` (boolean), `uploader`, `screenshotKeys`.

**Admin features**: stats dashboard (`src/lib/admin/stats-store.ts`, `/api/admin/stats`), map reorder (`/api/admin/maps/reorder`), tag editing (`/api/admin/maps/[id]/tags`), hide/unhide (`/api/admin/maps/[id]/hidden`), daily pick management.

**Tags**: whitelist defined in `src/lib/maps/tags.ts`. Applied per-map by admin.

**UI state**: no global state library. `NotificationProvider` (React Context, `src/lib/auth/notification-context.tsx`) handles toasts. Everything else is local `useState` + direct `fetch()` calls in `useEffect`.

**Layout components**: `src/components/layout/` — `SiteHeader.tsx`, `LaunchButton.tsx`, `NotificationBell.tsx`, `ToastContainer.tsx`.

**Env vars**: validated at startup in `src/instrumentation.ts`. Public vars (`NEXT_PUBLIC_*`) are safe for the browser; `SUPABASE_*`, `FIREBASE_*`, and `ADMIN_GOOGLE_EMAIL` are server-only. Check `src/lib/env.ts` for the full list.

**CSS**: Tailwind v4 via PostCSS. Theme tokens defined as CSS custom properties in `src/app/globals.css` (`--bg-base`, `--accent-cyan`, `--accent-orange`, etc.). Use these tokens rather than raw colors.

**Path alias**: `@/*` resolves to `src/*`.
