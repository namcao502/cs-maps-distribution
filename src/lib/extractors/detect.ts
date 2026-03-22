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
  const hasRootBsp = normalized.some(e => !e.includes('/') && e.endsWith('.bsp'))
  const hasSubdirs = normalized.some(e => e.includes('/'))
  if (hasRootBsp && !hasSubdirs) {
    return 'bare-files'
  }

  // Rule 4: single top-level folder wrapping recognizable CS content — strip it and re-detect.
  const entriesWithPath = normalized.filter(e => e.includes('/'))
  if (entriesWithPath.length > 0) {
    const topDirs = new Set(entriesWithPath.map(e => e.split('/')[0]))
    if (topDirs.size === 1) {
      const prefix = [...topDirs][0] + '/'
      const inner = normalized.map(e => e.startsWith(prefix) ? e.slice(prefix.length) : e).filter(e => e.length > 0)
      if (detectStructure(inner) !== 'unknown') return 'wrapped'
    }
  }

  return 'unknown'
}
