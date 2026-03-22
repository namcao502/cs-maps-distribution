// NOTE: 7z-wasm must be verified for browser buffer extraction before use.
// Test manually: upload a .7z file and confirm extraction works in Chrome.
import type { ExtractedFile } from './types'

export async function extractSevenZ(buffer: ArrayBuffer): Promise<ExtractedFile[]> {
  const SevenZip = (await import('7z-wasm')).default
  const sevenZip = await SevenZip()
  const stream = new sevenZip.InStream(new Uint8Array(buffer))
  const db = new sevenZip.SevenZipDatabase()
  db.open(stream)

  const result: ExtractedFile[] = []
  for (let i = 0; i < db.numFiles(); i++) {
    const entry = db.get(i)
    if (entry.isDirectory) continue
    const data = db.extract(i)
    result.push({
      path: entry.name.replace(/\\/g, '/'),
      data,
    })
  }
  return result
}
