import { StatsCard } from './StatsCard'

interface Props {
  totalMaps: number
  totalInstalls: number
  pendingSubmissions: number
}

export function StatsRow({ totalMaps, totalInstalls, pendingSubmissions }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <StatsCard label="Maps" value={totalMaps} />
      <StatsCard label="Installs" value={totalInstalls} />
      <StatsCard label="Pending" value={pendingSubmissions} />
    </div>
  )
}
