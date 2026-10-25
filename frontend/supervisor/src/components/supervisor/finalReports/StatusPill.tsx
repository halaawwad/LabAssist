import { CircleCheck, CircleDot, FileCheck2, RotateCcw } from 'lucide-react'
import type { FinalReportStatus } from '../../../data/supervisor/finalReportsMockData'
import type { FinalReportsLabels } from './finalReportsLabels'

const icons = { draft: CircleDot, submitted: FileCheck2, revision: RotateCcw, approved: CircleCheck }

export function StatusPill({ status, labels }: { status: FinalReportStatus; labels: FinalReportsLabels }) {
  const Icon = icons[status]
  return (
    <span className={`fr-status is-${status}`}>
      <Icon size={13} strokeWidth={2.2} aria-hidden="true" />
      {labels.status[status]}
    </span>
  )
}
