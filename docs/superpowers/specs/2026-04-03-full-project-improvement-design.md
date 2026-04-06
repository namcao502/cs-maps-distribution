# Full Project Improvement Design

**Date**: 2026-04-03
**Project**: cs-maps-distribution
**Approach**: Option A — 4 parallel independent tracks

---

## Context

Audit of the full codebase (6,063 lines, ~100 files, 23 API routes, 39 test files) identified
improvement areas across security, test coverage, code quality, and performance. Overall
architecture is solid. Issues are cross-cutting concerns, not fundamental design flaws.

---

## Track 1: Security & Production Hardening

### 1a. Rate Limiting

Add `src/lib/rate-limit.ts` — in-memory sliding window utility (no external dependency).
Applied inside route handlers for per-route control, not as global middleware.

| Route | Limit |
|---|---|
| `/api/submit` | 3 submissions per user per hour |
| `/api/download/[id]` | 30 requests per IP per minute |
| `/api/auth/session` | 10 attempts per IP per minute |
| `/api/maps` | 60 requests per IP per minute |

### 1b. Error Boundary

Add `src/app/error.tsx` — catches page-level component crashes, renders fallback UI.
Add `src/app/global-error.tsx` — catches root layout crashes.
Both use Next.js App Router error boundary convention.

### 1c. Silent Catches

Replace 6 empty `catch {}` blocks in admin routes with structured logging:
```ts
catch (err) {
  console.error('route.action.failed', { route, action, error: (err as Error).message })
  return NextResponse.json({ error: 'Internal error' }, { status: 500 })
}
```

Affected routes:
- `app/admin/page.tsx`
- `app/api/admin/daily-pick/route.ts`
- `app/api/admin/maps/reorder/route.ts`
- `app/api/admin/maps/[id]/hidden/route.ts`
- `app/api/admin/maps/[id]/tags/route.ts`
- `app/api/auth/session/route.ts`

### 1d. CSP Nonces

Add per-request nonces to replace `unsafe-inline` via Next.js 16 proxy.

> **Next.js 16 note:** Middleware is `src/proxy.ts` (not `middleware.ts`). The existing `proxy.ts` covers `/admin/:path*` only. CSP nonces must run on all routes, so the proxy needs a second matcher or the existing matcher must be broadened.

Steps:
1. Extend `src/proxy.ts` — add nonce generation using `crypto.randomUUID()`, set `x-nonce` and `Content-Security-Policy` response headers for every request (excluding `_next/static`, `_next/image`, and favicon). The auth redirect for `/admin` stays as a separate check within the same proxy function.
2. Read nonce in `src/app/layout.tsx` via `await headers()` and pass to any `<Script>` tags that need it.
3. No `next.config.ts` CSP change needed — the proxy sets the header directly on the response.

Pattern (from Next.js 16 docs):
```ts
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; ...`
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}
```

---

## Track 2: Test Coverage

**Target after track**: install.ts ~80%, MapCard ~65%, MapList ~65%, overall ~75%

### 2a. E2E Tests with Playwright

Install: `@playwright/test` as devDependency.
Config: `playwright.config.ts` at project root.
Test files: `tests/e2e/`

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
```

Flows:
- `install.spec.ts` — Browse page, click install, mock FSA via `page.evaluate()`, verify success toast
- `submit.spec.ts` — Sign in, upload zip, fill metadata, submit, verify pending state shown
- `admin-approve.spec.ts` — Sign in as admin, open submissions, approve, verify map in browse

### 2b. Unit Tests for Install Pipeline

File: `tests/lib/maps/install.test.ts`

Coverage targets:
- Archive structure detection: `game-root`, `cs-subfolder`, `bare-files`
- SHA256 verification: pass and fail cases
- File write path construction per structure type
- Error states: corrupt archive, wrong folder, permission denied

`FileSystemDirectoryHandle` mocked via hand-written fake object (no library).

### 2c. Component Tests for MapCard and MapList

Environment: jsdom via `@jest-environment jsdom` docblock.

`tests/components/MapCard.test.tsx`:
- Renders install button
- Triggers install on click
- Shows each install progress state

`tests/components/MapList.test.tsx`:
- Filters by search query
- Batch select/deselect behavior
- Pagination (next/prev page)

All network calls mocked via `jest.spyOn(global, 'fetch')`.

---

## Track 3: Code Quality

### 3a. Zod Schema Validation

Install: `zod` as production dependency.
New directory: `src/lib/schemas/`

Files:
- `map-schema.ts` — map metadata shape
- `submission-schema.ts` — submission request body
- `tag-schema.ts` — tag list validated against `MAP_TAGS` whitelist

Replace `JSON.parse` + try-catch in route handlers with `schema.safeParse()`. Typed output
flows through handlers with no untyped values.

### 3b. XHR to Fetch

Refactor `UploadForm.tsx` and `SubmitForm.tsx`:
- Note: `fetch()` does not support upload progress natively in current browsers.
  `XMLHttpRequest.upload.onprogress` is the only reliable mechanism for this.
- If upload progress UI must be preserved, keep XHR but extract it into a shared
  `src/lib/upload-client.ts` helper so both forms use the same implementation.
- If upload progress can be dropped (replaced with indeterminate spinner), replace
  with `fetch()` for full consistency. Decision to be made during implementation.
- Either way, the two forms must use the same pattern.

### 3c. MapCard / MapList Component Split

**MapCard** (451 lines → 3 files):
- `MapCard.tsx` — shell, props interface, memo wrapper (~100 lines)
- `MapCardInstall.tsx` — install button, progress state machine (~150 lines)
- `MapCardOverlay.tsx` — badge, caption, selection overlay (~100 lines)

**MapList** (432 lines → 2 files):
- `MapList.tsx` — filter bar, pagination, batch toolbar (~180 lines)
- `MapListGrid.tsx` — grid layout, card rendering, skeleton states (~150 lines)

Note: 16-prop `MapCard` interface unchanged — component split is the priority. Context
refactor is a separate, larger change.

### 3d. API Client Abstraction

New file: `src/lib/api-client.ts`

Typed wrapper around `fetch` handling:
- JSON parsing
- Error response normalization
- Common request headers

All client-side `fetch()` calls in components migrate to use it. One place to add auth
headers, retry logic, or logging later.

---

## Track 4: Performance & Observability

### 4a. React.lazy for Heavy Components

Lazy-load components not needed on initial render:
- `MapDetailModal` — only shown on card click
- `UploadForm` — admin-only
- `LaunchSetupModal` — only shown when CS launch is unconfigured

Pattern at each call site:
```tsx
const MapDetailModal = React.lazy(() => import('./MapDetailModal'))
// wrapped in <Suspense fallback={<Skeleton />}>
```

### 4b. Structured Logger

New file: `src/lib/logger.ts`

Interface:
```ts
logger.error('submission.approve.failed', { submissionId, error: err.message })
logger.info('map.install.completed', { mapId })
```

Implementation:
- Development: outputs to `console`
- Production: outputs JSON lines to `process.stdout` (parseable by Vercel Logs, Datadog, Logtail)
- No external dependency

Replaces all 7 `console.error` calls in server routes.

### 4c. SWR for Maps List

Install: `swr` as production dependency.

Replace `useEffect` + `fetch` in `MapList.tsx` with `useSWR`:
- Client-side cache key prevents re-fetch if data is fresh (matches 180s server cache)
- Free revalidation-on-focus behavior
- Cleaner loading/error state handling

**Coordination note**: Track 3c splits `MapList.tsx` into `MapList.tsx` + `MapListGrid.tsx`.
The SWR change in 4c belongs in the new `MapList.tsx` shell (filter/fetch layer).
If Track 3c and Track 4c run in parallel, merge Track 3c first, then apply 4c on top.

---

## Files Changed Summary

| Track | New Files | Modified Files |
|---|---|---|
| 1: Security | `src/lib/rate-limit.ts`, `src/app/error.tsx`, `src/app/global-error.tsx` | `src/proxy.ts`, 6 admin routes |
| 2: Tests | `playwright.config.ts`, `tests/e2e/*.spec.ts`, `tests/lib/maps/install.test.ts`, `tests/components/*.test.tsx` | None |
| 3: Quality | `src/lib/schemas/*.ts`, `src/lib/api-client.ts`, `src/components/maps/MapCardInstall.tsx`, `src/components/maps/MapCardOverlay.tsx`, `src/components/maps/MapListGrid.tsx` | `MapCard.tsx`, `MapList.tsx`, `UploadForm.tsx`, `SubmitForm.tsx`, affected routes |
| 4: Performance | `src/lib/logger.ts` | `MapCard.tsx`, `MapList.tsx`, 7 server routes |

---

## Out of Scope

- Role-based access control (single admin is acceptable for current scale)
- Redis-backed rate limiting (in-memory sufficient for current traffic)
- MapCard context refactor (16-prop interface unchanged for now)
- CSP nonce for third-party scripts (only first-party scripts in scope)
