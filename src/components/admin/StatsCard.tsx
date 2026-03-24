import { Card } from '@/components/ui'

export function StatsCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold text-[var(--text-primary)]">{value.toLocaleString()}</span>
    </Card>
  )
}
