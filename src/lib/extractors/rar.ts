// Uses node-unrar-js (Emscripten-compiled unrar lib).
// NOTE: Verify in-browser buffer extraction works in Chrome before shipping.
import type { ExtractedFile } from './types'

export async function extractRar(buffer: ArrayBuffer): Promise<ExtractedFile[]> {
  const { createExtractorFromData } = await import('node-unrar-js')
  const extractor = await createExtractorFromData({ data: buffer })
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
