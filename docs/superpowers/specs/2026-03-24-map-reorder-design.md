# Map Reorder Design

## Goal

Allow admins to reorder maps in the admin list using ↑/↓ buttons. The order persists to Firestore and is reflected on the public map list.

## Data Model

Add `order?: number` (optional) to `MapEntry` in `src/types/map.ts`.

- Existing maps without `order` sort last (behind maps that have it), using `uploadedAt` desc as tiebreaker.
- When admin first reorders, all maps get their current index written as `order`.
- New maps added via upload or submission approval default to `order: 0` (prepended to list).

## Storage Layer

**`src/lib/maps/maps-store.ts`:**

- `getMaps()`: change `.orderBy('uploadedAt', 'desc')` to `.orderBy('order').orderBy('uploadedAt', 'desc')`. Maps without `order` will not appear in the `orderBy('order')` result unless Firestore has an index — use a composite index or client-side sort fallback.
  - Simpler approach: fetch all, then sort client-side in `getMaps()` using: maps with `order` first (ascending), then maps without `order` sorted by `uploadedAt` desc.
- `reorderMaps(ids: string[]): Promise<void>`: uses a Firestore batch to write `order: index` for each ID in the array.
- `docToMapEntry`: read `order` field: `order: data.order !== undefined ? (data.order as number) : undefined`.
- `addMap`: write `order: 0` when creating a new map.

## API

**`POST /api/admin/maps/reorder`**

- Admin-only (403 if not admin).
- Body: `{ ids: string[] }` — full ordered list of all map IDs.
- Calls `reorderMaps(ids)`.
- Returns `{ ok: true }` on success, `{ error: string }` on failure.

## UI

**`src/components/maps/AdminMapList.tsx`:**

- Add `onReorder?: (newMaps: MapEntry[]) => void` prop.
- Local state `orderedMaps` initialized from `maps` prop, updated on ↑/↓ clicks.
- ↑ button: disabled on first item. ↓ button: disabled on last item.
- On click: swap adjacent items in `orderedMaps`, call `onReorder(orderedMaps)`, POST to `/api/admin/maps/reorder` with new ID order.
- While POST is in flight: buttons disabled, show a subtle saving indicator.
- On POST error: revert `orderedMaps` to pre-click state.

**`src/app/admin/page.tsx` (client component):**

- Pass `onReorder` handler that updates local maps state to the new order.

## Error Handling

- If `reorder` POST fails, UI reverts to previous order and shows an error notification via `useNotifications().push(...)`.

## Testing

- Unit test `reorderMaps` mock: verify batch writes correct `order` values.
- Unit test sort logic in `getMaps`: maps with `order` come first ascending, then maps without sorted by `uploadedAt` desc.
