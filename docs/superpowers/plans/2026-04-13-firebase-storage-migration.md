# Firebase Storage Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase Storage with Firebase Storage for all binary file hosting, removing the `@supabase/supabase-js` dependency entirely.

**Architecture:** `src/lib/storage/storage.ts` is the only file that touches the storage backend. Swap its four functions to use `getAdminStorage()` (already exported from `firebase-admin.ts`). Write a one-off migration script to copy all existing files from Supabase to Firebase before deploying the new code.

**Tech Stack:** `firebase-admin/storage` (already installed), `@supabase/supabase-js` (migration script only, then removed), `dotenv` (already installed), `tsx` (via npx)

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Modify | `tests/lib/storage/storage.test.ts` | Re-mock Firebase Admin instead of Supabase |
| Rewrite | `src/lib/storage/storage.ts` | Swap 4 functions to Firebase Admin Storage |
| Modify | `src/lib/env.ts` | Swap required env vars |
| Create | `scripts/migrate-storage.ts` | One-off file migration script |
| Modify | `package.json` | Remove `@supabase/supabase-js` after migration |

---

## Task 1: Update `storage.test.ts` to mock Firebase Admin

**Files:**
- Modify: `tests/lib/storage/storage.test.ts`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `tests/lib/storage/storage.test.ts` with:

```ts
import { getAdminStorage } from '@/lib/auth/firebase-admin'
import { putObject, deleteObject, getPresignedUrl, getObjectBuffer } from '@/lib/storage/storage'

jest.mock('@/lib/auth/firebase-admin')

const mockFile = {
  save: jest.fn(),
  delete: jest.fn(),
  getSignedUrl: jest.fn(),
  download: jest.fn(),
}

const mockBucket = {
  file: jest.fn().mockReturnValue(mockFile),
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(getAdminStorage as jest.Mock).mockReturnValue({
    bucket: jest.fn().mockReturnValue(mockBucket),
  })
})

describe('putObject', () => {
  it('saves buffer with content type', async () => {
    mockFile.save.mockResolvedValue(undefined)
    await putObject('archives/test.zip', Buffer.from('data'), 'application/zip')
    expect(mockBucket.file).toHaveBeenCalledWith('archives/test.zip')
    expect(mockFile.save).toHaveBeenCalledWith(
      Buffer.from('data'),
      { metadata: { contentType: 'application/zip' } }
    )
  })

  it('uses default content type', async () => {
    mockFile.save.mockResolvedValue(undefined)
    await putObject('key', Buffer.from(''))
    expect(mockFile.save).toHaveBeenCalledWith(
      expect.any(Buffer),
      { metadata: { contentType: 'application/octet-stream' } }
    )
  })

  it('throws if save throws', async () => {
    mockFile.save.mockRejectedValue(new Error('Upload failed'))
    await expect(putObject('bad', Buffer.from(''))).rejects.toThrow('Upload failed')
  })
})

describe('deleteObject', () => {
  it('deletes the file', async () => {
    mockFile.delete.mockResolvedValue(undefined)
    await deleteObject('archives/test.zip')
    expect(mockBucket.file).toHaveBeenCalledWith('archives/test.zip')
    expect(mockFile.delete).toHaveBeenCalled()
  })

  it('throws if delete throws', async () => {
    mockFile.delete.mockRejectedValue(new Error('Delete failed'))
    await expect(deleteObject('bad')).rejects.toThrow('Delete failed')
  })
})

describe('getPresignedUrl', () => {
  it('returns signed URL', async () => {
    mockFile.getSignedUrl.mockResolvedValue(['https://example.com/signed'])
    const url = await getPresignedUrl('archives/test.zip')
    expect(url).toBe('https://example.com/signed')
    expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
      action: 'read',
      expires: expect.any(Number),
    })
  })

  it('default ttl is ~900 seconds from now', async () => {
    mockFile.getSignedUrl.mockResolvedValue(['https://example.com/signed'])
    const before = Date.now()
    await getPresignedUrl('key')
    const after = Date.now()
    const { expires } = mockFile.getSignedUrl.mock.calls[0][0]
    expect(expires).toBeGreaterThanOrEqual(before + 900 * 1000)
    expect(expires).toBeLessThanOrEqual(after + 900 * 1000)
  })

  it('uses custom ttl', async () => {
    mockFile.getSignedUrl.mockResolvedValue(['https://example.com/signed'])
    const before = Date.now()
    await getPresignedUrl('key', 3600)
    const after = Date.now()
    const { expires } = mockFile.getSignedUrl.mock.calls[0][0]
    expect(expires).toBeGreaterThanOrEqual(before + 3600 * 1000)
    expect(expires).toBeLessThanOrEqual(after + 3600 * 1000)
  })

  it('throws if getSignedUrl throws', async () => {
    mockFile.getSignedUrl.mockRejectedValue(new Error('Signing failed'))
    await expect(getPresignedUrl('bad')).rejects.toThrow('Signing failed')
  })
})

describe('getObjectBuffer', () => {
  it('returns ArrayBuffer on success', async () => {
    const buf = Buffer.from('hello world')
    mockFile.download.mockResolvedValue([buf])
    const result = await getObjectBuffer('archives/test.zip')
    expect(result).not.toBeNull()
    expect(result).toBeInstanceOf(ArrayBuffer)
  })

  it('returns null if download throws', async () => {
    mockFile.download.mockRejectedValue(new Error('Not found'))
    const result = await getObjectBuffer('missing')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest tests/lib/storage/storage.test.ts
```

Expected: all tests fail with errors like `Cannot find module '@supabase/supabase-js'` or mock mismatch errors. This confirms the tests are now targeting the new implementation.

---

## Task 2: Rewrite `src/lib/storage/storage.ts`

**Files:**
- Rewrite: `src/lib/storage/storage.ts`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/lib/storage/storage.ts` with:

```ts
import { getAdminStorage } from '@/lib/auth/firebase-admin'

function getBucket() {
  return getAdminStorage().bucket()
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType = 'application/octet-stream',
): Promise<void> {
  await getBucket().file(key).save(body, { metadata: { contentType } })
}

export async function deleteObject(key: string): Promise<void> {
  await getBucket().file(key).delete()
}

export async function getPresignedUrl(key: string, ttlSeconds = 900): Promise<string> {
  const [url] = await getBucket().file(key).getSignedUrl({
    action: 'read',
    expires: Date.now() + ttlSeconds * 1000,
  })
  return url
}

export async function getObjectBuffer(key: string): Promise<ArrayBuffer | null> {
  try {
    const [buffer] = await getBucket().file(key).download()
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Run tests — expect PASS**

```bash
npx jest tests/lib/storage/storage.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 3: Run the full test suite to catch regressions**

```bash
npm test
```

Expected: all tests pass. If any test imports `@supabase/supabase-js` directly and fails, that is a problem to fix — but based on the codebase audit, only `storage.test.ts` uses Supabase mocks.

- [ ] **Step 4: Commit**

```bash
git add src/lib/storage/storage.ts tests/lib/storage/storage.test.ts
git commit -m "feat: replace Supabase storage with Firebase Admin Storage"
```

---

## Task 3: Update `src/lib/env.ts`

**Files:**
- Modify: `src/lib/env.ts`

- [ ] **Step 1: Swap env vars in the required list**

In `src/lib/env.ts`, replace the `REQUIRED_ENV_VARS` array:

```ts
const REQUIRED_ENV_VARS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'ADMIN_GOOGLE_EMAIL',
] as const
```

Removed: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
Added: `FIREBASE_STORAGE_BUCKET`

- [ ] **Step 2: Verify `.env.local` has `FIREBASE_STORAGE_BUCKET` set**

The value is the bucket name from the Firebase Console — typically `your-project-id.firebasestorage.app`. Open `.env.local` and confirm the line exists:

```
FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/env.ts
git commit -m "chore: swap Supabase env vars for FIREBASE_STORAGE_BUCKET in required list"
```

---

## Task 4: Write `scripts/migrate-storage.ts`

**Files:**
- Create: `scripts/migrate-storage.ts`

This script runs once during the downtime window. It reads every file from Supabase and writes it to Firebase Storage under the same key path. It does not delete from Supabase.

- [ ] **Step 1: Create the file**

Create `scripts/migrate-storage.ts` with:

```ts
import { createClient } from '@supabase/supabase-js'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Supabase client (source)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET_NAME ?? 'cs-maps'

// Firebase Admin (destination)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
  })
}
const fbBucket = getStorage().bucket()

const PREFIXES = [
  'archives/',
  'screenshots/',
  'submissions/',
  'submission-screenshots/',
]

// Lists all file keys under a prefix, recursing into virtual sub-folders.
// Supabase list() returns items with id=null for folders and id=uuid for files.
async function listAllKeys(prefix: string): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .list(prefix, { limit: 1000 })

  if (error || !data) {
    console.error(`[LIST ERROR] ${prefix}: ${error?.message ?? 'no data'}`)
    return []
  }

  const keys: string[] = []
  for (const item of data) {
    if (item.id) {
      keys.push(`${prefix}${item.name}`)
    } else {
      const nested = await listAllKeys(`${prefix}${item.name}/`)
      keys.push(...nested)
    }
  }
  return keys
}

async function main() {
  let copied = 0
  let failed = 0

  for (const prefix of PREFIXES) {
    const keys = await listAllKeys(prefix)
    console.log(`\n[${prefix}] ${keys.length} files found`)

    for (const key of keys) {
      try {
        const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(key)
        if (error || !data) throw new Error(error?.message ?? 'download returned no data')
        const buffer = Buffer.from(await data.arrayBuffer())
        await fbBucket.file(key).save(buffer)
        console.log(`[OK]   ${key}`)
        copied++
      } catch (err) {
        console.error(`[FAIL] ${key}: ${(err as Error).message}`)
        failed++
      }
    }
  }

  console.log(`\nDone. Copied: ${copied}  Failed: ${failed}`)
  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-storage.ts
git commit -m "chore: add one-off Supabase-to-Firebase storage migration script"
```

---

## Task 5: Run the migration (operator step)

This task is manual. Run it before deploying the new `storage.ts`.

- [ ] **Step 1: Confirm both sets of env vars are in `.env.local`**

The script needs Supabase vars (source) AND Firebase vars (destination):

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_BUCKET_NAME=cs-maps        # or whatever your bucket is named
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_STORAGE_BUCKET=...
```

- [ ] **Step 2: Run the script**

```bash
npx tsx scripts/migrate-storage.ts
```

Expected output — example with 3 files:
```
[archives/] 3 files found
[OK]   archives/abc123.zip
[OK]   archives/def456.7z
[OK]   archives/ghi789.rar

[screenshots/] 4 files found
[OK]   screenshots/abc123/0.jpg
[OK]   screenshots/abc123/1.jpg
[OK]   screenshots/def456/0.jpg
[OK]   screenshots/def456/1.jpg

[submissions/] 1 files found
[OK]   submissions/xyz999.zip

[submission-screenshots/] 0 files found

Done. Copied: 8  Failed: 0
```

- [ ] **Step 3: If any `[FAIL]` lines appear**

Re-run the script — transient network errors are safe to retry since `fbBucket.file(key).save()` overwrites. If failures persist, check Supabase bucket name and Firebase Storage bucket name are correct.

- [ ] **Step 4: Verify files in Firebase Console**

Open Firebase Console → Storage → browse `archives/`, `screenshots/`, `submissions/`. Confirm file counts match the script output.

---

## Task 6: Remove `@supabase/supabase-js`

Run this only after Task 5 confirms 0 failures and files are visible in Firebase Console.

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Uninstall the package**

```bash
npm uninstall @supabase/supabase-js
```

- [ ] **Step 2: Confirm no remaining imports**

```bash
grep -r "supabase" src/ --include="*.ts" --include="*.tsx"
```

Expected: no output. If any line appears, it is an import that was missed — fix it before continuing.

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Run a production build to confirm no type errors**

```bash
npm run build
```

Expected: exits with code 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove @supabase/supabase-js dependency"
```

---

## Task 7: Cleanup and env var housekeeping

- [ ] **Step 1: Remove migration script**

```bash
git rm scripts/migrate-storage.ts
git commit -m "chore: delete one-off storage migration script"
```

- [ ] **Step 2: Remove Supabase env vars from hosting**

In your deployment environment (Vercel or wherever), remove:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET_NAME`

These are no longer read by any code. Leaving them is harmless but creates noise.

- [ ] **Step 3: Cancel Supabase subscription**

Once production smoke-test passes and you're confident in the migration, cancel the Supabase subscription from the Supabase dashboard. The bucket and its files can be left until the subscription lapses — nothing in the codebase reads from it anymore.

- [ ] **Step 4: Smoke-test production**

After deploy:
1. Open the browse page — confirm map screenshots load
2. Click Install on a map — confirm download succeeds (presigned URL resolves)
3. Submit a map as a non-admin user — confirm it reaches pending queue
4. Approve the submission as admin — confirm it moves to the maps list
