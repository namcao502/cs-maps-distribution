import { Card } from '@/components/ui'
import type { ActivityEvent } from '@/lib/admin/stats-store'
import { LABEL_RECENT_ACTIVITY } from '@/lib/constants/messages'

const ICONS: Record<ActivityEvent['type'], string> = {
  approved: '✓',
  rejected: '✗',
  uploaded: '↑',
}

const ICON_COLORS: Record<ActivityEvent['type'], string> = {
  approved: 'text-[var(--accent-green)]',
  rejected: 'text-[var(--color-danger)]',
  uploaded: 'text-[var(--text-muted)]',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) return null

  return (
    <Card className="p-4 mb-6">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{LABEL_RECENT_ACTIVITY}</h3>
      <ul className="space-y-2">
        {events.map((e, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span className={`font-bold text-base w-4 text-center ${ICON_COLORS[e.type]}`}>{ICONS[e.type]}</span>
            <span className="text-[var(--text-primary)] flex-1 truncate">{e.mapName}</span>
            <span className="text-xs text-[var(--text-muted)] shrink-0">{timeAgo(e.at)}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
