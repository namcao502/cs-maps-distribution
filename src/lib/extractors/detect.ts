import type { ArchiveStructure } from './types'

const CS_SUBDIRS = ['maps', 'models', 'sound', 'sprites']

export function detectStructure(entries: string[]): ArchiveStructure {
  const normalized = entries.map(e => e.toLowerCase().replace(/\\/g, '/'))

  // Rule 1: cstrike/ at root
  if (normalized.some(e => e.startsWith('cstrike/'))) {
    return 'game-root'
  }

  // Rule 2: CS subdirectory at root (maps/, models/, sound/, sprites/)
  if (normalized.some(e => CS_SUBDIRS.some(dir => e.startsWith(dir + '/')))) {
    return 'cs-subfolder'
  }

  // Rule 3: .bsp files at root with no subdirectories.
  // Note: macOS zip artifacts like __MACOSX/ will cause this to fall through to 'unknown'.
  // This is acceptable — real CS 1.6 map zips rarely have such artifacts.
  const hasRootBsp = normalized.some(e => !e.includes('/') && e.endsWith('.bsp'))
  const hasSubdirs = normalized.some(e => e.includes('/'))
  if (hasRootBsp && !hasSubdirs) {
    return 'bare-files'
  }

  return 'unknown'
}
