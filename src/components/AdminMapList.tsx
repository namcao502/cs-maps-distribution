'use client'
import type { MapEntry } from '@/types/map'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AdminMapList({
  maps,
  onDeleted,
}: {
  maps: MapEntry[]
  onDeleted: (id: string) => void
}) {
  async function handleDelete(map: MapEntry) {
    if (!confirm(`Delete "${map.originalName}"?`)) return
    const res = await fetch(`/api/delete/${map.id}`, { method: 'DELETE' })
    if (!res.ok) {
      alert('Failed to delete map. Please try again.')
      return
    }
    onDeleted(map.id)
  }

  if (maps.length === 0) {
    return <p className="text-gray-400 text-center py-6">No maps yet.</p>
  }

  return (
    <div className="flex flex-col gap-2 mt-6">
      {maps.map(map => (
        <div key={map.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
          <div>
            <span className="font-medium">{map.originalName}</span>
            <span className="ml-2 text-xs text-gray-400 uppercase">{map.format}</span>
            <span className="ml-2 text-xs text-gray-400">{formatBytes(map.size)}</span>
          </div>
          <button
            onClick={() => handleDelete(map)}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
