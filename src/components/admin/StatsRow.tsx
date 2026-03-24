import { StatsCard } from './StatsCard'

interface Props {
  totalMaps: number
  totalInstalls: number
  totalDownloads: number
  pendingSubmissions: number
}

export function StatsRow({ totalMaps, totalInstalls, totalDownloads, pendingSubmissions }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <StatsCard label="Maps" value={totalMaps} />
      <StatsCard label="Installs" value={totalInstalls} />
      <StatsCard label="Downloads" value={totalDownloads} />
      <StatsCard label="Pending" value={pendingSubmissions} />
    </div>
  )
}
