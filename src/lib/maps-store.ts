import { getObject, putObject } from './storage'
import type { MapEntry } from '@/types/map'

const MAPS_KEY = 'maps.json'

export async function getMaps(): Promise<MapEntry[]> {
  const raw = await getObject(MAPS_KEY)
  if (!raw) return []
  return JSON.parse(raw) as MapEntry[]
}

export async function addMap(entry: MapEntry): Promise<void> {
  const maps = await getMaps()
  maps.push(entry)
  await putObject(MAPS_KEY, JSON.stringify(maps), 'application/json')
}

export async function removeMap(id: string): Promise<void> {
  const maps = await getMaps()
  const filtered = maps.filter(m => m.id !== id)
  await putObject(MAPS_KEY, JSON.stringify(filtered), 'application/json')
}
