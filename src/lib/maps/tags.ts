export const MAP_TAGS = ['de_', 'cs_'] as const
export type MapTag = typeof MAP_TAGS[number]
export type FilterTab = 'all' | MapTag

export const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'de_', label: 'DEFUSE' },
  { value: 'cs_', label: 'HOSTAGE' },
]

export const TAG_LABELS: Record<MapTag, string> = {
  'de_': 'Bomb/Defuse (DE)',
  'cs_': 'Hostage Rescue (CS)',
}

export const TAG_SHORT: Record<MapTag, string> = {
  'de_': 'DE',
  'cs_': 'CS',
}

export function tabToTag(tab: FilterTab): MapTag | null {
  return tab === 'all' ? null : tab
}
