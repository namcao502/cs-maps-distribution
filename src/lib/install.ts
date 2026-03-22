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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).showDirectoryPicker({ mode: 'readwrite' })
}

/** Check if the selected folder contains a cstrike/ subdirectory (case-insensitive) */
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

/** Compute SHA-256 of an ArrayBuffer in the browser using Web Crypto API */
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
    // bare-files: .bsp at root → goes into cstrike/maps/
    targetPath = `cstrike/maps/${file.path}`
  }

  const parts = targetPath.split('/').map(p => p.replace(/\\/g, '')).filter(p => p.length > 0)
  const filename = parts.pop()!
const dirHandle = await getNestedDir(gameRoot, parts)
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(file.data as unknown as ArrayBuffer)
  await writable.close()

  return targetPath
}

/** Check if a map's .bsp is already present in the game folder */
export async function isMapInstalled(
  gameRoot: FileSystemDirectoryHandle,
  mapName: string
): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = gameRoot as any
    const cstrike = await h.getDirectoryHandle('cstrike', { create: false })
    const maps = await cstrike.getDirectoryHandle('maps', { create: false })
    await maps.getFileHandle(`${mapName}.bsp`, { create: false })
    return true
  } catch {
    return false
  }
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

  // Extensions blocked by Chrome's File System Access API (security policy)
  // or irrelevant to CS 1.6 installation
  const BLOCKED_EXTENSIONS = new Set(['.url', '.lnk', '.exe', '.bat', '.cmd', '.scr', '.pif'])
  const isBlocked = (path: string) => {
    const ext = path.slice(path.lastIndexOf('.')).toLowerCase()
    return BLOCKED_EXTENSIONS.has(ext)
  }

  // Filter: for bare-files, only write .bsp files; always skip blocked extensions
  const filesToWrite = files
    .filter(f => !isBlocked(f.path))
    .filter(f => structure !== 'bare-files' || f.path.toLowerCase().endsWith('.bsp'))

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
