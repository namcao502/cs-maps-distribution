import type { ExtractedFile } from './types'

export async function extractRar(buffer: ArrayBuffer): Promise<ExtractedFile[]> {
  const { createExtractorFromData } = await import('node-unrar-js')

  // Fetch the WASM binary from /public so we're not relying on Emscripten's
  // locateFile (which breaks when bundled by Next.js/Turbopack).
  const wasmBinary = await fetch('/unrar.wasm').then(r => r.arrayBuffer())

  const extractor = await createExtractorFromData({ wasmBinary, data: buffer })
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
