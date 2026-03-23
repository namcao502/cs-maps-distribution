# Batch Install Design

## Goal

Allow users to select multiple maps and install them all in parallel with one click.

## State

**`src/components/MapList.tsx`** manages two new state variables:
- `selectedIds: Set<string>` — IDs of currently checked maps
- `batchTrigger: Set<string>` — IDs of maps whose install should auto-start; populated on "Install Selected" click, cleared per map after it triggers

## MapCard Changes (`src/components/MapCard.tsx`)

Four new props:
```ts
selected: boolean
onToggleSelect: () => void
autoInstall: boolean
onBatchTriggered: () => void
```

**Checkbox:** Always visible, rendered before the format badge in the left side of the card. Clicking it calls `onToggleSelect()`. Add `e.stopPropagation()` on the checkbox click to prevent unintended event bubbling.

**Auto-install effect:** Calls `handleInstall()` (not `doInstall()` directly) so that already-installed maps correctly show the reinstall confirmation modal. After `handleInstall()` resolves, calls `onBatchTriggered()` to remove this map from `batchTrigger`:
```ts
useEffect(() => {
  if (!autoInstall) return
  async function run() {
    await handleInstall()
    onBatchTriggered()
  }
  run()
}, [autoInstall])
```

> Note: `handleInstall` is already defined in the component. `doInstall` must NOT be called directly here — it skips the `installed` check and the reinstall confirmation modal.

## MapList Changes (`src/components/MapList.tsx`)

**New state:**
```ts
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
const [batchTrigger, setBatchTrigger] = useState<Set<string>>(new Set())
```

**Toggle select:**
```ts
function toggleSelect(id: string) {
  setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
}
```

**Trigger batch install:**
```ts
function triggerBatchInstall() {
  setBatchTrigger(new Set(selectedIds))
  setSelectedIds(new Set())
}
```

**Clear a map from batchTrigger after it starts:**
```ts
function clearBatchTrigger(id: string) {
  setBatchTrigger(prev => {
    const next = new Set(prev)
    next.delete(id)
    return next
  })
}
```

**"Install Selected" button:** Rendered between the tag chips block and the map list, only when `selectedIds.size > 0`:
```tsx
{selectedIds.size > 0 && (
  <button
    onClick={triggerBatchInstall}
    className="..."
  >
    ⚙ Install Selected ({selectedIds.size})
  </button>
)}
```

**Props passed to each MapCard:**
```tsx
selected={selectedIds.has(map.id)}
onToggleSelect={() => toggleSelect(map.id)}
autoInstall={batchTrigger.has(map.id)}
onBatchTriggered={() => clearBatchTrigger(map.id)}
```

## Already-installed maps

Because the useEffect calls `handleInstall()`, already-installed maps will show the existing `ConfirmModal` reinstall prompt as normal. The user must confirm each reinstall individually.

## Files Affected

| File | Change |
|------|--------|
| `src/components/MapList.tsx` | Add selectedIds, batchTrigger state; toggle/trigger/clear functions; "Install Selected" button; pass new props to MapCard |
| `src/components/MapCard.tsx` | Add 4 new props; checkbox UI; autoInstall useEffect calling handleInstall then onBatchTriggered |

## Out of Scope

- Select all / deselect all button
- Batch progress summary view
- Disabling individual install buttons while batch is running
