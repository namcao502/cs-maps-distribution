import { Card } from '@/components/ui'
import { LABEL_TOP_MAPS } from '@/lib/constants/messages'

interface MapStat { id: string; originalName: string; installCount: number }

export function TopMaps({ maps }: { maps: MapStat[] }) {
  if (maps.length === 0) return null
  const max = maps[0].installCount || 1

  return (
    <Card className="p-4 mb-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{LABEL_TOP_MAPS}</h3>
      <ol className="space-y-2">
        {maps.map((m, i) => (
          <li key={m.id} className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-muted)] w-4 text-right">{i + 1}</span>
            <span className="text-sm text-[var(--text-primary)] w-32 truncate">{m.originalName}</span>
            <div className="flex-1 bg-[var(--bg-inset)] rounded-full h-2">
              <div
                className="bg-[var(--accent-cyan)] h-2 rounded-full transition-all"
                style={{ width: `${(m.installCount / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-[var(--text-muted)] w-10 text-right">{m.installCount}</span>
          </li>
        ))}
      </ol>
    </Card>
  )
}
