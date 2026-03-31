# Daily Pick Feature — Design Spec

**Date:** 2026-03-31  
**Status:** Approved

## Overview

Allow the admin to nominate one map as "Today's Pick". Users see it pinned as the first card in the homepage map grid with a "Today's Pick" badge and an optional caption. The pick resets automatically at UTC midnight — no cron job needed, expiry is checked at read time.

---

## Data Layer

**Firestore document:** `config/daily-pick`

```ts
interface DailyPick {
  mapId: string
  caption: string   // empty string if no caption
  setAt: string     // ISO timestamp, e.g. "2026-03-31T14:05:00.000Z"
}
```

**Expiry logic:** On read, compare `setAt` date (UTC) against the current UTC date. If they differ, the pick is expired and treated as absent. No writes needed to clear.

**New file:** `src/lib/maps/daily-pick-store.ts`

- `getDailyPick(): Promise<DailyPick | null>` — reads doc, returns null if missing or expired
- `setDailyPick(mapId: string, caption: string): Promise<void>` — writes doc with current timestamp
- `clearDailyPick(): Promise<void>` — deletes the doc (utility, not required by the flow)

---

## API Routes

### `GET /api/daily-pick`

- **Auth:** Public
- **Returns:** `{ map: MapEntry, caption: string } | null`
- **Logic:** Read `config/daily-pick`, check expiry, fetch full map doc, return combined object. Returns `null` if expired or not set.

### `POST /api/admin/daily-pick`

- **Auth:** Admin only — verified via `getSessionUser()` + email check (same pattern as existing admin routes)
- **Body:** `{ mapId: string, caption: string }`
- **Logic:** Validate `mapId` exists in `maps` collection, write to `config/daily-pick`
- **Returns:** `{ success: true }` or error

No DELETE route. Admin overwrites the pick by setting a new one; midnight expiry handles the rest.

---

## UI

### Homepage (`src/app/page.tsx`)

- Fetch `/api/daily-pick` in parallel with `/api/maps`
- If a pick exists, prepend its `MapEntry` to the map list (deduplicated — remove it from its original position if it appears in the main list)
- Pass `dailyPick: true` and `caption` as props down to the card

### `MapCard` component

- Accepts an optional `badge?: string` prop and `caption?: string` prop
- When `badge` is present, renders a small pill label above the map name using `--accent-cyan` token
- Caption renders below the map name in muted text if non-empty

### Admin map list (`src/components/maps/AdminMapList.tsx`)

- Each map row gets a "Set as pick" button
- On click: opens a small inline caption input with a confirm button, then calls `POST /api/admin/daily-pick`
- If this map is already today's pick: button shows "Today's pick" in a highlighted/disabled state
- After setting, the previously highlighted row reverts to normal

---

## Error Handling

- If `/api/daily-pick` fails, homepage renders without a pick (graceful degradation — no error shown to user)
- If `POST /api/admin/daily-pick` fails, admin sees an error toast (existing `NotificationProvider` pattern)
- If the picked map is later deleted, `GET /api/daily-pick` returns `null` (map doc fetch returns nothing)

---

## Testing

- Unit: `getDailyPick()` returns null when `setAt` is yesterday
- Unit: `getDailyPick()` returns the pick when `setAt` is today
- Integration: `POST /api/admin/daily-pick` rejects unauthenticated requests
- Integration: `GET /api/daily-pick` returns null after pick expires
