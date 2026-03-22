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
