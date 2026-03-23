export interface MapPack {
  id: string
  name: string
  description: string
  mapIds: string[]
  createdAt: string
}

import type { MapEntry } from '@/types/map'

export type PackWithMaps = MapPack & { maps: MapEntry[] }
