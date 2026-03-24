import { Badge } from './Badge'

type Status = 'pending' | 'approved' | 'rejected'

const STATUS_PROPS: Record<Status, { variant: 'warning' | 'success' | 'danger'; label: string }> = {
  pending:  { variant: 'warning', label: 'Pending' },
  approved: { variant: 'success', label: 'Approved' },
  rejected: { variant: 'danger',  label: 'Rejected' },
}

export function StatusBadge({ status }: { status: Status }) {
  const { variant, label } = STATUS_PROPS[status]
  return <Badge variant={variant}>{label}</Badge>
}
