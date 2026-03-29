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
- **Firestore** — map metadata (`maps` collection), submission queue (`submissions` collection)
- **Supabase** — binary files: `archives/{id}.{ext}`, `screenshots/{id}/{index}.jpg`, `submissions/{id}.{ext}`

Server-side Firestore/Supabase access goes through `src/lib/auth/firebase-admin.ts` and Supabase server clients only. Browser code never touches admin credentials.

**Auth split**: `src/lib/auth/firebase-client.ts` (browser SDK) vs `firebase-admin.ts` (server). Session cookie (`__session`) is set on sign-in and verified server-side via `getSessionUser()` in route handlers. Admin access is gated by email match against `NEXT_PUBLIC_ADMIN_EMAIL`.

**Install pipeline** (`src/lib/maps/`): presigned URL → download → SHA256 verify → extract (ZIP/7Z/RAR via `src/lib/extractors/`) → detect archive structure (`game-root` / `cs-subfolder` / `bare-files`) → write to `cstrike/maps/` via File System Access API. The selected folder handle is persisted to localStorage via `src/lib/maps/folder-store.ts`.

**Submission flow**: user uploads → `/api/submit` validates (format, SHA256 dedup) → stored as `pending` in Firestore. Admin reviews via `/api/admin/submissions/*`, approves/rejects, moves approved maps to `maps` collection.

**UI state**: no global state library. `NotificationProvider` (React Context) handles toasts. Everything else is local `useState` + direct `fetch()` calls in `useEffect`.

**Env vars**: validated at startup in `src/instrumentation.ts`. Public vars (`NEXT_PUBLIC_*`) are safe for the browser; all `SUPABASE_*` and `FIREBASE_*` service-account vars are server-only. Check `src/lib/env.ts` for the full list.

**CSS**: Tailwind v4 via PostCSS. Theme tokens defined as CSS custom properties in `src/app/globals.css` (`--bg-base`, `--accent-cyan`, `--accent-orange`, etc.). Use these tokens rather than raw colors.

**Path alias**: `@/*` resolves to `src/*`.
