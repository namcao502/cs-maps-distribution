# CS 1.6 Map Distribution Web App — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js web app where the admin uploads CS 1.6 map archives and friends install them directly into their game folder in one click.

**Architecture:** Next.js App Router on Vercel, Cloudflare R2 (private) for storage, presigned URLs for downloads, all extraction happens client-side in the browser via fflate / 7z-wasm / unrar-wasm.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, fflate, 7z-wasm, unrar-wasm, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bcryptjs, jose, uuid, Jest

**Spec:** `docs/superpowers/specs/2026-03-22-cs-map-distribution-design.md`

---

## File Structure

```
src/
  app/
    page.tsx                        # Download page (public)
    admin/
      page.tsx                      # Admin page (password protected)
    api/
      auth/route.ts                 # POST /api/auth
      maps/route.ts                 # GET /api/maps
      upload/route.ts               # POST /api/upload
      download/[id]/route.ts        # GET /api/download/[id]
      delete/[id]/route.ts          # DELETE /api/delete/[id]
  lib/
    r2.ts                           # R2 client: get/put/delete/presign
    auth.ts                         # bcrypt verify + JWT sign/verify
    hash.ts                         # SHA-256 computation (server-side only — uses Node crypto)
    maps-store.ts                   # maps.json read/write in R2
    extractors/
      types.ts                      # ExtractedFile, ArchiveStructure types
      detect.ts                     # Structure detection from entry paths
      zip.ts                        # ZIP extraction via fflate
      sevenz.ts                     # 7Z extraction via 7z-wasm
      rar.ts                        # RAR extraction via unrar-wasm
      index.ts                      # Format router
    install.ts                      # File System Access API orchestration
  types/
    map.ts                          # MapEntry interface
  components/
    MapCard.tsx                     # Single map row (name, size, format, buttons + install logic)
    MapList.tsx                     # Renders list of MapCards
    UploadForm.tsx                  # Admin drag-and-drop upload
    AdminMapList.tsx                # Admin map list with delete
    ProgressModal.tsx               # Progress bar + status during install
tests/
  lib/
    auth.test.ts
    hash.test.ts
    maps-store.test.ts
    extractors/
      detect.test.ts
      zip.test.ts
.env.local.example
```

---

## Task 1: Project Initialization

**Files:**
- Create: project root (Next.js scaffold)
- Create: `.env.local.example`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd c:/MDP/CS-map-distribution
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Expected: Next.js project created in current directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install fflate 7z-wasm unrar-wasm
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install bcryptjs jose uuid
npm install --save-dev @types/bcryptjs @types/uuid jest @types/jest ts-jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Create jest.config.ts**

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
}

export default createJestConfig(config)
```

- [ ] **Step 4: Create .env.local.example**

```bash
ADMIN_PASSWORD_HASH=bcrypt_hash_here
JWT_SECRET=your-random-secret-min-32-chars
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=cs-maps
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
# Required for server-side data fetching in Next.js (use full URL in production):
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

- [ ] **Step 5: Verify project runs**

```bash
npm run dev
```

Expected: Next.js dev server starts on http://localhost:3000.

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: initialize Next.js project with dependencies"
```

---

## Task 2: Core Types

**Files:**
- Create: `src/types/map.ts`
- Create: `src/lib/extractors/types.ts`

- [ ] **Step 1: Create MapEntry type**

```typescript
// src/types/map.ts
export interface MapEntry {
  id: string           // UUID v4
  originalName: string // filename without extension
  r2Key: string        // e.g. "archives/uuid.zip"
  format: 'zip' | '7z' | 'rar'
  size: number         // bytes
  sha256: string       // hex-encoded SHA-256 of the archive
  uploadedAt: string   // ISO 8601
}
```

- [ ] **Step 2: Create extractor types**

```typescript
// src/lib/extractors/types.ts
export interface ExtractedFile {
  path: string      // relative path within archive (normalized, forward slashes)
  data: Uint8Array
}

export type ArchiveStructure =
  | 'game-root'     // archive root contains cstrike/
  | 'cs-subfolder'  // archive root contains maps/, models/, etc.
  | 'bare-files'    // archive root contains .bsp files directly
  | 'unknown'
```

- [ ] **Step 3: Commit**

```bash
git add src/types/map.ts src/lib/extractors/types.ts
git commit -m "feat: add core TypeScript types"
```

---

## Task 3: Archive Structure Detector

**Files:**
- Create: `src/lib/extractors/detect.ts`
- Create: `tests/lib/extractors/detect.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/extractors/detect.test.ts
import { detectStructure } from '@/lib/extractors/detect'

describe('detectStructure', () => {
  it('detects game-root when cstrike/ is present', () => {
    const entries = ['cstrike/maps/de_dust2.bsp', 'cstrike/models/player.mdl']
    expect(detectStructure(entries)).toBe('game-root')
  })

  it('detects game-root case-insensitively (CSTRIKE/)', () => {
    const entries = ['CSTRIKE/maps/de_dust2.bsp']
    expect(detectStructure(entries)).toBe('game-root')
  })

  it('detects cs-subfolder when maps/ present without cstrike/', () => {
    const entries = ['maps/de_dust2.bsp', 'models/player.mdl']
    expect(detectStructure(entries)).toBe('cs-subfolder')
  })

  it('detects cs-subfolder for models/, sound/, sprites/', () => {
    expect(detectStructure(['models/test.mdl'])).toBe('cs-subfolder')
    expect(detectStructure(['sound/test.wav'])).toBe('cs-subfolder')
    expect(detectStructure(['sprites/test.spr'])).toBe('cs-subfolder')
  })

  it('detects bare-files when .bsp at root with no subdirectories', () => {
    const entries = ['de_dust2.bsp', 'awp_india.bsp']
    expect(detectStructure(entries)).toBe('bare-files')
  })

  it('returns unknown when structure does not match any rule', () => {
    const entries = ['readme.txt', 'somefile.dat']
    expect(detectStructure(entries)).toBe('unknown')
  })

  it('prioritises game-root over cs-subfolder (rule 1 wins)', () => {
    const entries = ['cstrike/maps/de_dust2.bsp', 'maps/extra.bsp']
    expect(detectStructure(entries)).toBe('game-root')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest tests/lib/extractors/detect.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/extractors/detect'`

- [ ] **Step 3: Implement detect.ts**

```typescript
// src/lib/extractors/detect.ts
import type { ArchiveStructure } from './types'

const CS_SUBDIRS = ['maps', 'models', 'sound', 'sprites']

export function detectStructure(entries: string[]): ArchiveStructure {
  const normalized = entries.map(e => e.toLowerCase().replace(/\\/g, '/'))

  // Rule 1: cstrike/ at root
  if (normalized.some(e => e.startsWith('cstrike/'))) {
    return 'game-root'
  }

  // Rule 2: CS subdirectory at root (maps/, models/, sound/, sprites/)
  if (normalized.some(e => CS_SUBDIRS.some(dir => e.startsWith(dir + '/')))) {
    return 'cs-subfolder'
  }

  // Rule 3: .bsp files at root with no subdirectories.
  // Note: macOS zip artifacts like __MACOSX/ will cause this to fall through to 'unknown'.
  // This is acceptable — real CS 1.6 map zips rarely have such artifacts.
  const hasRootBsp = normalized.some(e => !e.includes('/') && e.endsWith('.bsp'))
  const hasSubdirs = normalized.some(e => e.includes('/'))
  if (hasRootBsp && !hasSubdirs) {
    return 'bare-files'
  }

  return 'unknown'
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest tests/lib/extractors/detect.test.ts --no-coverage
```

Expected: 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/extractors/detect.ts tests/lib/extractors/detect.test.ts
git commit -m "feat: add archive structure detector with tests"
```

---

## Task 4: Auth Library

**Files:**
- Create: `src/lib/auth.ts`
- Create: `tests/lib/auth.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/auth.test.ts
import { verifyPassword, signJWT, verifyJWT } from '@/lib/auth'
import bcrypt from 'bcryptjs'

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await bcrypt.hash('secret123', 10)
    expect(await verifyPassword('secret123', hash)).toBe(true)
  })

  it('returns false for wrong password', async () => {
    const hash = await bcrypt.hash('secret123', 10)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})

describe('JWT', () => {
  const secret = 'test-secret-that-is-at-least-32-chars-long'

  it('signs and verifies a token', async () => {
    const token = await signJWT({ role: 'admin' }, secret)
    const payload = await verifyJWT(token, secret)
    expect(payload.role).toBe('admin')
  })

  it('throws for tampered token', async () => {
    const token = await signJWT({ role: 'admin' }, secret)
    await expect(verifyJWT(token + 'x', secret)).rejects.toThrow()
  })

  it('throws for expired token', async () => {
    const token = await signJWT({ role: 'admin' }, secret, '-1s')
    await expect(verifyJWT(token, secret)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest tests/lib/auth.test.ts --no-coverage
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement auth.ts**

```typescript
// src/lib/auth.ts
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const COOKIE_NAME = 'admin_session'
const DEFAULT_TTL = '24h'

export { COOKIE_NAME }

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function signJWT(
  payload: Record<string, unknown>,
  secret: string,
  expirationTime: string = DEFAULT_TTL
): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(key)
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const key = new TextEncoder().encode(secret)
  const { payload } = await jwtVerify(token, key)
  return payload
}

export async function verifyAdminCookie(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false
  try {
    const secret = process.env.JWT_SECRET!
    await verifyJWT(cookieValue, secret)
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest tests/lib/auth.test.ts --no-coverage
```

Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts tests/lib/auth.test.ts
git commit -m "feat: add auth library (bcrypt + JWT) with tests"
```

---

## Task 5: Hash Utility

**Files:**
- Create: `src/lib/hash.ts`
- Create: `tests/lib/hash.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/lib/hash.test.ts
import { computeSHA256 } from '@/lib/hash'

describe('computeSHA256', () => {
  it('returns correct SHA-256 for known input', async () => {
    // SHA-256 of empty buffer is known
    const emptyBuffer = new ArrayBuffer(0)
    const result = await computeSHA256(emptyBuffer)
    expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb924' +
                        '27ae41e4649b934ca495991b7852b855')
  })

  it('returns different hashes for different inputs', async () => {
    const a = new TextEncoder().encode('hello').buffer
    const b = new TextEncoder().encode('world').buffer
    const hashA = await computeSHA256(a)
    const hashB = await computeSHA256(b)
    expect(hashA).not.toBe(hashB)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest tests/lib/hash.test.ts --no-coverage
```

- [ ] **Step 3: Implement hash.ts**

```typescript
// src/lib/hash.ts
// SERVER-SIDE ONLY — uses Node.js crypto module. Do NOT import this in browser/client code.
// For client-side SHA-256, use crypto.subtle.digest (see install.ts browserSHA256).
import { createHash } from 'crypto'

export async function computeSHA256(buffer: ArrayBuffer): Promise<string> {
  return createHash('sha256')
    .update(Buffer.from(buffer))
    .digest('hex')
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest tests/lib/hash.test.ts --no-coverage
```

Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/hash.ts tests/lib/hash.test.ts
git commit -m "feat: add SHA-256 hash utility with tests"
```

---

## Task 6: R2 Client

**Files:**
- Create: `src/lib/r2.ts`

Note: R2 operations require real credentials — not unit tested. Tested via integration during Task 8 (upload route).

- [ ] **Step 1: Implement r2.ts**

```typescript
// src/lib/r2.ts
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function getClient(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

const BUCKET = () => process.env.R2_BUCKET_NAME!

export async function getObject(key: string): Promise<string | null> {
  try {
    const client = getClient()
    const response = await client.send(
      new GetObjectCommand({ Bucket: BUCKET(), Key: key })
    )
    return response.Body ? await response.Body.transformToString() : null
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'NoSuchKey') return null
    throw err
  }
}

export async function putObject(
  key: string,
  body: Buffer | string,
  contentType = 'application/octet-stream'
): Promise<void> {
  const client = getClient()
  await client.send(
    new PutObjectCommand({ Bucket: BUCKET(), Key: key, Body: body, ContentType: contentType })
  )
}

export async function deleteObject(key: string): Promise<void> {
  const client = getClient()
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }))
}

export async function getPresignedUrl(key: string, ttlSeconds = 900): Promise<string> {
  const client = getClient()
  const command = new GetObjectCommand({ Bucket: BUCKET(), Key: key })
  return getSignedUrl(client, command, { expiresIn: ttlSeconds })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/r2.ts
git commit -m "feat: add R2 client (get/put/delete/presign)"
```

---

## Task 7: Maps Store

**Files:**
- Create: `src/lib/maps-store.ts`
- Create: `tests/lib/maps-store.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/maps-store.test.ts
import { getMaps, addMap, removeMap } from '@/lib/maps-store'
import type { MapEntry } from '@/types/map'

// Mock the R2 client
jest.mock('@/lib/r2', () => ({
  getObject: jest.fn(),
  putObject: jest.fn(),
}))

import { getObject, putObject } from '@/lib/r2'
const mockGet = getObject as jest.Mock
const mockPut = putObject as jest.Mock

const sampleMap: MapEntry = {
  id: 'test-uuid-1',
  originalName: 'de_dust2',
  r2Key: 'archives/test-uuid-1.zip',
  format: 'zip',
  size: 1000,
  sha256: 'abc123',
  uploadedAt: '2026-03-22T12:00:00Z',
}

beforeEach(() => jest.clearAllMocks())

describe('getMaps', () => {
  it('returns empty array when maps.json does not exist', async () => {
    mockGet.mockResolvedValue(null)
    expect(await getMaps()).toEqual([])
  })

  it('returns parsed maps from maps.json', async () => {
    mockGet.mockResolvedValue(JSON.stringify([sampleMap]))
    const maps = await getMaps()
    expect(maps).toHaveLength(1)
    expect(maps[0].id).toBe('test-uuid-1')
  })
})

describe('addMap', () => {
  it('appends entry and writes maps.json', async () => {
    mockGet.mockResolvedValue(JSON.stringify([]))
    await addMap(sampleMap)
    expect(mockPut).toHaveBeenCalledWith(
      'maps.json',
      JSON.stringify([sampleMap]),
      'application/json'
    )
  })
})

describe('removeMap', () => {
  it('removes entry by id and writes maps.json', async () => {
    mockGet.mockResolvedValue(JSON.stringify([sampleMap]))
    await removeMap('test-uuid-1')
    expect(mockPut).toHaveBeenCalledWith(
      'maps.json',
      JSON.stringify([]),
      'application/json'
    )
  })

  it('is a no-op when id not found', async () => {
    mockGet.mockResolvedValue(JSON.stringify([sampleMap]))
    await removeMap('nonexistent-id')
    expect(mockPut).toHaveBeenCalledWith(
      'maps.json',
      JSON.stringify([sampleMap]),
      'application/json'
    )
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest tests/lib/maps-store.test.ts --no-coverage
```

- [ ] **Step 3: Implement maps-store.ts**

```typescript
// src/lib/maps-store.ts
import { getObject, putObject } from './r2'
import type { MapEntry } from '@/types/map'

const MAPS_KEY = 'maps.json'

export async function getMaps(): Promise<MapEntry[]> {
  const raw = await getObject(MAPS_KEY)
  if (!raw) return []
  return JSON.parse(raw) as MapEntry[]
}

export async function addMap(entry: MapEntry): Promise<void> {
  const maps = await getMaps()
  maps.push(entry)
  await putObject(MAPS_KEY, JSON.stringify(maps), 'application/json')
}

export async function removeMap(id: string): Promise<void> {
  const maps = await getMaps()
  const filtered = maps.filter(m => m.id !== id)
  await putObject(MAPS_KEY, JSON.stringify(filtered), 'application/json')
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest tests/lib/maps-store.test.ts --no-coverage
```

Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/maps-store.ts tests/lib/maps-store.test.ts
git commit -m "feat: add maps store with R2-backed maps.json"
```

---

## Task 8: API Routes (Server)

**Files:**
- Create: `src/app/api/maps/route.ts`
- Create: `src/app/api/auth/route.ts`
- Create: `src/app/api/upload/route.ts`
- Create: `src/app/api/download/[id]/route.ts`
- Create: `src/app/api/delete/[id]/route.ts`

- [ ] **Step 1: GET /api/maps**

```typescript
// src/app/api/maps/route.ts
import { NextResponse } from 'next/server'
import { getMaps } from '@/lib/maps-store'

export async function GET() {
  try {
    const maps = await getMaps()
    return NextResponse.json(maps, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load maps' }, { status: 500 })
  }
}
```

- [ ] **Step 2: POST /api/auth**

```typescript
// src/app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, signJWT, COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  const hash = process.env.ADMIN_PASSWORD_HASH!
  const valid = await verifyPassword(password, hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = await signJWT({ role: 'admin' }, process.env.JWT_SECRET!)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })
  return response
}
```

- [ ] **Step 3: POST /api/upload**

```typescript
// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { verifyAdminCookie, COOKIE_NAME } from '@/lib/auth'
import { putObject } from '@/lib/r2'
import { addMap } from '@/lib/maps-store'
import { computeSHA256 } from '@/lib/hash'

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB
const ALLOWED_EXTENSIONS = new Set(['zip', '7z', 'rar'])

export async function POST(req: NextRequest) {
  const cookie = req.cookies.get(COOKIE_NAME)?.value
  if (!(await verifyAdminCookie(cookie))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Server-side size check via Content-Length
  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: 'Unsupported format. Use .zip, .7z, or .rar' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()

  // Streaming byte count (authoritative size check)
  if (buffer.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })
  }

  const id = uuidv4()
  const r2Key = `archives/${id}.${ext}`
  const sha256 = await computeSHA256(buffer)
  const originalName = file.name.replace(/\.[^.]+$/, '') // strip extension

  await putObject(r2Key, Buffer.from(buffer))

  await addMap({
    id,
    originalName,
    r2Key,
    format: ext as 'zip' | '7z' | 'rar',
    size: buffer.byteLength,
    sha256,
    uploadedAt: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, id })
}
```

- [ ] **Step 4: GET /api/download/[id]**

```typescript
// src/app/api/download/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getMaps } from '@/lib/maps-store'
import { getPresignedUrl } from '@/lib/r2'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const maps = await getMaps()
  const map = maps.find(m => m.id === params.id)
  if (!map) {
    return NextResponse.json({ error: 'Map not found' }, { status: 404 })
  }

  try {
    const url = await getPresignedUrl(map.r2Key, 900) // 15 min
    return NextResponse.json({ url, sha256: map.sha256 })
  } catch {
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
  }
}
```

- [ ] **Step 5: DELETE /api/delete/[id]**

```typescript
// src/app/api/delete/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminCookie, COOKIE_NAME } from '@/lib/auth'
import { getMaps, removeMap } from '@/lib/maps-store'
import { deleteObject } from '@/lib/r2'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookie = req.cookies.get(COOKIE_NAME)?.value
  if (!(await verifyAdminCookie(cookie))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const maps = await getMaps()
  const map = maps.find(m => m.id === params.id)
  if (!map) {
    return NextResponse.json({ error: 'Map not found' }, { status: 404 })
  }

  await deleteObject(map.r2Key)
  await removeMap(params.id)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/
git commit -m "feat: add all API routes (maps, auth, upload, download, delete)"
```

---

## Task 9: Client-Side Extractors

**Files:**
- Create: `src/lib/extractors/zip.ts`
- Create: `src/lib/extractors/sevenz.ts`
- Create: `src/lib/extractors/rar.ts`
- Create: `src/lib/extractors/index.ts`
- Create: `tests/lib/extractors/zip.test.ts`

**Important:** Before implementing 7z-wasm and unrar-wasm, verify they support in-browser buffer extraction. Check their README for browser usage examples. If a library only supports Node.js, find an alternative or add a clear code comment explaining the limitation and how to test it manually.

- [ ] **Step 1: Write ZIP extractor test**

```typescript
// tests/lib/extractors/zip.test.ts
/** @jest-environment jsdom */
import { extractZip } from '@/lib/extractors/zip'
import { strToU8, zipSync } from 'fflate'

describe('extractZip', () => {
  it('extracts files from a zip buffer', async () => {
    const zipped = zipSync({
      'maps/de_dust2.bsp': strToU8('fake bsp content'),
      'models/test.mdl': strToU8('fake mdl content'),
    })

    const files = await extractZip(zipped.buffer as ArrayBuffer)

    expect(files).toHaveLength(2)
    const paths = files.map(f => f.path)
    expect(paths).toContain('maps/de_dust2.bsp')
    expect(paths).toContain('models/test.mdl')

    const bsp = files.find(f => f.path === 'maps/de_dust2.bsp')!
    expect(new TextDecoder().decode(bsp.data)).toBe('fake bsp content')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx jest tests/lib/extractors/zip.test.ts --no-coverage
```

- [ ] **Step 3: Implement zip.ts**

```typescript
// src/lib/extractors/zip.ts
import { unzip } from 'fflate'
import type { ExtractedFile } from './types'

export function extractZip(buffer: ArrayBuffer): Promise<ExtractedFile[]> {
  return new Promise((resolve, reject) => {
    unzip(new Uint8Array(buffer), (err, files) => {
      if (err) return reject(err)
      const result: ExtractedFile[] = Object.entries(files)
        .filter(([path]) => !path.endsWith('/')) // skip directory entries
        .map(([path, data]) => ({
          path: path.replace(/\\/g, '/'),
          data,
        }))
      resolve(result)
    })
  })
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx jest tests/lib/extractors/zip.test.ts --no-coverage
```

- [ ] **Step 5: Implement sevenz.ts**

```typescript
// src/lib/extractors/sevenz.ts
// NOTE: 7z-wasm must be verified for browser buffer extraction before use.
// Test manually: upload a .7z file and confirm extraction works in Chrome.
import type { ExtractedFile } from './types'

export async function extractSevenZ(buffer: ArrayBuffer): Promise<ExtractedFile[]> {
  const { createExtractorFromData } = await import('7z-wasm')
  const extractor = await createExtractorFromData({ data: new Uint8Array(buffer) })
  const { files } = extractor.extract()
  const result: ExtractedFile[] = []
  for (const file of files) {
    if (!file.fileContent) continue
    result.push({
      path: file.fileHeader.name.replace(/\\/g, '/'),
      data: file.fileContent,
    })
  }
  return result
}
```

- [ ] **Step 6: Implement rar.ts**

```typescript
// src/lib/extractors/rar.ts
// NOTE: unrar-wasm must be verified for browser buffer extraction before use.
// Test manually: upload a .rar file and confirm extraction works in Chrome.
import type { ExtractedFile } from './types'

export async function extractRar(buffer: ArrayBuffer): Promise<ExtractedFile[]> {
  const { createExtractorFromData } = await import('unrar-wasm')
  const extractor = await createExtractorFromData(new Uint8Array(buffer))
  const list = extractor.getFileList()
  const fileHeaders = [...list.fileHeaders]
  const extracted = extractor.extract({ files: fileHeaders.map(h => h.name) })
  const result: ExtractedFile[] = []
  for (const file of extracted.files) {
    if (!file.extraction) continue
    result.push({
      path: file.fileHeader.name.replace(/\\/g, '/'),
      data: file.extraction,
    })
  }
  return result
}
```

- [ ] **Step 7: Implement extractor router (index.ts)**

```typescript
// src/lib/extractors/index.ts
import type { ExtractedFile } from './types'

export async function extractArchive(
  buffer: ArrayBuffer,
  format: 'zip' | '7z' | 'rar'
): Promise<ExtractedFile[]> {
  switch (format) {
    case 'zip': {
      const { extractZip } = await import('./zip')
      return extractZip(buffer)
    }
    case '7z': {
      const { extractSevenZ } = await import('./sevenz')
      return extractSevenZ(buffer)
    }
    case 'rar': {
      const { extractRar } = await import('./rar')
      return extractRar(buffer)
    }
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/extractors/ tests/lib/extractors/zip.test.ts
git commit -m "feat: add client-side extractors (zip/7z/rar) with zip tests"
```

---

## Task 10: Install Flow

**Files:**
- Create: `src/lib/install.ts`

This module orchestrates: download → hash verify → detect structure → extract → write to game folder.

- [ ] **Step 1: Implement install.ts**

```typescript
// src/lib/install.ts
import { detectStructure } from './extractors/detect'
import { extractArchive } from './extractors/index'
import type { ExtractedFile } from './extractors/types'
import type { MapEntry } from '@/types/map'

export interface InstallResult {
  written: string[]
  gameRoot: string
}

export type InstallStatus =
  | { phase: 'downloading'; progress: number }
  | { phase: 'verifying' }
  | { phase: 'extracting' }
  | { phase: 'writing'; current: string; total: number; done: number }
  | { phase: 'done'; result: InstallResult }
  | { phase: 'error'; message: string }

/** Check if the browser supports File System Access API */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/** Prompt user to pick the CS 1.6 game root folder */
export async function pickGameFolder(): Promise<FileSystemDirectoryHandle> {
  return window.showDirectoryPicker({ mode: 'readwrite' })
}

/** Check if the selected folder contains a cstrike/ subdirectory */
export async function validateGameFolder(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind === 'directory' && name.toLowerCase() === 'cstrike') {
      return true
    }
  }
  return false
}

/** Compute SHA-256 of an ArrayBuffer in the browser */
async function browserSHA256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Get or create a nested directory handle under a root */
async function getNestedDir(
  root: FileSystemDirectoryHandle,
  parts: string[]
): Promise<FileSystemDirectoryHandle> {
  let current = root
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: true })
  }
  return current
}

/** Write a single extracted file to the game folder with path remapping */
async function writeFile(
  gameRoot: FileSystemDirectoryHandle,
  file: ExtractedFile,
  structure: ReturnType<typeof detectStructure>
): Promise<string> {
  let targetPath: string

  if (structure === 'game-root') {
    targetPath = file.path
  } else if (structure === 'cs-subfolder') {
    targetPath = `cstrike/${file.path}`
  } else {
    // bare-files: file is a .bsp at root
    targetPath = `cstrike/maps/${file.path}`
  }

  const parts = targetPath.split('/')
  const filename = parts.pop()!
  const dirHandle = await getNestedDir(gameRoot, parts)
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(file.data)
  await writable.close()

  return targetPath
}

/** Full install flow with progress callbacks */
export async function installMap(
  map: MapEntry,
  presignedUrl: string,
  expectedSha256: string,
  gameRoot: FileSystemDirectoryHandle,
  onStatus: (status: InstallStatus) => void
): Promise<void> {
  // 1. Download with progress
  onStatus({ phase: 'downloading', progress: 0 })
  const response = await fetch(presignedUrl)
  if (!response.ok) throw new Error(`Download failed: ${response.statusText}`)

  const contentLength = Number(response.headers.get('content-length') ?? 0)
  const reader = response.body!.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    if (contentLength > 0) {
      onStatus({ phase: 'downloading', progress: received / contentLength })
    }
  }

  const buffer = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    buffer.set(chunk, offset)
    offset += chunk.length
  }

  // 2. Verify SHA-256
  onStatus({ phase: 'verifying' })
  const actualHash = await browserSHA256(buffer.buffer)
  if (actualHash !== expectedSha256) {
    throw new Error('File integrity check failed. The download may be corrupted.')
  }

  // 3. Extract
  onStatus({ phase: 'extracting' })
  const files = await extractArchive(buffer.buffer, map.format)

  // 4. Detect structure
  const structure = detectStructure(files.map(f => f.path))
  if (structure === 'unknown') {
    throw new Error('Unrecognised archive layout. Please install manually.')
  }

  // Filter to relevant files only (for bare-files: only .bsp)
  const filesToWrite = structure === 'bare-files'
    ? files.filter(f => f.path.toLowerCase().endsWith('.bsp'))
    : files

  // 5. Write files
  const written: string[] = []
  for (let i = 0; i < filesToWrite.length; i++) {
    const file = filesToWrite[i]
    onStatus({ phase: 'writing', current: file.path, total: filesToWrite.length, done: i })
    const targetPath = await writeFile(gameRoot, file, structure)
    written.push(targetPath)
  }

  onStatus({
    phase: 'done',
    result: { written, gameRoot: gameRoot.name },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/install.ts
git commit -m "feat: add install flow (download, verify, extract, write to game folder)"
```

---

## Task 11: Download Page UI

**Files:**
- Create: `src/components/MapCard.tsx`
- Create: `src/components/ProgressModal.tsx`
- Create: `src/components/MapList.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create ProgressModal.tsx**

```tsx
// src/components/ProgressModal.tsx
'use client'
import type { InstallStatus } from '@/lib/install'

interface Props {
  status: InstallStatus | null
  onClose: () => void
  onFallbackDownload?: () => void // called when user wants raw archive download after error
}

export function ProgressModal({ status, onClose, onFallbackDownload }: Props) {
  if (!status) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        {status.phase === 'downloading' && (
          <>
            <h2 className="font-bold text-lg mb-3">Downloading...</h2>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${Math.round(status.progress * 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{Math.round(status.progress * 100)}%</p>
          </>
        )}
        {status.phase === 'verifying' && <p className="font-semibold">Verifying file integrity...</p>}
        {status.phase === 'extracting' && <p className="font-semibold">Extracting archive...</p>}
        {status.phase === 'writing' && (
          <>
            <p className="font-semibold">Installing files...</p>
            <p className="text-sm text-gray-500 mt-1 truncate">{status.current}</p>
            <p className="text-xs text-gray-400">{status.done}/{status.total}</p>
          </>
        )}
        {status.phase === 'done' && (
          <>
            <h2 className="font-bold text-lg text-green-600 mb-2">Installed!</h2>
            <p className="text-sm text-gray-600 mb-1">
              Wrote {status.result.written.length} file(s) to <code>{status.result.gameRoot}</code>
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg w-full"
            >
              Done
            </button>
          </>
        )}
        {status.phase === 'error' && (
          <>
            <h2 className="font-bold text-lg text-red-600 mb-2">Error</h2>
            <p className="text-sm text-gray-600">{status.message}</p>
            {onFallbackDownload && (
              <button
                onClick={() => { onClose(); onFallbackDownload() }}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg w-full"
              >
                Download archive instead
              </button>
            )}
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 bg-gray-200 rounded-lg w-full"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create MapCard.tsx**

```tsx
// src/components/MapCard.tsx
'use client'
import { useState } from 'react'
import type { MapEntry } from '@/types/map'
import type { InstallStatus } from '@/lib/install'
import { ProgressModal } from './ProgressModal'
import {
  isFileSystemAccessSupported,
  pickGameFolder,
  validateGameFolder,
  installMap,
} from '@/lib/install'

const FORMAT_COLORS: Record<string, string> = {
  zip: 'bg-blue-100 text-blue-700',
  '7z': 'bg-purple-100 text-purple-700',
  rar: 'bg-orange-100 text-orange-700',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MapCard({ map }: { map: MapEntry }) {
  const [status, setStatus] = useState<InstallStatus | null>(null)
  const supportsFileApi = isFileSystemAccessSupported()

  async function handleInstall() {
    try {
      // Get presigned URL
      const res = await fetch(`/api/download/${map.id}`)
      if (!res.ok) throw new Error('Failed to get download URL')
      const { url, sha256 } = await res.json()

      // Pick game folder
      const handle = await pickGameFolder()

      // Validate folder
      const valid = await validateGameFolder(handle)
      if (!valid) {
        const confirmed = confirm(
          "This doesn't look like a CS 1.6 root folder (no 'cstrike' subfolder found). Continue anyway?"
        )
        if (!confirmed) return
      }

      // Install
      await installMap(map, url, sha256, handle, setStatus)
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return // user cancelled picker
      setStatus({ phase: 'error', message: (err as Error).message ?? 'Unknown error' })
    }
  }

  async function handleRawDownload() {
    const res = await fetch(`/api/download/${map.id}`)
    const { url } = await res.json()
    const a = document.createElement('a')
    a.href = url
    a.download = `${map.originalName}.${map.format}`
    a.click()
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm hover:shadow-md transition">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${FORMAT_COLORS[map.format]}`}>
            {map.format}
          </span>
          <div>
            <p className="font-semibold">{map.originalName}</p>
            <p className="text-xs text-gray-400">{formatBytes(map.size)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {supportsFileApi ? (
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
            >
              Install
            </button>
          ) : (
            <button
              onClick={handleRawDownload}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
            >
              Download
            </button>
          )}
        </div>
      </div>
      <ProgressModal
        status={status}
        onClose={() => setStatus(null)}
        onFallbackDownload={handleRawDownload}
      />
    </>
  )
}
```

- [ ] **Step 3: Create MapList.tsx**

```tsx
// src/components/MapList.tsx
import type { MapEntry } from '@/types/map'
import { MapCard } from './MapCard'

export function MapList({ maps }: { maps: MapEntry[] }) {
  if (maps.length === 0) {
    return <p className="text-gray-400 text-center py-12">No maps uploaded yet.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {maps.map(map => <MapCard key={map.id} map={map} />)}
    </div>
  )
}
```

- [ ] **Step 4: Update app/page.tsx**

```tsx
// src/app/page.tsx
import { MapList } from '@/components/MapList'
import type { MapEntry } from '@/types/map'

async function getMaps(): Promise<MapEntry[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/maps`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) return []
  return res.json()
}

export default async function HomePage() {
  const maps = await getMaps()
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">CS 1.6 Maps</h1>
      <p className="text-gray-500 mb-8 text-sm">
        Click <strong>Install</strong> to automatically extract and copy the map to your game folder.
        Works on Chrome and Edge. Firefox users: use Download.
      </p>
      <MapList maps={maps} />
    </main>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ src/app/page.tsx
git commit -m "feat: add download page UI with install flow and progress modal"
```

---

## Task 12: Admin Page UI

**Files:**
- Create: `src/components/UploadForm.tsx`
- Create: `src/components/AdminMapList.tsx`
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Create UploadForm.tsx**

```tsx
// src/components/UploadForm.tsx
'use client'
import { useState, useRef } from 'react'

const MAX_SIZE = 20 * 1024 * 1024

export function UploadForm({ onUploaded }: { onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    setError(null)
    if (file.size > MAX_SIZE) {
      setError('File is too large (max 20 MB)')
      return
    }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['zip', '7z', 'rar'].includes(ext ?? '')) {
      setError('Only .zip, .7z, and .rar files are allowed')
      return
    }

    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    // Use XMLHttpRequest for upload progress
    let succeeded = false
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/upload')
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) setProgress(e.loaded / e.total)
      }
      xhr.onload = () => {
        if (xhr.status === 200) { succeeded = true; resolve() }
        else reject(new Error(JSON.parse(xhr.responseText).error ?? 'Upload failed'))
      }
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.send(formData)
    }).catch(err => {
      setError(err.message)
    })

    setUploading(false)
    setProgress(0)
    if (succeeded) onUploaded() // only refresh list on success
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
        dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) upload(f) }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.7z,.rar"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }}
      />
      {uploading ? (
        <>
          <p className="font-medium mb-2">Uploading...</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </>
      ) : (
        <>
          <p className="text-gray-500">Drop a .zip, .7z, or .rar file here, or click to browse</p>
          <p className="text-xs text-gray-400 mt-1">Max 20 MB</p>
        </>
      )}
      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create AdminMapList.tsx**

```tsx
// src/components/AdminMapList.tsx
'use client'
import type { MapEntry } from '@/types/map'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AdminMapList({
  maps,
  onDeleted,
}: {
  maps: MapEntry[]
  onDeleted: (id: string) => void
}) {
  async function handleDelete(map: MapEntry) {
    if (!confirm(`Delete "${map.originalName}"?`)) return
    const res = await fetch(`/api/delete/${map.id}`, { method: 'DELETE' })
    if (!res.ok) {
      alert('Failed to delete map. Please try again.')
      return
    }
    onDeleted(map.id)
  }

  if (maps.length === 0) {
    return <p className="text-gray-400 text-center py-6">No maps yet.</p>
  }

  return (
    <div className="flex flex-col gap-2 mt-6">
      {maps.map(map => (
        <div key={map.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
          <div>
            <span className="font-medium">{map.originalName}</span>
            <span className="ml-2 text-xs text-gray-400 uppercase">{map.format}</span>
            <span className="ml-2 text-xs text-gray-400">{formatBytes(map.size)}</span>
          </div>
          <button
            onClick={() => handleDelete(map)}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create app/admin/page.tsx**

```tsx
// src/app/admin/page.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { UploadForm } from '@/components/UploadForm'
import { AdminMapList } from '@/components/AdminMapList'
import type { MapEntry } from '@/types/map'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true) // true while probing existing session
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [maps, setMaps] = useState<MapEntry[]>([])

  const loadMaps = useCallback(async () => {
    const res = await fetch('/api/maps')
    if (res.ok) setMaps(await res.json())
  }, [])

  // On mount, probe whether an existing admin_session cookie is still valid
  useEffect(() => {
    async function checkSession() {
      try {
        // Attempt a lightweight admin-only request; if it returns 200 the cookie is valid
        const res = await fetch('/api/upload', { method: 'POST', body: new FormData() })
        // 400 (missing file) means auth passed; 401 means no valid session
        if (res.status !== 401) setAuthed(true)
      } finally {
        setChecking(false)
      }
    }
    checkSession()
  }, [])

  useEffect(() => {
    if (authed) loadMaps()
  }, [authed, loadMaps])

  if (checking) {
    return <main className="max-w-sm mx-auto px-4 py-24 text-center text-gray-400">Loading...</main>
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthError(null)
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      setAuthed(true)
    } else {
      setAuthError('Incorrect password')
    }
  }

  if (!authed) {
    return (
      <main className="max-w-sm mx-auto px-4 py-24">
        <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border rounded-lg px-4 py-2 w-full"
          />
          <button type="submit" className="bg-black text-white rounded-lg py-2 font-medium hover:bg-gray-800">
            Login
          </button>
          {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
        </form>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Admin — Upload Maps</h1>
      <UploadForm onUploaded={loadMaps} />
      <AdminMapList maps={maps} onDeleted={id => setMaps(prev => prev.filter(m => m.id !== id))} />
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/UploadForm.tsx src/components/AdminMapList.tsx src/app/admin/page.tsx
git commit -m "feat: add admin page UI with upload form and map management"
```

---

## Task 13: Environment Setup & Deploy

**Files:**
- Create: `.env.local` (from `.env.local.example` — NOT committed)

- [ ] **Step 1: Generate admin password hash**

Run this once in Node.js REPL to get your bcrypt hash:

```bash
node -e "const b = require('bcryptjs'); b.hash('YOUR_PASSWORD', 10).then(console.log)"
```

Copy the output hash.

- [ ] **Step 2: Create .env.local**

```bash
# Copy the example and fill in real values
cp .env.local.example .env.local
# Edit .env.local with your actual R2 credentials and hashed password
```

Add `.env.local` to `.gitignore` (should already be there from Next.js scaffold).

- [ ] **Step 3: Set up Cloudflare R2**

1. Go to https://dash.cloudflare.com → R2 → Create bucket named `cs-maps`
2. Go to R2 → Manage R2 API Tokens → Create token with **Object Read & Write** for bucket `cs-maps`
3. Copy Account ID, Access Key ID, Secret Access Key into `.env.local`
4. Set `R2_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com`

- [ ] **Step 4: Test locally**

```bash
npm run dev
```

- Open http://localhost:3000 — verify map list loads (empty is fine)
- Open http://localhost:3000/admin — verify password form works
- Upload a .zip test file — verify it appears in the list
- Click Install — verify File System Access API picker appears

- [ ] **Step 5: Deploy to Vercel**

```bash
npx vercel
```

Add all env vars from `.env.local` to Vercel project settings (Settings → Environment Variables).

- [ ] **Step 6: Final commit**

```bash
git add .gitignore .env.local.example
git commit -m "chore: add deployment config and env example"
```

---

## Task 14: Run Full Test Suite

- [ ] **Step 1: Run all tests**

```bash
npx jest --no-coverage
```

Expected: All tests PASS. Check:
- `tests/lib/auth.test.ts` — 5 tests
- `tests/lib/hash.test.ts` — 2 tests
- `tests/lib/maps-store.test.ts` — 5 tests
- `tests/lib/extractors/detect.test.ts` — 7 tests
- `tests/lib/extractors/zip.test.ts` — 1 test

- [ ] **Step 2: Smoke test in browser (Chrome/Edge)**

1. Upload a real CS 1.6 map (each of the 3 archive structures if possible)
2. Install each — verify files appear in the correct `cstrike/maps/` location
3. Test the Firefox fallback by opening in Firefox — verify "Download" button appears instead of "Install"

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "chore: verify all tests pass and smoke test complete"
```

---

## Summary

| Task | What it builds |
|------|----------------|
| 1 | Next.js scaffold + dependencies |
| 2 | Core TypeScript types |
| 3 | Archive structure detector (TDD) |
| 4 | Auth library — bcrypt + JWT (TDD) |
| 5 | SHA-256 hash utility (TDD) |
| 6 | R2 client |
| 7 | Maps store with R2 backend (TDD) |
| 8 | All 5 API routes |
| 9 | Client-side extractors (ZIP/7Z/RAR) |
| 10 | Install flow (download → verify → extract → write) |
| 11 | Download page UI |
| 12 | Admin page UI |
| 13 | R2 setup + Vercel deploy |
| 14 | Full test suite + smoke test |
