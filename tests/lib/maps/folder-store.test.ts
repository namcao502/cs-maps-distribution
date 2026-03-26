/**
 * @jest-environment jsdom
 */
import { markInstalled, isInstalledLocally, ensurePermission, saveHandle, loadHandle } from '@/lib/maps/folder-store'

const mockIDBOpen = jest.fn()

beforeAll(() => {
  Object.defineProperty(global, 'indexedDB', {
    value: { open: mockIDBOpen },
    writable: true,
    configurable: true,
  })
})

beforeEach(() => {
  localStorage.clear()
  mockIDBOpen.mockReset()
})

// ── localStorage functions ────────────────────────────────────────────────────

test('isInstalledLocally returns false before markInstalled', () => {
  expect(isInstalledLocally('map-abc')).toBe(false)
})

test('markInstalled + isInstalledLocally round-trip', () => {
  markInstalled('map-abc')
  expect(isInstalledLocally('map-abc')).toBe(true)
})

test('isInstalledLocally is keyed per mapId', () => {
  markInstalled('map-1')
  expect(isInstalledLocally('map-1')).toBe(true)
  expect(isInstalledLocally('map-2')).toBe(false)
})

// ── ensurePermission ──────────────────────────────────────────────────────────

test('ensurePermission returns true when already granted', async () => {
  const handle = {
    queryPermission: jest.fn().mockResolvedValue('granted'),
    requestPermission: jest.fn(),
  } as unknown as FileSystemDirectoryHandle

  const result = await ensurePermission(handle)
  expect(result).toBe(true)
  expect(handle.requestPermission).not.toHaveBeenCalled()
})

test('ensurePermission requests permission when not yet granted', async () => {
  const handle = {
    queryPermission: jest.fn().mockResolvedValue('prompt'),
    requestPermission: jest.fn().mockResolvedValue('granted'),
  } as unknown as FileSystemDirectoryHandle

  const result = await ensurePermission(handle)
  expect(result).toBe(true)
  expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' })
})

test('ensurePermission returns false when permission denied', async () => {
  const handle = {
    queryPermission: jest.fn().mockResolvedValue('prompt'),
    requestPermission: jest.fn().mockResolvedValue('denied'),
  } as unknown as FileSystemDirectoryHandle

  const result = await ensurePermission(handle)
  expect(result).toBe(false)
})

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

/**
 * Creates a minimal IDBOpenDBRequest mock that fires onsuccess (or onerror)
 * on the next microtask.
 */
function makeIDBOpenRequest(db: IDBDatabase | null, error: DOMException | null = null) {
  const req = {
    result: db,
    error,
    onupgradeneeded: null as ((e: IDBVersionChangeEvent) => void) | null,
    onsuccess: null as ((e: Event) => void) | null,
    onerror: null as ((e: Event) => void) | null,
  }
  // Trigger the appropriate callback after setup
  Promise.resolve().then(() => {
    if (error) {
      req.onerror?.({} as Event)
    } else {
      req.onsuccess?.({} as Event)
    }
  })
  return req as unknown as IDBOpenDBRequest
}

function makeIDBDB(storedValue: FileSystemDirectoryHandle | null = null) {
  const getReq = {
    result: storedValue,
    onsuccess: null as ((e: Event) => void) | null,
    onerror: null as ((e: Event) => void) | null,
  }

  const putReq = {
    onsuccess: null as ((e: Event) => void) | null,
    onerror: null as ((e: Event) => void) | null,
  }

  const txReadonly = {
    oncomplete: null as ((e: Event) => void) | null,
    onerror: null as ((e: Event) => void) | null,
    error: null,
    objectStore: jest.fn().mockReturnValue({
      get: jest.fn().mockImplementation(() => {
        Promise.resolve().then(() => getReq.onsuccess?.({} as Event))
        return getReq
      }),
    }),
  }

  const txReadwrite = {
    oncomplete: null as ((e: Event) => void) | null,
    onerror: null as ((e: Event) => void) | null,
    error: null,
    objectStore: jest.fn().mockReturnValue({
      put: jest.fn().mockImplementation(() => {
        Promise.resolve().then(() => txReadwrite.oncomplete?.({} as Event))
        return putReq
      }),
    }),
  }

  const db = {
    transaction: jest.fn().mockImplementation((_store: string, mode: string) =>
      mode === 'readwrite' ? txReadwrite : txReadonly
    ),
    createObjectStore: jest.fn(),
  }

  return { db: db as unknown as IDBDatabase, txReadonly, txReadwrite, getReq }
}

// ── saveHandle ────────────────────────────────────────────────────────────────

test('saveHandle stores the handle via IndexedDB', async () => {
  const { db, txReadwrite } = makeIDBDB()
  mockIDBOpen.mockReturnValue(makeIDBOpenRequest(db))

  const handle = { name: 'CounterStrike' } as unknown as FileSystemDirectoryHandle
  await saveHandle(handle)

  expect(db.transaction).toHaveBeenCalledWith('settings', 'readwrite')
  expect(txReadwrite.objectStore('settings').put).toHaveBeenCalledWith(handle, 'gameFolder')
})

test('saveHandle rejects when openDB fails', async () => {
  const error = new DOMException('IDB error')
  mockIDBOpen.mockReturnValue(makeIDBOpenRequest(null, error))

  await expect(saveHandle({} as FileSystemDirectoryHandle)).rejects.toBeInstanceOf(DOMException)
})

// ── loadHandle ────────────────────────────────────────────────────────────────

test('loadHandle returns stored handle', async () => {
  const storedHandle = { name: 'CounterStrike' } as unknown as FileSystemDirectoryHandle
  const { db } = makeIDBDB(storedHandle)
  mockIDBOpen.mockReturnValue(makeIDBOpenRequest(db))

  const result = await loadHandle()
  expect(result).toBe(storedHandle)
})

test('loadHandle returns null when no handle stored', async () => {
  const { db } = makeIDBDB(null)
  mockIDBOpen.mockReturnValue(makeIDBOpenRequest(db))

  const result = await loadHandle()
  expect(result).toBeNull()
})

test('loadHandle rejects when openDB fails', async () => {
  const error = new DOMException('IDB error')
  mockIDBOpen.mockReturnValue(makeIDBOpenRequest(null, error))

  await expect(loadHandle()).rejects.toBeInstanceOf(DOMException)
})
