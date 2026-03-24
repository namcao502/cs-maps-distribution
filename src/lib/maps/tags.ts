export const MAP_TAGS = ['de_', 'cs_'] as const
export type MapTag = typeof MAP_TAGS[number]

export const TAG_LABELS: Record<string, string> = {
  'de_': 'Bomb/Defuse (DE)',
  'cs_': 'Hostage Rescue (CS)',
}

export const TAG_SHORT: Record<string, string> = {
  'de_': 'DE',
  'cs_': 'CS',
}
