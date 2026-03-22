const DB_NAME = 'cs-map-installer'
const STORE_NAME = 'settings'
const HANDLE_KEY = 'gameFolder'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

/** Verify permission is still granted, request it if not. Returns false if denied. */
export async function ensurePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = handle as any
  if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') return true
  return (await h.requestPermission({ mode: 'readwrite' })) === 'granted'
}
