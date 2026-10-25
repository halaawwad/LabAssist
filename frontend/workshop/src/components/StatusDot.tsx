import type { TableStatus } from '../data/workshopTables'

export function StatusDot({ status }: { status: TableStatus }) {
  return <span className={`status-dot status-${status}`} aria-hidden="true" />
}
