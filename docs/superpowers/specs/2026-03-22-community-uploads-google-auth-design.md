# Community Uploads with Google Auth — Design Spec

**Date:** 2026-03-22
**Status:** Approved

## Overview

Add Google OAuth sign-in so community members can submit CS 1.6 maps for admin review. A designated Google account acts as the sole admin, replacing the existing password-based login. Approved community maps appear on the public list with the uploader's name and avatar.

---

## 1. Auth

### Provider
Supabase Auth with Google OAuth. The existing password/JWT admin system is removed entirely.
Install: `npm install @supabase/ssr`

### Roles
| Role | How identified | Capabilities |
|---|---|---|
| Admin | Signed-in Google account email matches `ADMIN_GOOGLE_EMAIL` env var | Direct upload, approve/reject submissions, delete maps |
| Community user | Any other signed-in Google account | Submit maps, view own submission status |
| Visitor | Not signed in | Browse and install maps |

### Supabase client usage
Two Supabase client instances are used:

- **Auth client** (anon key + user cookies, via `@supabase/ssr` `createServerClient`) — used in route handlers to call `supabase.auth.getUser()`. Created per-request using the resolved `ReadonlyRequestCookies` from `await cookies()`.
- **Service role client** (service role key, existing) — used for storage operations and direct DB writes that bypass RLS. Never used for session reads.

### Proxy file (`src/proxy.ts`)
Next.js 16 renamed `middleware.ts` to `proxy.ts` with `export function proxy(request: NextRequest)`. This file uses `@supabase/ssr` `createServerClient` with the request/response cookie objects, calls `supabase.auth.getUser()` (which also refreshes the session token — required to prevent silent auth failures), and redirects unauthenticated requests on `/admin` and `/submissions` paths to `/`.

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // create @supabase/ssr client using request cookies
  // call getUser() — this refreshes session cookie in response
  // if no user: return NextResponse.redirect('/')
  // else: return NextResponse.next() with updated cookies
}

export const config = {
  matcher: ['/admin/:path*', '/submissions/:path*'],
}
```

### OAuth callback route (`src/app/auth/callback/route.ts`)
Handles the redirect from Google after sign-in:
1. Read `code` query param from the URL
2. `await cookies()` to get the cookie store
3. Create an `@supabase/ssr` server client with the cookie store
4. Call `supabase.auth.exchangeCodeForSession(code)` — this writes the session cookie
5. Redirect to `/` on success, `/?error=auth` on failure

### Helper exports (`src/lib/auth.ts`)

`cookies()` is async in Next.js 16. All callers must `await cookies()` before passing the result:

```ts
import { cookies } from 'next/headers'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import type { User } from '@supabase/supabase-js'

// Creates a request-scoped Supabase client using the anon key + resolved cookie store
export function createAuthClient(cookieStore: ReadonlyRequestCookies): SupabaseClient

// Calls `await cookies()` internally, then createAuthClient, returns User or null
export async function getSessionUser(): Promise<User | null>

// Returns true if user.email === process.env.ADMIN_GOOGLE_EMAIL
export function isAdmin(user: User): boolean
```

### Env vars removed
- `ADMIN_PASSWORD_HASH`
- `JWT_SECRET`

### Env vars added / renamed
- `ADMIN_GOOGLE_EMAIL` — email of the admin Google account
- `NEXT_PUBLIC_SUPABASE_URL` — **new public variant** required by `@supabase/ssr` on the client side. The existing `SUPABASE_URL` (server-only) is **kept** for the service role client in `storage.ts`. Both env vars coexist and point to the same URL value.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — new, the Supabase public/anon key for `@supabase/ssr`

---

## 2. Data Model

### `maps` table (replaces `maps.json`)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK default `gen_random_uuid()` | |
| `original_name` | text | filename without extension |
| `storage_key` | text | **full path** in Supabase Storage, e.g. `archives/uuid.zip` |
| `format` | text | `zip` / `7z` / `rar` |
| `size` | bigint | bytes |
| `sha256` | text | hex SHA-256, used for dedup |
| `uploaded_at` | timestamptz default `now()` | |
| `uploader_id` | uuid nullable | **null = admin direct upload** |
| `uploader_name` | text nullable | null for admin uploads |
| `uploader_avatar` | text nullable | Google profile picture URL at time of upload; null for admin uploads |

**Invariant:** admin direct uploads always write `uploader_id = null`. The approve route always writes the submitter's id and profile fields. Display logic: show uploader info if and only if `uploader_id IS NOT NULL`.

**Note on avatar URLs:** Google profile picture URLs are stored as-is and may expire. Accepted as known limitation.

### `submissions` table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK default `gen_random_uuid()` | |
| `original_name` | text | |
| `storage_key` | text | **full path**, e.g. `submissions/uuid.rar` |
| `format` | text | `zip` / `7z` / `rar` |
| `size` | bigint | bytes |
| `sha256` | text | |
| `submitted_at` | timestamptz default `now()` | |
| `submitter_id` | uuid | Supabase Auth user id |
| `submitter_name` | text | |
| `submitter_avatar` | text | Google profile picture URL at submission time |
| `status` | text default `'pending'` | `pending` / `approved` / `rejected` |
| `rejection_reason` | text nullable | |
| `reviewed_at` | timestamptz nullable | |

### TypeScript types

`MapEntry` updated — `r2Key` renamed to `storageKey`:

```ts
export interface MapEntry {
  id: string
  originalName: string
  storageKey: string        // renamed from r2Key; full storage path e.g. "archives/uuid.zip"
  format: 'zip' | '7z' | 'rar'
  size: number
  sha256: string
  uploadedAt: string
  uploader?: {
    id: string
    name: string
    avatar: string
  }
}
```

New `Submission` type:

```ts
export interface Submission {
  id: string
  originalName: string
  storageKey: string        // full path e.g. "submissions/uuid.zip"
  format: 'zip' | '7z' | 'rar'
  size: number
  sha256: string
  submittedAt: string
  submitterId: string
  submitterName: string
  submitterAvatar: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason: string | null
  reviewedAt: string | null
}
```

---

## 3. Storage Layout

```
Supabase Storage bucket (cs-maps)
├── archives/          ← approved maps (existing)
│   └── {uuid}.{ext}
└── submissions/       ← pending community uploads (new)
    └── {uuid}.{ext}
```

`storage_key` in both tables stores the **full path including prefix**, e.g. `submissions/abc123.zip`. All `getObject` / `putObject` / `deleteObject` calls receive this full path as the key — no prefix is prepended at call time.

**Approve file move:** Supabase Storage has no native server-side copy. The approve route:
1. Downloads binary via `getObjectBuffer(submission.storageKey)` — full path, no prefix added
2. Converts to `Buffer`: `Buffer.from(new Uint8Array(arrayBuffer))`
3. Uploads to `archives/{newUuid}.{ext}` via existing `putObject`
4. Deletes the submission file via `deleteObject(submission.storageKey)`

**Rejection:** File deleted from storage immediately via `deleteObject(submission.storageKey)`.

---

## 4. API Routes

### Removed
- `POST /api/auth`

### New auth route
- `GET /api/auth/callback` — see OAuth callback in §1

### Modified
- `POST /api/upload` — auth changed to admin Google account check (`isAdmin`). Dedup unchanged: checks `maps` table only. File goes to `archives/`, row inserted with `uploader_id = null`.
- `GET /api/maps` — reads from `maps` table. Cache-Control unchanged.
- `DELETE /api/delete/[id]` — auth changed to admin Google account check.
- `GET /api/download/[id]` — unchanged.

### New

**`POST /api/submit`** — community upload
- Verifies signed-in non-admin Google session
- Same validation: format (.zip/.7z/.rar), size max **20 MB**, archive structure (must contain `.bsp`)
- SHA-256 dedup: reject if hash exists in `maps` table OR in `submissions` table with `status = 'pending'`. A rejected submission with the same hash **may** be resubmitted.
- Stores file under `submissions/{uuid}.{ext}`; `storage_key` column stores the full path
- Inserts row into `submissions` with `status: 'pending'`

**`GET /api/submissions/mine`**
- Requires signed-in session (any Google account)
- Returns all submissions by the calling user, all statuses, ordered by `submitted_at` desc

**`GET /api/admin/submissions`**
- Admin only
- Optional `?status=pending|approved|rejected`; defaults to `pending`
- Returns matching rows ordered by `submitted_at` asc

**`GET /api/admin/submissions/[id]/preview`**
- Admin only
- Downloads submission file via `getObjectBuffer(submission.storageKey)`
- Calls `listArchivePaths(buffer, format)` (see §6) to get file paths
- Returns `{ structure: ArchiveStructure, bspFiles: string[] }`

**`POST /api/admin/submissions/[id]/approve`**
- Admin only
- Returns 409 if `status !== 'pending'`
- Downloads binary from `submission.storageKey` via `getObjectBuffer`
- Converts to `Buffer`, uploads to `archives/{newUuid}.{ext}` via `putObject`
- Inserts into `maps` with submitter's id/name/avatar as uploader fields
- Updates submission `status = 'approved'`, `reviewed_at = now()`
- Deletes file at `submission.storageKey`

**`POST /api/admin/submissions/[id]/reject`**
- Admin only
- Body: `{ reason: string }` (required, non-empty)
- Returns 409 if `status !== 'pending'`
- Updates `status = 'rejected'`, `rejection_reason`, `reviewed_at = now()`
- Deletes file at `submission.storageKey`

---

## 5. UI Changes

### Public page (`/`)
**Header:**
- Signed out: "Sign in with Google" button (top-right)
- Signed in (community): Google avatar + name, "Submit a Map" button, "My Submissions" link
- Signed in (admin): Google avatar + name, "Admin" link

**Map list:**
- Community-uploaded maps (`uploader` field present) show uploader avatar + name on the card
- Admin-uploaded maps show no uploader info

### Community submissions page (`/submissions`)
Protected by proxy. Lists the signed-in user's submissions:
- File name, format, size, submitted date
- Status badge: **Pending** (yellow) / **Approved** (green) / **Rejected** (red)
- Rejection reason shown inline for rejected items

### Admin page (`/admin`)
Password login form removed. Proxy ensures a session exists. Page checks `isAdmin`; shows "Access denied" for non-admin accounts.

**Pending Queue section** (above upload form, only when pending submissions exist):
- Each item: uploader avatar + name, file name, format, size, submitted date
- Archive preview loaded on demand via `GET /api/admin/submissions/[id]/preview` (lazy — shown when admin expands the item): structure label + `.bsp` file names
- **Approve** button (disabled after click)
- **Reject** button → inline textarea for rejection reason → confirm

**Existing sections unchanged:** direct upload form, map list with delete buttons.

---

## 6. Lib Changes

- `src/lib/auth.ts` — rewritten. Exports `createAuthClient`, `getSessionUser`, `isAdmin`. Removes password/JWT logic.
- `src/lib/r2.ts` → `src/lib/storage.ts` — renamed. Existing `getObject`, `putObject`, `deleteObject`, `getPresignedUrl` retained. **New export:** `getObjectBuffer(key: string): Promise<ArrayBuffer | null>` — downloads object and returns raw binary via `data.arrayBuffer()` instead of `data.text()`. Used by approve route and preview route. `putObject` signature unchanged — callers convert `ArrayBuffer` to `Buffer` before calling: `Buffer.from(new Uint8Array(buf))`.
- `src/lib/maps-store.ts` — rewritten to query/insert/delete from `maps` Supabase table.
- `src/lib/submissions-store.ts` — new. CRUD helpers for `submissions` table.
- `src/lib/validate-archive.ts` — add new **exported** function:
  ```ts
  export async function listArchivePaths(buffer: ArrayBuffer, format: 'zip' | '7z' | 'rar'): Promise<string[]>
  ```
  Extracts and returns the raw file path list from the archive (consolidating the existing unexported `listZipPaths`, `listSevenZPaths`, `listRarPaths`). Used by the preview route. `validateMapArchive` is refactored internally to call `listArchivePaths`.
- `src/proxy.ts` — new (replaces the old `src/middleware.ts` convention). Uses `@supabase/ssr`, protects `/admin` and `/submissions` paths.

---

## 7. Migration

### Step 1 — Install dependency
```
npm install @supabase/ssr
```

### Step 2 — Create tables (SQL)
```sql
create table maps (
  id uuid primary key default gen_random_uuid(),
  original_name text not null,
  storage_key text not null,
  format text not null,
  size bigint not null,
  sha256 text not null,
  uploaded_at timestamptz not null default now(),
  uploader_id uuid,
  uploader_name text,
  uploader_avatar text
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  original_name text not null,
  storage_key text not null,
  format text not null,
  size bigint not null,
  sha256 text not null,
  submitted_at timestamptz not null default now(),
  submitter_id uuid not null,
  submitter_name text not null,
  submitter_avatar text not null,
  status text not null default 'pending',
  rejection_reason text,
  reviewed_at timestamptz
);
```

### Step 3 — Seed `maps` table
One-time script `scripts/migrate-maps.ts` (run with `npx ts-node scripts/migrate-maps.ts`):
1. Downloads `maps.json` via `getObject('maps.json')`
2. Parses each entry (old `r2Key` field name)
3. Inserts a row per entry into `maps` table with `uploader_id = null` and `storage_key = entry.r2Key`

### Step 4 — Verify and delete `maps.json`
Confirm row count matches, then delete `maps.json` from storage.

### Step 5 — Env updates
Remove `ADMIN_PASSWORD_HASH`, `JWT_SECRET`. Add `ADMIN_GOOGLE_EMAIL`, `NEXT_PUBLIC_SUPABASE_URL` (same value as `SUPABASE_URL`), `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Step 6 — Configure Google OAuth in Supabase
Enable Google provider in Supabase Auth dashboard. Add authorised redirect URI: `{SITE_URL}/auth/callback`.

---

## 8. Out of Scope

- Email notifications
- Multiple admin accounts
- Community users withdrawing or editing submissions
- Rate limiting community uploads
- Avatar image proxying (broken/expired avatar URLs accepted as known limitation)
