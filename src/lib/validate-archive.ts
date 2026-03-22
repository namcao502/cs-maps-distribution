/**
 * Server-side archive validation.
 * Lists file paths inside an archive and checks for a valid CS 1.6 map structure.
 */
import { unzip } from 'fflate'
import fs from 'fs'
import path from 'path'
import { detectStructure } from './extractors/detect'

async function readWasm(filename: string): Promise<ArrayBuffer> {
  const buf = await fs.promises.readFile(path.join(process.cwd(), 'public', filename))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

async function listZipPaths(buffer: ArrayBuffer): Promise<string[]> {
  return new Promise((resolve, reject) => {
    unzip(new Uint8Array(buffer), (err, files) => {
      if (err) return reject(err)
      resolve(Object.keys(files).filter(p => !p.endsWith('/')))
    })
  })
}

async function listSevenZPaths(buffer: ArrayBuffer): Promise<string[]> {
  const wasmBinary = await readWasm('7zz.wasm')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SevenZip = ((await import('7z-wasm')) as { default: (opts: object) => Promise<any> }).default

  const lines: string[] = []
  const sevenZip = await SevenZip({
    wasmBinary,
    print: (text: string) => lines.push(text),
  })

  const { FS } = sevenZip
  FS.mkdir('/val')
  const stream = FS.open('/val/input.7z', 'w+')
  FS.write(stream, new Uint8Array(buffer), 0, buffer.byteLength)
  FS.close(stream)
  sevenZip.callMain(['l', '/val/input.7z'])

  // Parse 7z list output: file name starts at column 53, between separator lines
  const paths: string[] = []
  let inList = false
  for (const line of lines) {
    if (/^-{5,}/.test(line)) { inList = !inList; continue }
    if (inList && line.length > 53) {
      const name = line.slice(53).trim()
      if (name) paths.push(name)
    }
  }
  return paths
}

async function listRarPaths(buffer: ArrayBuffer): Promise<string[]> {
  const { createExtractorFromData } = await import('node-unrar-js')
  const wasmBinary = await readWasm('unrar.wasm')
  const extractor = await createExtractorFromData({ wasmBinary, data: buffer })
  const list = extractor.getFileList()
  return [...list.fileHeaders]
    .map(h => h.name)
    .filter(n => !n.endsWith('/') && !n.endsWith('\\'))
}

/**
 * Returns the list of file paths inside the archive without full extraction.
 * Throws if the archive cannot be read.
 */
export async function listArchivePaths(
  buffer: ArrayBuffer,
  format: 'zip' | '7z' | 'rar',
): Promise<string[]> {
  if (format === 'zip') return listZipPaths(buffer)
  if (format === '7z') return listSevenZPaths(buffer)
  return listRarPaths(buffer)
}

/**
 * Returns an error message if the archive is not a valid CS 1.6 map, or null if it passes.
 */
export async function validateMapArchive(
  buffer: ArrayBuffer,
  format: 'zip' | '7z' | 'rar',
): Promise<string | null> {
  let paths: string[]
  try {
    paths = await listArchivePaths(buffer, format)
  } catch {
    return 'Could not read archive contents. The file may be corrupted.'
  }
  const structure = detectStructure(paths)
  if (structure === 'unknown') {
    return 'Archive does not appear to contain a CS 1.6 map (no .bsp file or recognised folder structure found).'
  }
  return null
}
