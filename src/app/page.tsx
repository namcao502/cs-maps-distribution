import { MapList } from '@/components/MapList'
import type { MapEntry } from '@/types/map'

async function getMaps(): Promise<MapEntry[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''
    const res = await fetch(`${baseUrl}/api/maps`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function HomePage() {
  const maps = await getMaps()
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">CS 1.6 Maps</h1>
      <p className="text-gray-500 mb-8 text-sm">
        Click <strong>Install</strong> to automatically extract and copy the map to your game folder.
        Works on Chrome and Edge. Firefox users: use the Download button.
      </p>
      <MapList maps={maps} />
    </main>
  )
}
