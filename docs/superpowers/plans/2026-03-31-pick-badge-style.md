# Pick Badge Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the "Today's Pick" indicator from a pill badge in the card info zone to a gradient overlay at the bottom of the card thumbnail.

**Architecture:** Single file change in `src/components/maps/MapCard.tsx`. Remove the `badge` pill `<span>` from the info zone (lines 215-220). Add an absolutely-positioned gradient overlay div inside the thumbnail zone, rendered when `badge` is truthy and `isInstalling` is false (avoids clash with the progress bar at the same position). Props and data flow are unchanged.

**Tech Stack:** React, Tailwind v4, CSS custom properties (`--accent-cyan`).

---

### Task 1: Move badge from info zone pill to thumbnail overlay

**Files:**
- Modify: `src/components/maps/MapCard.tsx`
- Test: `tests/components/maps/MapCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add these two tests at the end of `tests/components/maps/MapCard.test.tsx` (before the final closing of the file):

```tsx
test('badge prop renders overlay inside thumbnail, not as a pill in info zone', () => {
  render(<MapCard {...defaultProps} badge="Today's Pick" />)
  const thumb = screen.getByTestId('card-thumbnail')
  // badge text should be inside the thumbnail zone
  expect(thumb).toHaveTextContent("Today's Pick")
  // should NOT be a cyan pill above the map name in info zone
  // (info zone does not contain card-thumbnail, so querying outside thumb should not find it)
  const infoZone = thumb.parentElement!.querySelector('.px-2\\.5') as HTMLElement
  if (infoZone) {
    expect(infoZone).not.toHaveTextContent("Today's Pick")
  }
})

test('badge overlay is not rendered when badge prop is absent', () => {
  render(<MapCard {...defaultProps} />)
  expect(screen.queryByText("Today's Pick")).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:\TEST\cs-maps-distribution && npx jest tests/components/maps/MapCard.test.tsx -v 2>&1 | tail -20
```

Expected: the two new tests FAIL (badge currently renders as a pill in the info zone, not the thumbnail).

- [ ] **Step 3: Apply the change to MapCard.tsx**

In `src/components/maps/MapCard.tsx`, make two edits:

**Edit A — Remove the pill badge from the info zone (lines 215-220).**

Find:
```tsx
        {badge && (
          <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm mb-1"
            style={{ background: 'var(--accent-cyan)', color: 'black' }}>
            {badge}
          </span>
        )}
```

Delete those 5 lines entirely.

**Edit B — Add the gradient overlay inside the thumbnail zone.**

Inside the thumbnail `<div>` (the one with `data-testid="card-thumbnail"`), find the installed green tint overlay at the very end of the thumbnail zone:
```tsx
        {installed && !isInstalling && (
          <div className="absolute inset-0 bg-[var(--accent-green)] opacity-5 pointer-events-none" />
        )}
```

After that closing `)}`, add:
```tsx
        {badge && !isInstalling && (
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center gap-1 px-2 py-1 pointer-events-none"
            style={{ background: 'linear-gradient(transparent, rgba(6,182,212,0.22))' }}
          >
            <span style={{ color: 'var(--accent-cyan)', fontSize: 11 }}>★</span>
            <span className="text-[9px] font-mono font-bold tracking-wide" style={{ color: 'var(--accent-cyan)' }}>
              {badge}
            </span>
          </div>
        )}
```

- [ ] **Step 4: Run the new tests to verify they pass**

```bash
cd C:\TEST\cs-maps-distribution && npx jest tests/components/maps/MapCard.test.tsx -v 2>&1 | tail -25
```

Expected: all tests in the file PASS including the two new ones.

- [ ] **Step 5: Run full test suite and build**

```bash
cd C:\TEST\cs-maps-distribution && npm run test 2>&1 | tail -10 && npm run build 2>&1 | tail -10
```

Expected: all tests pass, build succeeds with no errors.
