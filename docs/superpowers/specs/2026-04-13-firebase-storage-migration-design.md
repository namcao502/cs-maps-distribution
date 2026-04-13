# Firebase Storage Migration Design

**Date**: 2026-04-13
**Project**: cs-maps-distribution

---

## Context

Binary files (map archives, screenshots, submission archives) are currently stored in Supabase
Storage. The project already uses Firebase Admin SDK for auth and Firestore. This migration
consolidates all backend infrastructure onto Firebase, removing the Supabase dependency entirely.

Downtime is acceptable. All existing files must be migrated.

---

## Storage Layout

File paths are unchanged. The same keys used in Supabase are used in Firebase Storage:

| Prefix | Contents |
|---|---|
| `archives/{id}.{ext}` | Approved map archives (zip, 7z, rar) |
| `screenshots/{id}/{index}.jpg` | Approved map screenshots |
| `submissions/{id}.{ext}` | Pending submission archives |
| `submission-screenshots/{id}/{index}.{ext}` | Pending submission screenshots |

---

## What Changes

Three files change, one script is added:

| File | Change |
|---|---|
| `src/lib/storage/storage.ts` | Swap 4 functions from Supabase SDK to Firebase Admin Storage |
| `src/lib/env.ts` | Remove `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; add `FIREBASE_STORAGE_BUCKET` |
| `package.json` | Remove `@supabase/supabase-js` |
| `scripts/migrate-storage.ts` | One-off migration script (delete after use) |

No other files change. All callers import from `src/lib/storage/storage.ts` only — signatures
are preserved so no callers need updating.

---

## `src/lib/storage/storage.ts` Rewrite

`getAdminStorage()` is already exported from `src/lib/auth/firebase-admin.ts` and
`storageBucket` is already read from `FIREBASE_STORAGE_BUCKET` in the app init. No new
plumbing required.

Function mapping:

```ts
import { getAdminStorage } from '@/lib/auth/firebase-admin'

function getBucket() {
  return getAdminStorage().bucket()
}

export async function putObject(key: string, body: Buffer, contentType = 'application/octet-stream'): Promise<void> {
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
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  } catch {
    return null
  }
}
```

All four public signatures are unchanged.

---

## `src/lib/env.ts` Changes

Remove from required vars:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Add to required vars:
- `FIREBASE_STORAGE_BUCKET`

`SUPABASE_BUCKET_NAME` was optional (env var with fallback `'cs-maps'`) — remove the reference
from `storage.ts`, no change needed in `env.ts`.

---

## Migration Script: `scripts/migrate-storage.ts`

A one-off Node script run during the downtime window.

**Steps:**
1. Connect to Supabase using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
2. Connect to Firebase Admin using existing credentials
3. List files under each known prefix: `archives/`, `screenshots/`, `submissions/`,
   `submission-screenshots/`
4. For each file: download from Supabase, upload to Firebase under the same key
5. Log `[OK] key` or `[FAIL] key: error` per file
6. Print final summary: total copied, total failed

**Does not delete from Supabase** — operator verifies output, then cancels Supabase
subscription manually once confident.

**Run with:**
```bash
npx tsx scripts/migrate-storage.ts
```

---

## Execution Sequence

1. Ensure `FIREBASE_STORAGE_BUCKET` is set in `.env.local`
2. Take app offline (downtime window)
3. Run `npx tsx scripts/migrate-storage.ts` — verify 0 failures in output
4. Deploy updated code (new `storage.ts`, updated `env.ts`, `@supabase/supabase-js` removed)
5. Bring app back online, smoke-test downloads and screenshot display
6. Remove `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET_NAME` from hosting
   environment variables
7. Cancel Supabase subscription when confident
8. Delete `scripts/migrate-storage.ts`

---

## Prerequisites

**Signed URL permission**: `getSignedUrl` via Firebase Admin requires the service account to have
the `iam.serviceAccounts.signBlob` IAM role. Without it the call throws at runtime. Verify in
Google Cloud Console: IAM > find the Firebase service account > confirm it has
`Service Account Token Creator` role. If not, add it before deploying.

---

## Out of Scope

- Migrating Firestore data (already on Firebase, no change)
- Changing file key paths or bucket structure
- Zero-downtime cutover
- Automated post-migration verification beyond script output
