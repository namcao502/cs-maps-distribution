import type { MapEntry } from '@/types/map'
import { MapCard } from './MapCard'

export function MapList({
  maps,
  gameFolder,
  onPickFolder,
}: {
  maps: MapEntry[]
  gameFolder: FileSystemDirectoryHandle | null
  onPickFolder: () => Promise<void>
}) {
  if (maps.length === 0) {
    return <p className="text-gray-400 text-center py-12">No maps uploaded yet.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {maps.map(map => (
        <MapCard key={map.id} map={map} gameFolder={gameFolder} onPickFolder={onPickFolder} />
      ))}
    </div>
  )
}
