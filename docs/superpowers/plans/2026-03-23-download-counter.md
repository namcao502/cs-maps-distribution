# Download Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track and display separate download and install counts for each map, visible on the user map card and admin map list.

**Architecture:** Two Firestore fields (`downloadCount`, `installCount`) are added to each map document and incremented atomically via `FieldValue.increment(1)`. The download count increments in the existing `GET /api/download/[id]` route; the install count increments via a new `POST /api/maps/[id]/install` route called client-side after a successful install.

**Tech Stack:** Next.js App Router, Firebase Firestore (firebase-admin), TypeScript, Tailwind CSS.

---

### Task 1: Extend `MapEntry` type and `maps-store.ts`

**Files:**
- Modify: `src/types/map.ts`
- Modify: `src/lib/maps-store.ts`

**Context:** `MapEntry` is the shared type used everywhere. `maps-store.ts` wraps all Firestore reads/writes for the `maps` collection. `docToMapEntry` converts a raw Firestore document to `MapEntry`. `addMap` writes a new document.

- [ ] **Step 1: Add fields to `MapEntry`**

Open `src/types/map.ts`. Add two fields after `uploadedAt`:

```ts
export interface MapEntry {
  id: string
  originalName: string
  storageKey: string
  format: 'zip' | '7z' | 'rar'
  size: number
  sha256: string
  uploadedAt: string
  downloadCount: number
  installCount: number
  uploader?: {
    id: string
    name: string
    avatar: string
  }
}
```

- [ ] **Step 2: Update `docToMapEntry` in `maps-store.ts`**

Add the two new fields to the return value (using `?? 0` so existing documents without the field don't break):

```ts
function docToMapEntry(id: string, data: FirebaseFirestore.DocumentData): MapEntry {
  return {
    id,
    originalName: data.originalName as string,
    storageKey: data.storageKey as string,
    format: data.format as 'zip' | '7z' | 'rar',
    size: data.size as number,
    sha256: data.sha256 as string,
    uploadedAt: data.uploadedAt as string,
    downloadCount: (data.downloadCount as number) ?? 0,
    installCount: (data.installCount as number) ?? 0,
    uploader: data.uploaderId
      ? {
          id: data.uploaderId as string,
          name: data.uploaderName as string,
          avatar: data.uploaderAvatar as string,
        }
      : undefined,
  }
}
```

- [ ] **Step 3: Update `addMap` to initialize counters**

In the `.set({...})` call, add both counter fields:

```ts
export async function addMap(entry: MapEntry): Promise<void> {
  await getAdminDb().collection('maps').doc(entry.id).set({
    originalName: entry.originalName,
    storageKey: entry.storageKey,
    format: entry.format,
    size: entry.size,
    sha256: entry.sha256,
    uploadedAt: entry.uploadedAt,
    downloadCount: 0,
    installCount: 0,
    uploaderId: entry.uploader?.id ?? null,
    uploaderName: entry.uploader?.name ?? null,
    uploaderAvatar: entry.uploader?.avatar ?? null,
  })
}
```

- [ ] **Step 4: Add `incrementDownload` and `incrementInstall` functions**

Append to `src/lib/maps-store.ts`:

```ts
import { FieldValue } from 'firebase-admin/firestore'

export async function incrementDownload(id: string): Promise<void> {
  await getAdminDb().collection('maps').doc(id).update({
    downloadCount: FieldValue.increment(1),
  })
}

export async function incrementInstall(id: string): Promise<void> {
  await getAdminDb().collection('maps').doc(id).update({
    installCount: FieldValue.increment(1),
  })
}
```

> Note: Check how `firebase-admin/firestore` is imported in the existing codebase. If `getAdminDb` already imports from `firebase-admin`, you may need to import `FieldValue` from the same package. Look at `src/lib/firebase-admin.ts` for the import pattern.

- [ ] **Step 5: Build to check for type errors**

```bash
npm run build
```

Expected: Complains about `MapEntry` missing `downloadCount`/`installCount` in places that construct `MapEntry` objects (upload route, submissions approval). We fix those in Task 2.

- [ ] **Step 6: Commit**

```bash
git add src/types/map.ts src/lib/maps-store.ts
git commit -m "feat: add downloadCount and installCount to MapEntry and maps-store"
```

---

### Task 2: Fix `MapEntry` construction sites

**Files:**
- Modify: `src/app/api/upload/route.ts`
- Modify: `src/app/api/admin/submissions/[id]/approve/route.ts` (if it constructs a `MapEntry`)

**Context:** Any place that creates a `MapEntry` literal must now include `downloadCount: 0` and `installCount: 0`. The build error from Task 1 will point you to the exact lines.

- [ ] **Step 1: Fix all TypeScript errors from the build**

Run `npm run build` and read the errors. For each location that constructs a `MapEntry` object literal, add:

```ts
downloadCount: 0,
installCount: 0,
```

- [ ] **Step 2: Build again to confirm clean**

```bash
npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix: initialize downloadCount and installCount in MapEntry construction sites"
```

---

### Task 3: Increment download count in the download route

**Files:**
- Modify: `src/app/api/download/[id]/route.ts`

**Context:** This route currently does: fetch map list → find map by id → return presigned URL. We add one call to `incrementDownload` before returning. This fires for both the install path and the raw download path since both call this route.

- [ ] **Step 1: Update the download route**

Full updated file:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getMaps, incrementDownload } from '@/lib/maps-store'
import { getPresignedUrl } from '@/lib/storage'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const maps = await getMaps()
  const map = maps.find(m => m.id === id)
  if (!map) {
    return NextResponse.json({ error: 'Map not found' }, { status: 404 })
  }

  try {
    const url = await getPresignedUrl(map.storageKey, 900)
    await incrementDownload(id)
    return NextResponse.json({ url, sha256: map.sha256 })
  } catch {
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/download/[id]/route.ts
git commit -m "feat: increment downloadCount when download URL is issued"
```

---

### Task 4: Create the install count endpoint

**Files:**
- Create: `src/app/api/maps/[id]/install/route.ts`

**Context:** This is a new Next.js App Router route. The directory `src/app/api/maps/[id]/` does not yet exist — you need to create the full path. The route increments `installCount` and returns `{ ok: true }`. No authentication required.

- [ ] **Step 1: Create the directory and route file**

Create `src/app/api/maps/[id]/install/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { incrementInstall } from '@/lib/maps-store'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await incrementInstall(id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to record install' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Build to verify the route is picked up**

```bash
npm run build
```

Expected: The new route appears in the build output under `ƒ /api/maps/[id]/install`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/maps/[id]/install/route.ts
git commit -m "feat: add POST /api/maps/[id]/install endpoint for install count"
```

---

### Task 5: Call install endpoint from `MapCard` and display counts

**Files:**
- Modify: `src/components/MapCard.tsx`

**Context:** `doInstall()` already calls `markInstalled(map.id)` and `setInstalled(true)`. After `markInstalled`, fire-and-forget a call to `POST /api/maps/[map.id]/install`. Also add count display in the metadata line.

Current metadata line (around line 116):
```tsx
<span className="text-xs text-[var(--text-muted)]">
  {formatBytes(map.size)} · {new Date(map.uploadedAt).toLocaleDateString(...)} {new Date(map.uploadedAt).toLocaleTimeString(...)}
</span>
```

- [ ] **Step 1: Add fire-and-forget install call in `doInstall`**

After `markInstalled(map.id)` and before `setInstalled(true)`, add:

```ts
fetch(`/api/maps/${map.id}/install`, { method: 'POST' }).catch(() => {})
```

- [ ] **Step 2: Add counts to the metadata line**

Update the metadata `<span>` to append the counts:

```tsx
<span className="text-xs text-[var(--text-muted)]">
  {formatBytes(map.size)} · {new Date(map.uploadedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} {new Date(map.uploadedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
  {' · '}↓ {map.downloadCount} · ⚙ {map.installCount}
</span>
```

- [ ] **Step 3: Build to verify**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 4: Commit**

```bash
git add src/components/MapCard.tsx
git commit -m "feat: fire install count on install, display download/install counts on MapCard"
```

---

### Task 6: Display counts in `AdminMapList`

**Files:**
- Modify: `src/components/AdminMapList.tsx`

**Context:** Each map row currently shows name, format, size, and date. Add the two counts at the end of that row.

Current row metadata (around line 41–45):
```tsx
<span className="font-medium">{map.originalName}</span>
<span className="ml-2 text-xs text-[var(--text-muted)] uppercase">{map.format}</span>
<span className="ml-2 text-xs text-[var(--text-muted)]">{formatBytes(map.size)}</span>
<span className="ml-2 text-xs text-[var(--text-muted)]">
  {new Date(map.uploadedAt).toLocaleDateString(...)}
</span>
```

- [ ] **Step 1: Add counts after the date span**

```tsx
<span className="ml-2 text-xs text-[var(--text-muted)]">↓ {map.downloadCount}</span>
<span className="ml-2 text-xs text-[var(--text-muted)]">⚙ {map.installCount}</span>
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components/AdminMapList.tsx
git commit -m "feat: display download and install counts in AdminMapList"
```
