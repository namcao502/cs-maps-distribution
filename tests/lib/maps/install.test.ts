/**
 * @jest-environment jsdom
 */
import {
  isFileSystemAccessSupported,
  isBspInstalled,
  scanInstalledBsps,
  validateGameFolder,
  syncInstalledToLocalStorage,
  pickGameFolder,
  installMap,
} from '@/lib/maps/install'
import type { InstallStatus } from '@/lib/maps/install'
import type { MapEntry } from '@/types/map'

jest.mock('@/lib/maps/folder-store', () => ({
  markInstalled: jest.fn(),
  isInstalledLocally: jest.fn().mockReturnValue(false),
  ensurePermission: jest.fn().mockResolvedValue(true),
}))

jest.mock('@/lib/extractors/index', () => ({
  extractArchive: jest.fn(),
}))

jest.mock('@/lib/extractors/detect', () => ({
  detectStructure: jest.fn(),
}))

const { extractArchive } = jest.requireMock('@/lib/extractors/index') as {
  extractArchive: jest.MockedFunction<(buffer: ArrayBuffer, format: string) => Promise<{ path: string; data: Uint8Array }[]>>
}
const { detectStructure } = jest.requireMock('@/lib/extractors/detect') as {
  detectStructure: jest.MockedFunction<(paths: string[]) => string>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ZERO_HASH = '0'.repeat(64)

function makeMap(overrides?: Partial<MapEntry>): MapEntry {
  return {
    id: 'map-1',
    originalName: 'de_dust2',
    storageKey: 'archives/uuid.zip',
    format: 'zip',
    size: 1024,
    sha256: ZERO_HASH,
    uploadedAt: '',
    installCount: 0,
    tags: [],
    ...overrides,
  }
}

function makeChunkReader(data: Uint8Array) {
  const CHUNK = 512
  let pos = 0
  return {
    read: jest.fn().mockImplementation(() => {
      if (pos >= data.length) return Promise.resolve({ done: true, value: undefined })
      const chunk = data.slice(pos, pos + CHUNK)
      pos += CHUNK
      return Promise.resolve({ done: false, value: chunk })
    }),
  }
}

function makeFetchResponse(data: Uint8Array, ok = true, withContentLength = true) {
  const reader = makeChunkReader(data)
  return {
    ok,
    statusText: ok ? 'OK' : 'Not Found',
    headers: { get: jest.fn().mockReturnValue(withContentLength ? String(data.length) : null) },
    body: { getReader: jest.fn().mockReturnValue(reader) },
  }
}

function makeGameRoot() {
  const writable = {
    write: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  }
  const fileHandle = { createWritable: jest.fn().mockResolvedValue(writable) }
  const dirHandle = {
    name: 'CounterStrike',
    getDirectoryHandle: jest.fn(),
    getFileHandle: jest.fn().mockResolvedValue(fileHandle),
  }
  // getDirectoryHandle returns itself so nested paths resolve without errors
  dirHandle.getDirectoryHandle.mockResolvedValue(dirHandle)
  return { dirHandle: dirHandle as unknown as FileSystemDirectoryHandle, fileHandle, writable }
}

function collectStatuses(statuses: InstallStatus[]) {
  return (s: InstallStatus) => statuses.push(s)
}

// ── isFileSystemAccessSupported ───────────────────────────────────────────────

test('isFileSystemAccessSupported returns false when showDirectoryPicker absent', () => {
  expect(isFileSystemAccessSupported()).toBe(false)
})

test('isFileSystemAccessSupported returns true when showDirectoryPicker present', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).showDirectoryPicker = jest.fn()
  expect(isFileSystemAccessSupported()).toBe(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).showDirectoryPicker
})

// ── isBspInstalled ────────────────────────────────────────────────────────────

test('isBspInstalled exact match', () => {
  expect(isBspInstalled('de_dust2', new Set(['de_dust2']))).toBe(true)
})

test('isBspInstalled underscore boundary', () => {
  expect(isBspInstalled('de_dust2_final', new Set(['de_dust2']))).toBe(true)
})

test('isBspInstalled digit boundary matches (digit counts as boundary)', () => {
  expect(isBspInstalled('de_dust23', new Set(['de_dust2']))).toBe(true)
})

test('isBspInstalled non-boundary suffix returns false', () => {
  expect(isBspInstalled('de_hoschispotfinal', new Set(['de_hoschispot']))).toBe(false)
})

test('isBspInstalled returns false when set is empty', () => {
  expect(isBspInstalled('de_dust2', new Set())).toBe(false)
})

test('isBspInstalled is case-insensitive', () => {
  expect(isBspInstalled('DE_DUST2', new Set(['de_dust2']))).toBe(true)
})

// ── scanInstalledBsps ─────────────────────────────────────────────────────────

test('scanInstalledBsps returns bsp basenames from cstrike/maps/', async () => {
  const mapsEntries: [string, { kind: string }][] = [
    ['de_dust2.bsp', { kind: 'file' }],
    ['de_nuke.BSP', { kind: 'file' }],
    ['readme.txt', { kind: 'file' }],
    ['subdir', { kind: 'directory' }],
  ]

  async function* asyncEntries() {
    for (const entry of mapsEntries) yield entry
  }

  const mapsHandle = { entries: asyncEntries }
  const cstrikeHandle = {
    getDirectoryHandle: jest.fn().mockResolvedValue(mapsHandle),
  }
  const gameRoot = {
    getDirectoryHandle: jest.fn().mockResolvedValue(cstrikeHandle),
  } as unknown as FileSystemDirectoryHandle

  const result = await scanInstalledBsps(gameRoot)
  expect(result).toEqual(new Set(['de_dust2', 'de_nuke']))
})

test('scanInstalledBsps returns empty set when cstrike/ not found', async () => {
  const gameRoot = {
    getDirectoryHandle: jest.fn().mockRejectedValue(new Error('Not found')),
  } as unknown as FileSystemDirectoryHandle

  const result = await scanInstalledBsps(gameRoot)
  expect(result).toEqual(new Set())
})

// ── validateGameFolder ────────────────────────────────────────────────────────

test('validateGameFolder returns true when cstrike/ present', async () => {
  const rootEntries: [string, { kind: string }][] = [
    ['cstrike', { kind: 'directory' }],
    ['platform', { kind: 'directory' }],
  ]

  async function* asyncEntries() {
    for (const entry of rootEntries) yield entry
  }

  const handle = { entries: asyncEntries } as unknown as FileSystemDirectoryHandle
  expect(await validateGameFolder(handle)).toBe(true)
})

test('validateGameFolder is case-insensitive', async () => {
  const rootEntries: [string, { kind: string }][] = [
    ['CSTRIKE', { kind: 'directory' }],
  ]

  async function* asyncEntries() {
    for (const entry of rootEntries) yield entry
  }

  const handle = { entries: asyncEntries } as unknown as FileSystemDirectoryHandle
  expect(await validateGameFolder(handle)).toBe(true)
})

test('validateGameFolder returns false when no cstrike/ present', async () => {
  const rootEntries: [string, { kind: string }][] = [
    ['other_folder', { kind: 'directory' }],
    ['file.txt', { kind: 'file' }],
  ]

  async function* asyncEntries() {
    for (const entry of rootEntries) yield entry
  }

  const handle = { entries: asyncEntries } as unknown as FileSystemDirectoryHandle
  expect(await validateGameFolder(handle)).toBe(false)
})

// ── syncInstalledToLocalStorage ───────────────────────────────────────────────

test('syncInstalledToLocalStorage calls markInstalled for matching maps', () => {
  const { markInstalled } = jest.requireMock('@/lib/maps/folder-store')
  markInstalled.mockClear()

  const maps = [
    { id: '1', originalName: 'de_dust2', storageKey: 'a', format: 'zip' as const, size: 0, sha256: '', uploadedAt: '', installCount: 0, tags: [] },
    { id: '2', originalName: 'cs_office', storageKey: 'b', format: 'zip' as const, size: 0, sha256: '', uploadedAt: '', installCount: 0, tags: [] },
  ]
  const installed = new Set(['de_dust2', 'cs_office'])

  syncInstalledToLocalStorage(maps, installed)
  expect(markInstalled).toHaveBeenCalledWith('1')
  expect(markInstalled).toHaveBeenCalledWith('2')
})

test('syncInstalledToLocalStorage skips maps not in installedBsps', () => {
  const { markInstalled } = jest.requireMock('@/lib/maps/folder-store')
  markInstalled.mockClear()

  const maps = [
    { id: '1', originalName: 'de_dust2', storageKey: 'a', format: 'zip' as const, size: 0, sha256: '', uploadedAt: '', installCount: 0, tags: [] },
  ]
  const installed = new Set<string>()

  syncInstalledToLocalStorage(maps, installed)
  expect(markInstalled).not.toHaveBeenCalled()
})

// ── pickGameFolder ────────────────────────────────────────────────────────────

test('pickGameFolder calls showDirectoryPicker with readwrite mode', async () => {
  const mockHandle = { name: 'CounterStrike' } as unknown as FileSystemDirectoryHandle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).showDirectoryPicker = jest.fn().mockResolvedValue(mockHandle)

  const result = await pickGameFolder()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((window as any).showDirectoryPicker).toHaveBeenCalledWith({ mode: 'readwrite' })
  expect(result).toBe(mockHandle)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).showDirectoryPicker
})

// ── installMap ────────────────────────────────────────────────────────────────

function mockCrypto() {
  Object.defineProperty(global, 'crypto', {
    value: {
      subtle: {
        digest: jest.fn().mockResolvedValue(new Uint8Array(32).buffer),
      },
    },
    configurable: true,
    writable: true,
  })
}

describe('installMap', () => {
  beforeEach(() => {
    mockCrypto()
    extractArchive.mockReset()
    detectStructure.mockReset()
  })

  test('completes full flow with game-root structure', async () => {
    const fileData = new Uint8Array([1, 2, 3, 4])
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(fileData))

    const files = [{ path: 'cstrike/maps/de_dust2.bsp', data: new Uint8Array([1]) }]
    extractArchive.mockResolvedValue(files)
    detectStructure.mockReturnValue('game-root')

    const { dirHandle } = makeGameRoot()
    const statuses: InstallStatus[] = []

    await installMap(makeMap(), 'https://example.com/map.zip', ZERO_HASH, dirHandle, collectStatuses(statuses))

    expect(statuses[0]).toEqual({ phase: 'downloading', progress: 0 })
    expect(statuses).toContainEqual({ phase: 'verifying' })
    expect(statuses).toContainEqual({ phase: 'extracting' })
    const doneStatus = statuses.find(s => s.phase === 'done')
    expect(doneStatus).toBeDefined()
    expect((doneStatus as Extract<InstallStatus, { phase: 'done' }>).result.gameRoot).toBe('CounterStrike')
  })

  test('completes with cs-subfolder structure', async () => {
    const fileData = new Uint8Array([1])
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(fileData))

    const files = [{ path: 'maps/de_dust2.bsp', data: new Uint8Array([1]) }]
    extractArchive.mockResolvedValue(files)
    detectStructure.mockReturnValue('cs-subfolder')

    const { dirHandle } = makeGameRoot()
    const statuses: InstallStatus[] = []

    await installMap(makeMap(), 'https://example.com/map.zip', ZERO_HASH, dirHandle, collectStatuses(statuses))

    expect(statuses.find(s => s.phase === 'done')).toBeDefined()
  })

  test('completes with bare-files structure (only writes .bsp)', async () => {
    const fileData = new Uint8Array([1])
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(fileData))

    const files = [
      { path: 'de_dust2.bsp', data: new Uint8Array([1]) },
      { path: 'readme.txt', data: new Uint8Array([2]) },
    ]
    extractArchive.mockResolvedValue(files)
    detectStructure.mockReturnValue('bare-files')

    const { dirHandle, fileHandle } = makeGameRoot()
    const statuses: InstallStatus[] = []

    await installMap(makeMap(), 'https://example.com/map.zip', ZERO_HASH, dirHandle, collectStatuses(statuses))

    // readme.txt should be filtered out; only the .bsp is written
    expect(fileHandle.createWritable).toHaveBeenCalledTimes(1)
    expect(statuses.find(s => s.phase === 'done')).toBeDefined()
  })

  test('unwraps wrapped structure and installs', async () => {
    const fileData = new Uint8Array([1])
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(fileData))

    const files = [
      { path: 'de_dust2_pack/cstrike/maps/de_dust2.bsp', data: new Uint8Array([1]) },
    ]
    extractArchive.mockResolvedValue(files)
    // First call returns 'wrapped', second returns 'game-root' after unwrapping
    detectStructure.mockReturnValueOnce('wrapped').mockReturnValueOnce('game-root')

    const { dirHandle } = makeGameRoot()
    const statuses: InstallStatus[] = []

    await installMap(makeMap(), 'https://example.com/map.zip', ZERO_HASH, dirHandle, collectStatuses(statuses))

    expect(detectStructure).toHaveBeenCalledTimes(2)
    expect(statuses.find(s => s.phase === 'done')).toBeDefined()
  })

  test('throws on download failure', async () => {
    const fileData = new Uint8Array([1])
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(fileData, false))

    const { dirHandle } = makeGameRoot()

    await expect(
      installMap(makeMap(), 'https://example.com/map.zip', ZERO_HASH, dirHandle, jest.fn())
    ).rejects.toThrow('Download failed')
  })

  test('throws on SHA-256 mismatch', async () => {
    const fileData = new Uint8Array([1])
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(fileData))

    const files = [{ path: 'de_dust2.bsp', data: new Uint8Array([1]) }]
    extractArchive.mockResolvedValue(files)
    detectStructure.mockReturnValue('game-root')

    const { dirHandle } = makeGameRoot()

    await expect(
      installMap(makeMap(), 'https://example.com/map.zip', 'wrong-hash', dirHandle, jest.fn())
    ).rejects.toThrow('File integrity check failed')
  })

  test('throws on unknown archive structure', async () => {
    const fileData = new Uint8Array([1])
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(fileData))

    const files = [{ path: 'de_dust2.bsp', data: new Uint8Array([1]) }]
    extractArchive.mockResolvedValue(files)
    detectStructure.mockReturnValue('unknown')

    const { dirHandle } = makeGameRoot()

    await expect(
      installMap(makeMap(), 'https://example.com/map.zip', ZERO_HASH, dirHandle, jest.fn())
    ).rejects.toThrow('Unrecognised archive layout')
  })

  test('filters blocked extensions', async () => {
    const fileData = new Uint8Array([1])
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(fileData))

    const files = [
      { path: 'cstrike/maps/de_dust2.bsp', data: new Uint8Array([1]) },
      { path: 'setup.exe', data: new Uint8Array([2]) },
      { path: 'launch.url', data: new Uint8Array([3]) },
    ]
    extractArchive.mockResolvedValue(files)
    detectStructure.mockReturnValue('game-root')

    const { dirHandle, fileHandle } = makeGameRoot()

    await installMap(makeMap(), 'https://example.com/map.zip', ZERO_HASH, dirHandle, jest.fn())

    // Only the .bsp should be written
    expect(fileHandle.createWritable).toHaveBeenCalledTimes(1)
  })

  test('reports writing progress', async () => {
    const fileData = new Uint8Array([1])
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(fileData))

    const files = [
      { path: 'cstrike/maps/de_dust2.bsp', data: new Uint8Array([1]) },
      { path: 'cstrike/maps/cs_office.bsp', data: new Uint8Array([2]) },
    ]
    extractArchive.mockResolvedValue(files)
    detectStructure.mockReturnValue('game-root')

    const { dirHandle } = makeGameRoot()
    const statuses: InstallStatus[] = []

    await installMap(makeMap(), 'https://example.com/map.zip', ZERO_HASH, dirHandle, collectStatuses(statuses))

    const writingStatuses = statuses.filter(s => s.phase === 'writing')
    expect(writingStatuses.length).toBe(2)
    expect((writingStatuses[0] as Extract<InstallStatus, { phase: 'writing' }>).total).toBe(2)
  })

  test('reports download progress when content-length is known', async () => {
    const fileData = new Uint8Array(1024)
    global.fetch = jest.fn().mockResolvedValue(makeFetchResponse(fileData, true, true))

    const files = [{ path: 'cstrike/maps/de_dust2.bsp', data: new Uint8Array([1]) }]
    extractArchive.mockResolvedValue(files)
    detectStructure.mockReturnValue('game-root')

    const { dirHandle } = makeGameRoot()
    const statuses: InstallStatus[] = []

    await installMap(makeMap(), 'https://example.com/map.zip', ZERO_HASH, dirHandle, collectStatuses(statuses))

    const downloadStatuses = statuses.filter(s => s.phase === 'downloading')
    expect(downloadStatuses.length).toBeGreaterThan(1)
  })
})
