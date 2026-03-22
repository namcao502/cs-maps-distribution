# Community Uploads + Google Auth Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace password-based admin auth with Google OAuth via Supabase Auth, add a community map submission flow with admin approval, and display community uploaders on the public map list.

**Architecture:** Supabase Auth handles all authentication (Google OAuth). One designated Google account (`ADMIN_GOOGLE_EMAIL`) is admin. Maps metadata migrates from a `maps.json` file in Supabase Storage to a `maps` Supabase table. A new `submissions` table holds pending community uploads awaiting admin review.

**Tech Stack:** Next.js 16, Supabase JS (`@supabase/supabase-js` + `@supabase/ssr`), Tailwind CSS, Jest + ts-jest

---

## File Map

### New files
| File | Purpose |
|---|---|
| `src/proxy.ts` | Next.js 16 proxy (replaces `middleware.ts`) — session guard for `/admin` and `/submissions` |
| `src/app/auth/callback/route.ts` | OAuth code → session exchange |
| `src/app/submissions/page.tsx` | Community user's submission history page |
| `src/app/api/submit/route.ts` | Community upload endpoint |
| `src/app/api/submissions/mine/route.ts` | Returns calling user's submissions |
| `src/app/api/admin/submissions/route.ts` | Lists all submissions for admin (filterable by status) |
| `src/app/api/admin/submissions/[id]/preview/route.ts` | Returns archive structure + .bsp filenames |
| `src/app/api/admin/submissions/[id]/approve/route.ts` | Moves file to archives, inserts into maps table |
| `src/app/api/admin/submissions/[id]/reject/route.ts` | Stores rejection reason, deletes file |
| `src/lib/submissions-store.ts` | CRUD for `submissions` Supabase table |
| `src/types/submission.ts` | `Submission` TypeScript interface |
| `src/components/AuthButton.tsx` | Sign-in/out + user display in header |
| `src/components/PendingQueue.tsx` | Admin pending submissions queue UI |
| `src/components/MySubmissions.tsx` | Community user's submission list |
| `src/components/SubmitForm.tsx` | Community upload form (clone of UploadForm, posts to /api/submit) |
| `scripts/migrate-maps.ts` | One-time: seeds `maps` table from `maps.json` |
| `tests/lib/submissions-store.test.ts` | Unit tests for submissions-store |

### Modified files
| File | Change |
|---|---|
| `src/types/map.ts` | Rename `r2Key` → `storageKey`, add optional `uploader` field |
| `src/lib/r2.ts` → `src/lib/storage.ts` | Rename file; add `getObjectBuffer` export |
| `src/lib/auth.ts` | Complete rewrite: Supabase Auth helpers |
| `src/lib/maps-store.ts` | Rewrite: reads/writes `maps` Supabase table |
| `src/lib/validate-archive.ts` | Export `listArchivePaths` |
| `src/app/api/upload/route.ts` | Auth: admin cookie → `isAdmin(getSessionUser())` |
| `src/app/api/delete/[id]/route.ts` | Same auth change |
| `src/app/api/maps/route.ts` | Read from `maps` table |
| `src/app/api/download/[id]/route.ts` | Update `r2Key` → `storageKey` reference |
| `src/app/admin/page.tsx` | Remove password form; add `PendingQueue` |
| `src/app/page.tsx` | Add `AuthButton` to header |
| `src/components/MapCard.tsx` | Show uploader avatar + name when present |
| `src/components/AdminMapList.tsx` | Update `r2Key` → `storageKey` if referenced |
| `tests/lib/auth.test.ts` | Replace password/JWT tests with `isAdmin` test |
| `tests/lib/maps-store.test.ts` | Update to mock Supabase client, use `storageKey` |
| `.env.local` | Add `ADMIN_GOOGLE_EMAIL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `package.json` | Add `@supabase/ssr` |

---

## Task 1: Install @supabase/ssr and update env vars

**Files:**
- Modify: `package.json`
- Modify: `.env.local`

- [ ] **Step 1: Install the package**

```bash
cd c:/MDP/CS-map-distribution
npm install @supabase/ssr
```

Expected: `@supabase/ssr` appears in `package.json` dependencies.

- [ ] **Step 2: Add env vars to .env.local**

Add these lines (keep `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — they are still used by the service role client):

```
ADMIN_GOOGLE_EMAIL=your-admin@gmail.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ADMIN_EMAIL=your-admin@gmail.com
```

`NEXT_PUBLIC_SUPABASE_URL` is the same value as `SUPABASE_URL`. Both coexist: the public one is used by `@supabase/ssr` (client-accessible), the private one by the service role client. `NEXT_PUBLIC_ADMIN_EMAIL` is the same value as `ADMIN_GOOGLE_EMAIL` and is used by the client-side admin page to gate the UI (server-side API routes enforce security independently via `isAdmin`).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.local
git commit -m "chore: install @supabase/ssr and add Google auth env vars"
```

---

## Task 2: Update TypeScript types

**Files:**
- Modify: `src/types/map.ts`
- Create: `src/types/submission.ts`

- [ ] **Step 1: Update MapEntry — rename r2Key to storageKey, add uploader**

Replace the contents of `src/types/map.ts`:

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

- [ ] **Step 2: Create Submission type**

Create `src/types/submission.ts`:

```ts
export interface Submission {
  id: string
  originalName: string
  storageKey: string
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

- [ ] **Step 3: Fix the TypeScript compile error in tests/lib/maps-store.test.ts**

Change `r2Key: 'archives/test-uuid-1.zip'` to `storageKey: 'archives/test-uuid-1.zip'` in the `sampleMap` fixture. Also update mock path `'@/lib/r2'` → `'@/lib/storage'` (we rename the file in Task 3, but fix the test reference now so it's ready).

- [ ] **Step 4: Commit**

```bash
git add src/types/map.ts src/types/submission.ts tests/lib/maps-store.test.ts
git commit -m "feat: update MapEntry type (r2Key→storageKey) and add Submission type"
```

---

## Task 3: Rename r2.ts → storage.ts and add getObjectBuffer

**Files:**
- Rename: `src/lib/r2.ts` → `src/lib/storage.ts`

- [ ] **Step 1: Read the current r2.ts to understand its exports**

Read `src/lib/r2.ts` — note `getObject`, `putObject`, `deleteObject`, `getPresignedUrl`.

- [ ] **Step 2: Create src/lib/storage.ts with all existing exports plus getObjectBuffer**

Create `src/lib/storage.ts` — copy the existing contents of `r2.ts` verbatim, then add:

```ts
/** Downloads an object as raw binary. Returns null if not found. */
export async function getObjectBuffer(key: string): Promise<ArrayBuffer | null> {
  const { data, error } = await supabase.storage.from(BUCKET).download(key)
  if (error || !data) return null
  return data.arrayBuffer()
}
```

- [ ] **Step 3: Delete src/lib/r2.ts**

```bash
rm src/lib/r2.ts
```

- [ ] **Step 4: Update all imports of @/lib/r2 to @/lib/storage**

Files to update (search for `from '@/lib/r2'`):
- `src/lib/maps-store.ts`
- `src/app/api/upload/route.ts`
- `src/app/api/download/[id]/route.ts`
- `src/app/api/delete/[id]/route.ts`
- `tests/lib/maps-store.test.ts` (already done in Task 2)

```bash
cd c:/MDP/CS-map-distribution
grep -r "from '@/lib/r2'" src/ --include="*.ts" -l
```

Update each file: change `'@/lib/r2'` → `'@/lib/storage'`.

- [ ] **Step 5: Run the test suite to confirm nothing is broken**

```bash
npm test
```

Expected: all existing tests pass (maps-store tests will fail until Task 7 — that is expected).

- [ ] **Step 6: Commit**

```bash
git add src/lib/storage.ts src/lib/maps-store.ts src/app/api/upload/route.ts src/app/api/download src/app/api/delete
git commit -m "feat: rename r2.ts to storage.ts and add getObjectBuffer"
```

---

## Task 4: Export listArchivePaths from validate-archive.ts

**Files:**
- Modify: `src/lib/validate-archive.ts`

- [ ] **Step 1: Read validate-archive.ts to locate the internal list functions**

The file has unexported `listZipPaths`, `listSevenZPaths`, `listRarPaths`. These need to be exposed through a single exported function.

- [ ] **Step 2: Add exported listArchivePaths function**

After the three unexported list functions, add:

```ts
/**
 * Returns the list of file paths inside the archive without full extraction.
 * Throws if the archive cannot be read.
 */
export async function listArchivePaths(
  buffer: ArrayBuffer,
  format: 'zip' | '7z' | 'rar',
): Promise<string[]> {
  if (format === 'zip') return listZipPaths(buffer)
  if (format === '7z') return listSevenZPaths(buffer)
  return listRarPaths(buffer)
}
```

Also refactor `validateMapArchive` to call `listArchivePaths` internally instead of duplicating the dispatch:

```ts
export async function validateMapArchive(
  buffer: ArrayBuffer,
  format: 'zip' | '7z' | 'rar',
): Promise<string | null> {
  let paths: string[]
  try {
    paths = await listArchivePaths(buffer, format)
  } catch {
    return 'Could not read archive contents. The file may be corrupted.'
  }
  const structure = detectStructure(paths)
  if (structure === 'unknown') {
    return 'Archive does not appear to contain a CS 1.6 map (no .bsp file or recognised folder structure found).'
  }
  return null
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/validate-archive.ts
git commit -m "feat: export listArchivePaths from validate-archive"
```

---

## Task 5: Rewrite auth.ts + update auth tests

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `tests/lib/auth.test.ts`

- [ ] **Step 1: Write the new failing test first**

Replace `tests/lib/auth.test.ts`:

```ts
import { isAdmin } from '@/lib/auth'

// Mock next/headers and @supabase/ssr — not needed for isAdmin which is a pure function
describe('isAdmin', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, ADMIN_GOOGLE_EMAIL: 'admin@example.com' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns true when user email matches ADMIN_GOOGLE_EMAIL', () => {
    expect(isAdmin({ email: 'admin@example.com' } as any)).toBe(true)
  })

  it('returns false when user email does not match', () => {
    expect(isAdmin({ email: 'other@example.com' } as any)).toBe(false)
  })

  it('returns false when user has no email', () => {
    expect(isAdmin({ email: undefined } as any)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL (isAdmin not yet exported)**

```bash
npm test -- tests/lib/auth.test.ts
```

Expected: FAIL — `isAdmin is not a function` or similar.

- [ ] **Step 3: Rewrite src/lib/auth.ts**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export function createAuthClient(cookieStore: ReadonlyRequestCookies): SupabaseClient {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // cookieStore.set may throw in read-only contexts (e.g. Server Components);
            // that is fine — session refresh happens in the proxy
            try { cookieStore.set(name, value, options) } catch { /* ignore */ }
          })
        },
      },
    },
  )
}

/** Returns the signed-in Supabase user, or null if no session. */
export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const supabase = createAuthClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** Returns true if the user is the designated admin account. */
export function isAdmin(user: User): boolean {
  return !!user.email && user.email === process.env.ADMIN_GOOGLE_EMAIL
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- tests/lib/auth.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts tests/lib/auth.test.ts
git commit -m "feat: rewrite auth.ts for Supabase OAuth, add isAdmin helper"
```

---

## Task 6: Create Supabase tables

**Files:** (no code files — SQL run in Supabase dashboard)

- [ ] **Step 1: Run the following SQL in the Supabase SQL editor**

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

- [ ] **Step 2: Verify tables exist**

In the Supabase Table Editor, confirm both `maps` and `submissions` tables appear with correct columns.

---

## Task 7: Rewrite maps-store.ts + update tests

**Files:**
- Modify: `src/lib/maps-store.ts`
- Modify: `tests/lib/maps-store.test.ts`

- [ ] **Step 1: Write the new failing tests**

Replace `tests/lib/maps-store.test.ts`:

```ts
import { getMaps, addMap, removeMap } from '@/lib/maps-store'
import type { MapEntry } from '@/types/map'

// Mock the Supabase client used inside maps-store
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockDelete = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()
const mockFrom = jest.fn()

const mockSupabase = {
  from: mockFrom,
}

const sampleRow = {
  id: 'test-uuid-1',
  original_name: 'de_dust2',
  storage_key: 'archives/test-uuid-1.zip',
  format: 'zip',
  size: 1000,
  sha256: 'abc123',
  uploaded_at: '2026-03-22T12:00:00Z',
  uploader_id: null,
  uploader_name: null,
  uploader_avatar: null,
}

const sampleMap: MapEntry = {
  id: 'test-uuid-1',
  originalName: 'de_dust2',
  storageKey: 'archives/test-uuid-1.zip',
  format: 'zip',
  size: 1000,
  sha256: 'abc123',
  uploadedAt: '2026-03-22T12:00:00Z',
}

beforeEach(() => {
  jest.clearAllMocks()
  // Default chain for select queries
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockSelect.mockReturnValue({ order: mockOrder })
  mockEq.mockResolvedValue({ error: null })
  mockInsert.mockResolvedValue({ error: null })
  mockDelete.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  })
})

describe('getMaps', () => {
  it('returns empty array when table is empty', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    expect(await getMaps()).toEqual([])
  })

  it('maps snake_case row to camelCase MapEntry', async () => {
    mockOrder.mockResolvedValue({ data: [sampleRow], error: null })
    const maps = await getMaps()
    expect(maps[0]).toEqual(sampleMap)
  })

  it('populates uploader field when uploader_id is present', async () => {
    const rowWithUploader = {
      ...sampleRow,
      uploader_id: 'user-1',
      uploader_name: 'Alice',
      uploader_avatar: 'https://example.com/avatar.jpg',
    }
    mockOrder.mockResolvedValue({ data: [rowWithUploader], error: null })
    const maps = await getMaps()
    expect(maps[0].uploader).toEqual({ id: 'user-1', name: 'Alice', avatar: 'https://example.com/avatar.jpg' })
  })
})

describe('addMap', () => {
  it('inserts a row with correct snake_case fields', async () => {
    await addMap(sampleMap)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'test-uuid-1',
      original_name: 'de_dust2',
      storage_key: 'archives/test-uuid-1.zip',
      uploader_id: null,
    }))
  })
})

describe('removeMap', () => {
  it('deletes by id', async () => {
    await removeMap('test-uuid-1')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 'test-uuid-1')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- tests/lib/maps-store.test.ts
```

Expected: FAIL — current maps-store reads from maps.json, not Supabase table.

- [ ] **Step 3: Rewrite src/lib/maps-store.ts**

```ts
import { createClient } from '@supabase/supabase-js'
import type { MapEntry } from '@/types/map'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function rowToMapEntry(row: Record<string, unknown>): MapEntry {
  return {
    id: row.id as string,
    originalName: row.original_name as string,
    storageKey: row.storage_key as string,
    format: row.format as 'zip' | '7z' | 'rar',
    size: row.size as number,
    sha256: row.sha256 as string,
    uploadedAt: row.uploaded_at as string,
    uploader: row.uploader_id
      ? {
          id: row.uploader_id as string,
          name: row.uploader_name as string,
          avatar: row.uploader_avatar as string,
        }
      : undefined,
  }
}

export async function getMaps(): Promise<MapEntry[]> {
  const { data, error } = await supabase
    .from('maps')
    .select('*')
    .order('uploaded_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToMapEntry)
}

export async function addMap(entry: MapEntry): Promise<void> {
  const { error } = await supabase.from('maps').insert({
    id: entry.id,
    original_name: entry.originalName,
    storage_key: entry.storageKey,
    format: entry.format,
    size: entry.size,
    sha256: entry.sha256,
    uploaded_at: entry.uploadedAt,
    uploader_id: entry.uploader?.id ?? null,
    uploader_name: entry.uploader?.name ?? null,
    uploader_avatar: entry.uploader?.avatar ?? null,
  })
  if (error) throw error
}

export async function removeMap(id: string): Promise<void> {
  const { error } = await supabase.from('maps').delete().eq('id', id)
  if (error) throw error
}

export async function getMaps_sha256s(): Promise<string[]> {
  const { data, error } = await supabase.from('maps').select('sha256')
  if (error) throw error
  return (data ?? []).map(r => r.sha256 as string)
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- tests/lib/maps-store.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/maps-store.ts tests/lib/maps-store.test.ts
git commit -m "feat: rewrite maps-store to use Supabase table"
```

---

## Task 8: Create submissions-store.ts + tests

**Files:**
- Create: `src/lib/submissions-store.ts`
- Create: `tests/lib/submissions-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/submissions-store.test.ts`:

```ts
import {
  addSubmission,
  getSubmissionsByUser,
  getSubmissionById,
  getSubmissions,
  approveSubmission,
  rejectSubmission,
  hasPendingSubmissionBySha256,
} from '@/lib/submissions-store'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

const mockSingle = jest.fn()
const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()
const mockFrom = jest.fn()

const mockSupabase = { from: mockFrom }

const sampleRow = {
  id: 'sub-1',
  original_name: 'de_dust3',
  storage_key: 'submissions/sub-1.zip',
  format: 'zip',
  size: 2000,
  sha256: 'def456',
  submitted_at: '2026-03-22T12:00:00Z',
  submitter_id: 'user-1',
  submitter_name: 'Alice',
  submitter_avatar: 'https://example.com/avatar.jpg',
  status: 'pending',
  rejection_reason: null,
  reviewed_at: null,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockEq.mockResolvedValue({ error: null })
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockSingle.mockResolvedValue({ data: sampleRow, error: null })
  mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq, single: mockSingle })
  mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })
})

describe('addSubmission', () => {
  it('inserts and returns the new submission', async () => {
    mockSingle.mockResolvedValue({ data: sampleRow, error: null })
    const result = await addSubmission({
      originalName: 'de_dust3',
      storageKey: 'submissions/sub-1.zip',
      format: 'zip',
      size: 2000,
      sha256: 'def456',
      submitterId: 'user-1',
      submitterName: 'Alice',
      submitterAvatar: 'https://example.com/avatar.jpg',
    })
    expect(result.id).toBe('sub-1')
    expect(result.status).toBe('pending')
  })
})

describe('getSubmissionsByUser', () => {
  it('filters by submitter_id', async () => {
    mockOrder.mockResolvedValue({ data: [sampleRow], error: null })
    const results = await getSubmissionsByUser('user-1')
    expect(results).toHaveLength(1)
    expect(results[0].submitterId).toBe('user-1')
  })
})

describe('approveSubmission', () => {
  it('calls update with status approved', async () => {
    await approveSubmission('sub-1')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }))
  })
})

describe('rejectSubmission', () => {
  it('calls update with status rejected and reason', async () => {
    await rejectSubmission('sub-1', 'Not a valid map')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'rejected',
      rejection_reason: 'Not a valid map',
    }))
  })
})

describe('hasPendingSubmissionBySha256', () => {
  it('returns true when a pending submission matches', async () => {
    const mockHead = jest.fn().mockResolvedValue({ count: 1, error: null })
    mockFrom.mockReturnValue({ select: () => ({ eq: () => ({ eq: mockHead }) }) })
    const result = await hasPendingSubmissionBySha256('def456')
    expect(result).toBe(true)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- tests/lib/submissions-store.test.ts
```

- [ ] **Step 3: Create src/lib/submissions-store.ts**

```ts
import { createClient } from '@supabase/supabase-js'
import type { Submission } from '@/types/submission'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function rowToSubmission(row: Record<string, unknown>): Submission {
  return {
    id: row.id as string,
    originalName: row.original_name as string,
    storageKey: row.storage_key as string,
    format: row.format as 'zip' | '7z' | 'rar',
    size: row.size as number,
    sha256: row.sha256 as string,
    submittedAt: row.submitted_at as string,
    submitterId: row.submitter_id as string,
    submitterName: row.submitter_name as string,
    submitterAvatar: row.submitter_avatar as string,
    status: row.status as 'pending' | 'approved' | 'rejected',
    rejectionReason: row.rejection_reason as string | null,
    reviewedAt: row.reviewed_at as string | null,
  }
}

type NewSubmission = Pick<Submission, 'originalName' | 'storageKey' | 'format' | 'size' | 'sha256' | 'submitterId' | 'submitterName' | 'submitterAvatar'>

export async function addSubmission(sub: NewSubmission): Promise<Submission> {
  const { data, error } = await supabase.from('submissions').insert({
    original_name: sub.originalName,
    storage_key: sub.storageKey,
    format: sub.format,
    size: sub.size,
    sha256: sub.sha256,
    submitter_id: sub.submitterId,
    submitter_name: sub.submitterName,
    submitter_avatar: sub.submitterAvatar,
  }).select().single()
  if (error) throw error
  return rowToSubmission(data)
}

export async function getSubmissionsByUser(userId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('submitter_id', userId)
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToSubmission)
}

export async function getSubmissions(status?: string): Promise<Submission[]> {
  let query = supabase.from('submissions').select('*').order('submitted_at', { ascending: true })
  if (status) query = (query as any).eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(rowToSubmission)
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  const { data, error } = await supabase.from('submissions').select('*').eq('id', id).single()
  if (error) return null
  return rowToSubmission(data)
}

export async function approveSubmission(id: string): Promise<void> {
  const { error } = await supabase.from('submissions').update({
    status: 'approved',
    reviewed_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) throw error
}

export async function rejectSubmission(id: string, reason: string): Promise<void> {
  const { error } = await supabase.from('submissions').update({
    status: 'rejected',
    rejection_reason: reason,
    reviewed_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) throw error
}

export async function hasPendingSubmissionBySha256(sha256: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('sha256', sha256)
    .eq('status', 'pending')
  if (error) throw error
  return (count ?? 0) > 0
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- tests/lib/submissions-store.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/submissions-store.ts tests/lib/submissions-store.test.ts src/types/submission.ts
git commit -m "feat: add submissions-store and Submission type"
```

---

## Task 9: OAuth callback route + Proxy

**Files:**
- Create: `src/app/auth/callback/route.ts`
- Create: `src/proxy.ts`

- [ ] **Step 1: Create the OAuth callback route**

Create `src/app/auth/callback/route.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/?error=auth', request.url))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/?error=auth', request.url))
  }

  return NextResponse.redirect(new URL('/', request.url))
}
```

- [ ] **Step 2: Create src/proxy.ts**

Next.js 16 uses `proxy.ts` (renamed from `middleware.ts`). Create `src/proxy.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  // getUser() also refreshes the session — required to prevent silent auth failures
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/submissions/:path*'],
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/callback/route.ts src/proxy.ts
git commit -m "feat: add OAuth callback route and proxy for session-protected paths"
```

---

## Task 10: Update existing API routes to use new auth

**Files:**
- Modify: `src/app/api/upload/route.ts`
- Modify: `src/app/api/delete/[id]/route.ts`
- Modify: `src/app/api/maps/route.ts`
- Modify: `src/app/api/download/[id]/route.ts`

- [ ] **Step 1: Update /api/upload — replace cookie/JWT auth with getSessionUser + isAdmin**

In `src/app/api/upload/route.ts`:
- Remove: `import { verifyAdminCookie, COOKIE_NAME } from '@/lib/auth'`
- Add: `import { getSessionUser, isAdmin } from '@/lib/auth'`
- Replace the cookie verification block:

```ts
// Old:
const cookie = req.cookies.get(COOKIE_NAME)?.value
if (!(await verifyAdminCookie(cookie))) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// New:
const user = await getSessionUser()
if (!user || !isAdmin(user)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

- Update `addMap` call: change `r2Key` → `storageKey` in the object passed to `addMap`.

- [ ] **Step 2: Update /api/delete/[id] — same auth change**

Apply the same auth replacement pattern. Also update any `r2Key` → `storageKey` references and `'@/lib/r2'` → `'@/lib/storage'`.

- [ ] **Step 3: Update /api/maps — read from table**

The route just calls `getMaps()` which now reads from Supabase table — no changes to the route logic needed. Confirm the import is `from '@/lib/maps-store'` (unchanged).

- [ ] **Step 4: Update /api/download/[id] — fix r2Key reference**

Read `src/app/api/download/[id]/route.ts`. If it references `map.r2Key`, change to `map.storageKey`.

- [ ] **Step 5: Run build to catch type errors**

```bash
npm run build 2>&1 | head -40
```

Fix any remaining `r2Key` TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/upload/route.ts src/app/api/delete src/app/api/maps/route.ts src/app/api/download
git commit -m "feat: update API routes to use Supabase Auth and new storageKey field"
```

---

## Task 11: Community submit API route

**Files:**
- Create: `src/app/api/submit/route.ts`

- [ ] **Step 1: Create /api/submit**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getSessionUser, isAdmin } from '@/lib/auth'
import { putObject } from '@/lib/storage'
import { getMaps_sha256s, getMaps } from '@/lib/maps-store'
import { addSubmission, hasPendingSubmissionBySha256 } from '@/lib/submissions-store'
import { computeSHA256 } from '@/lib/hash'
import { validateMapArchive } from '@/lib/validate-archive'

const MAX_SIZE = 20 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['zip', '7z', 'rar'])

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  if (isAdmin(user)) return NextResponse.json({ error: 'Admins use the admin upload form' }, { status: 403 })

  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: 'Unsupported format. Use .zip, .7z, or .rar' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  if (buffer.byteLength > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })

  const structureError = await validateMapArchive(buffer, ext as 'zip' | '7z' | 'rar')
  if (structureError) return NextResponse.json({ error: structureError }, { status: 422 })

  const sha256 = await computeSHA256(buffer)

  // Dedup: check approved maps table
  const sha256s = await getMaps_sha256s()
  if (sha256s.includes(sha256)) {
    return NextResponse.json({ error: 'This map is already in the library' }, { status: 409 })
  }
  // Dedup: check pending submissions
  if (await hasPendingSubmissionBySha256(sha256)) {
    return NextResponse.json({ error: 'This map is already pending review' }, { status: 409 })
  }

  const id = uuidv4()
  const storageKey = `submissions/${id}.${ext}`
  const originalName = file.name.replace(/\.[^.]+$/, '')

  await putObject(storageKey, Buffer.from(new Uint8Array(buffer)))

  await addSubmission({
    originalName,
    storageKey,
    format: ext as 'zip' | '7z' | 'rar',
    size: buffer.byteLength,
    sha256,
    submitterId: user.id,
    submitterName: user.user_metadata?.full_name ?? user.email ?? 'Unknown',
    submitterAvatar: user.user_metadata?.avatar_url ?? '',
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/submit/route.ts
git commit -m "feat: add /api/submit community upload route"
```

---

## Task 12: Admin submission API routes

**Files:**
- Create: `src/app/api/submissions/mine/route.ts`
- Create: `src/app/api/admin/submissions/route.ts`
- Create: `src/app/api/admin/submissions/[id]/preview/route.ts`
- Create: `src/app/api/admin/submissions/[id]/approve/route.ts`
- Create: `src/app/api/admin/submissions/[id]/reject/route.ts`

- [ ] **Step 1: Create /api/submissions/mine**

```ts
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getSubmissionsByUser } from '@/lib/submissions-store'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const submissions = await getSubmissionsByUser(user.id)
  return NextResponse.json(submissions)
}
```

- [ ] **Step 2: Create /api/admin/submissions**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth'
import { getSubmissions } from '@/lib/submissions-store'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const status = new URL(req.url).searchParams.get('status') ?? 'pending'
  return NextResponse.json(await getSubmissions(status))
}
```

- [ ] **Step 3: Create /api/admin/submissions/[id]/preview**

Before writing this file, confirm `detectStructure` is exported from `src/lib/extractors/detect.ts`:
```bash
grep "export function detectStructure" src/lib/extractors/detect.ts
```
Expected: one match. If not found, check the actual export name before proceeding.

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth'
import { getSubmissionById } from '@/lib/submissions-store'
import { getObjectBuffer } from '@/lib/storage'
import { listArchivePaths } from '@/lib/validate-archive'
import { detectStructure } from '@/lib/extractors/detect'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const submission = await getSubmissionById(params.id)
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buffer = await getObjectBuffer(submission.storageKey)
  if (!buffer) return NextResponse.json({ error: 'File not found in storage' }, { status: 404 })

  const paths = await listArchivePaths(buffer, submission.format)
  const structure = detectStructure(paths)
  const bspFiles = paths.filter(p => p.toLowerCase().endsWith('.bsp'))

  return NextResponse.json({ structure, bspFiles })
}
```

- [ ] **Step 4: Create /api/admin/submissions/[id]/approve**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getSessionUser, isAdmin } from '@/lib/auth'
import { getSubmissionById, approveSubmission } from '@/lib/submissions-store'
import { addMap } from '@/lib/maps-store'
import { getObjectBuffer, putObject, deleteObject } from '@/lib/storage'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const submission = await getSubmissionById(params.id)
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.status !== 'pending') return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })

  // Download from submissions/
  const buffer = await getObjectBuffer(submission.storageKey)
  if (!buffer) return NextResponse.json({ error: 'File missing from storage' }, { status: 404 })

  // Upload to archives/
  const newId = uuidv4()
  const newKey = `archives/${newId}.${submission.format}`
  await putObject(newKey, Buffer.from(new Uint8Array(buffer)))

  // Insert into maps table
  await addMap({
    id: newId,
    originalName: submission.originalName,
    storageKey: newKey,
    format: submission.format,
    size: submission.size,
    sha256: submission.sha256,
    uploadedAt: new Date().toISOString(),
    uploader: {
      id: submission.submitterId,
      name: submission.submitterName,
      avatar: submission.submitterAvatar,
    },
  })

  // Update submission status
  await approveSubmission(submission.id)

  // Delete from submissions/
  await deleteObject(submission.storageKey)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Create /api/admin/submissions/[id]/reject**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth'
import { getSubmissionById, rejectSubmission } from '@/lib/submissions-store'
import { deleteObject } from '@/lib/storage'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const reason = (body?.reason ?? '').trim()
  if (!reason) return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })

  const submission = await getSubmissionById(params.id)
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.status !== 'pending') return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })

  await rejectSubmission(submission.id, reason)
  await deleteObject(submission.storageKey)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/submissions src/app/api/admin
git commit -m "feat: add submission and admin review API routes"
```

---

## Task 13: AuthButton component

**Files:**
- Create: `src/components/AuthButton.tsx`

- [ ] **Step 1: Create AuthButton**

This component runs on the client. It calls a small server action or API for sign-out, and uses Supabase Auth client-side SDK for sign-in.

```tsx
'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export function AuthButton({ adminEmail }: { adminEmail: string }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signIn() {
    const supabase = getSupabase()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  async function signOut() {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    setUser(null)
  }

  if (!user) {
    return (
      <button
        onClick={signIn}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
    )
  }

  const isAdmin = user.email === adminEmail

  return (
    <div className="flex items-center gap-3">
      <img src={user.user_metadata?.avatar_url} alt="" className="w-7 h-7 rounded-full" />
      <span className="text-sm text-slate-700 hidden sm:block">{user.user_metadata?.full_name ?? user.email}</span>
      {isAdmin ? (
        <a href="/admin" className="text-sm font-medium text-blue-600 hover:text-blue-800">Admin</a>
      ) : (
        <>
          <a href="/submissions" className="text-sm font-medium text-slate-600 hover:text-slate-800">My Submissions</a>
          <a href="/submissions?new=1" className="text-sm font-medium text-green-600 hover:text-green-800">Submit a Map</a>
        </>
      )}
      <button onClick={signOut} className="text-xs text-slate-400 hover:text-slate-600">Sign out</button>
    </div>
  )
}
```

- [ ] **Step 2: Add AuthButton to public page header**

In `src/app/page.tsx`, import `AuthButton` and add it to the header. Pass `adminEmail={process.env.ADMIN_GOOGLE_EMAIL ?? ''}` as a prop (this is a Server Component that passes the env var down):

```tsx
// In the header div, next to the existing folder picker:
<AuthButton adminEmail={process.env.ADMIN_GOOGLE_EMAIL ?? ''} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/AuthButton.tsx src/app/page.tsx
git commit -m "feat: add AuthButton component with Google sign-in/out"
```

---

## Task 14: Update MapCard to show uploader + community submissions page

**Files:**
- Modify: `src/components/MapCard.tsx`
- Create: `src/components/MySubmissions.tsx`
- Create: `src/components/SubmitForm.tsx`
- Create: `src/app/submissions/page.tsx`

- [ ] **Step 1: Update MapCard to show uploader info**

In `src/components/MapCard.tsx`, in the `<div className="min-w-0">` section where the map name and file size are displayed, add uploader info below the size line:

```tsx
{map.uploader && (
  <div className="flex items-center gap-1 mt-0.5">
    <img src={map.uploader.avatar} alt="" className="w-4 h-4 rounded-full" />
    <span className="text-xs text-slate-400">by {map.uploader.name}</span>
  </div>
)}
```

- [ ] **Step 2: Create SubmitForm (community upload form)**

Create `src/components/SubmitForm.tsx` — copy `UploadForm.tsx` exactly, but:
- Change the upload URL from `/api/upload` to `/api/submit`
- Change the title text from "Drop .zip, .7z, or .rar files here" to "Submit a CS 1.6 map for review"
- Remove `multiple` attribute (community users submit one at a time to keep the queue manageable)
- After success, call `onSubmitted()` callback instead of `onUploaded()`

- [ ] **Step 3: Create MySubmissions component**

Create `src/components/MySubmissions.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import type { Submission } from '@/types/submission'

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

export function MySubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/submissions/mine')
      .then(r => r.ok ? r.json() : [])
      .then(setSubmissions)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-slate-400 text-sm">Loading...</p>
  if (submissions.length === 0) return <p className="text-slate-400 text-sm">No submissions yet.</p>

  return (
    <div className="flex flex-col gap-2">
      {submissions.map(sub => (
        <div key={sub.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-slate-900">{sub.originalName}</span>
              <span className="ml-2 text-xs text-slate-400 uppercase">{sub.format}</span>
              <span className="ml-2 text-xs text-slate-400">{formatBytes(sub.size)}</span>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[sub.status]}`}>
              {sub.status}
            </span>
          </div>
          {sub.rejectionReason && (
            <p className="text-xs text-red-500 mt-1">Reason: {sub.rejectionReason}</p>
          )}
          <p className="text-xs text-slate-400 mt-0.5">
            Submitted {new Date(sub.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create /submissions page**

Create `src/app/submissions/page.tsx`:

```tsx
import { SubmitForm } from '@/components/SubmitForm'
import { MySubmissions } from '@/components/MySubmissions'

export default function SubmissionsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">Submit a Map</h1>
      <p className="text-slate-500 text-sm mb-6">
        Upload a CS 1.6 map archive. It will appear on the public list after admin review.
      </p>
      <SubmitForm onSubmitted={() => window.location.reload()} />
      <h2 className="text-lg font-semibold mt-10 mb-4">My Submissions</h2>
      <MySubmissions />
    </main>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/MapCard.tsx src/components/MySubmissions.tsx src/components/SubmitForm.tsx src/app/submissions/page.tsx
git commit -m "feat: show uploader on MapCard, add community submissions page"
```

---

## Task 15: Update admin page — remove password form, add pending queue

**Files:**
- Create: `src/components/PendingQueue.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Create PendingQueue component**

Create `src/components/PendingQueue.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import type { Submission } from '@/types/submission'

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Preview { structure: string; bspFiles: string[] }

export function PendingQueue({ onApproved }: { onApproved: () => void }) {
  const [queue, setQueue] = useState<Submission[]>([])
  const [previews, setPreviews] = useState<Record<string, Preview>>({})
  const [rejecting, setRejecting] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/admin/submissions?status=pending')
      .then(r => r.ok ? r.json() : [])
      .then(setQueue)
  }, [])

  async function loadPreview(id: string) {
    if (previews[id]) return
    const res = await fetch(`/api/admin/submissions/${id}/preview`)
    if (res.ok) setPreviews(p => ({ ...p, [id]: await res.json() }))
  }

  async function handleApprove(id: string) {
    if (busy[id]) return
    setBusy(b => ({ ...b, [id]: true }))
    const res = await fetch(`/api/admin/submissions/${id}/approve`, { method: 'POST' })
    if (res.ok) {
      setQueue(q => q.filter(s => s.id !== id))
      onApproved()
    } else {
      alert((await res.json()).error ?? 'Approval failed')
      setBusy(b => ({ ...b, [id]: false }))
    }
  }

  async function handleReject(id: string) {
    const reason = (rejecting[id] ?? '').trim()
    if (!reason) return
    setBusy(b => ({ ...b, [id]: true }))
    const res = await fetch(`/api/admin/submissions/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (res.ok) {
      setQueue(q => q.filter(s => s.id !== id))
    } else {
      alert((await res.json()).error ?? 'Rejection failed')
      setBusy(b => ({ ...b, [id]: false }))
    }
  }

  if (queue.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-3 text-orange-600">Pending Review ({queue.length})</h2>
      <div className="flex flex-col gap-3">
        {queue.map(sub => (
          <div key={sub.id} className="bg-white border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <img src={sub.submitterAvatar} alt="" className="w-6 h-6 rounded-full" />
              <span className="text-sm text-slate-600">{sub.submitterName}</span>
              <span className="text-xs text-slate-400 ml-auto">
                {new Date(sub.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase bg-slate-100 text-slate-600`}>{sub.format}</span>
              <span className="font-medium text-slate-900">{sub.originalName}</span>
              <span className="text-xs text-slate-400">{formatBytes(sub.size)}</span>
            </div>

            <button
              onClick={() => loadPreview(sub.id)}
              className="text-xs text-blue-500 hover:text-blue-700 mb-2"
            >
              {previews[sub.id] ? '▼ Archive preview' : '▶ Load archive preview'}
            </button>

            {previews[sub.id] && (
              <div className="text-xs bg-slate-50 rounded p-2 mb-2">
                <p className="text-slate-500">Structure: <span className="font-mono">{previews[sub.id].structure}</span></p>
                <p className="text-slate-500 mt-0.5">Maps: {previews[sub.id].bspFiles.join(', ') || 'none'}</p>
              </div>
            )}

            <div className="flex items-start gap-2 mt-2">
              <button
                onClick={() => handleApprove(sub.id)}
                disabled={busy[sub.id]}
                className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
              >
                Approve
              </button>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Rejection reason…"
                  value={rejecting[sub.id] ?? ''}
                  onChange={e => setRejecting(r => ({ ...r, [sub.id]: e.target.value }))}
                  className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                />
                <button
                  onClick={() => handleReject(sub.id)}
                  disabled={busy[sub.id] || !(rejecting[sub.id] ?? '').trim()}
                  className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite admin page**

Replace `src/app/admin/page.tsx`:

```tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { UploadForm } from '@/components/UploadForm'
import { AdminMapList } from '@/components/AdminMapList'
import { PendingQueue } from '@/components/PendingQueue'
import type { MapEntry } from '@/types/map'

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export default function AdminPage() {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [maps, setMaps] = useState<MapEntry[]>([])

  const loadMaps = useCallback(async () => {
    const res = await fetch(`/api/maps?t=${Date.now()}`)
    if (res.ok) setMaps(await res.json())
  }, [])

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getUser().then(async ({ data }) => {
      const email = data.user?.email ?? ''
      const isAdmin = email === process.env.NEXT_PUBLIC_ADMIN_EMAIL // see note below
      setAuthed(isAdmin)
      setChecking(false)
    })
  }, [])

  useEffect(() => {
    if (authed) loadMaps()
  }, [authed, loadMaps])

  if (checking) return <main className="max-w-sm mx-auto px-4 py-24 text-center text-gray-400">Loading...</main>
  if (!authed) return <main className="max-w-sm mx-auto px-4 py-24 text-center text-gray-400">Access denied.</main>

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Admin</h1>
      <PendingQueue onApproved={loadMaps} />
      <h2 className="text-lg font-semibold mb-3">Upload Map</h2>
      <UploadForm onUploaded={loadMaps} />
      <AdminMapList maps={maps} onDeleted={id => setMaps(prev => prev.filter(m => m.id !== id))} />
    </main>
  )
}
```

> **Note:** The admin page needs to check the admin email client-side. Add `NEXT_PUBLIC_ADMIN_EMAIL` to `.env.local` with the same value as `ADMIN_GOOGLE_EMAIL`. This is safe — it's just an email address used for UI gating. The actual security enforcement is in the server-side API routes via `isAdmin(getSessionUser())`.

Add to `.env.local`:
```
NEXT_PUBLIC_ADMIN_EMAIL=your-admin@gmail.com
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PendingQueue.tsx src/app/admin/page.tsx .env.local
git commit -m "feat: update admin page with pending queue and remove password form"
```

---

## Task 16: Migration script

**Files:**
- Create: `scripts/migrate-maps.ts`

- [ ] **Step 1: Create the migration script**

Create `scripts/migrate-maps.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  // Download maps.json from Supabase Storage
  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET_NAME ?? 'cs-maps')
    .download('maps.json')

  if (error || !data) {
    console.error('Could not download maps.json:', error)
    process.exit(1)
  }

  const text = await data.text()
  const maps = JSON.parse(text)
  console.log(`Found ${maps.length} maps in maps.json`)

  for (const map of maps) {
    const { error: insertError } = await supabase.from('maps').insert({
      id: map.id,
      original_name: map.originalName,
      storage_key: map.r2Key,   // old field name from maps.json
      format: map.format,
      size: map.size,
      sha256: map.sha256,
      uploaded_at: map.uploadedAt,
      uploader_id: null,
      uploader_name: null,
      uploader_avatar: null,
    })
    if (insertError) {
      console.error(`Failed to insert ${map.originalName}:`, insertError.message)
    } else {
      console.log(`✓ ${map.originalName}`)
    }
  }

  console.log('Migration complete. Verify the maps table, then delete maps.json from storage.')
}

main().catch(console.error)
```

- [ ] **Step 2: Run the migration**

```bash
npx ts-node --project tsconfig.json scripts/migrate-maps.ts
```

Expected: each map name prints with ✓. Verify row count in Supabase table editor.

- [ ] **Step 3: Delete maps.json from Supabase Storage**

In the Supabase Storage UI, navigate to the `cs-maps` bucket and delete `maps.json`.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-maps.ts
git commit -m "chore: add maps.json migration script for Supabase table"
```

---

## Task 17: Configure Google OAuth in Supabase + final validation

- [ ] **Step 1: Enable Google provider in Supabase Auth**

In the Supabase dashboard → Authentication → Providers → Google:
- Enable Google
- Add the Google OAuth Client ID and Secret (from Google Cloud Console)
- Set Redirect URL to: `https://your-site.com/auth/callback` (and `http://localhost:3000/auth/callback` for local dev)

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Start dev server and smoke-test**

```bash
npm run dev
```

Verify:
- [ ] Public page loads, shows "Sign in with Google" button
- [ ] Clicking sign-in redirects to Google, returns to `/` with user info in header
- [ ] Admin Google account sees "Admin" link and can access `/admin`
- [ ] Community account sees "My Submissions" + "Submit a Map" links
- [ ] Submit a valid CS map archive → appears as pending in admin queue
- [ ] Admin can expand archive preview, approve or reject
- [ ] Approved map appears on public list with uploader name + avatar
- [ ] Community user sees rejection reason on `/submissions`
- [ ] Non-signed-in user visiting `/admin` or `/submissions` redirects to `/`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: community uploads with Google OAuth — complete implementation"
```
