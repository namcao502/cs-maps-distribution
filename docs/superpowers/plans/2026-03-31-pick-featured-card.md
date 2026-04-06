# Pick Featured Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** COMPLETE — implemented in commit `de1edc0`

**Goal:** Render the Today's Pick map card as a full-width horizontal "featured" card that breaks out of the normal grid.

**Architecture:** Add `featured?: boolean` to `MapCard` props. When true, an early return renders a flex-row layout (thumbnail left, body right) with a pill badge inside the thumbnail. In `MapList`, wrap each grid card in a `<div>` — the pick card's wrapper gets `col-span-full`. No other files change.

**Tech Stack:** React, Tailwind v4, Jest + @testing-library/react.

> **Note:** Do NOT commit after completing tasks. The user will commit manually.

---

### Task 1: Add `featured` layout to MapCard

**Files:**
- Modify: `src/components/maps/MapCard.tsx`
- Test: `tests/components/maps/MapCard.test.tsx`

- [x] **Step 1: Write two failing tests**

Add at the end of `tests/components/maps/MapCard.test.tsx` (before the final closing of the file):

```tsx
test('featured prop renders badge pill inside thumbnail', () => {
  render(<MapCard {...defaultProps} badge="Today's Pick" caption="Great map" featured />)
  const thumb = screen.getByTestId('card-thumbnail')
  // badge text must be inside the thumbnail
  expect(thumb).toHaveTextContent("Today's Pick")
  const allMatches = screen.getAllByText("Today's Pick")
  allMatches.forEach(el => expect(thumb).toContainElement(el))
  // caption must be in the document (rendered in body, not thumbnail)
  expect(screen.getByText('Great map')).toBeInTheDocument()
})

test('featured without badge renders no badge text', () => {
  render(<MapCard {...defaultProps} featured />)
  expect(screen.queryByText("Today's Pick")).not.toBeInTheDocument()
})
```

- [x] **Step 2: Run tests to verify they fail**

```bash
cd C:\TEST\cs-maps-distribution && npx jest tests/components/maps/MapCard.test.tsx --verbose 2>&1 | tail -20
```

Expected: the two new tests FAIL (`featured` prop does not exist yet).

- [x] **Step 3: Add `featured` prop and implement the featured layout**

In `src/components/maps/MapCard.tsx`, make two edits:

**Edit A — Add `featured = false` to the props destructuring and type.**

Find:
```tsx
  badge,
  caption,
}: {
```
Replace with:
```tsx
  badge,
  caption,
  featured = false,
}: {
```

Find:
```tsx
  badge?: string
  caption?: string
}) {
```
Replace with:
```tsx
  badge?: string
  caption?: string
  featured?: boolean
}) {
```

**Edit B — Add the featured early return.**

After the closing brace of `phaseLabel` (the last computed value before `return`), insert the following block. The exact insertion point is after:
```tsx
    : null
```
...that closes the `phaseLabel` ternary. Insert before the existing `return (`:

```tsx
  if (featured) {
    return (
      <div
        className={`bg-[var(--bg-surface)] border rounded-lg overflow-hidden flex flex-row transition-[colors,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 ${cardBorder}`}
        style={badge && !isInstalling ? { boxShadow: '0 0 0 1px rgba(6,182,212,0.15), 0 0 20px rgba(6,182,212,0.15)' } : undefined}
      >
        {/* Thumbnail */}
        <div
          data-testid="card-thumbnail"
          className="relative w-40 self-stretch cursor-pointer shrink-0"
          style={{ background: screenshotUrl ? undefined : 'linear-gradient(135deg, #1a2744, #0f1e3a)' }}
          onClick={() => onOpenDetail(map)}
        >
          {screenshotUrl && (
            <Image src={screenshotUrl} alt={map.originalName} fill unoptimized className="object-cover" loading={priority ? 'eager' : 'lazy'} />
          )}
          {!screenshotUrl && (
            <>
              <style>{`[data-map-placeholder="${map.id}"]::before { content: "${map.originalName}"; display: block; color: var(--text-muted); font-family: monospace; font-size: 10px; text-align: center; opacity: 0.6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }`}</style>
              <div
                className="absolute inset-0 flex items-center justify-center px-2 pointer-events-none"
                aria-hidden="true"
                data-testid="card-thumbnail-placeholder"
                data-map-placeholder={map.id}
              />
            </>
          )}
          {typeBadge && (
            <span
              className="absolute top-1.5 left-2 text-xs font-mono font-bold px-1.5 py-0.5 rounded-sm text-black inline-block text-center min-w-[7rem]"
              style={{ background: typeBadge.color }}
            >
              {typeBadge.label}
            </span>
          )}
          {onToggleSelect && (
            <button
              className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-orange)] rounded-sm"
              onClick={e => { e.stopPropagation(); onToggleSelect() }}
              aria-label={selected ? 'Deselect' : 'Select'}
            >
              <span
                className="w-4 h-4 rounded-sm border flex items-center justify-center"
                style={{
                  background: selected ? 'var(--accent-orange)' : 'rgba(0,0,0,0.5)',
                  borderColor: selected ? 'var(--accent-orange)' : 'var(--text-muted)',
                }}
              >
                {selected && <span className="text-black text-xs font-bold leading-none">✓</span>}
              </span>
            </button>
          )}
          {isInstalling && (
            <div
              className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--border)]"
              role="progressbar"
              aria-valuenow={Math.round(downloadProgress ?? 50)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Download progress"
            >
              <div
                className="h-full bg-[var(--accent-orange)] transition-all duration-300"
                style={{ width: `${downloadProgress ?? 50}%` }}
              />
            </div>
          )}
          {installed && !isInstalling && (
            <div className="absolute inset-0 bg-[var(--accent-green)] opacity-5 pointer-events-none" />
          )}
          {badge && !isInstalling && (
            <div
              className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-sm pointer-events-none"
              style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid var(--accent-cyan)' }}
            >
              <span style={{ color: 'var(--accent-cyan)', fontSize: 10 }}>★</span>
              <span className="text-[9px] font-mono font-bold" style={{ color: 'var(--accent-cyan)' }}>
                {badge}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col justify-between flex-1 px-3 py-2.5 min-w-0">
          <div>
            <button
              type="button"
              className="text-sm font-mono font-bold text-[var(--accent-cyan)] mb-1 cursor-pointer hover:opacity-80 truncate text-left w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-cyan)] rounded-sm"
              onClick={() => onOpenDetail(map)}
            >
              {map.originalName}
            </button>
            {caption && (
              <p className="text-[10px] text-[var(--text-muted)] font-mono mb-2 line-clamp-2">{caption}</p>
            )}
          </div>
          <div className="flex justify-between items-end gap-2">
            <div className="text-[var(--text-muted)] text-xs font-mono">
              {isInstalling && phaseLabel ? (
                <span className="text-[var(--accent-orange)] truncate">{phaseLabel}</span>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <span>{formatBytes(map.size)}</span>
                  <span className={`flex items-center gap-1 ${installCount > 100 ? 'text-[var(--accent-orange)]' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {installCount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            {supportsFileApi ? (
              confirmReinstall ? (
                <div className="flex gap-1 shrink-0">
                  <button
                    className="py-1.5 px-3 rounded text-xs font-mono font-bold bg-[var(--accent-orange)] text-black hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-orange)]"
                    onClick={() => { setConfirmReinstall(false); void doInstall() }}
                  >
                    {BTN_REINSTALL}
                  </button>
                  <button
                    className="px-2 py-1.5 rounded text-xs font-mono text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-orange)]"
                    onClick={() => setConfirmReinstall(false)}
                  >
                    {BTN_CANCEL}
                  </button>
                </div>
              ) : (
                <button
                  className={`shrink-0 py-1.5 px-4 rounded text-xs font-mono font-bold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-orange)] ${
                    isInstalling
                      ? 'bg-[var(--bg-inset)] text-[var(--accent-orange)] border border-[var(--accent-orange)]'
                      : installed
                        ? 'bg-transparent text-[var(--accent-green)] border border-[var(--accent-green)] hover:opacity-80'
                        : 'bg-[var(--accent-orange)] text-black hover:opacity-90'
                  }`}
                  onClick={() => { if (isInstalling) return; if (installed) { setConfirmReinstall(true) } else { void doInstall() } }}
                  disabled={isInstalling}
                >
                  {isInstalling ? BTN_INSTALLING : installed ? BTN_INSTALLED : BTN_INSTALL}
                </button>
              )
            ) : (
              <button
                aria-label="install (download)"
                className="shrink-0 py-1.5 px-4 rounded text-xs font-mono font-bold bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-orange)]"
                onClick={handleRawDownload}
              >
                {BTN_DOWNLOAD}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

```

- [x] **Step 4: Run tests to verify they pass**

```bash
cd C:\TEST\cs-maps-distribution && npx jest tests/components/maps/MapCard.test.tsx --verbose 2>&1 | tail -20
```

Expected: all tests pass including the two new ones.

- [x] **Step 5: Run full test suite**

```bash
cd C:\TEST\cs-maps-distribution && npm run test 2>&1 | tail -10
```

Expected: all tests pass.

---

### Task 2: Wire up featured card in MapList

**Files:**
- Modify: `src/components/maps/MapList.tsx`

- [x] **Step 1: Wrap each card in a div and pass `featured` to the pick card**

In `src/components/maps/MapList.tsx`, find the grid rendering block:

```tsx
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-[10px]">
          {displayMaps.map((map, i) => {
            const isPick = pickPassesFilter && map.id === dailyPick!.map.id
            return (
              <MapCard
                key={map.id}
                map={map}
```

Replace with:

```tsx
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-[10px]">
          {displayMaps.map((map, i) => {
            const isPick = pickPassesFilter && map.id === dailyPick!.map.id
            return (
              <div key={map.id} className={isPick ? 'col-span-full' : ''}>
              <MapCard
                map={map}
```

Then find the closing of `<MapCard` (the line with `/>`) followed by `)})` and add the closing `</div>`:

Find:
```tsx
              />
            )
          })}
        </div>
```

Replace with:
```tsx
              />
              </div>
            )
          })}
        </div>
```

Also add `featured={isPick}` to the `<MapCard` props. Find within the MapCard props block:

```tsx
                badge={isPick ? LABEL_DAILY_PICK : undefined}
                caption={isPick ? dailyPick!.caption : undefined}
```

Replace with:

```tsx
                badge={isPick ? LABEL_DAILY_PICK : undefined}
                caption={isPick ? dailyPick!.caption : undefined}
                featured={isPick}
```

- [x] **Step 2: Run full test suite and build**

```bash
cd C:\TEST\cs-maps-distribution && npm run test 2>&1 | tail -10
```

```bash
cd C:\TEST\cs-maps-distribution && npm run build 2>&1 | tail -10
```

Expected: all tests pass, build succeeds with no errors.
