/** @jest-environment jsdom */
import { syncInstalledToLocalStorage } from '@/lib/maps/install'
import { isInstalledLocally } from '@/lib/maps/folder-store'
import type { MapEntry } from '@/types/map'

// Minimal MapEntry fixture — only fields used by syncInstalledToLocalStorage
function makeMap(id: string, originalName: string): MapEntry {
  return {
    id,
    originalName,
    storageKey: '',
    format: 'zip',
    size: 0,
    sha256: '',
    uploadedAt: '',
    installCount: 0,
    tags: [],
    hidden: false,
    uploader: undefined,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('syncInstalledToLocalStorage', () => {
  it('marks a map as installed when its BSP is in the set', () => {
    const maps = [makeMap('id-1', 'de_dust2')]
    const bsps = new Set(['de_dust2'])
    syncInstalledToLocalStorage(maps, bsps)
    expect(isInstalledLocally('id-1')).toBe(true)
  })

  it('does not mark a map when its BSP is absent', () => {
    const maps = [makeMap('id-1', 'de_dust2')]
    const bsps = new Set(['cs_assault'])
    syncInstalledToLocalStorage(maps, bsps)
    expect(isInstalledLocally('id-1')).toBe(false)
  })

  it('marks only matching maps when multiple maps are provided', () => {
    const maps = [
      makeMap('id-1', 'de_dust2'),
      makeMap('id-2', 'cs_assault'),
      makeMap('id-3', 'de_nuke'),
    ]
    const bsps = new Set(['de_dust2', 'de_nuke'])
    syncInstalledToLocalStorage(maps, bsps)
    expect(isInstalledLocally('id-1')).toBe(true)
    expect(isInstalledLocally('id-2')).toBe(false)
    expect(isInstalledLocally('id-3')).toBe(true)
  })

  it('does nothing when installedBsps is empty', () => {
    const maps = [makeMap('id-1', 'de_dust2')]
    syncInstalledToLocalStorage(maps, new Set())
    expect(isInstalledLocally('id-1')).toBe(false)
  })

  it('does nothing when maps array is empty', () => {
    // Should not throw
    expect(() => syncInstalledToLocalStorage([], new Set(['de_dust2']))).not.toThrow()
  })

  it('uses prefix matching (de_dust2_final matches de_dust2 BSP)', () => {
    const maps = [makeMap('id-1', 'de_dust2_final')]
    const bsps = new Set(['de_dust2'])
    syncInstalledToLocalStorage(maps, bsps)
    expect(isInstalledLocally('id-1')).toBe(true)
  })
})
