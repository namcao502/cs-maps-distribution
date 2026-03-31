# Daily Pick Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin pin one map as "Today's Pick" — it appears as the first card on the homepage with a badge and optional caption, and resets automatically at UTC midnight.

**Architecture:** A single Firestore document `config/daily-pick` stores `{ mapId, caption, setAt }`. Expiry is checked at read time by comparing `setAt`'s UTC date to today's UTC date — no cron needed. Two API routes serve the feature (public GET, admin-only POST). The homepage fetches both routes in parallel and passes the pick to `MapList` which pins it first. The admin sets it per-row in `AdminMapList`.

**Tech Stack:** Next.js App Router (route handlers), Firebase Admin SDK (Firestore), React `useState`/`useEffect`, Tailwind v4 CSS tokens.

---

### Task 1: Daily pick store + unit tests

**Files:**
- Create: `src/lib/maps/daily-pick-store.ts`
- Create: `tests/lib/maps/daily-pick-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/maps/daily-pick-store.test.ts`:

```ts
import { getDailyPick, setDailyPick, clearDailyPick } from '@/lib/maps/daily-pick-store'

const mockGet = jest.fn()
const mockSet = jest.fn()
const mockDelete = jest.fn()
const mockDoc = jest.fn()
const mockCollection = jest.fn()

jest.mock('@/lib/auth/firebase-admin', () => ({
  getAdminDb: jest.fn(() => ({ collection: mockCollection })),
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockDoc.mockReturnValue({ get: mockGet, set: mockSet, delete: mockDelete })
  mockCollection.mockReturnValue({ doc: mockDoc })
})

describe('getDailyPick', () => {
  it('returns null when doc does not exist', async () => {
    mockGet.mockResolvedValue({ exists: false })
    expect(await getDailyPick()).toBeNull()
  })

  it('returns null when setAt is yesterday', async () => {
    const yesterday = new Date()
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ mapId: 'map-1', caption: '', setAt: yesterday.toISOString() }),
    })
    expect(await getDailyPick()).toBeNull()
  })

  it('returns pick when setAt is today (UTC)', async () => {
    const now = new Date().toISOString()
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ mapId: 'map-1', caption: 'Good map', setAt: now }),
    })
    const result = await getDailyPick()
    expect(result).toEqual({ mapId: 'map-1', caption: 'Good map', setAt: now })
  })
})

describe('setDailyPick', () => {
  it('writes mapId, caption, and a current ISO timestamp to config/daily-pick', async () => {
    mockSet.mockResolvedValue(undefined)
    const before = Date.now()
    await setDailyPick('map-1', 'Great map')
    const after = Date.now()
    expect(mockCollection).toHaveBeenCalledWith('config')
    expect(mockDoc).toHaveBeenCalledWith('daily-pick')
    const written = mockSet.mock.calls[0][0]
    expect(written.mapId).toBe('map-1')
    expect(written.caption).toBe('Great map')
    expect(new Date(written.setAt).getTime()).toBeGreaterThanOrEqual(before)
    expect(new Date(written.setAt).getTime()).toBeLessThanOrEqual(after)
  })
})

describe('clearDailyPick', () => {
  it('deletes config/daily-pick', async () => {
    mockDelete.mockResolvedValue(undefined)
    await clearDailyPick()
    expect(mockCollection).toHaveBeenCalledWith('config')
    expect(mockDoc).toHaveBeenCalledWith('daily-pick')
    expect(mockDelete).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest tests/lib/maps/daily-pick-store.test.ts -v
```

Expected: FAIL with "Cannot find module '@/lib/maps/daily-pick-store'"

- [ ] **Step 3: Implement the store**

Create `src/lib/maps/daily-pick-store.ts`:

```ts
import { getAdminDb } from '@/lib/auth/firebase-admin'

export interface DailyPick {
  mapId: string
  caption: string
  setAt: string
}

function isTodayUtc(isoTimestamp: string): boolean {
  const setDate = new Date(isoTimestamp)
  const now = new Date()
  return (
    setDate.getUTCFullYear() === now.getUTCFullYear() &&
    setDate.getUTCMonth() === now.getUTCMonth() &&
    setDate.getUTCDate() === now.getUTCDate()
  )
}

export async function getDailyPick(): Promise<DailyPick | null> {
  const doc = await getAdminDb().collection('config').doc('daily-pick').get()
  if (!doc.exists) return null
  const data = doc.data()!
  if (!isTodayUtc(data.setAt as string)) return null
  return {
    mapId: data.mapId as string,
    caption: (data.caption as string) ?? '',
    setAt: data.setAt as string,
  }
}

export async function setDailyPick(mapId: string, caption: string): Promise<void> {
  await getAdminDb().collection('config').doc('daily-pick').set({
    mapId,
    caption,
    setAt: new Date().toISOString(),
  })
}

export async function clearDailyPick(): Promise<void> {
  await getAdminDb().collection('config').doc('daily-pick').delete()
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest tests/lib/maps/daily-pick-store.test.ts -v
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/maps/daily-pick-store.ts tests/lib/maps/daily-pick-store.test.ts
git commit -m "feat: add daily-pick-store with expiry-on-read logic"
```

---

### Task 2: Add message constants

**Files:**
- Modify: `src/lib/constants/messages.ts`

- [ ] **Step 1: Add constants to messages.ts**

Add these lines at the end of `src/lib/constants/messages.ts`:

```ts
// Daily pick
export const LABEL_DAILY_PICK = "Today's Pick"
export const BTN_SET_AS_PICK = 'Set as pick'
export const BTN_TODAY_PICK = "Today's pick ✓"
export const BTN_CONFIRM_PICK = 'Set'
export const INFO_CAPTION_PLACEHOLDER = 'Add a caption (optional)…'
export const ERR_SET_PICK_FAILED = 'Failed to set daily pick'
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/constants/messages.ts
git commit -m "feat: add daily pick message constants"
```

---

### Task 3: Public GET /api/daily-pick route

**Files:**
- Create: `src/app/api/daily-pick/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/daily-pick/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getDailyPick } from '@/lib/maps/daily-pick-store'
import { getAdminDb } from '@/lib/auth/firebase-admin'
import { resolveScreenshotUrls } from '@/lib/storage/screenshots'
import type { MapEntry } from '@/types/map'

export async function GET() {
  const pick = await getDailyPick()
  if (!pick) return NextResponse.json(null)

  const doc = await getAdminDb().collection('maps').doc(pick.mapId).get()
  if (!doc.exists) return NextResponse.json(null)

  const data = doc.data()!
  if (data.hidden) return NextResponse.json(null)

  const map: MapEntry = {
    id: doc.id,
    originalName: data.originalName as string,
    storageKey: data.storageKey as string,
    format: data.format as 'zip' | '7z' | 'rar',
    size: data.size as number,
    sha256: data.sha256 as string,
    uploadedAt: data.uploadedAt as string,
    installCount: (data.installCount as number) ?? 0,
    tags: (data.tags as string[]) ?? [],
    hidden: false,
    ...(data.order !== undefined && { order: data.order as number }),
    ...(data.uploaderId && {
      uploader: {
        id: data.uploaderId as string,
        name: data.uploaderName as string,
        avatar: data.uploaderAvatar as string,
      },
    }),
    screenshotKeys: data.screenshotKeys?.length
      ? await resolveScreenshotUrls(data.screenshotKeys as string[])
      : [],
  }

  return NextResponse.json({ map, caption: pick.caption })
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/daily-pick/route.ts
git commit -m "feat: add GET /api/daily-pick public route"
```

---

### Task 4: Admin POST /api/admin/daily-pick route

**Files:**
- Create: `src/app/api/admin/daily-pick/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/admin/daily-pick/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { setDailyPick } from '@/lib/maps/daily-pick-store'
import { getAdminDb } from '@/lib/auth/firebase-admin'
import { ERR_UNAUTHORIZED, ERR_MAP_NOT_FOUND } from '@/lib/constants/messages'

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: ERR_UNAUTHORIZED }, { status: 401 })
  }

  const { mapId, caption } = await request.json() as { mapId: string; caption: string }

  const doc = await getAdminDb().collection('maps').doc(mapId).get()
  if (!doc.exists) {
    return NextResponse.json({ error: ERR_MAP_NOT_FOUND }, { status: 404 })
  }

  await setDailyPick(mapId, caption ?? '')
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verify the build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/daily-pick/route.ts
git commit -m "feat: add POST /api/admin/daily-pick admin route"
```

---

### Task 5: MapCard — add badge and caption props

**Files:**
- Modify: `src/components/maps/MapCard.tsx`

- [ ] **Step 1: Add `badge` and `caption` props to MapCard**

In `src/components/maps/MapCard.tsx`, update the props interface (after `priority = false,`) to add two new optional props:

Old props block ends at line 52:
```ts
  priority = false,
}: {
```

Change the props destructuring to:

```ts
  priority = false,
  badge,
  caption,
}: {
  map: MapEntry
  gameFolder: FileSystemDirectoryHandle | null
  onPickFolder: () => Promise<void>
  installedBsps: Set<string>
  onInstalled: () => void
  onOpenDetail: (map: MapEntry) => void
  selected?: boolean
  onToggleSelect?: () => void
  autoInstall?: boolean
  onBatchTriggered?: () => void
  installStatus?: InstallStatus | null
  onInstallStatusChange?: (id: string, status: InstallStatus | null) => void
  priority?: boolean
  badge?: string
  caption?: string
}
```

- [ ] **Step 2: Rename internal `badge` variable to avoid shadowing**

In `MapCard`, find line:
```ts
  const badge = getTypeBadge(map.tags)
```

Change it to:
```ts
  const typeBadge = getTypeBadge(map.tags)
```

Then update the two places that reference `badge` in the JSX (the type badge rendering):

Find:
```tsx
        {badge && (
          <span
            className="absolute top-1.5 left-2 text-xs font-mono font-bold px-1.5 py-0.5 rounded-sm text-black inline-block text-center min-w-[7rem]"
            style={{ background: badge.color }}
          >
            {badge.label}
          </span>
        )}
```

Change to:
```tsx
        {typeBadge && (
          <span
            className="absolute top-1.5 left-2 text-xs font-mono font-bold px-1.5 py-0.5 rounded-sm text-black inline-block text-center min-w-[7rem]"
            style={{ background: typeBadge.color }}
          >
            {typeBadge.label}
          </span>
        )}
```

- [ ] **Step 3: Render the daily pick badge and caption in the info zone**

In the Info zone section of `MapCard`, find the map name button:
```tsx
        <button
          type="button"
          className="text-xs font-mono font-bold text-[var(--text-primary)] mb-1 cursor-pointer hover:text-[var(--accent-cyan)] truncate text-left w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-cyan)] rounded-sm"
          onClick={() => onOpenDetail(map)}
        >
          {map.originalName}
        </button>
```

Change to:
```tsx
        {badge && (
          <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm mb-1"
            style={{ background: 'var(--accent-cyan)', color: 'black' }}>
            {badge}
          </span>
        )}
        <button
          type="button"
          className="text-xs font-mono font-bold text-[var(--text-primary)] mb-1 cursor-pointer hover:text-[var(--accent-cyan)] truncate text-left w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-cyan)] rounded-sm"
          onClick={() => onOpenDetail(map)}
        >
          {map.originalName}
        </button>
        {caption && (
          <p className="text-[10px] text-[var(--text-muted)] font-mono mb-1 truncate">{caption}</p>
        )}
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/maps/MapCard.tsx
git commit -m "feat: add badge and caption props to MapCard"
```

---

### Task 6: MapList — accept and pin the daily pick

**Files:**
- Modify: `src/components/maps/MapList.tsx`

- [ ] **Step 1: Add `dailyPick` prop to MapList**

In `src/components/maps/MapList.tsx`, update the props interface from:

```ts
export function MapList({
  maps,
  gameFolder,
  onPickFolder,
}: {
  maps: MapEntry[]
  gameFolder: FileSystemDirectoryHandle | null
  onPickFolder: () => Promise<void>
})
```

To:

```ts
export function MapList({
  maps,
  gameFolder,
  onPickFolder,
  dailyPick = null,
}: {
  maps: MapEntry[]
  gameFolder: FileSystemDirectoryHandle | null
  onPickFolder: () => Promise<void>
  dailyPick?: { map: MapEntry; caption: string } | null
})
```

- [ ] **Step 2: Add LABEL_DAILY_PICK to the imports from messages**

Find the existing import from messages in `MapList.tsx`:
```ts
import {
  STATUS_NO_MAPS, STATUS_NO_MAPS_FOUND, INFO_PICK_CS_FOLDER, BTN_PICK_THIS, INFO_FOLDER_EXAMPLE,
  INFO_YOUR_FOLDER, INFO_YOUR_FOLDER_LABEL, BTN_CHANGE, LABEL_INSTALL_COUNT, LABEL_SELECTED_COUNT,
  BTN_INSTALL_ALL,
} from '@/lib/constants/messages'
```

Add `LABEL_DAILY_PICK` to the import list:
```ts
import {
  STATUS_NO_MAPS, STATUS_NO_MAPS_FOUND, INFO_PICK_CS_FOLDER, BTN_PICK_THIS, INFO_FOLDER_EXAMPLE,
  INFO_YOUR_FOLDER, INFO_YOUR_FOLDER_LABEL, BTN_CHANGE, LABEL_INSTALL_COUNT, LABEL_SELECTED_COUNT,
  BTN_INSTALL_ALL, LABEL_DAILY_PICK,
} from '@/lib/constants/messages'
```

- [ ] **Step 3: Pin the daily pick first in the grid, deduplicated**

In `MapList`, find the section where `filtered` and `sorted` are computed:

```ts
  const filtered = maps.filter(m =>
    (activeTab === 'all' || m.tags.includes(activeTab)) &&
    m.originalName.toLowerCase().includes(query.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) =>
    sortBy === 'name'
      ? a.originalName.localeCompare(b.originalName)
      : b.installCount - a.installCount
  )
```

Replace with:

```ts
  const filtered = maps.filter(m =>
    (activeTab === 'all' || m.tags.includes(activeTab)) &&
    m.originalName.toLowerCase().includes(query.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) =>
    sortBy === 'name'
      ? a.originalName.localeCompare(b.originalName)
      : b.installCount - a.installCount
  )

  const pickPassesFilter = dailyPick != null && (
    (activeTab === 'all' || dailyPick.map.tags.includes(activeTab)) &&
    dailyPick.map.originalName.toLowerCase().includes(query.toLowerCase())
  )
  const sortedWithoutPick = pickPassesFilter
    ? sorted.filter(m => m.id !== dailyPick!.map.id)
    : sorted
  const displayMaps = pickPassesFilter
    ? [dailyPick!.map, ...sortedWithoutPick]
    : sortedWithoutPick
```

- [ ] **Step 4: Use `displayMaps` in the grid and pass badge/caption to the pick card**

Find the grid rendering:
```tsx
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-[10px]">
          {sorted.map((map, i) => (
            <MapCard
              key={map.id}
              map={map}
              gameFolder={gameFolder}
              onPickFolder={onPickFolder}
              installedBsps={installedBsps}
              onInstalled={handleInstalled}
              onOpenDetail={map => setOpenDetailMap(map)}
              selected={selectedIds.has(map.id)}
              onToggleSelect={selectMode ? () => toggleSelect(map.id) : undefined}
              autoInstall={batchTrigger.has(map.id)}
              onBatchTriggered={() => clearBatchTrigger(map.id)}
              installStatus={installStatuses.get(map.id) ?? null}
              onInstallStatusChange={updateInstallStatus}
              priority={i < 5}
            />
          ))}
        </div>
```

Replace with:
```tsx
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-[10px]">
          {displayMaps.map((map, i) => {
            const isPick = pickPassesFilter && i === 0
            return (
              <MapCard
                key={map.id}
                map={map}
                gameFolder={gameFolder}
                onPickFolder={onPickFolder}
                installedBsps={installedBsps}
                onInstalled={handleInstalled}
                onOpenDetail={map => setOpenDetailMap(map)}
                selected={selectedIds.has(map.id)}
                onToggleSelect={selectMode ? () => toggleSelect(map.id) : undefined}
                autoInstall={batchTrigger.has(map.id)}
                onBatchTriggered={() => clearBatchTrigger(map.id)}
                installStatus={installStatuses.get(map.id) ?? null}
                onInstallStatusChange={updateInstallStatus}
                priority={i < 5}
                badge={isPick ? LABEL_DAILY_PICK : undefined}
                caption={isPick ? dailyPick!.caption : undefined}
              />
            )
          })}
        </div>
```

Also update the `filtered.length === 0` check to use `displayMaps`:
```tsx
      {displayMaps.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-12">{STATUS_NO_MAPS_FOUND}</p>
      ) : (
```

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/maps/MapList.tsx
git commit -m "feat: pin daily pick as first card in MapList"
```

---

### Task 7: Homepage — fetch daily pick in parallel

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add daily pick state and parallel fetch to page.tsx**

In `src/app/page.tsx`, add the import for `MapEntry` type (it's already imported). Add a new state variable for the daily pick.

Find:
```ts
  const [maps, setMaps] = useState<MapEntry[]>([])
  const [loading, setLoading] = useState(true)
```

Change to:
```ts
  const [maps, setMaps] = useState<MapEntry[]>([])
  const [dailyPick, setDailyPick] = useState<{ map: MapEntry; caption: string } | null>(null)
  const [loading, setLoading] = useState(true)
```

- [ ] **Step 2: Fetch daily pick in parallel with maps**

Find the `fetchMaps` function:
```ts
  function fetchMaps() {
    setLoading(true)
    fetch('/api/maps')
      .then(r => r.ok ? r.json() : [])
      .then(setMaps)
      .finally(() => setLoading(false))
  }
```

Replace with:
```ts
  function fetchMaps() {
    setLoading(true)
    Promise.all([
      fetch('/api/maps').then(r => r.ok ? r.json() : []),
      fetch('/api/daily-pick').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([mapsData, pickData]) => {
      setMaps(mapsData)
      setDailyPick(pickData)
    }).finally(() => setLoading(false))
  }
```

- [ ] **Step 3: Pass dailyPick to MapList**

Find:
```tsx
          <MapList maps={maps} gameFolder={gameFolder} onPickFolder={handlePickFolder} />
```

Change to:
```tsx
          <MapList maps={maps} gameFolder={gameFolder} onPickFolder={handlePickFolder} dailyPick={dailyPick} />
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: fetch and display daily pick on homepage"
```

---

### Task 8: AdminMapList — "Set as pick" per-row UI

**Files:**
- Modify: `src/components/maps/AdminMapList.tsx`

- [ ] **Step 1: Add new imports and state**

In `src/components/maps/AdminMapList.tsx`, add the new message constants to the existing import:

Find the existing messages import and add `BTN_SET_AS_PICK`, `BTN_TODAY_PICK`, `BTN_CONFIRM_PICK`, `INFO_CAPTION_PLACEHOLDER`, `ERR_SET_PICK_FAILED`:

```ts
import {
  VALIDATE_SCREENSHOT_FORMAT, VALIDATE_SCREENSHOT_SIZE, MSG_SCREENSHOTS_UPLOADED,
  STATUS_SAVING_ORDER, STATUS_NO_MAPS_ADMIN, STATUS_NO_MAPS_FOUND,
  BTN_MOVE_UP, BTN_MOVE_DOWN, BTN_SHOW, BTN_HIDE, BTN_DELETE, STATUS_ELLIPSIS,
  STATUS_UPLOADING, BTN_ADD_SCREENSHOT, LABEL_SCREENSHOTS, INFO_SCREENSHOTS_UP_TO,
  LABEL_DELETE_CONFIRM, BTN_SET_AS_PICK, BTN_TODAY_PICK, BTN_CONFIRM_PICK,
  INFO_CAPTION_PLACEHOLDER, ERR_SET_PICK_FAILED,
} from '@/lib/constants/messages'
```

- [ ] **Step 2: Add daily pick state variables to AdminMapList**

Inside `AdminMapList`, after the existing `useState` declarations (e.g. after `const [isSaving, setIsSaving] = useState(false)`), add:

```ts
  const [currentPickId, setCurrentPickId] = useState<string | null>(null)
  const [settingPickId, setSettingPickId] = useState<string | null>(null)
  const [pickCaption, setPickCaption] = useState('')
  const [savingPick, setSavingPick] = useState(false)
```

- [ ] **Step 3: Fetch current daily pick on mount**

After the existing `useEffect(() => { setOrderedMaps(maps) }, [maps])`, add:

```ts
  useEffect(() => {
    fetch('/api/daily-pick')
      .then(r => r.ok ? r.json() : null)
      .then((data: { map: { id: string }; caption: string } | null) => {
        setCurrentPickId(data?.map.id ?? null)
      })
      .catch(() => {})
  }, [])
```

- [ ] **Step 4: Add setAsPick handler**

After the `uploadScreenshots` function (before the early return for empty maps), add:

```ts
  async function setAsPick(mapId: string) {
    setSavingPick(true)
    try {
      const res = await fetch('/api/admin/daily-pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId, caption: pickCaption }),
      })
      if (!res.ok) throw new Error('Failed')
      setCurrentPickId(mapId)
      setSettingPickId(null)
      setPickCaption('')
      push(`Daily pick set`, 'success')
    } catch {
      push(ERR_SET_PICK_FAILED, 'error')
    } finally {
      setSavingPick(false)
    }
  }
```

- [ ] **Step 5: Add "Set as pick" button to the expanded actions row**

In the expanded panel's actions row (`{/* Actions row */}`), after the Delete button (`</Button>` for delete), add:

```tsx
                  {/* Daily pick */}
                  {currentPickId === map.id ? (
                    <span className="text-xs font-mono px-2 py-1.5 rounded border border-[var(--accent-cyan)] text-[var(--accent-cyan)]">
                      {BTN_TODAY_PICK}
                    </span>
                  ) : settingPickId === map.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={pickCaption}
                        onChange={e => setPickCaption(e.target.value)}
                        placeholder={INFO_CAPTION_PLACEHOLDER}
                        maxLength={80}
                        className="text-xs font-mono px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--bg-inset)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)] w-44"
                      />
                      <button
                        onClick={() => { void setAsPick(map.id) }}
                        disabled={savingPick}
                        className="text-xs font-mono px-2 py-1.5 rounded bg-[var(--accent-cyan)] text-black disabled:opacity-50"
                      >
                        {savingPick ? STATUS_ELLIPSIS : BTN_CONFIRM_PICK}
                      </button>
                      <button
                        onClick={() => { setSettingPickId(null); setPickCaption('') }}
                        className="text-xs font-mono px-2 py-1.5 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSettingPickId(map.id)}
                    >
                      {BTN_SET_AS_PICK}
                    </Button>
                  )}
```

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

- [ ] **Step 7: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/maps/AdminMapList.tsx
git commit -m "feat: add set-as-daily-pick UI to AdminMapList"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: BUILD SUCCESS, no errors or warnings about the new files.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no new lint errors.

- [ ] **Step 3: Run all tests**

```bash
npm run test
```

Expected: all tests pass including the new `daily-pick-store` tests.

- [ ] **Step 4: Final commit if any lint fixes were needed**

```bash
git add -p
git commit -m "chore: fix lint issues in daily pick implementation"
```
