# Batch Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add always-visible checkboxes to map cards so users can select multiple maps and install them all in parallel with one "Install Selected" button.

**Architecture:** Pure frontend change. `MapList` tracks `selectedIds` and `batchTrigger` state. Each `MapCard` receives 4 new props: `selected`, `onToggleSelect`, `autoInstall`, `onBatchTriggered`. When `autoInstall` becomes true, a `useEffect` calls the existing `handleInstall()` then fires `onBatchTriggered()` to clear itself from the trigger set.

**Tech Stack:** React hooks, TypeScript, Tailwind CSS. No backend changes.

---

### Task 1: Add new props and checkbox to MapCard

**Files:**
- Modify: `src/components/MapCard.tsx`

**Context:** `MapCard` currently receives `map`, `gameFolder`, `onPickFolder`, `installedBsps`, `onInstalled`. We add 4 new props. The checkbox goes before the format badge in the left side of the card. The `autoInstall` effect calls `handleInstall()` — the existing function that correctly handles the reinstall confirmation modal.

Current left side of card (around line 102):
```tsx
<div className="flex items-center gap-3 min-w-0">
  <span className={`shrink-0 text-xs font-bold ...`}>
    {map.format}
  </span>
```

- [ ] **Step 1: Add new props to the component signature**

Update the props destructuring and type:

```tsx
export function MapCard({
  map,
  gameFolder,
  onPickFolder,
  installedBsps,
  onInstalled,
  selected = false,
  onToggleSelect,
  autoInstall = false,
  onBatchTriggered,
}: {
  map: MapEntry
  gameFolder: FileSystemDirectoryHandle | null
  onPickFolder: () => Promise<void>
  installedBsps: Set<string>
  onInstalled: () => void
  selected?: boolean
  onToggleSelect?: () => void
  autoInstall?: boolean
  onBatchTriggered?: () => void
})
```

- [ ] **Step 2: Add autoInstall useEffect**

Add after the existing `useEffect` for `installedBsps` (around line 42):

```ts
useEffect(() => {
  if (!autoInstall) return
  async function run() {
    await handleInstall()
    onBatchTriggered?.()
  }
  run()
}, [autoInstall])
```

> Note: For already-installed maps, `handleInstall()` returns early (shows the reinstall modal) so `onBatchTriggered()` fires before the user confirms — this is acceptable; it simply removes the map from the trigger set immediately rather than after reinstall completes.

> Note: ESLint may warn about missing deps in this effect. Add `// eslint-disable-next-line react-hooks/exhaustive-deps` if needed — `handleInstall` and `onBatchTriggered` intentionally omitted to prevent re-triggering on every render.

- [ ] **Step 3: Add checkbox before format badge**

In the JSX, before the format `<span>`, add:

```tsx
<div className="flex items-center gap-3 min-w-0">
  <input
    type="checkbox"
    checked={selected}
    onChange={e => { e.stopPropagation(); onToggleSelect?.() }}
    className="w-4 h-4 shrink-0 cursor-pointer accent-blue-500"
  />
  <span className={`shrink-0 text-xs font-bold ...`}>
```

- [ ] **Step 4: Build to verify**

```bash
npm run build
```

Expected: Clean build. MapCard now accepts the new props (all optional, so existing usages don't break).

---

### Task 2: Add batch state and UI to MapList

**Files:**
- Modify: `src/components/MapList.tsx`

**Context:** `MapList` already has `query` and `selectedTags` state and renders `<MapCard>` for each filtered map. We add `selectedIds` and `batchTrigger` Sets, wire up the toggle/trigger/clear functions, add the "Install Selected" button between the tag chips and the map list, and pass the 4 new props to each `MapCard`.

- [ ] **Step 1: Add selectedIds and batchTrigger state**

After the existing `useState` declarations:

```ts
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
const [batchTrigger, setBatchTrigger] = useState<Set<string>>(new Set())
```

- [ ] **Step 2: Add toggle, trigger, and clear functions**

After the existing `handleInstalled` function:

```ts
function toggleSelect(id: string) {
  setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
}

function triggerBatchInstall() {
  setBatchTrigger(new Set(selectedIds))
  setSelectedIds(new Set())
}

function clearBatchTrigger(id: string) {
  setBatchTrigger(prev => {
    const next = new Set(prev)
    next.delete(id)
    return next
  })
}
```

- [ ] **Step 3: Add "Install Selected" button between tag chips and map list**

The current JSX has the tag chips block followed by the empty state / map list. Insert the button between them:

```tsx
      </div>{/* end tag chips div */}

      {selectedIds.size > 0 && (
        <button
          onClick={triggerBatchInstall}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 active:scale-95 transition-all"
        >
          ⚙ Install Selected ({selectedIds.size})
        </button>
      )}

      {filtered.length === 0 ? (
```

- [ ] **Step 4: Pass new props to MapCard**

Update the `<MapCard>` usage in the filtered map list:

```tsx
<MapCard
  key={map.id}
  map={map}
  gameFolder={gameFolder}
  onPickFolder={onPickFolder}
  installedBsps={installedBsps}
  onInstalled={handleInstalled}
  selected={selectedIds.has(map.id)}
  onToggleSelect={() => toggleSelect(map.id)}
  autoInstall={batchTrigger.has(map.id)}
  onBatchTriggered={() => clearBatchTrigger(map.id)}
/>
```

- [ ] **Step 5: Build and run tests**

```bash
npm run build && npm test
```

Expected: Clean build, all tests pass.

- [ ] **Step 6: Commit everything for feature D**

```bash
git add src/components/MapCard.tsx src/components/MapList.tsx
git commit -m "feat: add batch install with always-visible checkboxes and parallel install"
```
