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
