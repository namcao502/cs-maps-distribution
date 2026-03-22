// NOTE: 7z-wasm uses a virtual Emscripten FS. Verify works in Chrome before shipping.
import type { ExtractedFile } from './types'

interface SevenZipModule {
  FS: {
    open: (path: string, flags: string) => unknown
    write: (stream: unknown, data: Uint8Array, offset: number, length: number) => void
    close: (stream: unknown) => void
    readdir: (path: string) => string[]
    stat: (path: string) => { mode: number }
    isDir: (mode: number) => boolean
    readFile: (path: string) => Uint8Array
    mkdir: (path: string) => void
  }
  callMain: (args: string[]) => void
}

/** Recursively list all files (not directories) under a path in the virtual FS */
function listFiles(fs: SevenZipModule['FS'], dir: string): string[] {
  const entries = fs.readdir(dir).filter(e => e !== '.' && e !== '..')
  const result: string[] = []
  for (const entry of entries) {
    const full = dir === '/' ? `/${entry}` : `${dir}/${entry}`
    const stat = fs.stat(full)
    if (fs.isDir(stat.mode)) {
      result.push(...listFiles(fs, full))
    } else {
      result.push(full)
    }
  }
  return result
}

export async function extractSevenZ(buffer: ArrayBuffer): Promise<ExtractedFile[]> {
  const SevenZip = ((await import('7z-wasm')) as { default: (opts?: object) => Promise<SevenZipModule> }).default
  const sevenZip = await SevenZip({ locateFile: (path: string) => path === '7zz.wasm' ? '/7zz.wasm' : path })
  const { FS } = sevenZip

  // Write archive to virtual FS
  const archiveName = 'input.7z'
  const outputDir = '/output'
  FS.mkdir(outputDir)
  const stream = FS.open(archiveName, 'w+')
  FS.write(stream, new Uint8Array(buffer), 0, buffer.byteLength)
  FS.close(stream)

  // Extract
  sevenZip.callMain(['x', archiveName, `-o${outputDir}`, '-y'])

  // Read extracted files
  const filePaths = listFiles(FS, outputDir)
  const result: ExtractedFile[] = filePaths.map(fullPath => ({
    path: fullPath.slice(outputDir.length + 1).replace(/\\/g, '/'),
    data: FS.readFile(fullPath),
  }))

  return result
}
